import { Application, Assets, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { destroyPixiApp } from '../pixi/release-context';
import type { Manifest } from './mugen-player';
import { CardSprite, REFERENCE_SOURCE_HEIGHT } from '../card/CardSprite';
import type { CardModel } from '../card/card-model.type';
import type { CharacterDefinition, CharacterMove } from '../../types/character-definition.type';
import {
	boardCells,
	cellSide,
	findClosestApproach,
	findMeleeMeeting,
	findPath,
	findRetreatCell,
	isBoardCell,
	type Hex
} from './hex';

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
	 * The character's combat colour — its Supabase spawn colour (`red`, `blue`,
	 * `yellow`, `purple`, `orange`, `green`). When set, it fills the fighter's HP
	 * bar. Unlike the grid's `color`, this is per character, not per side.
	 */
	combatColor?: string;
	/**
	 * Character definition id (matches `public/characters/<id>/definition.json`). When set,
	 * its `directions` bindings drive the move-left/move-right animations used while
	 * combat walks the actor; without it both fall back to `run`.
	 */
	id?: string;
	/**
	 * The character's display card, drawn in the empty space around the hex grid (a
	 * {@link CardSprite}). When set on the grid's centre character and its extras, the
	 * board lays that side's cards out in a row outside the grid — rival above, player
	 * below. Omit to draw no card for this character.
	 */
	card?: CardModel;
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
}

const DEFAULTS = {
	cellSize: 120,
	depth: 760,
	farRatio: 0.97,
	padding: 40,
	yOffset: 110,
	centerColor: 0xffffff // white
};

/** Grid extents used to size the projection footprint (unchanged canvas size). */
const ROWS = 5;
const COLS = 10;

// --- Hex board layout (single hexagon-of-hexagons) --------------------------
// The board is one hexagon of radius HEX_RADIUS cells, addressed in axial
// coordinates (q across the width, r into the depth). The hexes are pointy-top
// (points up/down, flat edges left/right), so each hex reads vertically; lines
// of constant q slant half a step per row, but within any row cells are still
// ordered left-to-right by q, so q alone keeps deciding the red/blue side. Its
// raw (size-1) bounding box is symmetric about the origin and fitted
// independently on each axis into the projection box (col 0..COLS, row 0..ROWS)
// so it fills the whole footprint; every hex corner is then projected through
// the same one-point perspective the square grid used. Cells left of centre are
// the first grid's colour, cells to the right the second's.
const HEX_RADIUS = 3; // rings out from the centre hex (centre + 3 = 4 cells per spoke)
const SQRT3 = Math.sqrt(3);
const HEX_HALF_W = SQRT3 * (HEX_RADIUS + 0.5); // raw half-width (q extreme + flat edge)
const HEX_HALF_H = HEX_RADIUS * 1.5 + 1; // raw half-height (r extreme + corner point)
const HEX_SCALE_X = COLS / (2 * HEX_HALF_W); // raw x → grid columns
const HEX_SCALE_Y = ROWS / (2 * HEX_HALF_H); // raw y → grid rows
/** Corner offsets (in grid units) for a pointy-top hex, relative to its centre. */
const HEX_CORNERS: { x: number; y: number }[] = Array.from({ length: 6 }, (_, k) => {
	const angle = ((60 * k - 30) * Math.PI) / 180;
	return { x: Math.cos(angle) * HEX_SCALE_X, y: Math.sin(angle) * HEX_SCALE_Y };
});
/**
 * Offset (grid rows) from a hex's centre to the horizontal line through its two
 * lower corners — the line standing characters plant their feet on, so they read
 * as inside the cell rather than floating at its centre. Grid rows increase away
 * from the viewer (up-screen), so the lower-on-screen corners sit at −sin 30°.
 */
const HEX_FOOT_Y = -0.5 * HEX_SCALE_Y;

/**
 * Left→right screen position of the standing point in the hex at axial [q, r],
 * in arbitrary units (only the ordering is meaningful). Mirrors the horizontal
 * term of {@link MugenBoard.project} — the raw x scaled by the perspective
 * half-width at that row — so callers outside the engine (e.g. the board page's
 * character cards) can sort characters into the exact left-to-right order they
 * stand in on the canvas, tie-breaks and all. Uses the board's default
 * `farRatio`, the only value the app configures it with.
 */
export function cellScreenX(q: number, r: number, farRatio: number = DEFAULTS.farRatio): number {
	const rawX = SQRT3 * (q + r / 2);
	const row = ROWS / 2 + 1.5 * r * HEX_SCALE_Y;
	// Perspective depth parameter (0 near, 1 far), then the half-width at that row
	// relative to the near edge — matches project()'s halfWidth up to a positive
	// scale, which the ordering ignores.
	const t = row / (ROWS * farRatio + row * (1 - farRatio));
	const halfWidth = 1 + t * (farRatio - 1);
	return halfWidth * rawX;
}

/**
 * Top→bottom screen position of the standing point in the hex at axial [q, r], in
 * arbitrary units that increase downward (only the ordering is meaningful). Mirrors
 * the vertical term of {@link MugenBoard.project}: far rows (larger r) sit higher up
 * the canvas, so this returns the negated depth parameter — sort it ascending to lay
 * characters out top-of-board first. Uses the board's default `farRatio`, the only
 * value the app configures it with.
 */
export function cellScreenY(q: number, r: number, farRatio: number = DEFAULTS.farRatio): number {
	const row = ROWS / 2 + 1.5 * r * HEX_SCALE_Y;
	// Depth parameter t grows toward the far (upper) edge; screen y falls as t rises,
	// so negate it to get a value that increases down the screen.
	const t = row / (ROWS * farRatio + row * (1 - farRatio));
	return -t;
}

/** On-screen height of a reference-height ({@link REFERENCE_SOURCE_HEIGHT}) character
 * as a multiple of its (perspective-foreshortened) cell width. Every other character
 * scales by the same source→screen ratio, so shorter/taller sprites read shorter/taller. */
const CHAR_HEIGHT_RATIO = 1.3;

// --- Character cards (drawn outside the hex grid) ---------------------------
/** Portrait trading-card aspect (width / height) — mirrors the card renderer. */
const CARD_ASPECT = 2 / 3;
/** A card's width as a multiple of the near-edge cell size. */
const CARD_WIDTH_RATIO = 1.25;
/** Horizontal gap between cards in a side's row, as a fraction of card width. */
const CARD_GAP_RATIO = 0.14;
/** Clear space between a side's card row and the nearest board content, as a
 * fraction of card height, so the cards never overlap the grid or characters. */
const CARD_BAND_GAP_RATIO = 0.14;
/** Horizontal speed (canvas px/s) a character runs between cells during combat. */
const MOVE_SPEED = 260;
/** Speed (canvas px/s) a fired projectile travels from shooter to target. */
const PROJECTILE_SPEED = 720;
/** Frames of an aura animation (static/auras/<color>/1..N.png). */
const AURA_FRAMES = 4;
/** How long each aura frame shows (ms). */
const AURA_FRAME_MS = 120;
/** How far the aura flame overhangs the character it envelops, per axis: the
 * flame is stretched to this multiple of the actor's nominal display size. */
const AURA_WIDTH_RATIO = 1.7;
const AURA_HEIGHT_RATIO = 1.25;

/** Canvas hex for each combat colour, for tinting strike readouts and slashes. */
const COMBAT_COLOR_HEX: Record<string, number> = {
	red: 0xef4444,
	blue: 0x3b82f6,
	yellow: 0xfacc15,
	purple: 0xa855f7,
	orange: 0xf97316,
	green: 0x22c55e
};

/** Hex for a combat colour name, defaulting to white for anything unknown. */
export const combatColorHex = (color: string): number => COMBAT_COLOR_HEX[color] ?? 0xffffff;

/** Lifetime of a strike slash overlay (ms). */
const SLASH_MS = 420;

/** How long a knocked-out fighter holds its hurt pose while it fades to nothing
 * and is removed from the board (ms). */
const KNOCKOUT_FADE_MS = 700;

/** HP bar geometry: width as a fraction of the actor's nominal width, its pixel
 * height, and the gap (px) from the actor's feet down to the top of the bar. */
const HP_BAR_WIDTH_RATIO = 0.9;
const HP_BAR_HEIGHT = 18;
const HP_BAR_GAP = 10;
/** Font size (px) of the `hp/maxHp` readout centred inside the bar. */
const HP_BAR_FONT_SIZE = 12;
/** Border around the HP bar: a larger backing shape in the fill colour, darkened
 * by this much black, poking out this many px around the bar on every edge. */
const HP_BAR_BORDER_WIDTH = 2;
const HP_BAR_BORDER_DARKEN = 0.3;
/** How fast the displayed fill eases toward the real HP ratio (fraction closed
 * per second) — drives the width shrink as a fighter takes damage. */
const HP_BAR_EASE_PER_S = 6;

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

/**
 * A knocked-out fighter dissolving off the board: it holds its hurt pose while
 * its sprite (and HP bar) dim from full to nothing, then it's removed.
 */
interface KnockOutFade {
	/** Total fade duration (ms). */
	total: number;
	elapsed: number;
	/** Resolves once the fade finishes and the actor has been removed. */
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

/**
 * A combat aura burning behind an actor — the color it throws this round.
 * Frames come from static/auras/<color>/ (scripts/generate-auras.js) and loop
 * for as long as the aura is shown.
 */
interface Aura {
	sprite: Sprite;
	frames: Texture[];
	frameIndex: number;
	frameElapsed: number;
}

/** A transient slash mark drawn over a struck fighter, in the attacker's colour.
 * It scales in and fades out over {@link SLASH_MS}, then removes itself. */
interface SlashEffect {
	graphics: Graphics;
	elapsed: number;
}

/**
 * An HP bar drawn just below an actor's feet, filled in the fighter's own combat
 * (Supabase spawn) colour. The bar tracks a target ratio (the fighter's hp/maxHp)
 * but the *displayed* ratio eases toward it each tick, so the width shrink animates
 * smoothly; the fill colour is fixed to the fighter's spawn colour.
 */
interface HpBar {
	graphics: Graphics;
	/** The `current/max` readout centred inside the bar. */
	label: Text;
	/** Displayed fill fraction (0..1), eased toward {@link targetRatio}. */
	ratio: number;
	/** The real hp/maxHp fraction the bar is easing toward. */
	targetRatio: number;
	/** Fixed fill colour: the fighter's combat (spawn) colour. */
	fillColor: number;
}

/** A character standing (and, during combat, running) on the board. */
interface Actor {
	/** Stable id (character id or basePath's first segment), used to command it. */
	id: string;
	sprite: Sprite;
	/** Axial cell the actor started on, so it can walk back after combat. */
	homeCell: number;
	homeRow: number;
	/** Every loaded animation for this actor, keyed by name (idle, run, …). */
	animations: Record<string, LoadedFrame[]>;
	/** Raw manifest anim key of the hurt flinch (movement animation), or `''`. */
	hurtAnim: string;
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
	/**
	 * When set, the walk's final step targets this exact screen point instead of
	 * the last cell's standing mark — e.g. a fighter's half of a shared duel cell.
	 */
	finalTarget: Point | null;
	/** Called once the path queue empties. */
	onArrive: (() => void) | null;
	/** While set, a one-shot animation owns playback (movement/idle suspended). */
	oneShot: OneShot | null;
	/** While set, the actor has been knocked out and is fading off the board:
	 * it holds its hurt pose, dims to nothing, then is removed. */
	fade: KnockOutFade | null;
	/** The looping combat aura shown behind the actor, or null. */
	aura: Aura | null;
	/** The HP bar tracking this fighter's health below its feet. */
	hpBar: HpBar | null;
	/** Floating combat readout (the strike multiplier ×100) above the actor,
	 * shown during a duel so the two throws can be compared. Null when clear. */
	label: Text | null;
	/** Nominal on-screen size (px) of the character at its fit scale, measured
	 * from its base animation frames; sizes the aura that envelops it. */
	displayWidth: number;
	displayHeight: number;
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
	// Set the moment teardown starts, so a boot already in flight can bail out
	// instead of resurrecting a destroyed board.
	private destroyed = false;
	private actors: Actor[] = [];
	/** In-flight ranged projectiles, advanced each tick until they land. */
	private projectiles: Projectile[] = [];
	/** Transient slash overlays, faded out each tick until they expire. */
	private slashes: SlashEffect[] = [];
	/** Colour overlays on claimed cells, keyed by "q,r". */
	private cellPaint = new Map<string, Graphics>();
	/** Loaded aura frame textures, keyed by aura color name. */
	private auraTextures = new Map<string, Texture[]>();
	/** Character cards drawn in the empty space around the grid (rival + player). */
	private cardSprites: CardSprite[] = [];

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
			backgroundAlpha: 0,
			antialias: false,
			roundPixels: true
		});
		// The host can unmount while the boot is in flight (combat closed as it opens).
		// Without this the app would be created after destroy() had already run,
		// stranding a WebGL context and a render loop nothing can reach — and browsers
		// only allow a handful of contexts, so enough strays force-lose the oldest live
		// one and blank whatever canvas that was.
		if (this.destroyed) {
			destroyPixiApp(app);
			return;
		}
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

		// One hexagonal board: cells left of centre take the left leader's colour, right
		// the right leader's, the shared centre column white.
		this.drawBoard(
			this.options.grids[0].color,
			this.options.grids[1].color,
			this.options.centerColor
		);

		// The centre character of each grid stands left/right of centre: the left one
		// lower-left (unflipped), the right one (flipped) to the upper-right. Combat can
		// walk any actor into the central white column.
		await this.addActor(this.options.grids[0].character, -2, -1, false);
		await this.addActor(this.options.grids[1].character, 2, -3, true);

		// Extra characters stand idle on their assigned hexes — left half faces
		// right (unflipped), right half faces left (flipped) like the centre pair.
		for (const extra of this.options.grids[0].extras ?? []) {
			await this.addActor(extra, extra.q, extra.r, false);
		}
		for (const extra of this.options.grids[1].extras ?? []) {
			await this.addActor(extra, extra.q, extra.r, true);
		}

		// Lay the character cards out in the empty space above (rival) and below
		// (player) the board, before cropping — so the crop grows the canvas taller to
		// include them.
		// Every actor above was loaded asynchronously; the board may have been torn
		// down in the meantime, and destroy() has already freed the app.
		if (this.destroyed) return;

		this.layoutCards();

		// Crop the view to what's actually drawn: the hex grid (the widest element)
		// ends up flush with the canvas edges — so it fills the width when the canvas
		// is scaled to its container — and the height becomes the grid's height plus
		// the room the front-row characters need below it, plus the card bands above
		// and below. The projection keeps using the original design size
		// (canvasWidth/Height), so combat movement still lands on the right cells; we
		// only translate the stage and resize the framebuffer.
		this.fitToContent();

		app.ticker.add(this.tick);
	}

	/**
	 * Shrink the canvas to the bounding box of everything drawn (grid + characters),
	 * so the hex grid sits flush against the left/right edges and the
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

	/**
	 * Draw each side's character cards in the empty space around the hex grid: the
	 * rival (first grid) in a row above the board, the player (second grid) in a row
	 * below it. Runs after the grid and characters are placed but before
	 * {@link fitToContent}, so the two bands grow the cropped canvas taller. Each band
	 * is anchored just clear of everything already drawn (measured from the current
	 * stage bounds), so the cards never overlap the grid or the characters standing on
	 * it. The cards loop their idle art on the same ticker, via {@link CardSprite}.
	 */
	private layoutCards(): void {
		if (!this.app) return;
		const rival = this.collectCards(this.options.grids[0], { q: -2, r: -1 });
		const player = this.collectCards(this.options.grids[1], { q: 2, r: -3 });
		if (rival.length === 0 && player.length === 0) return;

		// Card geometry, sized to the grid so a side's row spans a comfortable fraction
		// of the board width.
		const cardW = Math.round(this.options.cellSize * CARD_WIDTH_RATIO);
		const cardH = Math.round(cardW / CARD_ASPECT);
		const gap = Math.round(cardW * CARD_GAP_RATIO);
		const bandGap = Math.round(cardH * CARD_BAND_GAP_RATIO);

		// Anchor the bands to the bounds of what's already drawn (grid + characters), so
		// the top row sits above the far row's heads and the bottom row below the near
		// row's feet — never overlapping the board.
		const bounds = this.app.stage.getBounds();
		const centerX = (bounds.minX + bounds.maxX) / 2;

		const placeRow = (cards: CardModel[], topY: number, flipped: boolean): void => {
			const rowW = cards.length * cardW + (cards.length - 1) * gap;
			const startX = centerX - rowW / 2;
			cards.forEach((card, i) => {
				const sprite = new CardSprite({ card, width: cardW, height: cardH, app: this.app!, flipped });
				sprite.position.set(startX + i * (cardW + gap), topY);
				// The cards sit in empty space, but keep them above everything regardless.
				sprite.zIndex = 100000;
				this.app!.stage.addChild(sprite);
				this.cardSprites.push(sprite);
			});
		};

		// The rival row (top) keeps the original, unmirrored art; the player row (bottom)
		// uses the flipped default, so the two sides' cards face each other.
		if (rival.length > 0) placeRow(rival, bounds.minY - bandGap - cardH, false);
		if (player.length > 0) placeRow(player, bounds.maxY + bandGap, true);
	}

	/**
	 * The display cards for one side, ordered by where the characters stand top→bottom
	 * on the board: the character highest up the canvas comes first (leftmost card),
	 * then the middle one, then the lowest. The centre character stands on `center`;
	 * each extra on its own hex. Characters without a card are skipped.
	 */
	private collectCards(grid: BoardGrid, center: { q: number; r: number }): CardModel[] {
		const entries: { card: CardModel; q: number; r: number }[] = [];
		if (grid.character.card) entries.push({ card: grid.character.card, q: center.q, r: center.r });
		for (const extra of grid.extras ?? []) {
			if (extra.card) entries.push({ card: extra.card, q: extra.q, r: extra.r });
		}
		entries.sort((a, b) => this.hexMark(a.q, a.r).y - this.hexMark(b.q, b.r).y);
		return entries.map((entry) => entry.card);
	}

	/** Tear everything down. Safe to call more than once. */
	destroy(): void {
		this.destroyed = true;
		if (this.app) {
			destroyPixiApp(this.app);
			this.app = null;
		}
		this.actors = [];
		this.projectiles = [];
		this.slashes = [];
		this.cardSprites = [];
		this.cellPaint.clear();
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
		const rawX = SQRT3 * (q + r / 2);
		const rawY = 1.5 * r;
		return { x: COLS / 2 + rawX * HEX_SCALE_X, y: ROWS / 2 + rawY * HEX_SCALE_Y };
	}

	/** Screen-space point an actor stands on in the hex at axial [q, r]:
	 * horizontally centred, vertically on the hex's lower-corner line. */
	private hexMark(q: number, r: number): Point {
		const centre = this.hexCoord(q, r);
		return this.project(centre.x, centre.y + HEX_FOOT_Y);
	}

	/**
	 * Draw the board. Cells left of the vertical centre line take `leftColor`,
	 * cells to the right `rightColor`, and the central column (q = 0) — the shared
	 * row both creatures can enter — is painted `centerColor`. Iterates the exact
	 * cell list from the shared hex utility (rather than a fixed radius box) so
	 * every occupiable cell is drawn, no matter how far its column reaches.
	 */
	private drawBoard(leftColor: number, rightColor: number, centerColor: number): void {
		if (!this.app) return;
		const graphics = new Graphics();
		for (const { q, r } of boardCells()) {
			// q alone decides the side; the central column (q = 0) is the shared
			// white row.
			const side = cellSide(q);
			const color = side === 'red' ? leftColor : side === 'blue' ? rightColor : centerColor;

			const centre = this.hexCoord(q, r);
			const pts: number[] = [];
			for (const corner of HEX_CORNERS) {
				const p = this.project(centre.x + corner.x, centre.y + corner.y);
				pts.push(p.x, p.y);
			}
			graphics.poly(pts);
			graphics.fill({ color, alpha: 0.08 });
			graphics.stroke({ width: 2, color, alpha: 0.9 });
		}
		this.app.stage.addChild(graphics);
	}

	/**
	 * Load a character and stand it in the centre of the hex at axial [q, r], feet on
	 * the hex's lower-corner line. Every actor loads its directional walk animations so
	 * combat can drive it hex to hex.
	 */
	private async addActor(
		character: BoardCharacter,
		q: number,
		r: number,
		flip: boolean
	): Promise<void> {
		if (!this.app) return;
		const startName = character.animation ?? 'idle';
		// The actor id is the instance identity (unique per placement — the two
		// sides can field the same character, so it must not be the asset id). The
		// character's definition/assets are keyed by the id embedded in basePath
		// (`/assets/<charId>/frames`), which stays shared across those instances.
		const segments = character.basePath.split('/').filter(Boolean);
		const characterId = segments[segments.length - 2] ?? segments[segments.length - 1] ?? '';
		const id = character.id ?? characterId ?? character.basePath;

		// Every actor can be walked cell to cell by combat, so all of them load the
		// directional animations bound in the character's JSON definition
		// (move-left/move-right), the hurt flinch, and every move the definition
		// declares (plus any inline projectile), so combat can play whichever move
		// gets picked. Without a definition the directional anims fall back to run.
		let moveRightAnim = 'run';
		let moveLeftAnim = 'run';
		let hurtAnim = '';
		const moveSources: string[] = [];
		const definition = await this.loadDefinition(characterId);
		if (definition) {
			moveRightAnim = definition.directions['move-right']?.source || moveRightAnim;
			moveLeftAnim = definition.directions['move-left']?.source || moveLeftAnim;
			// The hurt flinch is a movement animation every character defines, not a
			// move — pull it from the animations record.
			hurtAnim = definition.animations.hurt?.source || '';
			for (const move of definition.moves ?? []) {
				if (move.source) moveSources.push(move.source);
				if (move.projectile?.source) moveSources.push(move.projectile.source);
			}
		}
		const names = [
			...new Set(
				[startName, moveRightAnim, moveLeftAnim, hurtAnim, ...moveSources].filter(Boolean)
			)
		];
		const animations = await this.loadAnimations(character.basePath, names);
		const baseFrames = animations[startName];
		if (!baseFrames || baseFrames.length === 0) return;

		// The character stands centred on its hex's lower-corner line, feet on it. The
		// edge-to-edge points along that line are projected to size and place the sprite
		// (the line itself is not drawn).
		const centre = this.hexCoord(q, r);
		const half = (SQRT3 / 2) * HEX_SCALE_X; // pointy-top hex half-width (flat edge), in grid columns
		const footY = centre.y + HEX_FOOT_Y;
		const leftLine = this.project(centre.x - half, footY);
		const rightLine = this.project(centre.x + half, footY);
		const mark = this.project(centre.x, footY);

		// Width at that line encodes the perspective foreshortening there. Every actor
		// scales its sprite by the SAME source→screen ratio ({@link REFERENCE_SOURCE_HEIGHT}):
		// a reference-height character stands CHAR_HEIGHT_RATIO of the cell width tall, and
		// every other character scales by that same ratio — so on-screen size tracks each
		// character's true sprite height relative to the others (Krillin renders shorter
		// than Goku) instead of every sprite being stretched to the same cell height. The
		// shared scale is the same one the character cards use, so both surfaces agree on
		// relative sizes. It's then capped by the cell's width so a wide character can't
		// overflow into its neighbours: since each frame is positioned by its body axis
		// (anchorX), which can sit off-centre, the widest frame's axis-to-edge extent must
		// stay within half the cell.
		const cellWidth = Math.abs(rightLine.x - leftLine.x);
		const sharedScale = (cellWidth * CHAR_HEIGHT_RATIO) / REFERENCE_SOURCE_HEIGHT;
		const maxHalfExtent = Math.max(
			...baseFrames.map((frame) => Math.max(frame.anchorX, 1 - frame.anchorX) * frame.width)
		);
		const widthScale = cellWidth / 2 / maxHalfExtent;
		const fitScale = Math.min(sharedScale, widthScale);

		const sprite = new Sprite();
		// A negative x-scale mirrors the sprite around its anchor (in place).
		sprite.scale.set(flip ? -fitScale : fitScale, fitScale);
		sprite.x = mark.x;
		sprite.y = mark.y;
		// Feet-y drives depth order: nearer (lower) rows sit at larger y and on top.
		sprite.zIndex = mark.y;
		this.app.stage.addChild(sprite);

		// A full HP bar just below the character's feet, filled in the fighter's own
		// combat (spawn) colour; combat eases its width down via setHp as the fighter
		// takes damage. A `current/max` readout sits centred inside it (blank until
		// combat seeds the numbers).
		const hpGraphics = new Graphics();
		this.app.stage.addChild(hpGraphics);
		const hpLabel = new Text({
			text: '',
			style: {
				fill: 0xffffff,
				fontSize: HP_BAR_FONT_SIZE,
				fontWeight: '700',
				fontFamily: 'system-ui, sans-serif',
				stroke: { color: 0x000000, width: 3 },
				align: 'center'
			}
		});
		hpLabel.anchor.set(0.5);
		this.app.stage.addChild(hpLabel);

		const actor: Actor = {
			id,
			sprite,
			homeCell: q,
			homeRow: r,
			animations,
			hurtAnim,
			currentName: startName,
			frameIndex: 0,
			frameElapsed: 0,
			rowFront: r,
			cell: q,
			moveRightAnim,
			moveLeftAnim,
			pathQueue: [],
			finalTarget: null,
			onArrive: null,
			oneShot: null,
			fade: null,
			aura: null,
			hpBar: {
				graphics: hpGraphics,
				label: hpLabel,
				ratio: 1,
				targetRatio: 1,
				fillColor: combatColorHex(character.combatColor ?? '')
			},
			label: null,
			// Nominal size from the base frames at fit scale — stable across poses,
			// unlike the live sprite whose size tracks the current frame's texture.
			displayWidth: Math.max(...baseFrames.map((frame) => frame.width)) * fitScale,
			displayHeight: baseFrames[0].height * fitScale,
			x: mark.x,
			y: mark.y,
			targetX: mark.x,
			targetY: mark.y,
			moving: false,
			stepDir: 0
		};
		this.applyFrame(actor);
		this.updateHpBar(actor, 0);
		this.actors.push(actor);
	}

	/**
	 * Fetch a character's JSON definition (served from @3xl/data at
	 * `/data/characters/<id>/definition.json`). Returns null if it can't be loaded so movement
	 * falls back to sensible defaults rather than failing the board.
	 */
	private async loadDefinition(id: string): Promise<CharacterDefinition | null> {
		try {
			const response = await fetch(`/data/characters/${id}/definition.json`);
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
		// cell; vertical: 1 so the sprite's bottom end sits on the hex's lower-corner line.
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
			if (actor.fade) {
				// Knocked out: frozen in its hurt pose, dimming to nothing before it's
				// removed from the board entirely.
				this.advanceFade(actor, deltaMs);
				continue;
			}
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
			this.updateAura(actor, deltaMs);
			this.updateHpBar(actor, deltaMs);
			this.updateLabel(actor);
		}
		this.updateProjectiles(deltaMs);
		this.updateSlashes(deltaMs);
	};

	/** Advance every slash overlay: fade it out over its lifetime, then remove. */
	private updateSlashes(deltaMs: number): void {
		if (this.slashes.length === 0) return;
		const remaining: SlashEffect[] = [];
		for (const slash of this.slashes) {
			slash.elapsed += deltaMs;
			const t = slash.elapsed / SLASH_MS;
			if (t >= 1) {
				slash.graphics.parent?.removeChild(slash.graphics);
				slash.graphics.destroy();
				continue;
			}
			// Snap in, then fade: full opacity for the first third, easing to zero.
			slash.graphics.alpha = t < 0.33 ? 1 : 1 - (t - 0.33) / 0.67;
			slash.graphics.scale.set(0.85 + t * 0.3);
			remaining.push(slash);
		}
		this.slashes = remaining;
	}

	/** Loop the actor's aura animation and keep it glued to the actor's feet,
	 * just behind it in depth order. */
	private updateAura(actor: Actor, deltaMs: number): void {
		const aura = actor.aura;
		if (!aura) return;
		aura.frameElapsed += deltaMs;
		while (aura.frameElapsed >= AURA_FRAME_MS) {
			aura.frameElapsed -= AURA_FRAME_MS;
			aura.frameIndex = (aura.frameIndex + 1) % aura.frames.length;
		}
		aura.sprite.texture = aura.frames[aura.frameIndex];
		aura.sprite.x = actor.x;
		aura.sprite.y = actor.y;
		aura.sprite.zIndex = actor.y - 0.5;
	}

	/**
	 * Ease the actor's HP bar toward its target ratio and redraw it below the
	 * actor's feet. The displayed ratio lags the target, so a hit both shrinks the
	 * fill and slides its colour from green through yellow to red over ~0.2s.
	 */
	private updateHpBar(actor: Actor, deltaMs: number): void {
		const bar = actor.hpBar;
		if (!bar) return;

		// Exponential ease toward the target ratio (frame-rate independent).
		if (deltaMs > 0 && bar.ratio !== bar.targetRatio) {
			const t = 1 - Math.exp((-HP_BAR_EASE_PER_S * deltaMs) / 1000);
			bar.ratio += (bar.targetRatio - bar.ratio) * t;
			if (Math.abs(bar.targetRatio - bar.ratio) < 0.001) bar.ratio = bar.targetRatio;
		}

		const width = actor.displayWidth * HP_BAR_WIDTH_RATIO;
		const left = actor.x - width / 2;
		const top = actor.y + HP_BAR_GAP;
		const radius = HP_BAR_HEIGHT / 2;
		const fillWidth = Math.max(0, Math.min(1, bar.ratio)) * width;

		const g = bar.graphics;
		g.clear();
		// Border: a slightly larger rounded rect behind the bar, filled in the
		// fighter's colour under a 30% black overlay, so the border reads as a
		// darkened shade of the fill colour poking out around every edge.
		const bLeft = left - HP_BAR_BORDER_WIDTH;
		const bTop = top - HP_BAR_BORDER_WIDTH;
		const bWidth = width + HP_BAR_BORDER_WIDTH * 2;
		const bHeight = HP_BAR_HEIGHT + HP_BAR_BORDER_WIDTH * 2;
		const bRadius = bHeight / 2;
		g.roundRect(bLeft, bTop, bWidth, bHeight, bRadius);
		g.fill({ color: bar.fillColor });
		g.roundRect(bLeft, bTop, bWidth, bHeight, bRadius);
		g.fill({ color: 0x000000, alpha: HP_BAR_BORDER_DARKEN });
		// Track behind the fill: the fighter's own colour washed out by a 30% white
		// overlay, so the spent portion reads as a paler tint of the same colour.
		g.roundRect(left, top, width, HP_BAR_HEIGHT, radius);
		g.fill({ color: bar.fillColor });
		g.roundRect(left, top, width, HP_BAR_HEIGHT, radius);
		g.fill({ color: 0xffffff, alpha: 0.3 });
		if (fillWidth > 0) {
			g.roundRect(left, top, Math.max(fillWidth, HP_BAR_HEIGHT), HP_BAR_HEIGHT, radius);
			g.fill({ color: bar.fillColor });
		}
		// Draw with the actor's feet depth so nearer fighters' bars sit in front.
		g.zIndex = actor.y + HP_BAR_GAP;

		// The current/max readout, centred in the bar and just above it in depth.
		bar.label.x = actor.x;
		bar.label.y = top + HP_BAR_HEIGHT / 2;
		bar.label.zIndex = actor.y + HP_BAR_GAP + 1;
	}

	/** Keep the actor's combat readout floating just above its head, always on top. */
	private updateLabel(actor: Actor): void {
		const label = actor.label;
		if (!label) return;
		label.x = actor.x;
		label.y = actor.y - actor.displayHeight - 12;
		label.zIndex = actor.y + 10000;
	}

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
				// The final step may be overridden to an exact point (a fighter's half
				// of a shared duel cell) instead of the cell's standing mark.
				const override = actor.pathQueue.length === 0 ? actor.finalTarget : null;
				if (actor.pathQueue.length === 0) actor.finalTarget = null;
				const target = override ?? this.hexMark(next.q, next.r);
				actor.stepDir = Math.sign(target.x - actor.x) || actor.stepDir || 1;
				actor.targetX = target.x;
				actor.targetY = target.y;
				actor.moving = true;
			}
		}

		if (actor.moving) {
			// Advance along the straight line to the target hex. Pointy-top steps along
			// a row are purely horizontal; steps that change row also shift half a
			// column sideways, so they move diagonally.
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

	/**
	 * Advance a knocked-out actor's fade: dim its sprite (and HP bar) toward zero over
	 * the fade's lifetime while it holds its hurt pose, then remove it from the board
	 * and resolve. The hurt frame was pinned when the fade began, so nothing here
	 * advances playback.
	 */
	private advanceFade(actor: Actor, deltaMs: number): void {
		const fade = actor.fade;
		if (!fade) return;
		fade.elapsed += deltaMs;
		const alpha = Math.max(0, 1 - fade.elapsed / fade.total);
		actor.sprite.alpha = alpha;
		if (actor.hpBar) {
			actor.hpBar.graphics.alpha = alpha;
			actor.hpBar.label.alpha = alpha;
		}
		if (actor.label) actor.label.alpha = alpha;
		if (fade.elapsed >= fade.total) {
			actor.fade = null;
			this.removeActor(actor);
			fade.resolve();
		}
	}

	/** Destroy an actor's display objects and drop it from the board for good. */
	private removeActor(actor: Actor): void {
		this.clearAura(actor.id);
		this.clearStrikeLabel(actor.id);
		actor.sprite.parent?.removeChild(actor.sprite);
		actor.sprite.destroy();
		if (actor.hpBar) {
			actor.hpBar.graphics.parent?.removeChild(actor.hpBar.graphics);
			actor.hpBar.graphics.destroy();
			actor.hpBar.label.parent?.removeChild(actor.hpBar.label);
			actor.hpBar.label.destroy();
			actor.hpBar = null;
		}
		this.actors = this.actors.filter((a) => a.id !== actor.id);
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

	/**
	 * Walk an actor through the given cells (excluding its current one). When
	 * `finalPoint` is given the walk's last step lands on that exact screen point
	 * instead of the last cell's standing mark, so approaches that end off-centre
	 * (a fighter's half of a shared duel cell) stay one continuous motion. With no
	 * cells to walk it still glides straight to `finalPoint` if it isn't there yet.
	 */
	private walkCells(actor: Actor, cells: Hex[], finalPoint?: Point): Promise<void> {
		return new Promise((resolve) => {
			if (cells.length === 0) {
				if (finalPoint && (actor.x !== finalPoint.x || actor.y !== finalPoint.y)) {
					actor.stepDir = Math.sign(finalPoint.x - actor.x) || actor.stepDir || 1;
					actor.targetX = finalPoint.x;
					actor.targetY = finalPoint.y;
					actor.moving = true;
					actor.onArrive = resolve;
					return;
				}
				resolve();
				return;
			}
			actor.finalTarget = finalPoint ?? null;
			actor.pathQueue = [...cells];
			actor.onArrive = resolve;
		});
	}

	/**
	 * Walk two fighters toward each other until they stand side by side on the
	 * same row (immediately horizontal cells), each staying on its own colour or
	 * the shared white column. When `meetingCell` is given, the red fighter
	 * walks to that exact cell and the blue fighter to its east neighbour;
	 * otherwise the cheapest meeting pair is searched. Each walk ends on the
	 * meeting cell itself, split down its midline — red's sprite stops flush
	 * against it from the left, blue's from the right — so the pair shares the
	 * cell face to face without overlapping. Resolves once both have settled.
	 * Ids may be given in any order (sides are inferred).
	 */
	async meleeApproach(aId: string, bId: string, meetingCell?: Hex): Promise<void> {
		const a = this.findActor(aId);
		const b = this.findActor(bId);
		if (!a || !b) return;
		// Infer which fighter is on the red half (starts left) vs blue (right).
		const red = a.homeCell <= b.homeCell ? a : b;
		const blue = red === a ? b : a;
		// Route both fighters around any other character standing in the way (the two
		// duelists themselves are excluded so they don't block each other); if that
		// leaves no legal meeting, fall back to the side-only search.
		const blocked = this.occupied([red, blue]);
		const meeting =
			findMeleeMeeting(this.cellOf(red), this.cellOf(blue), meetingCell, blocked) ??
			findMeleeMeeting(this.cellOf(red), this.cellOf(blue), meetingCell);
		if (!meeting) return;

		// Split the meeting cell down its midline, one half each, without the two
		// sprites overlapping: red walks until its sprite's right edge stops at the
		// midline, blue until its left edge starts there, so they stand face to face
		// across the boundary. Extents come from each sprite's current frame (anchor
		// fraction × scaled width; blue is mirrored, so its lead edge is the frame's
		// far side). Logical cells are untouched (blue still counts as standing on
		// its east-neighbour cell); only the final step's landing point is offset.
		const centre = this.hexCoord(meeting.red.destination.q, meeting.red.destination.r);
		const footY = centre.y + HEX_FOOT_Y; // duel pair stands on the lower-corner line too
		const mid = this.project(centre.x, footY);
		const redLead = (1 - red.sprite.anchor.x) * Math.abs(red.sprite.width);
		const blueLead = (1 - blue.sprite.anchor.x) * Math.abs(blue.sprite.width);
		await Promise.all([
			this.walkCells(red, meeting.red.path.slice(1), { x: mid.x - redLead, y: mid.y }),
			this.walkCells(blue, meeting.blue.path.slice(1), { x: mid.x + blueLead, y: mid.y })
		]);
	}

	/**
	 * The cells an actor may occupy: nobody crosses the central white column, so a
	 * red-side fighter stays on red or the shared white line (q ≤ 0) and a blue-side
	 * fighter stays strictly on blue (q ≥ 1) — blue never even enters the white
	 * cells. Every combat move is confined to this predicate.
	 */
	private sideAllowed(actor: Actor): (c: Hex) => boolean {
		if (cellSide(actor.homeCell) === 'blue') {
			return (c) => isBoardCell(c.q, c.r) && cellSide(c.q) === 'blue';
		}
		return (c) => isBoardCell(c.q, c.r) && cellSide(c.q) !== 'blue';
	}

	/**
	 * Predicate: is a cell currently occupied by an actor other than those in
	 * `exclude`? Used to keep a moving fighter from stepping onto (or through) a
	 * cell another character is standing on; the movers themselves are excluded so
	 * their own start cell never counts as blocked.
	 */
	private occupied(exclude: Actor[]): (c: Hex) => boolean {
		const taken = new Set<string>();
		for (const other of this.actors) {
			if (exclude.includes(other)) continue;
			taken.add(`${other.cell},${other.rowFront}`);
		}
		return (c) => taken.has(`${c.q},${c.r}`);
	}

	/** The side rule combined with occupancy: `actor` may walk a cell only if it's
	 * on its own side and no other character is standing there. */
	private walkAllowed(actor: Actor): (c: Hex) => boolean {
		const side = this.sideAllowed(actor);
		const blocked = this.occupied([actor]);
		return (c) => side(c) && !blocked(c);
	}

	/**
	 * Settle an actor onto the standing mark of `cell`, claiming the whole cell —
	 * used when a duel's winner takes over the meeting cell once the loser leaves,
	 * moving from its half of the cell to its centre. Purely visual: the actor's
	 * logical cell is untouched, so a later duel on this cell re-splits it into
	 * halves as usual.
	 */
	async claimCell(id: string, cell: Hex): Promise<void> {
		const actor = this.findActor(id);
		if (!actor) return;
		await this.walkCells(actor, [], this.hexMark(cell.q, cell.r));
	}

	/**
	 * Tint a cell in one side's colour while an occupant holds it, or restore the
	 * base board colour with null. The overlay redraws the hex's fill and outline
	 * above the base grid but beneath the characters.
	 */
	paintCell(cell: Hex, side: 'red' | 'blue' | null): void {
		if (!this.app) return;
		const k = `${cell.q},${cell.r}`;
		const existing = this.cellPaint.get(k);
		if (existing) {
			existing.parent?.removeChild(existing);
			existing.destroy();
			this.cellPaint.delete(k);
		}
		if (!side) return;

		const color = side === 'red' ? this.options.grids[0].color : this.options.grids[1].color;
		const centre = this.hexCoord(cell.q, cell.r);
		const pts: number[] = [];
		for (const corner of HEX_CORNERS) {
			const p = this.project(centre.x + corner.x, centre.y + corner.y);
			pts.push(p.x, p.y);
		}
		const graphics = new Graphics();
		graphics.poly(pts);
		// Stronger fill than the base grid's 0.08 so the takeover reads clearly.
		graphics.fill({ color, alpha: 0.35 });
		graphics.stroke({ width: 2, color, alpha: 1 });
		graphics.zIndex = 0.5; // above the base grid (0), below the actors
		this.app.stage.addChild(graphics);
		this.cellPaint.set(k, graphics);
	}

	/** Walk an actor back to the cell it started on, staying on its own side. */
	async returnHome(id: string): Promise<void> {
		const actor = this.findActor(id);
		if (!actor) return;
		const home: Hex = { q: actor.homeCell, r: actor.homeRow };
		// Route around other characters when a clear path exists; if occupancy boxes
		// it in, fall back to the side-only path so the actor still reaches home.
		const path =
			findPath(this.cellOf(actor), home, this.walkAllowed(actor)) ??
			findPath(this.cellOf(actor), home, this.sideAllowed(actor));
		if (!path) return;
		// Passing the home mark as the walk's end point also covers the fighter
		// whose home *is* the cell it logically occupies but who is standing half a
		// cell off centre after a shared-cell duel — it glides straight back.
		await this.walkCells(actor, path.slice(1), this.hexMark(home.q, home.r));
	}

	/**
	 * Knock a fighter out where it stands: freeze it on its hurt flinch, then fade
	 * it (and its HP bar) out over {@link KNOCKOUT_FADE_MS} and
	 * remove it from the board entirely. Resolves once it's gone. Any in-flight
	 * movement or one-shot is cancelled so the hurt pose owns the sprite as it
	 * dissolves.
	 */
	knockOut(id: string): Promise<void> {
		const actor = this.findActor(id);
		if (!actor) return Promise.resolve();
		// Hold the hurt flinch (its last, most-crumpled frame) rather than looping or
		// snapping back to idle.
		const hurt = actor.hurtAnim ? actor.animations[actor.hurtAnim] : undefined;
		if (hurt && hurt.length > 0) {
			this.setAnimation(actor, actor.hurtAnim);
			actor.frameIndex = hurt.length - 1;
			actor.frameElapsed = 0;
		}
		this.applyFrame(actor);
		// Stop everything else that could drive the sprite while it fades.
		actor.oneShot = null;
		actor.moving = false;
		actor.pathQueue = [];
		actor.onArrive = null;
		this.clearAura(id);
		return new Promise((resolve) => {
			actor.fade = { total: KNOCKOUT_FADE_MS, elapsed: 0, resolve };
		});
	}

	/**
	 * Back an actor off to shoot: walk it to the cell furthest from the central
	 * column on its own side, so its ranged attack fires from as deep in its
	 * territory as the board allows. Resolves once it has settled there.
	 */
	async retreat(id: string): Promise<void> {
		const actor = this.findActor(id);
		if (!actor) return;
		const retreat =
			findRetreatCell(this.cellOf(actor), this.walkAllowed(actor)) ??
			findRetreatCell(this.cellOf(actor), this.sideAllowed(actor));
		if (!retreat) return;
		await this.walkCells(actor, retreat.path.slice(1));
	}

	/**
	 * Walk a (melee) actor as close to `targetId` as its own side allows. It never
	 * crosses the white line, so against a foe who backed off to shoot it advances
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
	 * Fire `move`'s projectile from `shooterId` toward `targetId`: the shooter plays
	 * the move's own pose while its projectile sprite flies across the board.
	 * Resolves once the projectile reaches the target. If the move binds no
	 * projectile it still flies a small dot, so combat keeps its beat.
	 */
	shoot(shooterId: string, targetId: string, move: CharacterMove): Promise<void> {
		const shooter = this.findActor(shooterId);
		const target = this.findActor(targetId);
		if (!this.app || !shooter || !target) return Promise.resolve();

		// Play the firing pose; it recovers to idle on its own, so don't block on it.
		void this.playMove(shooterId, move);

		const from = this.chestPoint(shooter);
		const to = this.chestPoint(target);
		const projName = move.projectile?.source;
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
	 * Play one of a character's defined moves as a one-shot pose and resolve when
	 * it finishes. If the move binds no animation (or it failed to load), resolves
	 * immediately so combat still flows.
	 */
	playMove(id: string, move: CharacterMove): Promise<void> {
		return this.playAnimationOnce(id, move.source);
	}

	/** Play a character's hurt flinch once; resolves when it finishes. */
	playHurt(id: string): Promise<void> {
		const actor = this.findActor(id);
		return this.playAnimationOnce(id, actor?.hurtAnim ?? '');
	}

	/**
	 * Burn a looping aura of `color` behind a character for the round. The frames
	 * come from static/auras/<color>/ (scripts/generate-auras.js); the aura sits
	 * base-down at the actor's feet, scaled to envelop the character, and follows
	 * it as it moves. Replaces any aura the actor already has.
	 */
	async showAura(id: string, color: string): Promise<void> {
		const actor = this.findActor(id);
		if (!actor || !this.app) return;
		const frames = await this.loadAuraFrames(color);
		if (frames.length === 0) return;
		// The board may have been torn down (or the aura replaced) while loading.
		if (!this.app || !this.actors.includes(actor)) return;
		this.clearAura(id);

		const sprite = new Sprite(frames[0]);
		// Base-down behind the character: bottom-centre on the actor's feet. The
		// flame is stretched per axis to envelop the character's nominal size, so
		// wide and tall sprites alike sit inside their aura.
		sprite.anchor.set(0.5, 1);
		sprite.scale.set(
			(actor.displayWidth * AURA_WIDTH_RATIO) / frames[0].width,
			(actor.displayHeight * AURA_HEIGHT_RATIO) / frames[0].height
		);
		sprite.alpha = 0.85;
		sprite.x = actor.x;
		sprite.y = actor.y;
		sprite.zIndex = actor.y - 0.5;
		this.app.stage.addChild(sprite);
		actor.aura = { sprite, frames, frameIndex: 0, frameElapsed: 0 };
	}

	/** Put out a character's aura, if it has one. */
	clearAura(id: string): void {
		const actor = this.findActor(id);
		if (!actor?.aura) return;
		actor.aura.sprite.parent?.removeChild(actor.aura.sprite);
		actor.aura.sprite.destroy();
		actor.aura = null;
	}

	/** Put out every aura on the board. */
	clearAuras(): void {
		for (const actor of this.actors) this.clearAura(actor.id);
	}

	/**
	 * Set a character's HP bar to `hp` out of `maxHp`. The bar eases toward the new
	 * fill over the next few ticks — animating both its width and its
	 * green→yellow→red colour — and shows the `hp/maxHp` numbers inside it.
	 */
	setHp(id: string, hp: number, maxHp: number): void {
		const actor = this.findActor(id);
		if (!actor?.hpBar) return;
		const safeMax = maxHp > 0 ? maxHp : 1;
		actor.hpBar.targetRatio = Math.max(0, Math.min(1, hp / safeMax));
		actor.hpBar.label.text = `${Math.max(0, Math.round(hp))}/${Math.round(maxHp)}`;
	}

	/**
	 * Float a combat readout above a character — the strike multiplier of its
	 * throw ×100 (50 / 100 / 200) — tinted in the thrown `color`, so the two
	 * fighters' numbers can be compared during a duel (higher deals more, and
	 * wins). Replaces any existing label.
	 */
	showStrikeLabel(id: string, value: number, color: string): void {
		const actor = this.findActor(id);
		if (!actor || !this.app) return;
		this.clearStrikeLabel(id);
		const label = new Text({
			text: String(value),
			style: {
				fill: combatColorHex(color),
				fontSize: 40,
				fontWeight: '900',
				fontFamily: 'system-ui, sans-serif',
				stroke: { color: 0x000000, width: 6 },
				align: 'center'
			}
		});
		label.anchor.set(0.5, 1);
		this.app.stage.addChild(label);
		actor.label = label;
		this.updateLabel(actor);
	}

	/**
	 * Flash a slash mark over a struck fighter in the attacker's `color`. Two bold
	 * crossing strokes are drawn at the actor's mid-body; the effect scales in and
	 * fades out on its own via the tick loop, so callers fire and forget.
	 */
	showSlash(id: string, color: string): void {
		const actor = this.findActor(id);
		if (!actor || !this.app) return;
		const reach = Math.max(actor.displayWidth, actor.displayHeight) * 0.55;
		const hex = combatColorHex(color);
		const graphics = new Graphics();
		// A slashing "X": two diagonal strokes, a dark backing under a bright core so
		// the mark reads over any character.
		const strokes: [number, number][][] = [
			[
				[-reach, -reach],
				[reach, reach]
			],
			[
				[reach, -reach],
				[-reach, reach]
			]
		];
		for (const [[x1, y1], [x2, y2]] of strokes) {
			graphics.moveTo(x1, y1).lineTo(x2, y2);
		}
		graphics.stroke({ width: 12, color: 0x000000, alpha: 0.6, cap: 'round' });
		for (const [[x1, y1], [x2, y2]] of strokes) {
			graphics.moveTo(x1, y1).lineTo(x2, y2);
		}
		graphics.stroke({ width: 6, color: hex, cap: 'round' });
		graphics.x = actor.x;
		graphics.y = actor.y - actor.displayHeight * 0.5;
		graphics.zIndex = actor.y + 20000; // above sprites, auras and labels
		this.app.stage.addChild(graphics);
		this.slashes.push({ graphics, elapsed: 0 });
	}

	/** Remove a character's combat readout, if it has one. */
	clearStrikeLabel(id: string): void {
		const actor = this.findActor(id);
		if (!actor?.label) return;
		actor.label.parent?.removeChild(actor.label);
		actor.label.destroy();
		actor.label = null;
	}

	/** Clear every combat readout on the board. */
	clearStrikeLabels(): void {
		for (const actor of this.actors) this.clearStrikeLabel(actor.id);
	}

	/** Load (and cache) the frame textures of one aura color. Resolves to an
	 * empty list for colors with no generated frames, so callers can no-op. */
	private async loadAuraFrames(color: string): Promise<Texture[]> {
		const cached = this.auraTextures.get(color);
		if (cached) return cached;
		try {
			const frames = await Promise.all(
				Array.from({ length: AURA_FRAMES }, (_, i) =>
					Assets.load<Texture>(`/assets/auras/${color}/${i + 1}.png`)
				)
			);
			this.auraTextures.set(color, frames);
			return frames;
		} catch {
			return [];
		}
	}

	/**
	 * Play a loaded raw animation as a one-shot and resolve when it finishes. If
	 * the actor has no such animation, resolves immediately so combat still flows.
	 */
	private playAnimationOnce(id: string, name: string): Promise<void> {
		const actor = this.findActor(id);
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
