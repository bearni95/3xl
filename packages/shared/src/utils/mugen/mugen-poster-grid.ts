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
 * "Exactly as the board" is not a resemblance, it is the same calls. The size is
 * {@link characterFitScale} over a box of {@link CHAR_HEIGHT_RATIO} cell widths, with
 * the character's own {@link readRenderScale}, shifted by {@link crownCorrection} where
 * its definition asks for it. The **ground** is the board's too: a field of pointy-topped
 * hexagons off `grid.ts`'s lattice, rows nested half a cell into each other's slants, each
 * character stood on its cell's foot line rather than on the hexagon's bottom point.
 * Nothing here decides a size or a place; if a poster and a fighter ever disagree it is
 * because one of them stopped calling these.
 *
 * What the wall does not take from the board is the board's own *field* — five signed
 * columns, four rows, lanes and halves and a white column between them. Those are the
 * rules of a duel and there is no duel here, which is why the lattice is asked for apart
 * from the board that is usually drawn on it.
 *
 * **The field grows from the middle out.** The roster is laid on a hex *spiral*, wound
 * from the three cells at the middle that are kept clear ({@link KEPT_CELLS}): the first
 * character takes the first cell outside them and the rest ring it, each ring walked
 * round before the next begins ({@link spiralCells}). So the wall is a hexagon of hexagons
 * rather than a paragraph of them — the shape a hex field makes when nothing crops it —
 * and the roster reads outward from its middle. A rectangle of cells was the arrangement
 * before, and its one virtue was that it reflowed: this one has a size of its own, so it
 * is the *cell* that gives instead, scaled down until the whole field fits the page.
 * Which is why the sizes are worked out per layout rather than once at load: a character
 * a third of the way down the roster is drawn against the same cell as everyone else, and
 * when that cell changes they all change together.
 *
 * The hexagons are painted, faintly. On the board they are drawn at alpha 0 — the field
 * is real ground that is deliberately unmarked — but here the cell *is* the subject: it
 * is the box every character was fitted into, and a size is easier to read against a
 * drawn one. Two marks are not faint: the blue trio at the middle, which is the ground the
 * spiral was wound out from and the only cells nobody stands on, and the red line down the
 * field's own middle, halving it the way the board's white column stands between its two
 * halves. The two are not the same place once the outer ring is unfinished — the field
 * grows lopsided before it closes, and saying so is the point of drawing both.
 *
 * One canvas rather than one per character: a browser allows a handful of WebGL
 * contexts at a time (see `release-context`), and the roster is dozens of characters —
 * a canvas each would evict itself before the wall had finished loading.
 */

import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { CHAR_HEIGHT_RATIO, characterFitScale } from '../card/character-fit';
import { crownCorrection, readCrownAlign } from './character-crown';
import { readRenderScale } from './character-render-scale';
import {
	type GridPoint,
	HEX_HEIGHT,
	HEX_ROW_STEP,
	latticeCenter,
	latticeCorners,
	latticeFoot
} from './grid';
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

/** One character on the wall: its sprite, its cycle, the playback cursor, and the two
 * things its own definition says about how it is drawn. */
interface Poster {
	/** Its place in the roster it was given, which is the place it takes on the wall
	 * however late it finished loading. */
	order: number;
	sprite: Sprite;
	frames: LoadedFrame[];
	frameIndex: number;
	frameElapsed: number;
	/** The character's authored render scale, read once from its definition. */
	renderScale: number;
	/**
	 * How far its crown sits from the axis it is drawn around, in its **own source
	 * pixels** — the correction at scale 1. Kept unscaled because the correction is
	 * linear in the fit and the fit moves with the page, whereas re-reading it would mean
	 * reading every frame's pixels back off a canvas again on every resize. Zero for a
	 * character that opts out of the rule, and for artwork nothing could be read from.
	 */
	crownOffset: number;
}

/** One hexagon of the wall: its centre in cell widths, off the field's top-left corner —
 * the lattice's own units, put on the canvas when the field is drawn — and whether it is
 * one of the kept middle ones nobody stands on ({@link KEPT_CELLS}). */
interface WallCell {
	centre: GridPoint;
	kept: boolean;
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
	/**
	 * The widest a hexagon is drawn, in canvas px — its short way across, which is also
	 * how far apart two neighbours on a row stand, and what the box a character is fitted
	 * into is measured from ({@link CHAR_HEIGHT_RATIO}). A cap rather than a size: the
	 * field is as many cells across as the roster makes it, so the cell shrinks below this
	 * whenever that many will not fit the page.
	 */
	maxCellWidth?: number;
	backgroundColor?: number;
	/** Fill and outline of a hexagon — see the module note on why the wall paints the
	 * ground the board leaves invisible. */
	cellColor?: number;
	cellLineColor?: number;
	/** Fill of the three cells at the middle — the ground the spiral is wound from, which
	 * is drawn and kept clear (see {@link KEPT_CELLS}). */
	centerCellColor?: number;
	/** The line down the middle of the field. */
	halvingLineColor?: number;
	/** Called as the wall fills in. */
	onStatus?: (status: PosterGridStatus) => void;
}

const DEFAULTS = {
	maxCellWidth: 150,
	backgroundColor: 0x1d232a,
	cellColor: 0x272e37,
	cellLineColor: 0x3b4451,
	// The board's own two, which is what makes the pair read as a board's marks rather
	// than as decoration: blue for the ground everything is wound from, red for the line
	// that halves what it grew into.
	centerCellColor: 0x3b82f6,
	halvingLineColor: 0xef4444
};

/**
 * The cells at the middle of the field that are kept clear: the one the spiral is wound
 * from, the one immediately to its right, and the one below the pair of them — which on
 * a hex field is a single cell, since a row nests into the slants of the row above and
 * every two neighbours have exactly one cell under both.
 *
 * They are drawn like any other cell and painted blue, and **nobody stands on them**: the
 * spiral steps over them as it winds, so the roster begins on the first cell outside the
 * three and the count of characters is unaffected by their being there. They are the one
 * part of the wall that is ground rather than roster.
 */
const KEPT_CELLS: { q: number; r: number }[] = [
	{ q: 0, r: 0 },
	{ q: 1, r: 0 },
	{ q: 0, r: 1 }
];

const isKept = (cell: { q: number; r: number }): boolean =>
	KEPT_CELLS.some((kept) => kept.q === cell.q && kept.r === cell.r);

/**
 * Room kept above the field's top row, in cell widths.
 *
 * A character stands {@link CHAR_HEIGHT_RATIO} cell widths tall from its foot line, and
 * the rows are only {@link HEX_ROW_STEP} apart — which is the whole look of the board,
 * every fighter standing up over the row behind it. Every row but the first has the row
 * above to rise into; the first has the canvas edge, and would be cropped at the neck.
 * The board keeps a spare row of hexagons over the lanes for this; the wall, whose top
 * row is a character like any other, keeps the difference as blank canvas.
 */
const HEADROOM = Math.max(0, CHAR_HEIGHT_RATIO - HEX_ROW_STEP);

/**
 * The six steps around a hexagon, in axial coordinates — the pair of axes a hex grid is
 * walked in, where a step is a step and does not depend on which row it is taken from
 * (the board's offset coordinates, which are the right way to *write* its rules, pay for
 * that convenience with a stagger; see `grid.ts`). Used only to wind the spiral, so
 * nothing outside this module ever sees them.
 */
const AXIAL_STEPS: { q: number; r: number }[] = [
	{ q: 1, r: 0 },
	{ q: 1, r: -1 },
	{ q: 0, r: -1 },
	{ q: -1, r: 0 },
	{ q: -1, r: 1 },
	{ q: 0, r: 1 }
];

/**
 * The field for `count` characters: the kept middle ({@link KEPT_CELLS}) and then as many
 * cells as there are characters, wound outward from that middle — each ring around it
 * walked in turn, so the roster fills the field from the middle rather than from a corner.
 *
 * A ring of radius k is 6k cells: step out to one corner of it and walk the six sides,
 * k cells each. Cells of the kept middle are walked over rather than counted, so `count`
 * characters always get `count` cells to stand on and the middle costs the wall its own
 * three cells of ground. The centres come back in the lattice's own units, which is a
 * conversion and not a second geometry — an axial cell's row is the lattice's row, and
 * its column is that row's stagger already undone. The two end rows are then squared up
 * (see {@link centerEndRows}).
 */
function spiralCells(count: number): WallCell[] {
	// Axial [q, r] as the lattice draws it: even rows sit on the indented half-step,
	// odd rows on the other, which is exactly the nesting the lattice already knows.
	const centre = ({ q, r }: { q: number; r: number }): GridPoint =>
		latticeCenter(q + Math.floor(r / 2), r, r % 2 === 0);

	if (count <= 0) return [];
	// The kept three are laid first and whole. Reached in the winding they would be at
	// the mercy of how far it got — a short roster would leave the middle half drawn,
	// and it is a mark on the field rather than part of the roster's shape.
	const cells: WallCell[] = KEPT_CELLS.map((kept) => ({ centre: centre(kept), kept: true }));

	let stood = 0;
	for (let ring = 1; stood < count; ring++) {
		// Start at the ring's corner in one direction, then walk the six sides. Which
		// corner is arbitrary — it only decides where a half-finished outer ring has its
		// gap — so it is the one that starts the walk along the top.
		let cell = { q: -ring, r: ring };
		for (const step of AXIAL_STEPS) {
			for (let i = 0; i < ring && stood < count; i++) {
				if (!isKept(cell)) {
					cells.push({ centre: centre(cell), kept: false });
					stood++;
				}
				cell = { q: cell.q + step.q, r: cell.r + step.r };
			}
			if (stood >= count) break;
		}
	}
	return centerEndRows(cells);
}

/**
 * Slide the field's first and last rows back under the middle of it.
 *
 * A ring is walked from one corner, so a roster that does not finish the ring it is on
 * leaves the outermost row it reached hanging off one side — the wall's own top and
 * bottom edges, which are exactly the two rows an eye squares the shape up by. The rows
 * between them are held on both sides by the rings that closed around them and are
 * already true; these two are not, and nothing but the count decides where they stop.
 *
 * So the two are re-hung under the middle of what *is* closed: the field measured across
 * the rows in between, which is why a wall of one or two rows is left alone — there is
 * nothing under them to be centred on.
 *
 * The move is by **whole cells**. Half of one would put the row on the other parity's
 * positions, where it stacks squarely on the row below instead of nesting into its
 * slants, and a hex field that has stopped interlocking is no longer one. So a row lands
 * within half a cell of the middle rather than on it, which is as centred as this ground
 * can be.
 */
function centerEndRows(cells: WallCell[]): WallCell[] {
	const rows = new Map<number, WallCell[]>();
	for (const cell of cells) {
		// Rows are a fixed step apart, so the step is the key; the arithmetic is exact
		// enough that rounding it recovers the row index a cell was built from.
		const row = Math.round(cell.centre.y / HEX_ROW_STEP);
		const found = rows.get(row);
		if (found) found.push(cell);
		else rows.set(row, [cell]);
	}

	const indices = [...rows.keys()].sort((a, b) => a - b);
	if (indices.length < 3) return cells;
	const ends = [indices[0], indices[indices.length - 1]];
	const middle = span(indices.slice(1, -1).flatMap((row) => rows.get(row) ?? []));

	for (const row of ends) {
		const cellsInRow = rows.get(row) ?? [];
		const off = middle - span(cellsInRow);
		// The whole number of cells that leaves the row nearest the middle — and, on a tie,
		// none of them. A row already half a cell out is as close as it can get, and moving
		// it would only swap the side it hangs off.
		const shift = Math.sign(off) * Math.ceil(Math.abs(off) - 0.5);
		if (!shift) continue;
		for (const cell of cellsInRow) cell.centre.x += shift;
	}
	return cells;
}

/** The middle of what a set of cells spans across, in cell widths. */
function span(cells: WallCell[]): number {
	const xs = cells.map((cell) => cell.centre.x);
	return (Math.min(...xs) + Math.max(...xs)) / 2;
}

/**
 * How many characters are loaded at once. A manifest is a few hundred KB and a cycle is
 * a dozen textures, so the whole roster at once is a stampede that finishes no sooner
 * and shows nothing until it does; a handful at a time fills the wall from the middle.
 */
const LOAD_CONCURRENCY = 4;

export class MugenPosterGrid {
	private readonly characters: PosterCharacter[];
	private readonly maxCellWidth: number;
	private readonly backgroundColor: number;
	private readonly cellColor: number;
	private readonly cellLineColor: number;
	private readonly centerCellColor: number;
	private readonly halvingLineColor: number;
	private readonly onStatus?: (status: PosterGridStatus) => void;

	private app: Application | null = null;
	private host: HTMLElement | null = null;
	private backdrop: Graphics | null = null;
	private stage: Container | null = null;
	private observer: ResizeObserver | null = null;

	// The posters, kept in roster order rather than in the order they finished loading
	// (several load at once, and the small ones win) — so the wall reads the same way
	// twice running. A character that could not be loaded never joins, and the spiral
	// closes up over it.
	private posters: Poster[] = [];
	private missing: string[] = [];
	private loading = true;

	// Set the moment teardown starts, so a load already in flight drops what it has
	// instead of building onto a destroyed app.
	private destroyed = false;

	constructor(options: MugenPosterGridOptions) {
		this.characters = options.characters;
		this.maxCellWidth = options.maxCellWidth ?? DEFAULTS.maxCellWidth;
		this.backgroundColor = options.backgroundColor ?? DEFAULTS.backgroundColor;
		this.cellColor = options.cellColor ?? DEFAULTS.cellColor;
		this.cellLineColor = options.cellLineColor ?? DEFAULTS.cellLineColor;
		this.centerCellColor = options.centerCellColor ?? DEFAULTS.centerCellColor;
		this.halvingLineColor = options.halvingLineColor ?? DEFAULTS.halvingLineColor;
		this.onStatus = options.onStatus;
	}

	/** Boot Pixi inside `container` and start loading the roster into it. */
	async start(container: HTMLElement): Promise<void> {
		const app = new Application();
		await app.init({
			width: Math.max(1, container.clientWidth),
			// One cell's worth, until `layout` sizes it to the field it actually needs.
			height: Math.ceil((HEADROOM + HEX_HEIGHT) * this.maxCellWidth),
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

		// The field goes in first and stays behind every character.
		this.backdrop = new Graphics();
		this.stage = new Container();
		// The rows overlap — a character rises into the row above it — so who is in front
		// is decided by whose feet are lower on the screen, as it is on the board. The
		// posters do not arrive in that order (they arrive as they load), so the stage
		// sorts rather than relying on the order they were added in.
		this.stage.sortableChildren = true;
		app.stage.addChild(this.backdrop, this.stage);

		// The wall reflows with the window: the field keeps its shape and the cell takes
		// the difference, so this re-draws and re-sizes but never re-loads.
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
		const queue = this.characters.map((character, order) => ({
			character,
			order
		}));
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
	 * What is read here is what the *character* says about itself — its render scale, and
	 * where its crown sits relative to its axis. Both are facts about its artwork, so both
	 * are read once; what is done with them belongs to the layout, because that is where
	 * the cell they are measured against is decided. A character whose definition cannot
	 * be read gets the defaults those two readers give, which is what the board does too.
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

		const crownOffset = readCrownAlign(definition)
			? crownCorrection(
					frames.map((frame) => ({
						source: frame.texture.source.resource,
						width: frame.width,
						height: frame.height,
						anchorX: frame.anchorX
					})),
					// At scale 1: the correction is in the artwork's own pixels until the
					// layout says how big those are being drawn.
					1,
					// Mirrored, the way a character faces on a card and in a team line-up.
					true
				)
			: 0;

		const sprite = new Sprite();
		this.stage.addChild(sprite);
		const poster: Poster = {
			order,
			sprite,
			frames,
			frameIndex: 0,
			frameElapsed: 0,
			renderScale: readRenderScale(definition),
			crownOffset
		};
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
	 * Draw the field and stand everyone on it, at whatever size the page allows.
	 *
	 * The spiral decides the shape, so the width is what the field asks for and the cell
	 * is what gives: as big as the cap allows, and smaller whenever that many cells across
	 * would not fit. Everything then follows from that one number — the hexagons, the box
	 * each character is fitted into, and so every character's size.
	 *
	 * Each character stands on its cell's foot line — that shared line is what makes two
	 * characters' heights comparable at all — with its body axis on the cell's middle,
	 * moved by its crown shift. Whose feet are lower decides who is in front, since the
	 * rows overlap.
	 */
	private layout(): void {
		const app = this.app;
		const host = this.host;
		const backdrop = this.backdrop;
		if (!app || !host || !backdrop || this.destroyed) return;

		const cells = spiralCells(this.posters.length);
		const field = fieldExtent(cells);
		// As big as allowed, and no bigger than the page has room for.
		const width = Math.max(1, host.clientWidth);
		const cellWidth = Math.min(this.maxCellWidth, width / field.width);
		const box = { width: cellWidth, height: cellWidth * CHAR_HEIGHT_RATIO };

		const height = Math.ceil((HEADROOM + field.height) * cellWidth);
		if (app.renderer.width !== width || app.renderer.height !== height) {
			app.renderer.resize(width, height);
		}

		// The field is centred in whatever the cell size leaves over. Everything below is
		// in cell widths off the field's own top-left corner until this puts it on the
		// canvas.
		const originX = Math.max(0, (width - field.width * cellWidth) / 2);
		const onCanvas = (point: GridPoint): GridPoint => ({
			x: originX + (point.x - field.left) * cellWidth,
			y: (point.y - field.top + HEADROOM) * cellWidth
		});

		// The whole field is drawn — the kept middle in blue, everything else faint.
		backdrop.clear();
		for (const cell of cells) {
			const outline = latticeCorners(cell.centre).flatMap((corner) => {
				const point = onCanvas(corner);
				return [point.x, point.y];
			});
			backdrop
				.poly(outline)
				.fill(cell.kept ? this.centerCellColor : this.cellColor)
				.stroke({ width: 1, color: this.cellLineColor });
		}

		// The roster stands on the rest of it, in the order the spiral reached them.
		const stands = cells.filter((cell) => !cell.kept);
		this.posters.forEach((poster, index) => {
			const centre = stands[index].centre;
			// The fit is asked again per layout because the box it answers has just been
			// decided; it is the same question the board asks, of the same function.
			const fitScale = characterFitScale(poster.frames, box, poster.renderScale);
			const foot = onCanvas(latticeFoot(centre));
			// A negative x-scale mirrors the sprite about its anchor, in place.
			poster.sprite.scale.set(-fitScale, fitScale);
			poster.sprite.x = foot.x + poster.crownOffset * fitScale;
			poster.sprite.y = foot.y;
			// Lower feet paint later, so a character stands in front of the row behind it.
			poster.sprite.zIndex = foot.y;
		});

		// The line that halves the field, drawn over the ground and under the characters:
		// it is a mark on the board, not a thing standing on it. Nothing to halve until
		// somebody has landed on the wall.
		if (this.posters.length > 0) {
			const middleX = originX + (field.width / 2) * cellWidth;
			backdrop
				.moveTo(middleX, 0)
				.lineTo(middleX, height)
				.stroke({ width: 2, color: this.halvingLineColor });
		}
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

/** The rectangle a field of hexagons occupies, in cell widths: its top-left corner and
 * its size. A hexagon reaches half a cell either side of its centre and half its own
 * height above and below it, so the extent is the centres' spread plus that. An empty
 * field is one cell's worth, so a wall with nothing on it yet is still a canvas. */
function fieldExtent(cells: WallCell[]): {
	left: number;
	top: number;
	width: number;
	height: number;
} {
	if (cells.length === 0) return { left: -0.5, top: -HEX_HEIGHT / 2, width: 1, height: HEX_HEIGHT };
	const xs = cells.map((cell) => cell.centre.x);
	const ys = cells.map((cell) => cell.centre.y);
	const left = Math.min(...xs) - 0.5;
	const top = Math.min(...ys) - HEX_HEIGHT / 2;
	return {
		left,
		top,
		width: Math.max(...xs) + 0.5 - left,
		height: Math.max(...ys) + HEX_HEIGHT / 2 - top
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
