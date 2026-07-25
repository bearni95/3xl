import { Application, Assets, Graphics, Sprite, Texture } from 'pixi.js';
import type { Manifest } from './mugen-player';

/** One loaded idle frame with its pre-computed anchor fractions and source size. */
interface LoadedFrame {
	texture: Texture;
	anchorX: number;
	anchorY: number;
	duration: number;
	width: number;
	height: number;
}

/** A single lineup member: its loaded idle animation and playback cursor. */
interface Member {
	sprite: Sprite;
	frames: LoadedFrame[];
	frameIndex: number;
	frameElapsed: number;
	/** Centre x of this member's cell, in canvas pixels. */
	centerX: number;
}

/**
 * Target character height as a multiple of the cell width — mirrors the board's
 * CHAR_HEIGHT_RATIO so a lineup sprite reads at the same size the board renders it.
 */
const CHAR_HEIGHT_RATIO = 1.3;

export interface MugenLineupOptions {
	/** Frame folders per slot (relative to the static root); null = empty slot. */
	basePaths?: (string | null)[];
	/** Pixel width each slot gets on the canvas. */
	cellWidth?: number;
	/** Pixel height of the canvas (every slot shares one baseline). */
	cellHeight?: number;
	/** Horizontal gap between slots. */
	gap?: number;
	/**
	 * Per-slot backdrop colour (24-bit RGB hex), aligned with `basePaths`; null
	 * paints no backdrop for that slot. Typically each character's spawn colour.
	 */
	cellColors?: (number | null)[];
	backgroundColor?: number;
	/** Canvas background alpha; 0 lets the DOM backdrop show through. */
	backgroundAlpha?: number;
}

const DEFAULTS: Required<MugenLineupOptions> = {
	basePaths: [],
	cellWidth: 96,
	cellHeight: 128,
	gap: 8,
	cellColors: [],
	backgroundColor: 0x000000,
	backgroundAlpha: 0
};

/**
 * Renders several MUGEN characters' idle animations side by side on a *single*
 * PixiJS canvas. Each character is height-normalised the way the board sizes its
 * actors (so they all read at the same on-screen height), mirrored horizontally,
 * and stood on a common baseline over an optional per-slot colour backdrop.
 * Unlike {@link MugenPlayer} there is no ground line, no input and no movement —
 * it is a passive lineup, e.g. a team preview.
 *
 * All rendering state lives here so the Svelte component stays UI-only.
 */
export class MugenLineup {
	private readonly options: Required<MugenLineupOptions>;
	private app: Application | null = null;
	private members: Member[] = [];

	constructor(options: MugenLineupOptions = {}) {
		this.options = { ...DEFAULTS, ...options };
	}

	/** Boot Pixi inside `container`, load each slot's idle frames and start. */
	async start(container: HTMLElement): Promise<void> {
		const { basePaths, cellWidth, cellHeight, gap } = this.options;
		const count = basePaths.length;
		const width = count * cellWidth + Math.max(0, count - 1) * gap;

		const app = new Application();
		await app.init({
			width: Math.max(width, cellWidth),
			height: cellHeight,
			backgroundColor: this.options.backgroundColor,
			backgroundAlpha: this.options.backgroundAlpha,
			antialias: false,
			roundPixels: true
		});
		this.app = app;
		container.appendChild(app.canvas);

		// Paint each slot's spawn-colour backdrop first, so the sprites sit on top.
		const { cellColors } = this.options;
		basePaths.forEach((_basePath, index) => {
			const color = cellColors[index];
			if (color == null) return;
			const cellX = index * (cellWidth + gap);
			const backdrop = new Graphics().rect(cellX, 0, cellWidth, cellHeight).fill(color);
			app.stage.addChild(backdrop);
		});

		// Load every slot's idle frames (empty slots stay null).
		const framesPerSlot = await Promise.all(
			basePaths.map((basePath) => (basePath ? this.loadIdle(basePath) : Promise.resolve(null)))
		);

		// Feet sit on a shared baseline just above the canvas bottom.
		const baselineY = cellHeight - 2;

		framesPerSlot.forEach((frames, index) => {
			if (!frames || frames.length === 0) return;
			const centerX = index * (cellWidth + gap) + cellWidth / 2;

			// Match the board: size each character by height so they all read at the
			// same on-screen height (idle frame 0 → CHAR_HEIGHT_RATIO of the cell
			// width), then cap by width so the widest frame's axis-to-edge extent
			// stays within half the cell. Scaling is per-character, never shared.
			const heightScale = (cellWidth * CHAR_HEIGHT_RATIO) / frames[0].height;
			const maxHalfExtent = Math.max(
				...frames.map((frame) => Math.max(frame.anchorX, 1 - frame.anchorX) * frame.width)
			);
			const widthScale = cellWidth / 2 / maxHalfExtent;
			const fitScale = Math.min(heightScale, widthScale);

			const sprite = new Sprite();
			// Negative x-scale mirrors the sprite horizontally around its body axis.
			sprite.scale.set(-fitScale, fitScale);
			sprite.x = centerX;
			sprite.y = baselineY;
			app.stage.addChild(sprite);
			const member: Member = { sprite, frames, frameIndex: 0, frameElapsed: 0, centerX };
			this.applyFrame(member);
			this.members.push(member);
		});

		app.ticker.add(this.tick);
	}

	/** Tear everything down. Safe to call more than once. */
	destroy(): void {
		if (this.app) {
			this.app.destroy(true, { children: true });
			this.app = null;
		}
		this.members = [];
	}

	private async loadIdle(basePath: string): Promise<LoadedFrame[]> {
		const response = await fetch(`${basePath}/manifest.json`);
		if (!response.ok) throw new Error(`Failed to load manifest: ${response.status}`);
		const manifest: Manifest = await response.json();
		const animation = manifest.animations.idle;
		if (!animation) return [];

		const frames: LoadedFrame[] = [];
		for (const frame of animation.frames) {
			const texture = await Assets.load<Texture>(`${basePath}/${frame.file}`);
			texture.source.scaleMode = 'nearest';
			frames.push({
				texture,
				anchorX: frame.anchorX / frame.width,
				anchorY: frame.anchorY / frame.height,
				duration: frame.duration,
				width: frame.width,
				height: frame.height
			});
		}
		return frames;
	}

	/** Push a member's current frame (texture + anchor) to its sprite. */
	private applyFrame(member: Member): void {
		const frame = member.frames[member.frameIndex % member.frames.length];
		member.sprite.texture = frame.texture;
		// Horizontal by the body axis, vertical pinned to the frame bottom (the
		// baseline) — same convention the board uses so feet line up across the row.
		member.sprite.anchor.set(frame.anchorX, 1);
	}

	private tick = (): void => {
		if (!this.app) return;
		const deltaMs = this.app.ticker.deltaMS;
		for (const member of this.members) {
			if (member.frames.length < 2) continue;
			member.frameElapsed += deltaMs;
			let guard = member.frames.length;
			while (member.frameElapsed >= member.frames[member.frameIndex].duration && guard-- > 0) {
				member.frameElapsed -= member.frames[member.frameIndex].duration;
				member.frameIndex = (member.frameIndex + 1) % member.frames.length;
			}
			this.applyFrame(member);
		}
	};
}
