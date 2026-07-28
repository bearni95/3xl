import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { destroyPixiApp } from '../pixi/release-context';
import type { Manifest } from './mugen-player';

export type { Manifest } from './mugen-player';

/** DOM elements the sheet renders into (see MugenFrameSheet.svelte). */
export interface MugenFrameSheetMount {
	/** Scrollable viewport; supplies the canvas size and scroll offset. */
	scrollEl: HTMLElement;
	/** Empty child of scrollEl, stretched to the full content size for scrolling. */
	spacer: HTMLElement;
	/** Overlay element the Pixi canvas is appended to. */
	host: HTMLElement;
}

export interface MugenFrameSheetOptions {
	/** Folder (relative to the static root) holding manifest.json + frame PNGs. */
	basePath: string;
	/**
	 * Animation names to render, in order. Missing ones are skipped. When
	 * omitted, every animation the manifest defines is rendered in manifest order.
	 */
	animations?: string[];
	/** Integer-ish factor the pixel art is scaled up by. */
	scale?: number;
	/** Canvas background colour. */
	backgroundColor?: number;
}

const DEFAULTS = {
	scale: 1.75,
	backgroundColor: 0x1d232a
};

// Layout constants (world pixels).
const PAD = 20;
const ROW_GAP = 26;
const LABEL_HEIGHT = 26;
const CAPTION_HEIGHT = 18;
const BOX_PAD = 14;
const GROUND_MARGIN = 10;
const CELL_GAP = 10;
// Extra gap separating the live loop from the static filmstrip beside it.
const SECTION_GAP = 28;

const COLORS = {
	label: 0xe2e8f0,
	caption: 0x8593a5,
	captionActive: 0x93c5fd,
	box: 0x3a4453,
	boxActive: 0x60a5fa,
	boxFill: 0x161b22,
	ground: 0x3a4453
};

/** A frame with its loaded texture and pre-computed anchor fractions. */
interface LoadedFrame {
	texture: Texture;
	anchorX: number;
	anchorY: number;
	duration: number;
}

/** The live-looping sprite for one animation row. */
interface PlayingAnimation {
	frames: LoadedFrame[];
	sprite: Sprite;
	index: number;
	elapsed: number;
}

/** Geometry for one animation row, measured before textures are loaded. */
interface RowLayout {
	name: string;
	frameNames: string[];
	frameCount: number;
	cycleMs: number;
	rowTop: number;
	boxW: number;
	boxH: number;
}

/**
 * Renders each of a MUGEN character's animations as its own row: a live-looping
 * panel on the left, followed by the static frames that make up that loop as a
 * filmstrip beside it. With full movesets running to 100+ animations, the whole
 * sheet is far taller than a canvas may be, so it draws through a camera — one
 * viewport-sized PixiJS canvas (a single WebGL context) whose stage is panned to
 * match the surrounding scroll container.
 *
 * All rendering/playback state lives here so the Svelte component stays UI-only.
 */
export class MugenFrameSheet {
	private readonly basePath: string;
	/** Explicit animation order, or null to render every manifest animation. */
	private readonly animations: string[] | null;
	private readonly scale: number;
	private readonly backgroundColor: number;

	private app: Application | null = null;
	private mount: MugenFrameSheetMount | null = null;
	private playing: PlayingAnimation[] = [];
	private textures = new Map<string, Texture>();

	constructor(options: MugenFrameSheetOptions) {
		this.basePath = options.basePath;
		this.animations = options.animations ?? null;
		this.scale = options.scale ?? DEFAULTS.scale;
		this.backgroundColor = options.backgroundColor ?? DEFAULTS.backgroundColor;
	}

	/** Load the manifest, size the scroll area, boot Pixi and start every loop. */
	async render(mount: MugenFrameSheetMount): Promise<Manifest> {
		this.mount = mount;
		const manifest = await this.loadManifest();
		const { layout, contentWidth, contentHeight } = this.measure(manifest);

		// Size the spacer so the scroll container exposes the full sheet.
		mount.spacer.style.width = `${contentWidth}px`;
		mount.spacer.style.height = `${contentHeight}px`;

		// The canvas only ever covers the visible viewport; the camera pans it.
		const viewW = Math.max(1, mount.scrollEl.clientWidth);
		const viewH = Math.max(1, mount.scrollEl.clientHeight);

		const app = new Application();
		await app.init({
			width: viewW,
			height: viewH,
			backgroundColor: this.backgroundColor,
			antialias: false,
			roundPixels: true
		});
		this.app = app;
		mount.host.appendChild(app.canvas);

		await this.loadTextures(manifest, layout);
		for (const row of layout) {
			this.buildRow(row, manifest);
		}

		mount.scrollEl.addEventListener('scroll', this.onScroll, { passive: true });
		this.resizeObserver.observe(mount.scrollEl);
		app.ticker.add(this.tick);
		return manifest;
	}

	/** Tear everything down. Safe to call more than once. */
	destroy(): void {
		this.resizeObserver.disconnect();
		if (this.mount) {
			this.mount.scrollEl.removeEventListener('scroll', this.onScroll);
			this.mount = null;
		}
		if (this.app) {
			destroyPixiApp(this.app);
			this.app = null;
		}
		this.playing = [];
		this.textures.clear();
	}

	private async loadManifest(): Promise<Manifest> {
		const response = await fetch(`${this.basePath}/manifest.json`);
		if (!response.ok) {
			throw new Error(`Failed to load manifest: ${response.status}`);
		}
		return response.json();
	}

	/** Compute each row's geometry plus the total content width and height. */
	private measure(manifest: Manifest): {
		layout: RowLayout[];
		contentWidth: number;
		contentHeight: number;
	} {
		const scale = this.scale;
		// Explicit order when given, otherwise every animation the manifest defines.
		const names = this.animations ?? Object.keys(manifest.animations);
		const layout: RowLayout[] = [];

		let rowTop = PAD;
		let maxRowWidth = 0;

		for (const name of names) {
			const animation = manifest.animations[name];
			if (!animation || animation.frames.length === 0) continue;

			const frames = animation.frames;
			// Uniform boxes: sized to the animation's largest frame so the live
			// panel and every filmstrip cell line up.
			const boxW = Math.round(Math.max(...frames.map((f) => f.width)) * scale) + BOX_PAD * 2;
			const boxH = Math.round(Math.max(...frames.map((f) => f.height)) * scale) + BOX_PAD * 2;

			layout.push({
				name,
				frameNames: frames.map((f) => f.file),
				frameCount: frames.length,
				cycleMs: frames.reduce((sum, f) => sum + f.duration, 0),
				rowTop,
				boxW,
				boxH
			});

			// Live box + section gap + one cell per frame.
			const rowWidth =
				PAD + boxW + SECTION_GAP + frames.length * (boxW + CELL_GAP) - CELL_GAP + PAD;
			maxRowWidth = Math.max(maxRowWidth, rowWidth);
			rowTop += LABEL_HEIGHT + boxH + CAPTION_HEIGHT + ROW_GAP;
		}

		return {
			layout,
			contentWidth: Math.max(maxRowWidth, PAD * 2),
			contentHeight: Math.max(rowTop - ROW_GAP + PAD, PAD * 2)
		};
	}

	/** Preload every referenced sprite once, in parallel, keyed by filename. */
	private async loadTextures(manifest: Manifest, layout: RowLayout[]): Promise<void> {
		const files = new Set<string>();
		for (const row of layout) {
			for (const file of row.frameNames) files.add(file);
		}

		await Promise.all(
			[...files].map(async (file) => {
				const texture = await Assets.load<Texture>(`${this.basePath}/${file}`);
				texture.source.scaleMode = 'nearest'; // keep the pixel art crisp
				this.textures.set(file, texture);
			})
		);
		void manifest;
	}

	private buildRow(row: RowLayout, manifest: Manifest): void {
		if (!this.app) return;
		const contentTop = row.rowTop + LABEL_HEIGHT;
		const manifestFrames = manifest.animations[row.name].frames;

		// Row header: "WALK · 16 frames · 2100ms loop".
		const header = new Text({
			text: `${row.name.toUpperCase()}  ·  ${row.frameCount} frames  ·  ${row.cycleMs}ms loop`,
			style: { fontFamily: 'monospace', fontSize: 14, fill: COLORS.label, fontWeight: 'bold' }
		});
		header.x = PAD;
		header.y = row.rowTop + 4;
		this.app.stage.addChild(header);

		const frames: LoadedFrame[] = manifestFrames.map((frame) => ({
			texture: this.textures.get(frame.file) ?? Texture.EMPTY,
			anchorX: frame.anchorX / frame.width,
			anchorY: frame.anchorY / frame.height,
			duration: frame.duration
		}));

		// Live-looping panel on the left (accent border).
		const liveSprite = this.addCell(PAD, contentTop, row, true, 'live');
		const anim: PlayingAnimation = { frames, sprite: liveSprite, index: 0, elapsed: 0 };
		this.applyFrame(anim);
		this.playing.push(anim);

		// Static filmstrip: one frozen frame per cell, beside the live panel.
		const stripX = PAD + row.boxW + SECTION_GAP;
		for (let i = 0; i < frames.length; i++) {
			const cellX = stripX + i * (row.boxW + CELL_GAP);
			const sprite = this.addCell(cellX, contentTop, row, false, `#${i} · ${frames[i].duration}ms`);
			sprite.texture = frames[i].texture;
			sprite.anchor.set(frames[i].anchorX, frames[i].anchorY);
		}
	}

	/**
	 * Draw one uniform box (border, fill, ground line, caption) at (x, y) and
	 * return an empty sprite positioned with its feet on the ground line, ready
	 * for a texture. `active` styles it as the live panel.
	 */
	private addCell(x: number, y: number, row: RowLayout, active: boolean, caption: string): Sprite {
		const stage = this.app!.stage;
		const groundY = row.boxH - GROUND_MARGIN;

		const box = new Container();
		box.x = x;
		box.y = y;
		box.addChild(
			new Graphics()
				.rect(0, 0, row.boxW, row.boxH)
				.fill({ color: COLORS.boxFill, alpha: 0.6 })
				.stroke({ width: active ? 2 : 1, color: active ? COLORS.boxActive : COLORS.box, alpha: 0.9 })
				.moveTo(BOX_PAD, groundY)
				.lineTo(row.boxW - BOX_PAD, groundY)
				.stroke({ width: 1, color: COLORS.ground, alpha: 0.8 })
		);

		const label = new Text({
			text: caption,
			style: {
				fontFamily: 'monospace',
				fontSize: 11,
				fill: active ? COLORS.captionActive : COLORS.caption
			}
		});
		label.x = 0;
		label.y = row.boxH + 3;
		box.addChild(label);

		const sprite = new Sprite();
		sprite.scale.set(this.scale);
		sprite.x = row.boxW / 2;
		sprite.y = groundY;
		box.addChild(sprite);

		stage.addChild(box);
		return sprite;
	}

	/** Push an animation's current frame texture and anchor onto its sprite. */
	private applyFrame(anim: PlayingAnimation): void {
		const frame = anim.frames[anim.index % anim.frames.length];
		anim.sprite.texture = frame.texture;
		anim.sprite.anchor.set(frame.anchorX, frame.anchorY);
	}

	/** Pan the Pixi stage to match the scroll container (the camera). */
	private onScroll = (): void => {
		if (!this.app || !this.mount) return;
		this.app.stage.x = -Math.round(this.mount.scrollEl.scrollLeft);
		this.app.stage.y = -Math.round(this.mount.scrollEl.scrollTop);
	};

	private resizeObserver = new ResizeObserver(() => {
		if (!this.app || !this.mount) return;
		this.app.renderer.resize(
			Math.max(1, this.mount.scrollEl.clientWidth),
			Math.max(1, this.mount.scrollEl.clientHeight)
		);
	});

	private tick = (): void => {
		if (!this.app) return;
		const deltaMs = this.app.ticker.deltaMS;

		for (const anim of this.playing) {
			if (anim.frames.length < 2) continue;
			anim.elapsed += deltaMs;
			let guard = anim.frames.length;
			while (anim.elapsed >= anim.frames[anim.index].duration && guard-- > 0) {
				anim.elapsed -= anim.frames[anim.index].duration;
				anim.index = (anim.index + 1) % anim.frames.length;
			}
			this.applyFrame(anim);
		}
	};
}
