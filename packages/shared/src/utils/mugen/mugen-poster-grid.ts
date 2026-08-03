/**
 * The poster wall
 *
 * Every character in the registry stood up at once, idling, on **one** PixiJS canvas —
 * the admin's `/posters` screen. What it is for is comparison: a character's size is
 * not a property of its artwork but of the corrections authored for it
 * (`renderScale`, `crownAlign`), and those are only judged against the rest of the
 * roster. So this draws each character exactly as the combat board draws it and puts
 * them side by side.
 *
 * "Exactly as the board" is not a resemblance, it is the same three calls:
 * {@link characterFitScale} over a box of {@link CHAR_HEIGHT_RATIO} cell widths, with
 * the character's own {@link readRenderScale}, shifted by {@link crownCorrection} where
 * its definition asks for it. Nothing here decides a size; if a poster and a fighter
 * ever disagree it is because one of them stopped calling these.
 *
 * One canvas rather than one per character: a browser allows a handful of WebGL
 * contexts at a time (see `release-context`), and the roster is dozens of characters —
 * a canvas each would evict itself before the wall had finished loading.
 */

import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { CHAR_HEIGHT_RATIO, characterFitScale } from '../card/character-fit';
import { crownCorrection, readCrownAlign } from './character-crown';
import { readRenderScale } from './character-render-scale';
import type { CharacterDefinition } from '../../types/character-definition.type';
import type { Manifest } from './mugen-player';
import { destroyPixiApp } from '../pixi/release-context';

/** A character to stand on the wall: its id (which is what its definition is under)
 * and the folder its decoded frames are served from. */
export interface PosterCharacter {
	id: string;
	basePath: string;
}

/** One loaded idle frame, with its anchor already as a fraction of the frame. */
interface LoadedFrame {
	texture: Texture;
	width: number;
	height: number;
	anchorX: number;
	duration: number;
}

/** One character on the wall: its sprite, its cycle, and the playback cursor. */
interface Poster {
	/** Its place in the roster it was given, which is the place it takes on the wall
	 * however late it finished loading. */
	order: number;
	sprite: Sprite;
	frames: LoadedFrame[];
	frameIndex: number;
	frameElapsed: number;
	/** The crown shift in screen px, kept so a re-layout can place the sprite again
	 * without re-reading the artwork's pixels (the scale does not change with the
	 * column count, so neither does this). */
	crownShift: number;
}

/** How the wall is getting on, reported as it loads. */
export interface PosterGridStatus {
	/** Characters drawn so far, and how many were asked for. */
	drawn: number;
	total: number;
	/** Ids that could not be drawn — no manifest, or no `idle` in it. */
	missing: string[];
	/** False once every character has been tried. */
	loading: boolean;
}

export interface MugenPosterGridOptions {
	characters: PosterCharacter[];
	/** Width of one character's cell, in canvas px. Its height follows from
	 * {@link CHAR_HEIGHT_RATIO}, as a board cell's does. */
	cellWidth?: number;
	/** Space between cells, both ways. */
	gap?: number;
	backgroundColor?: number;
	/** Backdrop painted behind each cell, so the box a character is fitted into is
	 * visible — which is the thing being judged. */
	cellColor?: number;
	/** Called as the wall fills in. */
	onStatus?: (status: PosterGridStatus) => void;
}

const DEFAULTS = {
	cellWidth: 150,
	gap: 8,
	backgroundColor: 0x1d232a,
	cellColor: 0x272e37
};

/**
 * How many characters are loaded at once. A manifest is a few hundred KB and a cycle is
 * a dozen textures, so the whole roster at once is a stampede that finishes no sooner
 * and shows nothing until it does; a handful at a time fills the wall from the top.
 */
const LOAD_CONCURRENCY = 4;

export class MugenPosterGrid {
	private readonly characters: PosterCharacter[];
	private readonly cellWidth: number;
	private readonly cellHeight: number;
	private readonly gap: number;
	private readonly backgroundColor: number;
	private readonly cellColor: number;
	private readonly onStatus?: (status: PosterGridStatus) => void;

	private app: Application | null = null;
	private host: HTMLElement | null = null;
	private backdrop: Graphics | null = null;
	private stage: Container | null = null;
	private observer: ResizeObserver | null = null;

	// The posters, kept in roster order rather than in the order they finished loading
	// (several load at once, and the small ones win) — so the wall reads the same way
	// twice running. A character that could not be loaded never joins, and the wall
	// closes up over it.
	private posters: Poster[] = [];
	private missing: string[] = [];
	private loading = true;
	private columns = 1;

	// Set the moment teardown starts, so a load already in flight drops what it has
	// instead of building onto a destroyed app.
	private destroyed = false;

	constructor(options: MugenPosterGridOptions) {
		this.characters = options.characters;
		this.cellWidth = options.cellWidth ?? DEFAULTS.cellWidth;
		this.cellHeight = this.cellWidth * CHAR_HEIGHT_RATIO;
		this.gap = options.gap ?? DEFAULTS.gap;
		this.backgroundColor = options.backgroundColor ?? DEFAULTS.backgroundColor;
		this.cellColor = options.cellColor ?? DEFAULTS.cellColor;
		this.onStatus = options.onStatus;
	}

	/** Boot Pixi inside `container` and start loading the roster into it. */
	async start(container: HTMLElement): Promise<void> {
		const app = new Application();
		await app.init({
			width: Math.max(1, container.clientWidth),
			height: this.cellHeight,
			backgroundColor: this.backgroundColor,
			antialias: false,
			roundPixels: true
		});
		// The screen can be left while `init` is in flight; without this the app would
		// be created after destroy() had run, holding a context and a render loop that
		// nothing can reach to stop.
		if (this.destroyed) {
			destroyPixiApp(app);
			return;
		}

		this.app = app;
		this.host = container;
		container.appendChild(app.canvas);
		app.canvas.addEventListener('webglcontextlost', this.onContextLost);
		app.canvas.addEventListener('webglcontextrestored', this.onContextRestored);

		// The cell backdrops go in first and stay behind every sprite.
		this.backdrop = new Graphics();
		this.stage = new Container();
		app.stage.addChild(this.backdrop, this.stage);

		// The wall reflows with the window: only the column count changes, and a
		// character's size does not depend on it, so this is a re-placement and never
		// a reload.
		this.observer = new ResizeObserver(() => this.layout());
		this.observer.observe(container);

		app.ticker.add(this.tick);
		this.layout();
		this.report();

		await this.loadAll();
	}

	/** Tear everything down. Safe to call more than once. */
	destroy(): void {
		this.destroyed = true;
		this.observer?.disconnect();
		this.observer = null;
		if (this.app) {
			this.app.canvas?.removeEventListener('webglcontextlost', this.onContextLost);
			this.app.canvas?.removeEventListener('webglcontextrestored', this.onContextRestored);
			destroyPixiApp(this.app);
			this.app = null;
		}
		this.posters = [];
		this.host = null;
		this.backdrop = null;
		this.stage = null;
	}

	/**
	 * A lost context (the browser reclaiming one under pressure) leaves the renderer
	 * unable to draw: keep rendering and it throws every frame. Stop the loop until it
	 * comes back.
	 */
	private onContextLost = (event: Event): void => {
		// preventDefault marks the context restorable; without it the browser never
		// fires `webglcontextrestored`.
		event.preventDefault();
		this.app?.ticker?.stop();
	};

	private onContextRestored = (): void => {
		if (this.destroyed || !this.app) return;
		this.app.ticker.start();
	};

	/** Load every character, a few at a time, placing each as it lands. */
	private async loadAll(): Promise<void> {
		const queue = this.characters.map((character, order) => ({ character, order }));
		const workers = Array.from({ length: Math.min(LOAD_CONCURRENCY, queue.length) }, async () => {
			for (let next = queue.shift(); next; next = queue.shift()) {
				if (this.destroyed) return;
				await this.place(next.character, next.order);
			}
		});
		await Promise.all(workers);
		if (this.destroyed) return;
		this.loading = false;
		this.report();
	}

	/**
	 * Stand one character on the wall.
	 *
	 * The sizing is the board's, called rather than copied: one shared source→screen
	 * ratio capped by the cell's box, the character's own `renderScale` riding along on
	 * it, and the crown shift that puts its head — not its MUGEN axis — over the middle
	 * of the cell. A character whose definition cannot be read is drawn with the
	 * defaults those two readers give, which is the same thing the board would do.
	 */
	private async place(character: PosterCharacter, order: number): Promise<void> {
		const [frames, definition] = await Promise.all([
			this.loadIdle(character.basePath),
			loadDefinition(character.id)
		]);
		if (this.destroyed || !this.stage) return;
		if (!frames || frames.length === 0) {
			this.missing.push(character.id);
			this.report();
			return;
		}

		const fitScale = characterFitScale(
			frames,
			{ width: this.cellWidth, height: this.cellHeight },
			readRenderScale(definition)
		);
		const crownShift = readCrownAlign(definition)
			? crownCorrection(
					frames.map((frame) => ({
						source: frame.texture.source.resource,
						width: frame.width,
						height: frame.height,
						anchorX: frame.anchorX
					})),
					fitScale,
					// Mirrored, the way a character faces on a card and in a team line-up.
					true
				)
			: 0;

		const sprite = new Sprite();
		// A negative x-scale mirrors the sprite about its anchor, in place.
		sprite.scale.set(-fitScale, fitScale);
		this.stage.addChild(sprite);

		const poster: Poster = { order, sprite, frames, frameIndex: 0, frameElapsed: 0, crownShift };
		this.applyFrame(poster);
		// Into its own place in the roster, not onto the end: the loads finish in no
		// particular order, and the wall is a roster rather than a race result.
		const at = this.posters.findIndex((other) => other.order > order);
		this.posters.splice(at < 0 ? this.posters.length : at, 0, poster);
		this.layout();
		this.report();
	}

	/** Fetch a folder's manifest and load its `idle` cycle's textures. Null when the
	 * folder, the manifest or the cycle is missing — none of which is worth failing the
	 * whole wall for. */
	private async loadIdle(basePath: string): Promise<LoadedFrame[] | null> {
		try {
			const response = await fetch(`${basePath}/manifest.json`);
			if (!response.ok) return null;
			const manifest = (await response.json()) as Manifest;
			const animation = manifest.animations?.idle;
			if (!animation || animation.frames.length === 0) return null;

			const frames: LoadedFrame[] = [];
			for (const frame of animation.frames) {
				const texture = await Assets.load<Texture>(`${basePath}/${frame.file}`);
				// Keep the pixel art crisp when scaled.
				texture.source.scaleMode = 'nearest';
				frames.push({
					texture,
					width: frame.width,
					height: frame.height,
					anchorX: frame.anchorX / frame.width,
					duration: frame.duration
				});
			}
			return frames;
		} catch {
			return null;
		}
	}

	/**
	 * Place every poster in the grid the host's current width allows, repaint the cell
	 * backdrops and resize the canvas to the rows that result.
	 *
	 * Each character stands on the bottom of its own cell — that shared foot line is
	 * what makes two characters' heights comparable at all — with its axis on the cell's
	 * middle, moved by its crown shift.
	 */
	private layout(): void {
		const app = this.app;
		const host = this.host;
		const backdrop = this.backdrop;
		if (!app || !host || !backdrop || this.destroyed) return;

		const width = Math.max(this.cellWidth, host.clientWidth);
		this.columns = Math.max(1, Math.floor((width + this.gap) / (this.cellWidth + this.gap)));
		const rows = Math.max(1, Math.ceil(this.posters.length / this.columns));
		const height = rows * this.cellHeight + (rows - 1) * this.gap;
		if (app.renderer.width !== width || app.renderer.height !== height) {
			app.renderer.resize(width, height);
		}

		// The grid is centred in whatever the columns leave over, so a wall that cannot
		// divide the width evenly is not pushed against one edge.
		const gridWidth = this.columns * this.cellWidth + (this.columns - 1) * this.gap;
		const originX = Math.max(0, (width - gridWidth) / 2);

		backdrop.clear();
		this.posters.forEach((poster, index) => {
			const column = index % this.columns;
			const row = Math.floor(index / this.columns);
			const left = originX + column * (this.cellWidth + this.gap);
			const top = row * (this.cellHeight + this.gap);
			backdrop.rect(left, top, this.cellWidth, this.cellHeight).fill(this.cellColor);
			poster.sprite.x = left + this.cellWidth / 2 + poster.crownShift;
			poster.sprite.y = top + this.cellHeight;
		});
	}

	/** Push a poster's current frame to its sprite: horizontally by the frame's own
	 * MUGEN axis, vertically pinned to its bottom edge (the foot line). */
	private applyFrame(poster: Poster): void {
		const frame = poster.frames[poster.frameIndex % poster.frames.length];
		poster.sprite.texture = frame.texture;
		poster.sprite.anchor.set(frame.anchorX, 1);
	}

	private report(): void {
		this.onStatus?.({
			drawn: this.posters.length,
			total: this.characters.length,
			missing: [...this.missing],
			loading: this.loading
		});
	}

	private tick = (): void => {
		if (!this.app) return;
		const deltaMs = this.app.ticker.deltaMS;
		for (const poster of this.posters) {
			if (poster.frames.length < 2) continue;
			poster.frameElapsed += deltaMs;
			let guard = poster.frames.length;
			while (poster.frameElapsed >= poster.frames[poster.frameIndex].duration && guard-- > 0) {
				poster.frameElapsed -= poster.frames[poster.frameIndex].duration;
				poster.frameIndex = (poster.frameIndex + 1) % poster.frames.length;
			}
			this.applyFrame(poster);
		}
	};
}

/** A character's authored definition, or null for anything unreadable — the same
 * fetch the board makes, and the same shrug when it fails. */
async function loadDefinition(id: string): Promise<CharacterDefinition | null> {
	try {
		const response = await fetch(`/data/characters/${id}/definition.json`);
		if (!response.ok) return null;
		return (await response.json()) as CharacterDefinition;
	} catch {
		return null;
	}
}
