import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { destroyPixiApp } from '../pixi/release-context';
import type { Manifest } from './mugen-player';
import { characterFitScale, REFERENCE_SOURCE_HEIGHT } from '../card/character-fit';
import { characterIdFromFramesPath, readRenderScale } from './character-render-scale';
import { type Crown, paintedCrown, readCrownAlign } from './character-crown';
import type { CharacterDefinition, CharacterMove } from '../../types/character-definition.type';
import {
	BOARD_HEIGHT,
	BOARD_WIDTH,
	boardCells,
	type Cell,
	cellCenter,
	cellFoot,
	cellSide,
	type CellSide,
	FIRST_COLUMN,
	findClosestApproach,
	findMeleeMeeting,
	findPath,
	hexCorners,
	isBoardCell,
	LAST_COLUMN,
	MIDDLE_ROW
} from './grid';

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
	 * Character definition id (matches `public/characters/<id>/definition.json`). When set,
	 * its `directions` bindings drive the move-left/move-right animations used while
	 * combat walks the actor; without it both fall back to `run`.
	 */
	id?: string;
}

/** A character placed on a specific board cell. */
export interface PlacedCharacter extends BoardCharacter {
	/** Column (q) of the cell to stand on. Sign must match the grid's half. */
	q: number;
	/** Row (r) of the cell to stand on, counted down the screen. */
	r: number;
}

/** One half of the board: its border colour and the characters standing on it. */
export interface BoardGrid {
	/** Grid line / fill colour, e.g. 0xff0000 for red. */
	color: number;
	/**
	 * The half's lead character. Give it `q`/`r` to stand it on a specific cell;
	 * without them it takes the half's default lead cell ({@link LEAD_CELLS}).
	 */
	character: BoardCharacter | PlacedCharacter;
	/**
	 * Extra characters standing idle on this half of the board, each pinned to its
	 * own cell. They loop their animation in place until combat walks them.
	 */
	extras?: PlacedCharacter[];
}

export interface MugenBoardOptions {
	grids: [BoardGrid, BoardGrid];
	/** Width of a single grid cell, in pixels — the hexagon's short way across, which is
	 * also how far apart two neighbours on a row stand. Every cell is this wide. */
	cellSize?: number;
	/** Outer padding around the grid, in pixels. */
	padding?: number;
	/** Colour of the central column (q = 0), the shared ground between the halves. */
	centerColor?: number;
}

const DEFAULTS = {
	// A cell's width in canvas px. Five columns of it is very nearly the whole board's
	// width, so this is what decides the canvas's resolution: enough that the arena —
	// which scales the canvas to fit the viewport (see MAX_CANVAS_HEIGHT) — is always
	// scaling it *down* rather than up, which is what keeps the pixel art crisp.
	cellSize: 220,
	padding: 40,
	centerColor: 0xffffff // white
};

// --- Board layout (a field of pointy-topped hexagons) -----------------------
// The grid is drawn face-on: no tilt, no vanishing point, no per-row scaling.
// A cell is the same hexagon of `cellSize` px across wherever it sits, so a
// character keeps its size wherever it walks, because there is no depth for it to
// walk into. Where a cell *is* comes from the grid module — `cellCenter`,
// `cellFoot` and `hexCorners`, all in cell widths off the grid's top-left corner —
// so the only arithmetic here is the scale by `cellSize` and the translation into
// the canvas ({@link MugenBoard.project}). Cells left of centre are the first
// grid's colour, cells to the right the second's.

/**
 * The colour every line of the grid is drawn in. The lattice is not a side's marking —
 * it is the board itself — so it is one colour all the way across, and black is the one
 * that says "ruled line" over the pale fills the halves are tinted with.
 */
const GRID_LINE = 0x000000;

/**
 * The most of the viewport's height the canvas may take.
 *
 * The board is a wide field — five columns by three rows — but the characters
 * standing on it are taller than their cells, so scaling it to its container's *width*,
 * which is all `max-width` can do, can still run it off the bottom of
 * the screen. Both axes are capped instead: a canvas has an intrinsic size, so one
 * given two maxima and no size of its own shrinks to fit inside both while keeping its
 * aspect ratio, which is what puts the whole board on screen however the window is
 * shaped. What is left of the height is the room the arena's own score row and buttons
 * stand in above and below it.
 */
const MAX_CANVAS_HEIGHT = '70vh';

/** On-screen height of a reference-height ({@link REFERENCE_SOURCE_HEIGHT}) character
 * as a multiple of a cell's width — the height of the box every character is fitted
 * into. Every other character scales by the same source→screen ratio, so shorter/taller
 * sprites read shorter/taller; anything taller than the reference is brought back to
 * this height rather than standing out of its cell. */
const CHAR_HEIGHT_RATIO = 1.3;

/**
 * The room the canvas keeps above the grid, in cell widths: **a whole cell of it**,
 * empty, on top of everything else drawn.
 *
 * A character plants its feet on its cell's foot line and stands taller than the cell
 * ({@link CHAR_HEIGHT_RATIO}), so everybody on the top row is partly above the grid to
 * begin with — but the exact amount is not something this can be worked out from. A
 * character's own `renderScale` rides along on the fit, so one drawn small in its source
 * sheet is scaled up past that cap; a pose is not the height of the cycle it belongs to;
 * an aura is drawn to envelop the whole sprite; and a callout floats clear above the
 * fighter's head. Only the first of those is even known when the canvas is sized, and
 * every one of them reaches up out of the top row.
 *
 * So the room is not calculated, it is reserved: a full cell width, which is more than a
 * row's own step down the board and more than any of them needs, and is the one
 * measurement on this board that is guaranteed to be enough.
 * Everything else is pushed down by it, and {@link MugenBoard.fitToContent} is careful
 * not to crop it back off.
 */
const HEAD_ROOM = 1;

// --- The coordinate gutter (a chessboard's letters and numbers) ---------------
// A cell is still named the way a chess square is — its column's letter and its row's
// number, `columnLabel`/`rowLabel` — but the names are not drawn on the board any more.
// They were printed along two edges, a letter under each column and a number beside
// each row, in a gutter a third of a cell wide taken off the left-hand side and out of
// the bottom. Nothing in the game is played by naming a cell: an order is given by
// tapping a fighter, and where it then walks is watched rather than read off a
// coordinate. So the band was a third of a cell of canvas spent on a reading nobody
// takes, and on a board scaled to fit its box that is a third of a cell the fight
// itself does not get. The names live on in `grid.ts`, where the combat log still
// says which cell a fighter moved to.

/**
 * Top→bottom screen position of the cell — rows run down the screen, so it is the
 * row itself. Callers outside the engine (the arena's line-up, the saved board's
 * lane numbering) sort by it to lay characters out top-of-board first, and go on
 * asking the renderer which way its rows run rather than assuming it.
 */
export const cellScreenY = (cell: Cell): number => cell.r;

/** Horizontal speed (canvas px/s) a character runs between cells during combat. */
const MOVE_SPEED = 260;
/** Frames of an aura animation (static/auras/<color>/1..N.png). */
const AURA_FRAMES = 4;
/** How long each aura frame shows (ms). */
const AURA_FRAME_MS = 120;
/** How far the aura flame overhangs the character it envelops, per axis: the
 * flame is stretched to this multiple of the actor's nominal display size. */
const AURA_WIDTH_RATIO = 1.7;
const AURA_HEIGHT_RATIO = 1.25;
/**
 * How long the flame takes to well up from the fighter's feet to its full height.
 *
 * An aura is not a thing that switches on — it is the fighter having loaded, and that
 * is an act, so it is drawn as one: the flame comes up off the ground it is standing
 * on and reaches its height. Short enough to be over inside the beat the orders are
 * read out in ({@link CombatController}'s reveal), because it is what *says* the
 * fighter loaded and cannot still be arriving once the shooting starts.
 */
const AURA_RISE_MS = 320;
/** How much of its width the flame starts with, as it leaves the ground. Not zero:
 * a flame that grew from a point reads as a spark rather than as fire coming up, and
 * one that came up at full width is a flat smear across the feet on its first frames. */
const AURA_RISE_WIDTH = 0.7;

/**
 * Where each half's lead character stands when its grid doesn't say: the middle
 * row of each side's outer column, red facing blue across the board. A grid
 * overrides this by giving its `character` `q`/`r` of its own.
 */
const LEAD_CELLS: [Cell, Cell] = [
	{ q: FIRST_COLUMN, r: MIDDLE_ROW },
	{ q: LAST_COLUMN, r: MIDDLE_ROW }
];

/** The cell a half's lead character stands on: its own `q`/`r`, or `fallback`. */
const leadCell = (grid: BoardGrid, fallback: Cell): Cell =>
	'q' in grid.character ? { q: grid.character.q, r: grid.character.r } : fallback;

/**
 * How far to move a character sideways so its **crown** — the middle of the highest
 * painted pixels of the pose it stands in — sits over the middle of its cell, instead of
 * the MUGEN axis it is drawn around doing so. See {@link paintedCrown} for why the axis
 * is the wrong point to stand a fighter on.
 *
 * Read off the standing cycle, taking the frame whose paint reaches **highest**: that is
 * the character's tallest point, and it is the one the phrase names. Every frame is
 * bottom-aligned on the board's foot line ({@link MugenBoard.applyFrame} anchors at 1),
 * so how high a frame reaches is its own height less the empty rows above its artwork —
 * which is why the frames' differing heights are no obstacle to comparing them.
 *
 * The answer is in screen px at `scale`, and already mirrored for a `flip`ped half: a
 * sprite drawn with a negative x-scale is reflected about its anchor, so the crown a
 * fighter's own artwork puts to its left appears to its right, and the correction that
 * brings it back has to turn round with it.
 *
 * Zero when nothing can be read — an empty cycle, artwork a canvas will not give up its
 * pixels for. A fighter stood on its axis is the placement this board had all along, so
 * failing to improve on it costs nothing.
 */
function crownCorrection(frames: LoadedFrame[], scale: number, flip: boolean): number {
	let best: { frame: LoadedFrame; crown: Crown; reach: number } | null = null;
	for (const frame of frames) {
		const crown = paintedCrown(frame.texture.source.resource, frame.width, frame.height);
		if (!crown) continue;
		const reach = frame.height - crown.top;
		if (!best || reach > best.reach) best = { frame, crown, reach };
	}
	if (!best) return 0;
	// Both in the frame's own pixels, off its left edge: where the crown is, and where the
	// axis the sprite is anchored at is. The gap between them is what has to be undone.
	const axis = best.frame.anchorX * best.frame.width;
	return (flip ? 1 : -1) * (best.crown.x - axis) * scale;
}

/** Canvas hex for each combat colour, for tinting callouts and slashes. */
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

// --- Order buttons (drawn on the board, beside the fighter they command) -----
/** Horizontal gap (px) from the actor's own side to the near edge of its column of
 * buttons, whichever shoulder that column is standing off. */
const ORDER_GAP = 8;
/**
 * How many orders a column is sized to hold. A fighter that can be ordered at all is
 * given all three of them (charge, defend, shoot), so the column is drawn to come to
 * exactly one cell of the grid: it is as tall as the ground its fighter is standing on,
 * which is what keeps it beside that fighter and out of the lane above. A list of some
 * other length keeps this button size and simply runs shorter or longer.
 */
const ORDER_COLUMN_COUNT = 3;
/** Gap between buttons in a column, as a fraction of a button's height. */
const ORDER_SPACING_RATIO = 0.12;
/** A button's height as a fraction of a cell's side: the count and the gaps above,
 * solved so that many buttons and the gaps between them span one whole cell. */
const ORDER_HEIGHT_RATIO =
	1 / (ORDER_COLUMN_COUNT + (ORDER_COLUMN_COUNT - 1) * ORDER_SPACING_RATIO);
/** A button's width as a fraction of its own height, which is all that is left to say
 * about its size once {@link ORDER_HEIGHT_RATIO} has set the height. */
const ORDER_WIDTH_RATIO = 1.11;
/** The glyph's size inside a button, as a fraction of the button's height. */
const ORDER_ICON_RATIO = 0.62;
/** Corner rounding, as a fraction of a button's height. */
const ORDER_RADIUS_RATIO = 0.22;
/** Fill of a button nobody has chosen, and of one that cannot be chosen. */
const ORDER_IDLE_FILL = 0x1f2937;
const ORDER_DISABLED_FILL = 0x374151;
/** How far the glyph on a disabled button fades toward its background. */
const ORDER_DISABLED_ALPHA = 0.35;

// --- Trait badges (drawn on the board, at the top-left corner of a fighter) ---
/**
 * The white disc one gift is drawn on: 48 canvas px across, whatever it belongs to.
 *
 * A fixed size, not a fraction of the fighter — which is what it used to be, and meant
 * every character wore its gifts at a different size, a wide sprite carrying a bigger
 * coin than a narrow one for no reason a player could read. A badge says the same thing
 * about every fighter, so it is the same mark on all of them.
 *
 * Canvas px: the unit the whole board is laid out in ({@link DEFAULTS.cellSize} and the
 * rest), so a disc is 48 against a cell's 220 — a little under a quarter of a cell —
 * however the finished canvas is then scaled to fit its box.
 */
const TRAIT_DISC_PX = 48;
/** The glyph inside that disc, as a fraction of it. Under one, so the corners of a glyph
 * drawn to the edges of its own box (a sword lies across its) still land on white rather
 * than off the rim. */
const TRAIT_GLYPH_RATIO = 0.8;
/** Gap between a compound's two discs, as a fraction of one disc. */
const TRAIT_SPACING_RATIO = 0.2;
/** How far a spent trait's glyph fades. It is not taken off the fighter — what a
 * card *is* does not change — it simply stops reading as something still in hand. */
const TRAIT_SPENT_ALPHA = 0.25;

/**
 * The square each icon SVG is rasterised into, in px, before anything draws it.
 *
 * An SVG is resolution-independent right up to the moment something turns it into pixels,
 * and then the size it is turned into is the only resolution it will ever have. Pixi
 * rasterises one at its *intrinsic* size — whatever the file's own `width`/`height` say —
 * so leaving that to the file means leaving the artwork's resolution to an attribute
 * written for some other purpose entirely. The three glyphs the board draws had
 * `width="1em"`, which is 16px in a standalone document: they were being baked into 16×16
 * bitmaps and then drawn at three times that. Hence "fuzzy as fuck" — every one of them
 * was a 16-pixel picture blown up. (Those three have since been put back into the form
 * their 4,180 siblings are in, `viewBox` and a white fill and nothing about size, but the
 * lesson is that the *board* should name the resolution it wants rather than inherit one.)
 *
 * 256 is a generous square for it: the largest anything draws one of these at is about
 * 48px (a trait disc, an order button's glyph), so there is resolution to spare for a
 * high-dpi screen, and it is a power of two, which is what the mipmap chain that keeps
 * the downscale from shimmering wants. Square, because the artwork is
 * (`viewBox="0 0 512 512"` throughout the set) — and one that is not simply sits centred
 * inside the square, undistorted, since an SVG scaled into a box keeps its aspect ratio.
 */
const ICON_RASTER_PX = 256;

/** Lifetime of a strike slash overlay (ms). */
const SLASH_MS = 420;

/** How far a cell's callout is lifted clear of the heads of whoever is standing in it,
 * in cells. Small: it is meant to sit just over the pair it is about. */
const CELL_CALLOUT_GAP = 0.08;

// --- The guard ring (drawn around a fighter holding its defend stance) ---
/** The ring's radius, as a fraction of half the character's longer nominal side. A little
 * over one, so the circle stands clear of the sprite instead of cutting across it. */
const GUARD_RING_RATIO = 1.08;
/** How thick the ring is drawn, in canvas px — read against a cell's 220. */
const GUARD_RING_WIDTH = 5;

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
 * A combat aura burning behind an actor — the color it throws this round.
 * Frames come from static/auras/<color>/ (scripts/generate-auras.js) and loop
 * for as long as the aura is shown.
 */
interface Aura {
	sprite: Sprite;
	frames: Texture[];
	frameIndex: number;
	frameElapsed: number;
	/** The size the flame settles at, once it is all the way up — what the rise below
	 * is a fraction of, kept here because the sprite's own scale is mid-rise. */
	scaleX: number;
	scaleY: number;
	/** How far into {@link AURA_RISE_MS} the flame is. It only ever counts up, and at
	 * the end of it the aura is simply burning. */
	rise: number;
}

/** A transient slash mark drawn over a struck fighter, in the attacker's colour.
 * It scales in and fades out over {@link SLASH_MS}, then removes itself. */
interface SlashEffect {
	graphics: Graphics;
	elapsed: number;
}

/**
 * One order a fighter can be given, drawn as a button beside it. The board knows
 * nothing about what an order *means* — it draws what it is handed and reports which
 * one was tapped, by the caller's own id.
 */
export interface BoardOrder {
	/** The caller's id for this order, handed back when the button is tapped. */
	id: string;
	/** URL of the glyph drawn inside the button (an SVG under /assets). The artwork
	 * must be white: it is tinted, and tinting only ever darkens. */
	icon: string;
	/** Drawn as the chosen one, in {@link color} or failing that its side's colour. */
	selected: boolean;
	/** Drawn greyed, and taps on it are ignored. */
	disabled: boolean;
	/**
	 * Drawn but never reported: no pointer, no cursor, taps pass through it. A column of
	 * these is a reading of a fighter rather than a way of commanding one — which is what
	 * a rival's orders are, since they are shown only once they have been carried out.
	 */
	readonly?: boolean;
	/**
	 * Combat colour name to fill this button with when it is the chosen one. Left out, the
	 * chosen order takes the colour of the *side* the fighter belongs to, which is what
	 * says "these are yours" about a column the player is giving orders in. A column that
	 * is only reporting has no such job, so it names the fighter's own colour instead and
	 * the order that was carried out is marked in the colour of whoever carried it out.
	 */
	color?: string;
}

/**
 * One thing a fighter's colour hands it for free, drawn as a glyph at its top-left
 * corner. As with an order, the board is told what to draw and nothing about what it
 * means: a picture, and whether it has been used up.
 */
export interface BoardTrait {
	/** URL of the glyph (an SVG under /assets). The artwork must be white: it is
	 * tinted, and tinting only ever darkens. */
	icon: string;
	/** Drawn faded — the fighter still has this colour, but no longer this gift. */
	spent: boolean;
}

/** One drawn order button, kept so its look can be updated without rebuilding it. */
interface OrderButton {
	id: string;
	container: Container;
	face: Graphics;
	glyph: Sprite;
	selected: boolean;
	disabled: boolean;
	/** Combat colour name for the chosen fill, or null to take the side's colour. */
	color: string | null;
}

/** Which side of its fighter a column of orders stands on. */
export type OrderSide = 'left' | 'right';

/** The column of order buttons beside one fighter. */
interface OrderStrip {
	container: Container;
	buttons: OrderButton[];
	side: OrderSide;
}

/** The marks of what one fighter's colour grants it — a white disc with a glyph on
 * it apiece — kept so a gift being spent only repaints them rather than fetching
 * their artwork all over again. */
interface TraitBadge {
	container: Container;
	/** One per gift: the disc and the glyph it carries, faded together. */
	marks: Container[];
	/** The icon URLs drawn, in order — what a fresh list is compared against. */
	icons: string[];
}


/** A character standing (and, during combat, running) on the board. */
interface Actor {
	/** Stable id (character id or basePath's first segment), used to command it. */
	id: string;
	sprite: Sprite;
	/** Which half the actor belongs to — the grid it was placed from, not the cell it
	 * is standing on: a fighter that has taken the white column still belongs to its
	 * own side, and must never be read as having changed halves. */
	side: CellSide;
	/** The cell the actor started on, so it can walk back after combat. */
	homeColumn: number;
	homeRow: number;
	/** Every loaded animation for this actor, keyed by name (idle, run, …). */
	animations: Record<string, LoadedFrame[]>;
	/**
	 * Screen px to move this fighter by so that its crown — the middle of the highest
	 * painted pixels of the pose it stands in ({@link paintedCrown}) — lands on the
	 * middle of whatever cell it is standing on, rather than its MUGEN axis doing so.
	 * Zero for a character whose head is already over its axis, and for one whose
	 * artwork could not be read.
	 *
	 * Held per actor rather than applied per frame: the axis is what aligns a cycle's
	 * frames to each other, so it goes on doing that, and this moves the whole fighter
	 * by one fixed amount. Already mirrored for the half it stands on, so it is simply
	 * added to a cell's standing mark ({@link MugenBoard.standPoint}).
	 */
	crownShift: number;
	/** Raw manifest anim key of the hurt flinch (movement animation), or `''`. */
	hurtAnim: string;
	currentName: string;
	frameIndex: number;
	frameElapsed: number;
	// Movement. Actors step cell to cell; `column`/`row` are the ones currently
	// occupied. Movement is programmatic (combat) via `pathQueue`.
	/** Row (r) the actor currently occupies. */
	row: number;
	/** Column (q) the actor currently occupies. */
	column: number;
	/** Raw manifest animation played while running right / left (from the JSON). */
	moveRightAnim: string;
	moveLeftAnim: string;
	/** Remaining cells to step through (programmatic movement). */
	pathQueue: Cell[];
	/**
	 * When set, the walk's final step targets this exact screen point instead of
	 * the last cell's standing mark — e.g. a fighter's half of a shared duel cell.
	 */
	finalTarget: Point | null;
	/** Called once the path queue empties. */
	onArrive: (() => void) | null;
	/** While set, a one-shot animation owns playback (movement/idle suspended). */
	oneShot: OneShot | null;
	/**
	 * A raw manifest animation name the actor **stands in** instead of idling — the guard a
	 * fighter braces into on a blow and holds for the rest of the turn. Unlike a
	 * {@link oneShot} it owns nothing: a walk still walks and a pose still plays over it,
	 * and it is what the actor comes back to when either finishes, rather than idle. Null
	 * when the actor simply stands (see {@link MugenBoard.holdMove}).
	 */
	stance: string | null;
	/** The looping combat aura shown behind the actor, or null. */
	aura: Aura | null;
	/**
	 * The ring drawn around the actor while it holds a {@link stance}, or null. It says
	 * the stance is *on* — a pose alone is a frame of animation, and a fighter braced
	 * against a blow looks much like one caught mid-swing — so the two go up and come down
	 * together (see {@link MugenBoard.holdMove}).
	 */
	ring: Graphics | null;
	/** Floating callout (what its turn amounted to) above the actor, so a turn every
	 * fighter acts in at once can be read one fighter at a time. Null when clear. */
	label: Text | null;
	/** The column of order buttons drawn beside this fighter, or null when it commands
	 * nothing (every rival, and the player's side once the fight is over). */
	orders: OrderStrip | null;
	/**
	 * The glyphs of what this fighter's colour grants it for free, drawn at its
	 * top-left corner, or null when nothing has been said about it. The glyphs
	 * themselves are fixed for the fight — a colour cannot change — so it is only ever
	 * rebuilt when the set does, and otherwise repainted as its gifts are spent.
	 */
	traits: TraitBadge | null;
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

/** A rectangle in stage coordinates — the shape `Container.getBounds()` returns, cut
 * down to the four numbers {@link contentCrop} reads off it. */
export interface ContentBounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

/** Breathing room kept on every side of the drawn board, so nothing sits hard against
 * the canvas edge — and so the small per-frame wobble in the bounds as animations play
 * has somewhere to go. */
const CROP_MARGIN = 8;

/**
 * The canvas the board is drawn on: where to put the stage's origin, and how big to make
 * the framebuffer. The two axes are answered by different things.
 *
 * **Across, it is the grid and nothing else.** `gridSpan` is the hexagons' own left and
 * right edges, and the canvas is cut to exactly that — no margin, nothing reserved. The
 * canvas is scaled to fit its box, so every pixel of canvas that is not board is scale
 * the board does not get: a strip kept clear down one side is the whole grid drawn
 * smaller for it. Fitting the width to the *drawn* bounds instead would hand that strip
 * to whichever fighter happens to be standing furthest out on the frame the crop is taken
 * from, which is both wasteful and arbitrary. So the hexagons run edge to edge and the
 * width of the canvas says the width of the board.
 *
 * What that costs is real and is the trade being made: a sprite wider than its cell on an
 * outer column, and the order strip hung off a fighter in one, are clipped at the canvas
 * edge rather than given room beside the board.
 *
 * **Down, it is the drawn bounds, centred.** The empty row above the grid
 * ({@link HEAD_ROOM}) is room for the auras, poses and callouts that reach up out of the
 * top row and are not drawn when this is taken, so the top is pinned at the layout's own
 * zero rather than cropped to whatever happens to be standing there — and the same depth
 * is then given back underneath, so the board sits in the middle of its canvas instead of
 * riding high in it. The pin is a floor and never a lid: anything drawn higher still
 * grows the crop.
 */
export function contentCrop(
	bounds: ContentBounds,
	gridSpan: { left: number; right: number },
	{ margin = CROP_MARGIN }: { margin?: number } = {}
): { left: number; top: number; width: number; height: number } {
	const centerY = (bounds.minY + bounds.maxY) / 2;
	// Half-extent: the furthest either side has to reach from the board's own middle.
	const halfHeight = Math.max(
		centerY - Math.min(0, bounds.minY - margin),
		bounds.maxY + margin - centerY
	);
	const left = Math.floor(gridSpan.left);
	const top = Math.floor(centerY - halfHeight);
	return {
		left,
		top,
		width: Math.ceil(gridSpan.right) - left,
		height: Math.ceil(centerY + halfHeight) - top
	};
}

/**
 * Renders the board — a field of pointy-topped hexagons, drawn face-on — on a PixiJS
 * canvas. Cells left of centre take the first grid colour, cells to the right the
 * second, and the shared central column the centre colour. Two MUGEN characters loop
 * (idle by default) standing upright, one on each half.
 *
 * Nothing is tilted: a cell is the same hexagon wherever it is on the board, so a
 * character's size says something about the character and nothing about where it
 * stands, and walking it forward neither resizes it nor moves it toward a vanishing
 * point. The only thing depth still decides is paint order — a row further down the
 * screen draws over the row above it, and hexagonal rows interlock, so it decides it
 * rather more than a rectangle's did.
 *
 * Frame decoding happens at build time (scripts/generate-sprites.js); this
 * class only lays out the grid and plays the loaded frames. All rendering
 * state lives here so the Svelte component stays UI-only.
 */
export class MugenBoard {
	private readonly options: Required<MugenBoardOptions>;
	private app: Application | null = null;
	// Set the moment teardown starts, so a boot already in flight can bail out
	// instead of resurrecting a destroyed board.
	private destroyed = false;
	private actors: Actor[] = [];
	/** Transient slash overlays, faded out each tick until they expire. */
	private slashes: SlashEffect[] = [];
	/** Callouts pinned to a cell rather than to a fighter (see {@link showCellCallout}).
	 * A fighter's own is held on the actor, which is what takes it down; these have
	 * nobody, so the board keeps them until the turn's callouts are cleared. */
	private cellLabels: Text[] = [];
	/** Colour overlays on claimed cells, keyed by "q,r". */
	private cellPaint = new Map<string, Graphics>();
	/** Loaded aura frame textures, keyed by aura color name. */
	private auraTextures = new Map<string, Texture[]>();
	private iconTextures = new Map<string, Texture>();
	/** What to call when an order button is tapped; set by {@link onOrder}. */
	private orderHandler: ((actorId: string, orderId: string) => void) | null = null;

	constructor(options: MugenBoardOptions) {
		this.options = { ...DEFAULTS, ...options };
	}

	/**
	 * Total canvas size: the grid's own extent at `cellSize` px to the cell width
	 * ({@link BOARD_WIDTH}, {@link BOARD_HEIGHT} — which is why neither figure is simply
	 * the count of columns or rows: the offset rows hang half a cell out to the right,
	 * and the rows interlock rather than stack), plus the padding around it and the empty
	 * cell kept above it for everything that reaches up out of the top row
	 * ({@link HEAD_ROOM}).
	 *
	 * This is the size the board is *laid out* at, not the size it is seen at: the canvas
	 * is cropped to what is actually drawn once the characters are standing on it
	 * ({@link MugenBoard.fitToContent}) and then scaled to fit its box, so what these
	 * figures decide between them is the board's proportions and its resolution.
	 */
	get dimensions(): { width: number; height: number } {
		const { cellSize, padding } = this.options;
		return {
			width: padding * 2 + cellSize * BOARD_WIDTH,
			height: padding * 2 + cellSize * (BOARD_HEIGHT + HEAD_ROOM)
		};
	}

	/** Screen x of the grid's left edge. */
	private get gridLeft(): number {
		return this.options.padding;
	}

	/** Screen y of the grid's top edge: the padding, plus the empty room kept above it —
	 * which is what pushes every cell and every character down by a cell width from where
	 * they would otherwise be drawn. */
	private get gridTop(): number {
		const { cellSize, padding } = this.options;
		return padding + cellSize * HEAD_ROOM;
	}

	/** Boot Pixi inside `container`, draw the grids and start the game loop. */
	async start(container: HTMLElement): Promise<void> {
		const { width, height } = this.dimensions;
		const app = new Application();
		await app.init({
			width,
			height,
			backgroundAlpha: 0,
			// On, for the drawn shapes: the trait discs, the order buttons' rounded corners
			// and the slashes are all geometry with a curve or a diagonal in them, and with
			// this off every one of those edges is a staircase — which the scaling this canvas
			// then goes through smears into a soft fringe rather than tidying up. It costs the
			// characters nothing: a sprite is an axis-aligned quad, and how its artwork is
			// sampled is its texture's own business (`nearest`, set per frame sheet), not this.
			antialias: true,
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
		// Sort stage children by zIndex so characters further down the screen (larger
		// rows, larger screen-y) paint over those standing behind them.
		app.stage.sortableChildren = true;
		// Order buttons live on the board, so the stage has to be hit-tested for taps.
		app.stage.eventMode = 'static';
		// Render as a block so the canvas doesn't reserve inline-baseline descender
		// space below it, and let it scale down responsively while keeping its
		// aspect ratio rather than forcing its full pixel size. Neither dimension is
		// asserted, so the two maxima decide the size between them and the whole board
		// stays on screen (see MAX_CANVAS_HEIGHT).
		app.canvas.style.display = 'block';
		app.canvas.style.maxWidth = '100%';
		app.canvas.style.maxHeight = MAX_CANVAS_HEIGHT;
		app.canvas.style.width = 'auto';
		app.canvas.style.height = 'auto';
		// Held back until the board is assembled — see the reveal at the end of this method.
		app.canvas.style.visibility = 'hidden';
		container.appendChild(app.canvas);

		// One rectangular board: cells left of centre take the left leader's colour, right
		// the right leader's, the shared centre column white.
		this.drawBoard(
			this.options.grids[0].color,
			this.options.grids[1].color,
			this.options.centerColor
		);

		// The lead character of each half stands where its grid asks, or on the half's
		// default lead cell: the left one in its own outer column (unflipped), the right
		// one (flipped) in its own. Combat can walk any actor into the central white
		// column.
		const redLead = leadCell(this.options.grids[0], LEAD_CELLS[0]);
		const blueLead = leadCell(this.options.grids[1], LEAD_CELLS[1]);
		await this.addActor(this.options.grids[0].character, redLead.q, redLead.r, false);
		await this.addActor(this.options.grids[1].character, blueLead.q, blueLead.r, true);

		// Extra characters stand idle on their assigned cells — left half faces
		// right (unflipped), right half faces left (flipped) like the centre pair.
		for (const extra of this.options.grids[0].extras ?? []) {
			await this.addActor(extra, extra.q, extra.r, false);
		}
		for (const extra of this.options.grids[1].extras ?? []) {
			await this.addActor(extra, extra.q, extra.r, true);
		}

		// Every actor above was loaded asynchronously; the board may have been torn
		// down in the meantime, and destroy() has already freed the app.
		if (this.destroyed) return;

		// Crop the view to what's actually drawn: the board ends up centred in the canvas
		// with the height it needs and no more — the grid's own, plus the room the
		// characters standing on its rows need above it. Cell positions are absolute px off
		// the grid's origin, so this only translates the stage and resizes the framebuffer;
		// nothing moves.
		this.fitToContent();

		// And only now is any of it shown. A Pixi application renders every frame from the
		// moment it is created, so a canvas in the document is a live picture of a board
		// being built: the empty grid paints first, then each fighter appears as its sheets
		// arrive one after another, and the crop above lands last — resizing the framebuffer
		// under a canvas whose width is pinned to its container, which restates its height
		// and shifts everything below it. That is the flicker. It is not something to slow
		// down or fade out, because none of it is anything to look at: the board is worth
		// showing when it is a board. So the canvas is hidden from the moment it is
		// appended, drawn once here in its finished state, and revealed with that frame
		// already on it. `visibility` rather than `display`, so the space it will take is
		// held from the start and the layout does not jump when it arrives.
		app.renderer.render(app.stage);
		app.canvas.style.visibility = 'visible';

		app.ticker.add(this.tick);
	}

	/**
	 * Cut the canvas to the board: the hexagons' own span across, and the height they and
	 * the characters standing on them need. The stage is offset so the board lands inside
	 * it; the grid's own coordinates are untouched, so no cell shifts.
	 *
	 * The grid's edges are geometry rather than a measurement — the first and last column's
	 * outer sides at the size a cell is drawn — so the width does not depend on the frame
	 * the crop happens to be taken in, and is the same board however the fighters in it are
	 * standing. Everything else about the crop, and what running the hexagons to the canvas
	 * edge costs, is on {@link contentCrop}.
	 */
	private fitToContent(): void {
		if (!this.app) return;
		const { left, top, width, height } = contentCrop(this.app.stage.getBounds(), {
			left: this.project(0, 0).x,
			right: this.project(BOARD_WIDTH, 0).x
		});
		this.app.stage.position.set(-left, -top);
		this.app.renderer.resize(width, height);
	}

	/** Tear everything down. Safe to call more than once. */
	destroy(): void {
		this.destroyed = true;
		if (this.app) {
			destroyPixiApp(this.app);
			this.app = null;
		}
		this.actors = [];
		this.slashes = [];
		this.cellPaint.clear();
	}

	/**
	 * Screen point of a place on the grid, given in **cell widths** off its top-left
	 * corner. One cell width is `cellSize` px on both axes, so this is a scale and a
	 * translation and nothing else — which is the whole of what "not tilted" means here.
	 * The hexagons' own proportions are already inside the figures handed to it, so
	 * anything measured in cell widths projects through it unchanged: a cell's corners,
	 * its foot line, and the height a character is drawn at alike.
	 */
	private project(col: number, row: number): Point {
		const { cellSize } = this.options;
		return { x: this.gridLeft + col * cellSize, y: this.gridTop + row * cellSize };
	}

	/** Screen-space point at the middle of the cell at [q, r]'s foot line
	 * ({@link cellFoot}), so a fighter reads as inside the cell rather than floating at
	 * its centre or balancing on its bottom point. */
	private cellMark(q: number, r: number): Point {
		const foot = cellFoot(q, r);
		return this.project(foot.x, foot.y);
	}

	/**
	 * Where a *particular* actor is put to stand in the cell at [q, r]: the cell's own
	 * mark, moved by that actor's crown correction ({@link Actor.crownShift}), so what
	 * ends up over the middle of the cell is the fighter's head rather than the axis its
	 * artwork happens to be drawn around.
	 *
	 * Every placement that leaves a fighter *standing* somewhere goes through this — the
	 * opening line-up, each step of a walk, a winner claiming ground, a loser retracting.
	 * The one that does not is the duel split ({@link meleeApproach}), which is not a
	 * fighter standing in the middle of a cell at all: it is two sprites brought edge to
	 * edge against one line, and it measures from their edges for that reason.
	 */
	private standPoint(actor: Actor, q: number, r: number): Point {
		const mark = this.cellMark(q, r);
		return { x: mark.x + actor.crownShift, y: mark.y };
	}

	/**
	 * The width of a cell in screen px — one figure for the whole board, since every
	 * cell is the same hexagon. It is the box every character is fitted into, so how big
	 * a fighter is drawn says something about the fighter and nothing about where on the
	 * board it happens to be, and walking a fighter forward never resizes it.
	 */
	private cellWidth(): number {
		return Math.abs(this.project(1, 0).x - this.project(0, 0).x);
	}

	/**
	 * Draw the board: one hexagon per cell, standing on end, laid out face-on. Cells left
	 * of the central column take `leftColor`, cells to the right `rightColor`, and the
	 * central column (q = 0) — the shared ground both sides can enter — is painted
	 * `centerColor`. Iterates the exact cell list from the shared grid utility, so every
	 * occupiable cell is drawn and nothing else is.
	 *
	 * Only the fills are coloured: every line of the grid is drawn in {@link GRID_LINE},
	 * so the lattice reads as one board rather than as two colours meeting, and a cell's
	 * side is said by the ground inside it alone.
	 */
	private drawBoard(leftColor: number, rightColor: number, centerColor: number): void {
		if (!this.app) return;
		const graphics = new Graphics();
		for (const { q, r } of boardCells()) {
			// q alone decides the side; the central column (q = 0) is the shared
			// white ground.
			const side = cellSide(q);
			const color = side === 'red' ? leftColor : side === 'blue' ? rightColor : centerColor;

			graphics.poly(this.cellOutline(q, r));
			graphics.fill({ color, alpha: 0.08 });
			graphics.stroke({ width: 2, color: GRID_LINE, alpha: 0.9 });
		}
		this.app.stage.addChild(graphics);
	}

	/**
	 * The cell at [q, r] as a closed screen-space outline: its six corners projected in
	 * order, flattened to the `[x, y, x, y, …]` list Pixi draws a polygon from. Every
	 * hexagon on this board — the ruled grid, a claimed cell's overlay — is drawn from
	 * this one path, so the paint can never sit a hair off the line under it.
	 */
	private cellOutline(q: number, r: number): number[] {
		return hexCorners(q, r).flatMap((corner) => {
			const at = this.project(corner.x, corner.y);
			return [at.x, at.y];
		});
	}

	/**
	 * Load a character and stand it in the centre of the cell at [q, r], feet on the
	 * cell's lower edge. Every actor loads its directional walk animations so combat
	 * can drive it cell to cell.
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
		// (`/assets/<charId>/frames`), which stays shared across those instances —
		// read out by the helper every surface that has only a frames folder uses.
		const characterId = characterIdFromFramesPath(character.basePath) ?? '';
		const id = character.id ?? characterId ?? character.basePath;

		// Every actor can be walked cell to cell by combat, so all of them load the
		// directional animations bound in the character's JSON definition
		// (move-left/move-right), the hurt flinch, and every move the definition
		// declares, so combat can play whichever move gets picked. Nothing loads a
		// move's projectile: nothing on this board flies any more — an attack is walked
		// over to its target ({@link MugenBoard.closeIn}). Without a definition the
		// directional anims fall back to run.
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

		// The character stands centred on its cell's foot line, feet on it.
		const mark = this.cellMark(q, r);

		// How big the character is drawn is the cards' question, asked of the cards' own
		// answer ({@link characterFitScale}): one shared source→screen ratio for every
		// character, capped so neither a tall one nor a wide one spills out of its box.
		// The box is a cell's width — the same anywhere on the board — so the two lines are
		// scaled alike wherever each stands, and a fighter keeps its size as it walks. Both
		// surfaces then agree on every character's size relative to the others.
		// The character's own render scale rides along: the definition is already loaded
		// above for its bindings, and it is the same correction the cards and the statues
		// read, so a set drawn small stands as tall here as it does on a card.
		// The width cap measures the cycle's whole sweep, as it does everywhere else, and
		// not the furthest one reach from the axis doubled — which is the rule this board
		// used to ask for, on the grounds that a fighter is pinned to its cell's mark by
		// that axis (see below) and so ought to keep every limb within half a cell of it.
		// What that bought was a fighter that never crossed into its neighbour's cell; what
		// it cost was the fighter being a different size from its own card. Frieza paid
		// most of it — his idle sweeps a tail most of a body-width to one side, so he was
		// held at half the size his card draws him, his own correction and all — and it
		// was eating the InuYasha cast's correction too, Kagome's 1.4 among them. The
		// crossing is the smaller thing: every fighter here already stands a third taller
		// than its cell and over the row behind it ({@link CHAR_HEIGHT_RATIO}), so a limb
		// reaching past the hexagon is the overlap this board is drawn with throughout.
		const box = this.cellWidth();
		const fitScale = characterFitScale(
			baseFrames,
			{ width: box, height: box * CHAR_HEIGHT_RATIO },
			readRenderScale(definition)
		);

		// Where the character's head is, relative to the axis it is drawn around — the
		// correction that puts the head over the middle of the cell instead of the axis.
		// Every character gets it but the ones whose own definition opts out, which are
		// the sheets whose highest painted pixel is not a head at all.
		const crownShift = readCrownAlign(definition)
			? crownCorrection(baseFrames, fitScale, flip)
			: 0;
		const stand = { x: mark.x + crownShift, y: mark.y };

		const sprite = new Sprite();
		// A negative x-scale mirrors the sprite around its anchor (in place).
		sprite.scale.set(flip ? -fitScale : fitScale, fitScale);
		sprite.x = stand.x;
		sprite.y = stand.y;
		// Feet-y drives paint order: rows further down the screen sit at larger y and on top.
		sprite.zIndex = stand.y;
		this.app.stage.addChild(sprite);

		const actor: Actor = {
			id,
			sprite,
			// The grid it was placed from: `flip` is what tells the two halves apart.
			side: flip ? 'blue' : 'red',
			homeColumn: q,
			homeRow: r,
			animations,
			hurtAnim,
			currentName: startName,
			frameIndex: 0,
			frameElapsed: 0,
			row: r,
			column: q,
			moveRightAnim,
			moveLeftAnim,
			pathQueue: [],
			finalTarget: null,
			onArrive: null,
			oneShot: null,
			stance: null,
			aura: null,
			ring: null,
			label: null,
			orders: null,
			traits: null,
			// Nominal size: the base cycle's widest and tallest frame at fit scale —
			// stable across poses, unlike the live sprite whose size tracks the current
			// frame's texture. Taken over the whole cycle (as the fit is), so an aura or
			// a label sits by the character's full reach rather than by frame one's.
			displayWidth: Math.max(...baseFrames.map((frame) => frame.width)) * fitScale,
			displayHeight: Math.max(...baseFrames.map((frame) => frame.height)) * fitScale,
			crownShift,
			x: stand.x,
			y: stand.y,
			targetX: stand.x,
			targetY: stand.y,
			moving: false,
			stepDir: 0
		};
		this.applyFrame(actor);
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
		// Horizontal: the frame's own MUGEN axis, which is what holds the frames of a
		// cycle to each other — where that axis is *put* is the standing mark plus the
		// actor's one crown correction ({@link Actor.crownShift}), decided once, not
		// here. Vertical: 1, so the sprite's bottom end sits on the cell's foot line.
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
			// cells/characters it draws level with and behind those it moves past.
			actor.sprite.zIndex = actor.y;
			this.applyFrame(actor);
			this.updateAura(actor, deltaMs);
			this.updateRing(actor);
			this.updateOrders(actor);
			this.updateTraits(actor);
			this.updateLabel(actor);
		}
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
	 * just behind it in depth order — and, for its first moments, bring it up off
	 * those feet to its full height (see {@link AURA_RISE_MS}). */
	private updateAura(actor: Actor, deltaMs: number): void {
		const aura = actor.aura;
		if (!aura) return;
		aura.frameElapsed += deltaMs;
		while (aura.frameElapsed >= AURA_FRAME_MS) {
			aura.frameElapsed -= AURA_FRAME_MS;
			aura.frameIndex = (aura.frameIndex + 1) % aura.frames.length;
		}
		aura.sprite.texture = aura.frames[aura.frameIndex];
		if (aura.rise < AURA_RISE_MS) {
			aura.rise = Math.min(AURA_RISE_MS, aura.rise + deltaMs);
			// Eased out, so the flame leaps off the ground and settles into its height
			// rather than creeping up at one rate. The sprite is anchored at its foot
			// (see showAura), so scaling its height is the flame growing upwards from
			// where it stands and never from its middle.
			const t = 1 - Math.pow(1 - aura.rise / AURA_RISE_MS, 3);
			aura.sprite.scale.set(
				aura.scaleX * (AURA_RISE_WIDTH + (1 - AURA_RISE_WIDTH) * t),
				aura.scaleY * t
			);
		}
		aura.sprite.x = actor.x;
		aura.sprite.y = actor.y;
		aura.sprite.zIndex = actor.y - 0.5;
	}

	/** Keep the actor's callout floating just above its head, always on top. */
	private updateLabel(actor: Actor): void {
		const label = actor.label;
		if (!label) return;
		label.x = actor.x;
		label.y = actor.y - actor.displayHeight - 12;
		label.zIndex = actor.y + 10000;
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
				actor.column = next.q;
				actor.row = next.r;
				// The final step may be overridden to an exact point (a fighter's half
				// of a shared duel cell) instead of the cell's standing mark.
				const override = actor.pathQueue.length === 0 ? actor.finalTarget : null;
				if (actor.pathQueue.length === 0) actor.finalTarget = null;
				const target = override ?? this.standPoint(actor, next.q, next.r);
				actor.stepDir = Math.sign(target.x - actor.x) || actor.stepDir || 1;
				actor.targetX = target.x;
				actor.targetY = target.y;
				actor.moving = true;
			}
		}

		if (actor.moving) {
			// Advance along the straight line to the target cell. A step crosses one side of
			// the hexagon, so it is purely horizontal along a row and a diagonal — half a
			// cell across, three quarters of one down — onto the row above or below.
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
			this.setAnimation(actor, this.standing(actor));
		}
	}

	/**
	 * What an actor that is doing nothing stands in: the stance it has been put in, or
	 * idle. A stance whose animation never loaded falls back to idle rather than leaving
	 * the actor frozen in whatever it happened to be showing.
	 */
	private standing(actor: Actor): string {
		return actor.stance && actor.animations[actor.stance] ? actor.stance : 'idle';
	}

	/** Drive a one-shot combat animation to completion, then release to whatever the
	 * actor stands in — its stance if it is holding one, else idle. */
	private advanceOneShot(actor: Actor, deltaMs: number): void {
		const shot = actor.oneShot;
		if (!shot) return;
		shot.elapsed += deltaMs;
		this.advanceFrame(actor, deltaMs);
		if (shot.elapsed >= shot.total) {
			actor.oneShot = null;
			this.setAnimation(actor, this.standing(actor));
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

	/** The cell the actor is currently on. */
	private cellOf(actor: Actor): Cell {
		return { q: actor.column, r: actor.row };
	}

	/**
	 * Walk an actor through the given cells (excluding its current one). When
	 * `finalPoint` is given the walk's last step lands on that exact screen point
	 * instead of the last cell's standing mark, so approaches that end off-centre
	 * (a fighter's half of a shared duel cell) stay one continuous motion. With no
	 * cells to walk it still glides straight to `finalPoint` if it isn't there yet.
	 */
	private walkCells(actor: Actor, cells: Cell[], finalPoint?: Point): Promise<void> {
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
	 * Walk two fighters toward each other until they stand face to face on the **board's
	 * own middle**, on the row they are fighting down. When `meetingCell` is given, the
	 * red fighter walks to that exact cell and the blue fighter to its east neighbour;
	 * otherwise the cheapest meeting pair is searched. Resolves once both have settled.
	 * Ids may be given in any order (sides are inferred).
	 *
	 * The line they meet on is the board's, not the meeting cell's. The two are the same
	 * line on a level row, whose white cell sits dead centre — but the middle row is
	 * staggered half a cell across, so its white cell is not centred and a pair that met
	 * in the middle of it met half a cell right of where the lanes above and below them
	 * did. Three lanes clashing on three different lines is not a board being fought
	 * across. Both lines open the same distance out from this one (see the controller's
	 * opening cells, which is where the stagger is answered), so meeting on it is also
	 * the two of them walking out the same distance and arriving together.
	 */
	async meleeApproach(aId: string, bId: string, meetingCell?: Cell): Promise<void> {
		const a = this.findActor(aId);
		const b = this.findActor(bId);
		if (!a || !b) return;
		// Which fighter belongs to the red half (drawn left) vs the blue (right).
		const red = a.side === 'red' ? a : b;
		const blue = red === a ? b : a;
		// Route both fighters around any other character standing in the way (the two
		// duelists themselves are excluded so they don't block each other); if that
		// leaves no legal meeting, fall back to the side-only search.
		const blocked = this.occupied([red, blue]);
		const meeting =
			findMeleeMeeting(this.cellOf(red), this.cellOf(blue), meetingCell, blocked) ??
			findMeleeMeeting(this.cellOf(red), this.cellOf(blue), meetingCell);
		if (!meeting) return;

		// One on each side of that line, without the two sprites overlapping: red walks
		// until its sprite's right edge stops at it, blue until its left edge starts
		// there, so they stand face to face across it. Extents come from each sprite's
		// current frame (anchor fraction × scaled width; blue is mirrored, so its lead
		// edge is the frame's far side). Logical cells are untouched (each still counts
		// as standing on the cell it walked to); only the final step's landing point is
		// offset — and the crown correction is not applied to it either, because two
		// fighters brought edge to edge against a line are placed by their edges.
		// The pair stands on the meeting cell's own foot line, as everybody else does.
		const mid = {
			x: this.project(BOARD_WIDTH / 2, 0).x,
			y: this.cellMark(meeting.red.destination.q, meeting.red.destination.r).y
		};
		const redLead = (1 - red.sprite.anchor.x) * Math.abs(red.sprite.width);
		const blueLead = (1 - blue.sprite.anchor.x) * Math.abs(blue.sprite.width);
		await Promise.all([
			this.walkCells(red, meeting.red.path.slice(1), { x: mid.x - redLead, y: mid.y }),
			this.walkCells(blue, meeting.blue.path.slice(1), { x: mid.x + blueLead, y: mid.y })
		]);
	}

	/**
	 * The cells an actor may occupy: its own half, plus the central white column, which
	 * is neither side's — it is the ground between the two lines, and the only ground
	 * either of them can take off the other. Nobody ever *stands* across it in the far
	 * half: every move that leaves a fighter somewhere is confined to this predicate.
	 * The one thing that is not is the strike run ({@link closeIn}), which crosses and
	 * comes straight back, because a blow is not ground taken.
	 */
	private sideAllowed(actor: Actor): (c: Cell) => boolean {
		const far: CellSide = actor.side === 'blue' ? 'red' : 'blue';
		return (c) => isBoardCell(c.q, c.r) && cellSide(c.q) !== far;
	}

	/**
	 * Predicate: is a cell currently occupied by an actor other than those in
	 * `exclude`? Used to keep a moving fighter from stepping onto (or through) a
	 * cell another character is standing on; the movers themselves are excluded so
	 * their own start cell never counts as blocked.
	 */
	private occupied(exclude: Actor[]): (c: Cell) => boolean {
		const taken = new Set<string>();
		for (const other of this.actors) {
			if (exclude.includes(other)) continue;
			taken.add(`${other.column},${other.row}`);
		}
		return (c) => taken.has(`${c.q},${c.r}`);
	}

	/** The side rule combined with occupancy: `actor` may walk a cell only if it's
	 * on its own side and no other character is standing there. */
	private walkAllowed(actor: Actor): (c: Cell) => boolean {
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
	async claimCell(id: string, cell: Cell): Promise<void> {
		const actor = this.findActor(id);
		if (!actor) return;
		await this.walkCells(actor, [], this.standPoint(actor, cell.q, cell.r));
	}

	/**
	 * Tint a cell in one side's colour while an occupant holds it, or restore the
	 * base board colour with null. The overlay redraws the cell's fill and outline
	 * above the base grid but beneath the characters.
	 */
	paintCell(cell: Cell, side: 'red' | 'blue' | null): void {
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
		const graphics = new Graphics();
		graphics.poly(this.cellOutline(cell.q, cell.r));
		// Stronger fill than the base grid's 0.08 so the takeover reads clearly.
		graphics.fill({ color, alpha: 0.35 });
		graphics.stroke({ width: 2, color, alpha: 1 });
		graphics.zIndex = 0.5; // above the base grid (0), below the actors
		this.app.stage.addChild(graphics);
		this.cellPaint.set(k, graphics);
	}

	/** Walk an actor back to the cell it started on — the ground it holds, which a
	 * strike run only ever borrows it away from. */
	async returnHome(id: string): Promise<void> {
		const actor = this.findActor(id);
		if (!actor) return;
		const home: Cell = { q: actor.homeColumn, r: actor.homeRow };
		// Its own ground, by a clear route through it, first. But a fighter walking back
		// off a strike run is standing in the far half, which its own side rule would
		// refuse to lead it out of, so the ways home loosen one rule at a time until one
		// of them answers: around the others over any ground, then straight over
		// everything. Coming home settles nothing, so no rule of the fight is spent here.
		const blocked = this.occupied([actor]);
		const anyCell = (c: Cell) => isBoardCell(c.q, c.r);
		const path =
			findPath(this.cellOf(actor), home, this.walkAllowed(actor)) ??
			findPath(this.cellOf(actor), home, this.sideAllowed(actor)) ??
			findPath(this.cellOf(actor), home, (c) => anyCell(c) && !blocked(c)) ??
			findPath(this.cellOf(actor), home, anyCell);
		if (!path) return;
		// Passing the home mark as the walk's end point also covers the fighter
		// whose home *is* the cell it logically occupies but who is standing half a
		// cell off centre after a shared-cell duel — it glides straight back.
		await this.walkCells(actor, path.slice(1), this.standPoint(actor, home.q, home.r));
	}

	/**
	 * Walk an actor to `cell` and **adopt it as its new home**, so this is where it
	 * stands from now on and where {@link returnHome} would bring it back to. Every
	 * lasting move on this board is one of these: the winner of a lane taking the white
	 * column it was played for, and the fighter that lost it retracting to the back of
	 * its own half. The ground either of them was holding is given up for good, not
	 * borrowed.
	 *
	 * Resolves once it has settled; a cell off the actor's own side is refused. An actor
	 * already standing on `cell` still settles onto its mark — which is how the winner of
	 * a duel, stopped flush against the fighter it just felled, glides to the middle of
	 * the cell they were both standing in.
	 */
	async regroup(id: string, cell: Cell): Promise<void> {
		const actor = this.findActor(id);
		if (!actor || !this.sideAllowed(actor)(cell)) return;
		// Route around whoever else is standing about; if occupancy boxes the actor
		// in, fall back to the side-only path so it still gets there.
		const path =
			findPath(this.cellOf(actor), cell, this.walkAllowed(actor)) ??
			findPath(this.cellOf(actor), cell, this.sideAllowed(actor));
		if (!path) return;
		await this.walkCells(actor, path.slice(1), this.standPoint(actor, cell.q, cell.r));
		actor.homeColumn = cell.q;
		actor.homeRow = cell.r;
	}

	/**
	 * Run an attacker up to the fighter it is striking and stand it face to face with
	 * it, close enough for the blow to land. Resolves once it has settled there; the
	 * caller then plays the strike and walks it back ({@link returnHome}).
	 *
	 * It comes at the target's face: the red half leads with its right and the blue
	 * half (mirrored) with its left, so each closes on the cell beside the target on
	 * its own side of it and on the target's own row, which is what makes the pair
	 * read horizontally. Where that cell is taken (or off the board) it settles for
	 * the nearest cell it can reach instead.
	 *
	 * A strike run is the one thing on this board that crosses the white line. The
	 * line is about ground *held* — where a fighter stands between turns, and what a
	 * lane is won and lost over — and a blow is not ground taken: the attacker is back
	 * on its own cell before the turn is over. What it may not do is walk *through*
	 * whoever else is standing about, so the route is still laid around them.
	 */
	async closeIn(attackerId: string, targetId: string): Promise<void> {
		const attacker = this.findActor(attackerId);
		const target = this.findActor(targetId);
		if (!attacker || !target) return;
		const from = this.cellOf(attacker);
		const targetCell = this.cellOf(target);
		const beside: Cell = {
			q: targetCell.q + (attacker.side === 'blue' ? 1 : -1),
			r: targetCell.r
		};
		const blocked = this.occupied([attacker]);
		const open = (c: Cell) => isBoardCell(c.q, c.r) && !blocked(c);
		// Short of that cell it takes the nearest one it can reach that still leaves it
		// in front of the target — coming at a fighter from behind it is not a duel —
		// and only if even that is boxed in does it settle for the nearest cell at all.
		const inFront = (c: Cell) =>
			attacker.side === 'blue' ? c.q > targetCell.q : c.q < targetCell.q;
		const path =
			(open(beside) ? findPath(from, beside, open) : null) ??
			findClosestApproach(from, targetCell, (c) => open(c) && inFront(c))?.path ??
			findClosestApproach(from, targetCell, open)?.path;
		if (!path) return;
		await this.walkCells(attacker, path.slice(1), this.strikeMark(attacker, target));
	}

	/**
	 * Where an attacker stands to strike `target`: level with it, on its foot line,
	 * with the two sprites' leading edges flush — face to face and touching, without
	 * overlapping. The extents are read off each sprite's current frame (anchor
	 * fraction × scaled width); the blue half is mirrored, so for both of them the
	 * leading edge is the frame's far side.
	 */
	private strikeMark(attacker: Actor, target: Actor): Point {
		const lead = (actor: Actor) => (1 - actor.sprite.anchor.x) * Math.abs(actor.sprite.width);
		const gap = lead(attacker) + lead(target);
		return { x: attacker.side === 'blue' ? target.x + gap : target.x - gap, y: target.y };
	}

	/**
	 * Play one of a character's defined moves as a one-shot pose and resolve when
	 * it finishes. If the move binds no animation (or it failed to load), resolves
	 * immediately so combat still flows.
	 */
	playMove(id: string, move: CharacterMove): Promise<void> {
		return this.playAnimationOnce(id, move.source);
	}

	/**
	 * Stand a character *in* one of its moves and leave it there — the guard a fighter
	 * turned a blow aside with holds for the rest of the turn, rather than a brace it
	 * throws once and drops. The animation loops where every other pose plays out, because
	 * that is the difference between doing a thing and being in a state: a fighter covering
	 * is covering until it is told otherwise ({@link clearHold}).
	 *
	 * It is not a one-shot and owns nothing. Whatever the turn asks of the actor next —
	 * a walk, a strike, a flinch — plays straight over the top, and the actor drops back
	 * into the held move when that finishes instead of into idle. So a fighter can brace,
	 * be walked onto ground it has won, and still be braced when it gets there.
	 *
	 * Given a `color`, a ring of it is drawn around the character for as long as the stance
	 * lasts. A held pose on its own is not legible as a state: it is a frame of the
	 * character's own animation, and braced-against-a-blow looks a good deal like
	 * caught-mid-swing. The ring is what says the stance is *on*, and it is the fighter's
	 * own colour because whose stance it is is the other half of that.
	 *
	 * A move binding no animation (or one that failed to load) clears the hold rather
	 * than freezing the actor: there is no pose to stand in, so it idles as before — and
	 * no ring goes up either, since there would be no stance for it to be saying.
	 */
	holdMove(id: string, move: CharacterMove, color?: string): void {
		const actor = this.findActor(id);
		if (!actor) return;
		actor.stance = move.source && actor.animations[move.source] ? move.source : null;
		// Into the pose now, unless something is already playing on the sprite — that
		// releases into the stance when it ends, so the hold lands either way.
		if (!actor.oneShot) this.setAnimation(actor, this.standing(actor));
		this.clearRing(actor);
		if (actor.stance && color) this.drawRing(actor, color);
	}

	/** Let a character out of the move it was standing in, back to idle — and out of the
	 * ring that was saying it was in one. */
	clearHold(id: string): void {
		const actor = this.findActor(id);
		if (!actor || !actor.stance) return;
		actor.stance = null;
		this.clearRing(actor);
		if (!actor.oneShot) this.setAnimation(actor, 'idle');
	}

	/** Let every character out of whatever it was standing in — the turn holding them
	 * there is over. */
	clearHolds(): void {
		for (const actor of this.actors) this.clearHold(actor.id);
	}

	/**
	 * Draw the ring that says a character is holding a stance: a circle of its own colour
	 * around it, wide enough to enclose the whole character rather than to sit at its feet
	 * — it is a guard being read, not a mark on the floor.
	 *
	 * Sized off the actor's nominal box, which is its full reach over the whole animation
	 * cycle rather than the frame currently showing, so the ring holds still while the
	 * fighter breathes inside it. Behind the character and above the board: a fighter
	 * stands in its own guard, not behind it.
	 */
	private drawRing(actor: Actor, color: string): void {
		if (!this.app) return;
		const radius = (Math.max(actor.displayWidth, actor.displayHeight) / 2) * GUARD_RING_RATIO;
		const ring = new Graphics();
		ring.circle(0, 0, radius);
		ring.stroke({ color: combatColorHex(color), width: GUARD_RING_WIDTH, alpha: 0.9 });
		this.app.stage.addChild(ring);
		actor.ring = ring;
		this.updateRing(actor);
	}

	/** Keep a stance ring centred on the character it belongs to as it walks. */
	private updateRing(actor: Actor): void {
		const ring = actor.ring;
		if (!ring) return;
		ring.x = actor.x;
		// Around the middle of the character, not its feet: the actor's own y is the foot
		// line it stands on, and a circle centred there would be a ring around its ankles.
		ring.y = actor.y - actor.displayHeight / 2;
		ring.zIndex = actor.y - 0.25;
	}

	/** Take a character's stance ring off the board. */
	private clearRing(actor: Actor): void {
		if (!actor.ring) return;
		actor.ring.parent?.removeChild(actor.ring);
		actor.ring.destroy();
		actor.ring = null;
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
	 *
	 * It arrives rather than appearing: the flame comes up off the fighter's feet to
	 * its full height over {@link AURA_RISE_MS}, which is the whole of what is drawn
	 * about a fighter loading — a charge produces something the moment it is given,
	 * and this is that something happening, so nothing needs to say it in words.
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
		// wide and tall sprites alike sit inside their aura. The anchor at the foot
		// is also what the rise is measured from — scaling this sprite's height moves
		// its top and leaves its base on the ground.
		sprite.anchor.set(0.5, 1);
		const scaleX = (actor.displayWidth * AURA_WIDTH_RATIO) / frames[0].width;
		const scaleY = (actor.displayHeight * AURA_HEIGHT_RATIO) / frames[0].height;
		// Flat on the ground to begin with: the first tick brings it up (see updateAura).
		sprite.scale.set(scaleX * AURA_RISE_WIDTH, 0);
		sprite.alpha = 0.85;
		sprite.x = actor.x;
		sprite.y = actor.y;
		sprite.zIndex = actor.y - 0.5;
		this.app.stage.addChild(sprite);
		actor.aura = { sprite, frames, frameIndex: 0, frameElapsed: 0, scaleX, scaleY, rise: 0 };
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
	 * Float a short callout above a character — what its turn amounted to
	 * (`BLOCK`, `HIT!`) — tinted in `color`, so a turn in which every
	 * fighter acts at once can still be read off the board a fighter at a time.
	 * Replaces any existing callout on that character.
	 */
	showCallout(id: string, text: string, color: string): void {
		const actor = this.findActor(id);
		if (!actor || !this.app) return;
		this.clearCallout(id);
		const label = this.calloutText(text, combatColorHex(color));
		this.app.stage.addChild(label);
		actor.label = label;
		this.updateLabel(actor);
	}

	/**
	 * Float one callout over a **cell** rather than over a fighter, for something that
	 * happened to a piece of ground instead of to somebody: two attacks meeting in the
	 * middle of a lane, which is one event and belongs to neither of the pair that caused
	 * it. Said over each of them it read as two things happening at once, and as each
	 * fighter's own doing, when the whole point of a clash is that it is the one thing and
	 * nobody's.
	 *
	 * White, for the same reason — a clash is not either side's, and the ground it happens
	 * on is the white column. Placed clear above the heads of anybody standing in that cell,
	 * so it sits over the collision rather than in it: a character stands
	 * {@link CHAR_HEIGHT_RATIO} cell widths tall from the cell's own foot line, and the
	 * label's foot goes a little above where that reaches.
	 *
	 * Taken down with every other callout ({@link clearCallouts}) — it belongs to the turn
	 * it was drawn in, like everything else said on this board.
	 */
	showCellCallout(cell: Cell, text: string): void {
		if (!this.app) return;
		const label = this.calloutText(text, 0xffffff);
		const foot = cellFoot(cell.q, cell.r);
		const at = this.project(foot.x, foot.y - CHAR_HEIGHT_RATIO - CELL_CALLOUT_GAP);
		label.x = at.x;
		label.y = at.y;
		// Over everything the lane holds, as a callout is: what has just happened is never
		// covered by whoever it happened to.
		label.zIndex = at.y + 10000;
		this.app.stage.addChild(label);
		this.cellLabels.push(label);
	}

	/** The type every callout on this board is set in, whatever it is anchored to. */
	private calloutText(text: string, fill: number): Text {
		const label = new Text({
			text,
			style: {
				fill,
				fontSize: 28,
				fontWeight: '900',
				fontFamily: 'system-ui, sans-serif',
				stroke: { color: 0x000000, width: 6 },
				align: 'center'
			}
		});
		// The anchor point is the label's foot, so a caller places the line it sits above.
		label.anchor.set(0.5, 1);
		return label;
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

	/** Remove a character's callout, if it has one. */
	clearCallout(id: string): void {
		const actor = this.findActor(id);
		if (!actor?.label) return;
		actor.label.parent?.removeChild(actor.label);
		actor.label.destroy();
		actor.label = null;
	}

	/** Clear every callout on the board. */
	clearCallouts(): void {
		for (const actor of this.actors) this.clearCallout(actor.id);
		// And the ones pinned to ground rather than to anybody, which no actor would take
		// down for us.
		for (const label of this.cellLabels) {
			label.parent?.removeChild(label);
			label.destroy();
		}
		this.cellLabels = [];
	}

	// --- Order buttons --------------------------------------------------------

	/**
	 * Say what happens when an order button is tapped. The board reports the actor it
	 * belongs to and the caller's own id for the order; it never decides anything
	 * about what an order is or whether it was sensible.
	 */
	onOrder(handler: (actorId: string, orderId: string) => void): void {
		this.orderHandler = handler;
	}

	/**
	 * Give a fighter the orders it can be given, drawn as a column of buttons immediately
	 * beside the character they belong to — where the association is unambiguous — the
	 * three of them together coming to the height of the cell it is standing on
	 * ({@link ORDER_HEIGHT_RATIO}).
	 *
	 * `side` says which of its shoulders the column stands off, and is the caller's to
	 * decide because it is about the fight and not about the board: the two teams stand on
	 * opposite halves, so a column on the outer shoulder of each puts every one of them
	 * clear of the ground being fought over, and puts a team's columns together on that
	 * team's own side of the screen.
	 *
	 * Called on every change of the fight's state, so it rebuilds only when the *set*
	 * of orders changes and otherwise just repaints the buttons it already has: a
	 * strip torn down and rebuilt each time would drop the pointer state mid-tap and
	 * flicker its glyphs while their textures reloaded. An empty list clears the strip.
	 */
	setOrders(actorId: string, orders: BoardOrder[], side: OrderSide = 'right'): void {
		const actor = this.findActor(actorId);
		if (!actor || !this.app) return;
		if (orders.length === 0) {
			this.clearOrders(actor);
			return;
		}

		const sameSet =
			actor.orders?.buttons.length === orders.length &&
			actor.orders.buttons.every((button, i) => button.id === orders[i].id);
		if (!sameSet) {
			this.clearOrders(actor);
			actor.orders = this.buildOrders(actor, orders, side);
		}

		const strip = actor.orders;
		if (!strip) return;
		strip.side = side;
		orders.forEach((order, i) => {
			const button = strip.buttons[i];
			if (!button) return;
			const color = order.color ?? null;
			if (
				button.selected === order.selected &&
				button.disabled === order.disabled &&
				button.color === color
			)
				return;
			button.selected = order.selected;
			button.disabled = order.disabled;
			button.color = color;
			this.paintOrder(actor, button);
		});
		this.updateOrders(actor);
	}

	/** Build a fighter's strip: one button per order, glyphs loaded as they arrive. */
	private buildOrders(actor: Actor, orders: BoardOrder[], side: OrderSide): OrderStrip {
		const container = new Container();
		container.sortableChildren = false;
		this.app!.stage.addChild(container);

		const buttons = orders.map((order) => {
			const face = new Graphics();
			const glyph = new Sprite();
			glyph.anchor.set(0.5);
			const button: OrderButton = {
				id: order.id,
				container: new Container(),
				face,
				glyph,
				selected: order.selected,
				disabled: order.disabled,
				color: order.color ?? null
			};
			button.container.addChild(face, glyph);
			// A reporting button is not an input: it is left with no event mode at all, so it
			// takes no pointer, shows no cursor and cannot be hit-tested — rather than taking
			// the tap and dropping it, which is a button that looks pressable and does
			// nothing.
			if (!order.readonly) {
				// The button itself takes the tap, so the hit area is exactly its face.
				button.container.eventMode = 'static';
				button.container.cursor = 'pointer';
				button.container.on('pointertap', () => {
					if (button.disabled) return;
					this.orderHandler?.(actor.id, button.id);
				});
			}
			container.addChild(button.container);

			void this.loadIcon(order.icon).then((texture) => {
				// The strip may have been rebuilt (or the board torn down) while loading.
				if (!texture || glyph.destroyed) return;
				glyph.texture = texture;
				this.layOutOrders(actor);
			});
			this.paintOrder(actor, button);
			return button;
		});

		const strip: OrderStrip = { container, buttons, side };
		actor.orders = strip;
		this.layOutOrders(actor);
		return strip;
	}

	/** Repaint one button for its current state: chosen, plain, or out of reach. */
	private paintOrder(actor: Actor, button: OrderButton): void {
		const { width, height } = this.orderSize();
		const radius = height * ORDER_RADIUS_RATIO;
		// The chosen order takes the fighter's own colour where one was named, and otherwise
		// its side's, so a fighter's orders read as belonging to it rather than to some
		// palette of the interface's own.
		const chosen = button.color
			? combatColorHex(button.color)
			: actor.side === 'blue'
				? this.options.grids[1].color
				: this.options.grids[0].color;
		const fill = button.disabled ? ORDER_DISABLED_FILL : button.selected ? chosen : ORDER_IDLE_FILL;

		button.face.clear();
		button.face.roundRect(-width / 2, -height / 2, width, height, radius);
		button.face.fill({ color: fill });
		button.face.roundRect(-width / 2, -height / 2, width, height, radius);
		button.face.stroke({ width: 2, color: 0x000000, alpha: 0.45 });

		// Tint only ever darkens, so the glyph artwork is white and the tint is what
		// gives it its colour. A disabled glyph fades toward its own background rather
		// than vanishing, so an order out of reach still reads as an order.
		button.glyph.tint = 0xffffff;
		button.glyph.alpha = button.disabled ? ORDER_DISABLED_ALPHA : 1;
	}

	/**
	 * A button's drawn size: a cell's side split {@link ORDER_COLUMN_COUNT} ways with the
	 * gaps taken out of it, and as wide as that height allows — so the column of orders
	 * comes to exactly the cell it is stacked alongside. One size for every fighter,
	 * because one size is what a cell is, so a fighter that walks carries the same column
	 * of buttons with it.
	 */
	private orderSize(): { width: number; height: number; gap: number } {
		const height = this.cellWidth() * ORDER_HEIGHT_RATIO;
		return { width: height * ORDER_WIDTH_RATIO, height, gap: height * ORDER_SPACING_RATIO };
	}

	/**
	 * Stack the buttons in a column and size their glyphs to fit. The column is laid out
	 * upward from its own origin — the fighter's feet — so the bottom button sits on the
	 * ground the fighter stands on and the rest rise from it, while the list still reads
	 * top to bottom in the order it was handed in.
	 */
	private layOutOrders(actor: Actor): void {
		const strip = actor.orders;
		if (!strip) return;
		const { height, gap } = this.orderSize();
		const step = height + gap;
		const column = strip.buttons.length * height + (strip.buttons.length - 1) * gap;
		const start = -column + height / 2;
		strip.buttons.forEach((button, i) => {
			button.container.x = 0;
			button.container.y = start + i * step;
			this.paintOrder(actor, button);
			const glyph = button.glyph;
			if (glyph.texture && glyph.texture.width > 0) {
				const target = height * ORDER_ICON_RATIO;
				glyph.scale.set(target / Math.max(glyph.texture.width, glyph.texture.height));
			}
		});
	}

	/** Keep a fighter's column planted off the shoulder it was given, as the fighter
	 * moves. Measured off the sprite's own half-width rather than off the cell, so the
	 * gap is to the character and not to the ground it happens to be standing on. */
	private updateOrders(actor: Actor): void {
		const strip = actor.orders;
		if (!strip) return;
		const { width } = this.orderSize();
		const reach = actor.displayWidth / 2 + ORDER_GAP + width / 2;
		strip.container.x = actor.x + (strip.side === 'left' ? -reach : reach);
		strip.container.y = actor.y;
		// Above the board and its own fighter, below the callouts and slashes.
		strip.container.zIndex = actor.y + 5000;
	}

	/** Take a fighter's strip off the board. */
	private clearOrders(actor: Actor): void {
		const strip = actor.orders;
		if (!strip) return;
		actor.orders = null;
		strip.container.parent?.removeChild(strip.container);
		strip.container.destroy({ children: true });
	}

	// --- Trait badges ---------------------------------------------------------

	/**
	 * Say what a fighter's colour gives it for nothing, drawn as glyphs at its
	 * top-left corner — the free shot, the free charge, the free guard. The orders
	 * beside it are what it may be *told* to do; this is what it does without
	 * being told, so it is drawn off the strip and shaped nothing like it: a round
	 * white coin apiece rather than a button, carrying the glyph in the fighter's own
	 * colour, so a glance at the corner says both what the fighter has and what colour
	 * it is.
	 *
	 * The board is handed the glyphs and whether each has been used up, exactly as it
	 * is handed a strip of orders: it draws what it is given and knows nothing of what
	 * a trait means. Called again as gifts are spent, so — as with the strip — the
	 * badge is rebuilt only when the *set* changes and is otherwise just repainted: a
	 * badge torn down and rebuilt would flicker its glyphs while their textures
	 * reloaded, for nothing but a change of alpha. An empty list takes it off.
	 */
	setTraits(actorId: string, traits: BoardTrait[], color: string): void {
		const actor = this.findActor(actorId);
		if (!actor || !this.app) return;
		if (traits.length === 0) {
			this.clearTraits(actor);
			return;
		}

		const icons = traits.map((trait) => trait.icon);
		const sameSet =
			actor.traits?.icons.length === icons.length &&
			actor.traits.icons.every((icon, i) => icon === icons[i]);
		if (!sameSet) {
			this.clearTraits(actor);
			actor.traits = this.buildTraits(actor, icons, color);
		}

		const badge = actor.traits;
		if (!badge) return;
		traits.forEach((trait, i) => {
			// The disc fades with the glyph it carries: the two are one mark, and a white
			// coin left burning under a spent glyph would be the louder half of it.
			const mark = badge.marks[i];
			if (mark) mark.alpha = trait.spent ? TRAIT_SPENT_ALPHA : 1;
		});
		this.updateTraits(actor);
	}

	/**
	 * Build a fighter's badge: one mark per gift, each a white disc with the glyph
	 * centred on it, artwork loaded as it arrives.
	 *
	 * The disc is what makes the mark readable at all. A glyph tinted the fighter's
	 * own colour is drawn straight over whatever the sprite behind it happens to be —
	 * a yellow one over a pale character is nothing but a smudge — so it is given a
	 * white coin to sit on, and the colour then reads against white wherever the
	 * fighter walks.
	 */
	private buildTraits(actor: Actor, icons: string[], color: string): TraitBadge {
		const container = new Container();
		this.app!.stage.addChild(container);
		const tint = combatColorHex(color);
		// One disc, one size, on every fighter — see TRAIT_DISC_PX. The mark's box *is* the
		// disc, so the glyph is placed and fitted against the coin it sits on rather than
		// against a box the coin then overflows.
		const disc = TRAIT_DISC_PX;
		const step = disc * (1 + TRAIT_SPACING_RATIO);
		const glyphBox = disc * TRAIT_GLYPH_RATIO;

		const marks = icons.map((url, index) => {
			// Laid out rightward from the corner, so a compound's second mark reads left
			// to right and neither hangs off the fighter into the cell beside it.
			const mark = new Container();
			mark.x = index * step;

			const coin = new Graphics();
			coin.circle(disc / 2, disc / 2, disc / 2);
			coin.fill({ color: 0xffffff });

			const glyph = new Sprite(Texture.EMPTY);
			// Centred on the disc, so a glyph wider than it is tall still sits in the
			// middle of its coin rather than hanging off the top of it.
			glyph.anchor.set(0.5);
			glyph.position.set(disc / 2, disc / 2);
			// Tint only ever darkens, so the artwork is white and the tint is the colour.
			glyph.tint = tint;
			mark.addChild(coin, glyph);
			container.addChild(mark);

			void this.loadIcon(url).then((texture) => {
				// The badge may have been rebuilt (or the board torn down) while loading.
				if (!texture || glyph.destroyed) return;
				glyph.texture = texture;
				// The raster is square (see ICON_RASTER_PX), so this is one scale for both
				// axes and the artwork lands inside the rim on every side.
				glyph.scale.set(glyphBox / Math.max(texture.width, texture.height));
			});
			return mark;
		});

		return { container, marks, icons };
	}

	/**
	 * Keep a fighter's badge pinned to its top-left corner as it walks: the corner of
	 * the box its nominal size describes, which is the character's own full reach
	 * rather than whatever the frame currently showing happens to measure — so the
	 * badge holds still while the fighter breathes.
	 */
	private updateTraits(actor: Actor): void {
		const badge = actor.traits;
		if (!badge) return;
		badge.container.x = actor.x - actor.displayWidth / 2;
		badge.container.y = actor.y - actor.displayHeight;
		// Above the board and its own fighter, below the callouts and the slashes: what
		// a fighter is must never cover what has just happened to it.
		badge.container.zIndex = actor.y + 4000;
	}

	/** Take a fighter's badge off the board. */
	private clearTraits(actor: Actor): void {
		const badge = actor.traits;
		if (!badge) return;
		actor.traits = null;
		badge.container.parent?.removeChild(badge.container);
		badge.container.destroy({ children: true });
	}

	/**
	 * Load (and cache) one icon glyph, rasterised into a known square at a resolution
	 * worth looking at. Resolves to null if it cannot be had, so a missing icon costs the
	 * mark its picture and nothing else.
	 *
	 * The size is given rather than taken from the file, because a file's own `width` is
	 * not a statement about how much resolution the artwork in it deserves — see
	 * {@link ICON_RASTER_PX} for what taking it was costing. Mipmaps are asked for with it:
	 * a 256px glyph drawn at about 48 is a heavy minification, and sampling one straight
	 * off the full-size bitmap picks a sparse scatter of its pixels, which is what makes
	 * fine artwork crawl and sparkle as the thing it is pinned to moves.
	 *
	 * One texture serves every mark that names the same glyph — the trait discs and the
	 * order buttons both come through here — so it is rasterised for the largest of them
	 * and each scales the one bitmap down to its own size.
	 */
	private async loadIcon(url: string): Promise<Texture | null> {
		const cached = this.iconTextures.get(url);
		if (cached) return cached;
		try {
			const texture = await Assets.load<Texture>({
				src: url,
				// `width`/`height` are what the SVG parser rasterises into; the rest is passed
				// on to the texture source it builds around that bitmap.
				data: {
					width: ICON_RASTER_PX,
					height: ICON_RASTER_PX,
					autoGenerateMipmaps: true,
					scaleMode: 'linear'
				}
			});
			this.iconTextures.set(url, texture);
			return texture;
		} catch {
			return null;
		}
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
	 * Finish whatever one-shot currently owns an actor's sprite, resolving whoever is
	 * awaiting it. A pose is over the moment something takes the sprite off it, and a
	 * caller waiting on the pose it no longer owns would otherwise wait for ever —
	 * which strands the turn playing it out.
	 */
	private settleOneShot(actor: Actor): void {
		const shot = actor.oneShot;
		if (!shot) return;
		actor.oneShot = null;
		shot.resolve();
	}

	/**
	 * Play a loaded raw animation as a one-shot and resolve when it finishes. If
	 * the actor has no such animation, resolves immediately so combat still flows.
	 * Any pose already playing is settled first — it has lost the sprite.
	 */
	private playAnimationOnce(id: string, name: string): Promise<void> {
		const actor = this.findActor(id);
		const frames = actor && name ? actor.animations[name] : undefined;
		if (!actor || !name || !frames || frames.length === 0) return Promise.resolve();
		this.settleOneShot(actor);
		const total = frames.reduce((sum, frame) => sum + frame.duration, 0);
		this.setAnimation(actor, name);
		actor.frameIndex = 0;
		actor.frameElapsed = 0;
		return new Promise((resolve) => {
			actor.oneShot = { total, elapsed: 0, resolve };
		});
	}
}
