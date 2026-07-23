import { Application, Assets, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { Manifest } from '$utils/mugen/mugen-player';
import { findMove, type CharacterDefinition, type MoveKind } from '$types/character-definition.type';
import {
	cellSide,
	findClosestApproach,
	findMeleeMeeting,
	findPath,
	findRetreatCell,
	isBoardCell,
	type Hex
} from '$utils/mugen/hex';

/**
 * Combat poses the board can play on demand: the melee/ranged strikes (moves)
 * plus the hurt flinch, which every character defines as a movement animation.
 */
type CombatMoveKind = Extract<MoveKind, 'melee' | 'ranged'> | 'hurt';

/** A frame with its loaded texture and pre-computed anchor fractions. */
interface LoadedFrame {
	texture: Texture;
	width: number;
	height: number;
	anchorX: number;
	anchorY: number;
	duration: number;
}

/** A character to place on the board, in the centre of its grid. */
export interface BoardCharacter {
	/** Folder (relative to the static root) holding manifest.json + frame PNGs. */
	basePath: string;
	/** Animation to play in place. Defaults to `idle`. */
	animation?: string;
	/**
	 * Character definition id (matches `static/characters/<id>.json`). When set,
	 * its `directions` bindings drive the move-left/move-right animations used while
	 * combat walks the actor; without it both fall back to `run`.
	 */
	id?: string;
}

/** A character placed on a specific hex cell (axial coordinates). */
export interface PlacedCharacter extends BoardCharacter {
	/** Axial column (q) of the hex to stand on. Sign must match the grid's half. */
	q: number;
	/** Axial row (r) of the hex to stand on. */
	r: number;
}

/** One 3x3 grid: its border colour and the character standing in the middle. */
export interface BoardGrid {
	/** Grid line / fill colour, e.g. 0xff0000 for red. */
	color: number;
	/** Character rendered in the centre cell of this half. */
	character: BoardCharacter;
	/**
	 * Extra characters standing idle on this half of the board, each pinned to its
	 * own hex cell. They loop their animation in place until combat walks them.
	 */
	extras?: PlacedCharacter[];
}

export interface MugenBoardOptions {
	grids: [BoardGrid, BoardGrid];
	/** Near-edge (closest to viewer) size of a single grid cell, in pixels. */
	cellSize?: number;
	/** Screen distance from the near (bottom) edge to the far (top) edge. */
	depth?: number;
	/**
	 * Far-edge width as a fraction of the near-edge width (0..1). Lower values
	 * tilt the grids harder toward the shared vanishing point. 1 = flat.
	 */
	farRatio?: number;
	/** Outer padding around the grids, in pixels. */
	padding?: number;
	/**
	 * Vertical shift (px) applied to the whole projected board. Positive moves it
	 * down. Used to re-centre after front rows are trimmed off the near edge.
	 */
	yOffset?: number;
	/** Colour of the central column (q = 0), the shared row between the halves. */
	centerColor?: number;
	backgroundColor?: number;
}

const DEFAULTS = {
	cellSize: 120,
	depth: 760,
	farRatio: 0.97,
	padding: 40,
	yOffset: 110,
	centerColor: 0x9333ea, // purple
	backgroundColor: 0x1d232a
};

/** Grid extents used to size the projection footprint (unchanged canvas size). */
const ROWS = 5;
const COLS = 10;

// --- Hex board layout (single hexagon-of-hexagons) --------------------------
// The board is one hexagon of radius HEX_RADIUS cells, addressed in axial
// coordinates (q across the width, r into the depth). The hexes are flat-top
// (points left/right, flat edges top/bottom), so columns of constant q are
// vertical. Its raw (size-1) bounding box is symmetric about the origin and
// fitted independently on each axis into the projection box (col 0..COLS,
// row 0..ROWS) so it fills the whole footprint; every hex corner is then
// projected through the same one-point perspective the square grid used. Cells
// left of centre are the first grid's colour, cells to the right the second's.
const HEX_RADIUS = 3; // rings out from the centre hex (centre + 3 = 4 cells per spoke)
const SQRT3 = Math.sqrt(3);
const HEX_HALF_W = HEX_RADIUS * 1.5 + 1; // raw half-width (q extreme + corner point)
const HEX_HALF_H = SQRT3 * (HEX_RADIUS + 0.5); // raw half-height (r extreme + flat edge)
const HEX_SCALE_X = COLS / (2 * HEX_HALF_W); // raw x → grid columns
const HEX_SCALE_Y = ROWS / (2 * HEX_HALF_H); // raw y → grid rows
/** Corner offsets (in grid units) for a flat-top hex, relative to its centre. */
const HEX_CORNERS: { x: number; y: number }[] = Array.from({ length: 6 }, (_, k) => {
	const angle = (60 * k * Math.PI) / 180;
	return { x: Math.cos(angle) * HEX_SCALE_X, y: Math.sin(angle) * HEX_SCALE_Y };
});

/** Character height as a multiple of its (perspective-foreshortened) cell width. */
const CHAR_HEIGHT_RATIO = 1.3;
/** Horizontal speed (canvas px/s) a character runs between cells during combat. */
const MOVE_SPEED = 260;
/** Speed (canvas px/s) a fired projectile travels from shooter to target. */
const PROJECTILE_SPEED = 720;

interface Point {
	x: number;
	y: number;
}

/** A one-shot combat animation currently playing (a strike or a flinch). */
interface OneShot {
	/** Total duration (ms) of one full pass of the animation. */
	total: number;
	elapsed: number;
	/** Resolves when the animation finishes and the actor returns to idle. */
	resolve: () => void;
}

/** A projectile fired by a ranged attack, flying from a shooter to a target. */
interface Projectile {
	/** The flying sprite (an animated projectile frame, or a plain dot). */
	display: Sprite;
	/** Projectile animation frames, or null when the character binds none. */
	frames: LoadedFrame[] | null;
	frameIndex: number;
	frameElapsed: number;
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	/** Resolves once the projectile reaches its target and is removed. */
	resolve: () => void;
}

/** A character standing (and, during combat, running) on the board. */
interface Actor {
	/** Stable id (character id or basePath's first segment), used to command it. */
	id: string;
	sprite: Sprite;
	/** The guide line under the character; slides with it as it moves. */
	guide: Graphics;
	/** Where the guide line was drawn, so it can be re-offset while moving. */
	homeX: number;
	homeY: number;
	/** Axial cell the actor started on, so it can walk back after combat. */
	homeCell: number;
	homeRow: number;
	/** Every loaded animation for this actor, keyed by name (idle, run, …). */
	animations: Record<string, LoadedFrame[]>;
	/** Raw manifest anim keys bound to the combat moves we can play on demand. */
	moveAnims: Partial<Record<CombatMoveKind, string>>;
	/** Raw manifest anim key of the projectile a ranged attack fires, if any. */
	projectileAnims: Partial<Record<'ranged', string>>;
	currentName: string;
	frameIndex: number;
	frameElapsed: number;
	// Movement. Actors step hex to hex; `cell`/`rowFront` are the axial column (q)
	// and row (r) currently occupied. Movement is programmatic (combat) via `pathQueue`.
	/** Axial row (r) the actor currently occupies. */
	rowFront: number;
	/** Axial column (q) the actor currently occupies. */
	cell: number;
	/** Raw manifest animation played while running right / left (from the JSON). */
	moveRightAnim: string;
	moveLeftAnim: string;
	/** Remaining cells to step through (programmatic movement). */
	pathQueue: Hex[];
	/** Called once the path queue empties. */
	onArrive: (() => void) | null;
	/** While set, a one-shot animation owns playback (movement/idle suspended). */
	oneShot: OneShot | null;
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	moving: boolean;
	/** Direction of the in-progress step: -1 left, +1 right, 0 when stationary. */
	stepDir: number;
}

/**
 * Renders a single pointy-top hex board (one hexagon of radius HEX_RADIUS cells)
 * on a PixiJS canvas, tilted in one-point perspective toward a vanishing point
 * above its centre. Cells left of centre take the first grid colour, cells to the
 * right the second. Two MUGEN characters loop (idle by default) standing upright
 * — one on each half — while only the board tilts, not the characters.
 *
 * Frame decoding happens at build time (scripts/generate-sprites.js); this
 * class only projects the grids and plays the loaded frames. All rendering
 * state lives here so the Svelte component stays UI-only.
 */
export class MugenBoard {
	private readonly options: Required<MugenBoardOptions>;
	private app: Application | null = null;
	private actors: Actor[] = [];
	/** In-flight ranged projectiles, advanced each tick until they land. */
	private projectiles: Projectile[] = [];

	/** Canvas size, cached so {@link project} can map grid coords to screen space. */
	private canvasWidth = 0;
	private canvasHeight = 0;

	constructor(options: MugenBoardOptions) {
		this.options = { ...DEFAULTS, ...options };
	}

	/** Total canvas size — width sized to the grid, height a tall-ish fraction of it
	 * so the hexes get real vertical room (they were squashed at 2:1). */
	get dimensions(): { width: number; height: number } {
		const { cellSize, padding } = this.options;
		const width = padding * 2 + cellSize * COLS;
		return { width, height: Math.round(width * 0.72) };
	}

	/** Boot Pixi inside `container`, draw the grids and start the game loop. */
	async start(container: HTMLElement): Promise<void> {
		const { width, height } = this.dimensions;
		const app = new Application();
		await app.init({
			width,
			height,
			backgroundColor: this.options.backgroundColor,
			antialias: false,
			roundPixels: true
		});
		this.app = app;
		// Sort stage children by zIndex so characters nearer the viewer (lower rows,
		// larger screen-y) paint over those set further back into the board's depth.
		app.stage.sortableChildren = true;
		// Render as a block so the canvas doesn't reserve inline-baseline descender
		// space below it, and let it scale down responsively while keeping its
		// aspect ratio rather than forcing its full pixel size.
		app.canvas.style.display = 'block';
		app.canvas.style.maxWidth = '100%';
		app.canvas.style.height = 'auto';
		container.appendChild(app.canvas);

		this.canvasWidth = width;
		this.canvasHeight = height;

		// One hexagonal board: cells left of centre red, right blue, centre purple.
		this.drawBoard(
			this.options.grids[0].color,
			this.options.grids[1].color,
			this.options.centerColor
		);

		// The centre character of each grid stands left/right of centre: the red one
		// left (unflipped), the blue one (flipped) to the right. Combat can walk any
		// actor into the central purple column.
		await this.addActor(this.options.grids[0].character, -2, 2, false, this.options.grids[0].color);
		await this.addActor(this.options.grids[1].character, 2, 0, true, this.options.grids[1].color);

		// Extra characters stand idle on their assigned hexes — left half faces
		// right (unflipped), right half faces left (flipped) like the centre pair.
		for (const extra of this.options.grids[0].extras ?? []) {
			await this.addActor(extra, extra.q, extra.r, false, this.options.grids[0].color);
		}
		for (const extra of this.options.grids[1].extras ?? []) {
			await this.addActor(extra, extra.q, extra.r, true, this.options.grids[1].color);
		}

		// Crop the view to what's actually drawn: the hex grid (the widest element)
		// ends up flush with the canvas edges — so it fills the width when the canvas
		// is scaled to its container — and the height becomes the grid's height plus
		// the room the front-row characters need below it. The projection keeps using
		// the original design size (canvasWidth/Height), so combat movement still lands
		// on the right cells; we only translate the stage and resize the framebuffer.
		this.fitToContent();

		app.ticker.add(this.tick);
	}

	/**
	 * Shrink the canvas to the bounding box of everything drawn (grid + characters
	 * + guides), so the hex grid sits flush against the left/right edges and the
	 * canvas is exactly tall enough for the grid plus the front-row characters that
	 * stand below its near edge. The stage is offset so the content stays in view;
	 * the projection's design size is left untouched so hex positions don't shift.
	 */
	private fitToContent(): void {
		if (!this.app) return;
		const bounds = this.app.stage.getBounds();
		// A little breathing room so nothing sits hard against the edge (and to absorb
		// the small per-frame bounds wobble as animations play).
		const margin = 8;
		const left = Math.floor(bounds.minX - margin);
		const top = Math.floor(bounds.minY - margin);
		const width = Math.ceil(bounds.maxX + margin) - left;
		const height = Math.ceil(bounds.maxY + margin) - top;
		this.app.stage.position.set(-left, -top);
		this.app.renderer.resize(width, height);
	}

	/** Tear everything down. Safe to call more than once. */
	destroy(): void {
		if (this.app) {
			this.app.destroy(true, { children: true });
			this.app = null;
		}
		this.actors = [];
		this.projectiles = [];
	}

	/**
	 * Project a point given in grid coordinates (column 0..COLS across the width,
	 * row 0..ROWS into the depth) to screen space. The near edge (row 0) spans the
	 * full width at the bottom; the far edge (row ROWS) is narrower and centred, so
	 * all depth lines converge on one vanishing point above the horizontal centre.
	 * Fractional columns and rows are supported, so hex corners project correctly.
	 */
	private project(col: number, row: number): Point {
		const { depth, farRatio, padding, yOffset } = this.options;
		const cx = this.canvasWidth / 2;
		const nearHalf = (this.canvasWidth - padding * 2) / 2;
		const farHalf = nearHalf * farRatio;
		// Centre the (short) grid vertically within the canvas.
		const nearY = (this.canvasHeight + depth) / 2;
		const farY = (this.canvasHeight - depth) / 2;

		// Perspective-correct depth parameter: rows bunch up toward the far edge.
		// t=0 at the near edge, t=1 at the far edge.
		const t = row / (ROWS * farRatio + row * (1 - farRatio));
		const halfWidth = nearHalf + t * (farHalf - nearHalf);
		const y = nearY + t * (farY - nearY);
		const frac = col / COLS; // 0 = left edge, 1 = right edge
		return { x: cx - halfWidth + frac * halfWidth * 2, y: y + yOffset };
	}

	/**
	 * Grid coordinates (column/row, pre-projection) of the centre of the hex at
	 * axial [q, r]. The origin hex sits at the centre of the board; the field is
	 * scaled independently on each axis so the hexagon fills the whole footprint.
	 */
	private hexCoord(q: number, r: number): Point {
		const rawX = 1.5 * q;
		const rawY = SQRT3 * (r + q / 2);
		return { x: COLS / 2 + rawX * HEX_SCALE_X, y: ROWS / 2 + rawY * HEX_SCALE_Y };
	}

	/** Screen-space centre of the hex at axial [q, r]. */
	private hexMark(q: number, r: number): Point {
		const centre = this.hexCoord(q, r);
		return this.project(centre.x, centre.y);
	}

	/**
	 * Draw the hexagonal board (radius HEX_RADIUS). Cells left of the vertical
	 * centre line take `leftColor`, cells to the right `rightColor`, and the
	 * central column (q = 0) — the shared row both creatures can enter — is painted
	 * `centerColor`.
	 */
	private drawBoard(leftColor: number, rightColor: number, centerColor: number): void {
		if (!this.app) return;
		const graphics = new Graphics();
		const R = HEX_RADIUS;
		// Cell membership (hexagon shape, trimmed columns and front edge) lives in
		// the shared hex utility so pathfinding and rendering can't disagree.
		for (let q = -R; q <= R; q++) {
			for (let r = -R; r <= R; r++) {
				if (!isBoardCell(q, r)) continue;
				// Flat-top columns are vertical, so q alone decides the side; the
				// central column (q = 0) is the shared purple row.
				const side = cellSide(q);
				const color =
					side === 'red' ? leftColor : side === 'blue' ? rightColor : centerColor;

				const centre = this.hexCoord(q, r);
				const pts: number[] = [];
				for (const corner of HEX_CORNERS) {
					const p = this.project(centre.x + corner.x, centre.y + corner.y);
					pts.push(p.x, p.y);
				}
				graphics.poly(pts);
				graphics.fill({ color, alpha: 0.08 });
				graphics.stroke({ width: 2, color, alpha: 0.9 });

				// Label the cell with its axial coordinates so it's easy to refer to.
				const mid = this.project(centre.x, centre.y);
				const label = new Text({
					text: `${q},${r}`,
					style: { fontFamily: 'monospace', fontSize: 14, fill: 0xffffff, align: 'center' }
				});
				label.anchor.set(0.5);
				label.position.set(mid.x, mid.y);
				label.alpha = 0.75;
				// Behind the characters (zIndex ~ feet-y) but above the grid graphics.
				label.zIndex = 1;
				this.app.stage.addChild(label);
			}
		}
		this.app.stage.addChild(graphics);
	}

	/**
	 * Load a character and stand it in the centre of the hex at axial [q, r]. A
	 * line is drawn across the hex's width; the character's feet sit on it. Every
	 * actor loads its directional walk animations so combat can drive it hex to hex.
	 */
	private async addActor(
		character: BoardCharacter,
		q: number,
		r: number,
		flip: boolean,
		color: number
	): Promise<void> {
		if (!this.app) return;
		const startName = character.animation ?? 'idle';
		const id = character.id ?? character.basePath.split('/').filter(Boolean)[0] ?? character.basePath;

		// Every actor can be walked cell to cell by combat, so all of them load the
		// directional animations bound in the character's JSON definition
		// (move-left/move-right) plus the melee/hurt combat poses. Without a
		// definition the directional anims fall back to run.
		let moveRightAnim = 'run';
		let moveLeftAnim = 'run';
		const moveAnims: Partial<Record<CombatMoveKind, string>> = {};
		const projectileAnims: Partial<Record<'ranged', string>> = {};
		const definition = await this.loadDefinition(id);
		if (definition) {
			moveRightAnim = definition.directions['move-right']?.source || moveRightAnim;
			moveLeftAnim = definition.directions['move-left']?.source || moveLeftAnim;
			for (const kind of ['melee', 'ranged'] as const) {
				const source = findMove(definition, kind)?.source;
				if (source) moveAnims[kind] = source;
			}
			// The hurt flinch is a movement animation every character defines, not a
			// move — pull it from the animations record.
			const hurtSource = definition.animations.hurt?.source;
			if (hurtSource) moveAnims.hurt = hurtSource;
			// The sprite that flies when a ranged attack fires (separate from the
			// pose) — it lives inline on the ranged move itself.
			const projectileSource = findMove(definition, 'ranged')?.projectile?.source;
			if (projectileSource) projectileAnims.ranged = projectileSource;
		}
		const names = [
			...new Set([
				startName,
				moveRightAnim,
				moveLeftAnim,
				...Object.values(moveAnims),
				...Object.values(projectileAnims)
			])
		];
		const animations = await this.loadAnimations(character.basePath, names);
		const baseFrames = animations[startName];
		if (!baseFrames || baseFrames.length === 0) return;

		// Guide line spans the hex's flat-to-flat width through its centre; the
		// character stands centred on it.
		const centre = this.hexCoord(q, r);
		const half = HEX_SCALE_X; // flat-top hex half-width (corner point), in grid columns
		const leftLine = this.project(centre.x - half, centre.y);
		const rightLine = this.project(centre.x + half, centre.y);
		const mark = this.project(centre.x, centre.y);

		// Draw the guide line the character stands on.
		const guide = new Graphics();
		guide
			.moveTo(leftLine.x, leftLine.y)
			.lineTo(rightLine.x, rightLine.y)
			.stroke({ width: 2, color, alpha: 0.9 });
		this.app.stage.addChild(guide);

		// Width at that line encodes the perspective foreshortening there. Size the
		// character by height (CHAR_HEIGHT_RATIO of the cell width), but cap the scale
		// so it never overflows the cell's width. Since each frame is positioned by
		// its body axis (anchorX), which can sit off-centre, the wider axis-to-edge
		// extent of the widest frame must stay within half the cell.
		const cellWidth = Math.abs(rightLine.x - leftLine.x);
		const heightScale = (cellWidth * CHAR_HEIGHT_RATIO) / baseFrames[0].height;
		const maxHalfExtent = Math.max(
			...baseFrames.map((frame) => Math.max(frame.anchorX, 1 - frame.anchorX) * frame.width)
		);
		const widthScale = cellWidth / 2 / maxHalfExtent;
		const fitScale = Math.min(heightScale, widthScale);

		const sprite = new Sprite();
		// A negative x-scale mirrors the sprite around its anchor (in place).
		sprite.scale.set(flip ? -fitScale : fitScale, fitScale);
		sprite.x = mark.x;
		sprite.y = mark.y;
		// Feet-y drives depth order: nearer (lower) rows sit at larger y and on top.
		sprite.zIndex = mark.y;
		this.app.stage.addChild(sprite);

		const actor: Actor = {
			id,
			sprite,
			guide,
			homeX: mark.x,
			homeCell: q,
			homeRow: r,
			animations,
			moveAnims,
			projectileAnims,
			currentName: startName,
			frameIndex: 0,
			frameElapsed: 0,
			rowFront: r,
			cell: q,
			moveRightAnim,
			moveLeftAnim,
			pathQueue: [],
			onArrive: null,
			oneShot: null,
			homeY: mark.y,
			x: mark.x,
			y: mark.y,
			targetX: mark.x,
			targetY: mark.y,
			moving: false,
			stepDir: 0
		};
		this.applyFrame(actor);
		this.actors.push(actor);
	}

	/**
	 * Fetch a character's JSON definition (served as a static asset from
	 * `/characters/<id>.json`). Returns null if it can't be loaded so movement
	 * falls back to sensible defaults rather than failing the board.
	 */
	private async loadDefinition(id: string): Promise<CharacterDefinition | null> {
		try {
			const response = await fetch(`/characters/${id}.json`);
			if (!response.ok) return null;
			return (await response.json()) as CharacterDefinition;
		} catch {
			return null;
		}
	}

	/** Fetch a manifest and load the textures for the named animations. */
	private async loadAnimations(
		basePath: string,
		names: string[]
	): Promise<Record<string, LoadedFrame[]>> {
		const response = await fetch(`${basePath}/manifest.json`);
		if (!response.ok) {
			throw new Error(`Failed to load manifest: ${response.status}`);
		}
		const manifest: Manifest = await response.json();

		const result: Record<string, LoadedFrame[]> = {};
		for (const name of names) {
			const animation = manifest.animations[name];
			if (!animation) continue; // e.g. a character without a run cycle
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
					anchorY: frame.anchorY / frame.height,
					duration: frame.duration
				});
			}
			result[name] = frames;
		}
		return result;
	}

	/** Push the actor's current frame texture and anchor to its sprite. */
	private applyFrame(actor: Actor): void {
		const frames = actor.animations[actor.currentName];
		if (!frames || frames.length === 0) return;
		const frame = frames[actor.frameIndex % frames.length];
		actor.sprite.texture = frame.texture;
		// Horizontal: the character's body (foot) anchor keeps it centred over the
		// cell; vertical: 1 so the sprite's bottom end sits on the guide line.
		actor.sprite.anchor.set(frame.anchorX, 1);
	}

	/** Switch the active animation, restarting playback if it actually changed. */
	private setAnimation(actor: Actor, name: string): void {
		if (actor.currentName === name || !actor.animations[name]) return;
		actor.currentName = name;
		actor.frameIndex = 0;
		actor.frameElapsed = 0;
	}

	private tick = (): void => {
		if (!this.app) return;
		const deltaMs = this.app.ticker.deltaMS;
		for (const actor of this.actors) {
			if (actor.oneShot) {
				// A strike/flinch owns playback; movement and idle are suspended.
				this.advanceOneShot(actor, deltaMs);
			} else {
				// Programmatic paths (combat) drive actor movement; between fights they
				// just settle to idle.
				this.updateStep(actor, deltaMs / 1000);
				this.advanceFrame(actor, deltaMs);
			}
			// Re-sort by feet-y each frame so a moving character passes in front of the
			// hexes/characters it draws level with and behind those it moves past.
			actor.sprite.zIndex = actor.y;
			this.applyFrame(actor);
		}
		this.updateProjectiles(deltaMs);
	};

	/** Advance every in-flight projectile toward its target; land and resolve on arrival. */
	private updateProjectiles(deltaMs: number): void {
		if (this.projectiles.length === 0) return;
		const dt = deltaMs / 1000;
		const remaining: Projectile[] = [];
		for (const projectile of this.projectiles) {
			// Loop the projectile's own animation while it travels, if it has one.
			const frames = projectile.frames;
			if (frames && frames.length > 1) {
				projectile.frameElapsed += deltaMs;
				let guard = frames.length;
				while (projectile.frameElapsed >= frames[projectile.frameIndex].duration && guard-- > 0) {
					projectile.frameElapsed -= frames[projectile.frameIndex].duration;
					projectile.frameIndex = (projectile.frameIndex + 1) % frames.length;
				}
				projectile.display.texture = frames[projectile.frameIndex].texture;
			}

			const dx = projectile.targetX - projectile.x;
			const dy = projectile.targetY - projectile.y;
			const dist = Math.hypot(dx, dy);
			const step = PROJECTILE_SPEED * dt;
			if (dist <= step || dist === 0) {
				projectile.display.parent?.removeChild(projectile.display);
				projectile.display.destroy();
				projectile.resolve();
				continue;
			}
			projectile.x += (dx / dist) * step;
			projectile.y += (dy / dist) * step;
			projectile.display.x = projectile.x;
			projectile.display.y = projectile.y;
			remaining.push(projectile);
		}
		this.projectiles = remaining;
	}

	/**
	 * Advance an actor along its path queue one cell at a time. When idle it pulls
	 * the next queued cell; on arriving at the last one it fires `onArrive`. The
	 * directional walk animation (`move-left`/`move-right`) is chosen by the step's
	 * screen-space direction, matching the arrow-key behaviour.
	 */
	private updateStep(actor: Actor, dt: number): void {
		if (!actor.moving) {
			const next = actor.pathQueue.shift();
			if (next) {
				actor.cell = next.q;
				actor.rowFront = next.r;
				const target = this.hexMark(next.q, next.r);
				actor.stepDir = Math.sign(target.x - actor.x) || actor.stepDir || 1;
				actor.targetX = target.x;
				actor.targetY = target.y;
				actor.moving = true;
			}
		}

		if (actor.moving) {
			// Advance along the straight line to the target hex. Flat-top steps move
			// diagonally (adjacent columns are offset in depth); for a level row this
			// is purely horizontal.
			const step = MOVE_SPEED * dt;
			const dx = actor.targetX - actor.x;
			const dy = actor.targetY - actor.y;
			const dist = Math.hypot(dx, dy);
			if (dist <= step || dist === 0) {
				actor.x = actor.targetX;
				actor.y = actor.targetY;
				actor.moving = false;
			} else {
				actor.x += (dx / dist) * step;
				actor.y += (dy / dist) * step;
			}
			actor.sprite.x = actor.x;
			actor.sprite.y = actor.y;
			// Slide the guide line so it stays under the running character.
			actor.guide.x = actor.x - actor.homeX;
			actor.guide.y = actor.y - actor.homeY;
			// Play the animation bound to this direction in the JSON definition, as-is.
			const name = actor.stepDir < 0 ? actor.moveLeftAnim : actor.moveRightAnim;
			this.setAnimation(actor, actor.animations[name] ? name : 'idle');
			// Finished the whole queued path — settle and notify.
			if (!actor.moving && actor.pathQueue.length === 0) {
				actor.stepDir = 0;
				const done = actor.onArrive;
				actor.onArrive = null;
				done?.();
			}
		} else {
			actor.stepDir = 0;
			this.setAnimation(actor, 'idle');
		}
	}

	/** Drive a one-shot combat animation to completion, then release to idle. */
	private advanceOneShot(actor: Actor, deltaMs: number): void {
		const shot = actor.oneShot;
		if (!shot) return;
		shot.elapsed += deltaMs;
		this.advanceFrame(actor, deltaMs);
		if (shot.elapsed >= shot.total) {
			actor.oneShot = null;
			this.setAnimation(actor, 'idle');
			shot.resolve();
		}
	}

	private advanceFrame(actor: Actor, deltaMs: number): void {
		const frames = actor.animations[actor.currentName];
		if (!frames || frames.length < 2) return;
		actor.frameElapsed += deltaMs;
		let guard = frames.length;
		while (actor.frameElapsed >= frames[actor.frameIndex].duration && guard-- > 0) {
			actor.frameElapsed -= frames[actor.frameIndex].duration;
			actor.frameIndex = (actor.frameIndex + 1) % frames.length;
		}
	}

	// --- Combat API -----------------------------------------------------------
	// Programmatic control used by the combat controller. All movement methods
	// resolve once the actor has settled, so the controller can await each beat.

	/** Ids of every actor on the board, in placement order. */
	getActorIds(): string[] {
		return this.actors.map((actor) => actor.id);
	}

	private findActor(id: string): Actor | undefined {
		return this.actors.find((actor) => actor.id === id);
	}

	/** The actor's current axial cell. */
	private cellOf(actor: Actor): Hex {
		return { q: actor.cell, r: actor.rowFront };
	}

	/** Walk an actor through the given cells (excluding its current one). */
	private walkCells(actor: Actor, cells: Hex[]): Promise<void> {
		return new Promise((resolve) => {
			if (cells.length === 0) {
				resolve();
				return;
			}
			actor.pathQueue = [...cells];
			actor.onArrive = resolve;
		});
	}

	/**
	 * Walk two fighters toward each other until they stand on adjacent hexes,
	 * each staying on its own colour or the shared purple column. Resolves once
	 * both have arrived. Ids may be given in any order (sides are inferred).
	 */
	async meleeApproach(aId: string, bId: string): Promise<void> {
		const a = this.findActor(aId);
		const b = this.findActor(bId);
		if (!a || !b) return;
		// Infer which fighter is on the red half (starts left) vs blue (right).
		const red = a.homeCell <= b.homeCell ? a : b;
		const blue = red === a ? b : a;
		const meeting = findMeleeMeeting(this.cellOf(red), this.cellOf(blue));
		if (!meeting) return;
		await Promise.all([
			this.walkCells(red, meeting.red.path.slice(1)),
			this.walkCells(blue, meeting.blue.path.slice(1))
		]);
	}

	/**
	 * The cells an actor may occupy: nobody crosses the central purple column, so a
	 * red-side fighter stays on red or the shared purple line (q ≤ 0) and a blue-side
	 * fighter stays strictly on blue (q ≥ 1) — blue never even enters the purple
	 * cells. Every combat move is confined to this predicate.
	 */
	private sideAllowed(actor: Actor): (c: Hex) => boolean {
		if (cellSide(actor.homeCell) === 'blue') {
			return (c) => isBoardCell(c.q, c.r) && cellSide(c.q) === 'blue';
		}
		return (c) => isBoardCell(c.q, c.r) && cellSide(c.q) !== 'blue';
	}

	/** Walk an actor back to the cell it started on, staying on its own side. */
	async returnHome(id: string): Promise<void> {
		const actor = this.findActor(id);
		if (!actor) return;
		const home: Hex = { q: actor.homeCell, r: actor.homeRow };
		const path = findPath(this.cellOf(actor), home, this.sideAllowed(actor));
		if (!path) return;
		await this.walkCells(actor, path.slice(1));
	}

	/**
	 * Back an actor off to shoot: walk it to the cell furthest from the central
	 * column on its own side, so its ranged attack fires from as deep in its
	 * territory as the board allows. Resolves once it has settled there.
	 */
	async retreat(id: string): Promise<void> {
		const actor = this.findActor(id);
		if (!actor) return;
		const retreat = findRetreatCell(this.cellOf(actor), this.sideAllowed(actor));
		if (!retreat) return;
		await this.walkCells(actor, retreat.path.slice(1));
	}

	/**
	 * Walk a (melee) actor as close to `targetId` as its own side allows. It never
	 * crosses the purple line, so against a foe who backed off to shoot it advances
	 * up to the boundary rather than reaching them — the strike still lands (for
	 * halved damage) from there. Resolves once it has settled.
	 */
	async advance(moverId: string, targetId: string): Promise<void> {
		const mover = this.findActor(moverId);
		const target = this.findActor(targetId);
		if (!mover || !target) return;
		const approach = findClosestApproach(
			this.cellOf(mover),
			this.cellOf(target),
			this.sideAllowed(mover)
		);
		if (!approach) return;
		await this.walkCells(mover, approach.path.slice(1));
	}

	/** Screen-space point roughly at an actor's chest, where projectiles enter/leave. */
	private chestPoint(actor: Actor): Point {
		return { x: actor.x, y: actor.y - actor.sprite.height * 0.5 };
	}

	/**
	 * Fire a ranged projectile from `shooterId` toward `targetId`: the shooter plays
	 * its ranged pose while a projectile sprite flies across the board. Resolves once
	 * the projectile reaches the target. If the shooter binds no projectile it still
	 * flies a small dot, so combat keeps its beat.
	 */
	shoot(shooterId: string, targetId: string): Promise<void> {
		const shooter = this.findActor(shooterId);
		const target = this.findActor(targetId);
		if (!this.app || !shooter || !target) return Promise.resolve();

		// Play the firing pose; it recovers to idle on its own, so don't block on it.
		void this.playOnce(shooterId, 'ranged');

		const from = this.chestPoint(shooter);
		const to = this.chestPoint(target);
		const projName = shooter.projectileAnims.ranged;
		const frames = (projName && shooter.animations[projName]) || null;

		const display = new Sprite(frames && frames.length > 0 ? frames[0].texture : Texture.WHITE);
		display.anchor.set(0.5);
		if (frames && frames.length > 0) {
			frames[0].texture.source.scaleMode = 'nearest';
			// Size the projectile to a fraction of the shooter's height; mirror it to
			// face the direction of travel.
			const scale = (shooter.sprite.height * 0.4) / frames[0].height;
			display.scale.set(from.x <= to.x ? scale : -scale, scale);
		} else {
			display.width = 16;
			display.height = 16;
			display.tint = 0xffe066;
		}
		display.x = from.x;
		display.y = from.y;
		display.zIndex = 1_000_000; // always drawn above the board and characters
		this.app.stage.addChild(display);

		return new Promise((resolve) => {
			this.projectiles.push({
				display,
				frames: frames && frames.length > 0 ? frames : null,
				frameIndex: 0,
				frameElapsed: 0,
				x: from.x,
				y: from.y,
				targetX: to.x,
				targetY: to.y,
				resolve
			});
		});
	}

	/**
	 * Play a one-shot combat pose (melee strike or hurt flinch) and resolve when
	 * it finishes. If the character has no animation bound to that move, resolves
	 * immediately so combat still flows.
	 */
	playOnce(id: string, kind: CombatMoveKind): Promise<void> {
		const actor = this.findActor(id);
		const name = actor?.moveAnims[kind];
		const frames = actor && name ? actor.animations[name] : undefined;
		if (!actor || !name || !frames || frames.length === 0) return Promise.resolve();
		const total = frames.reduce((sum, frame) => sum + frame.duration, 0);
		this.setAnimation(actor, name);
		actor.frameIndex = 0;
		actor.frameElapsed = 0;
		return new Promise((resolve) => {
			actor.oneShot = { total, elapsed: 0, resolve };
		});
	}
}
