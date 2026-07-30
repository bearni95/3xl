/**
 * BoxCrumble
 *
 * One surface's worth of a booster box coming apart, on a canvas: a grid of squares of that
 * surface's own tone that blurs itself into place square by square and, when what is under it
 * is there to be seen, blurs away again — both times out from the middle of the plane, and both
 * times with the columns broken up out of order, though not the same order twice.
 *
 * It is the canvas's VeilBlock, and deliberately the same object: the same square size, the
 * same three durations, the same reach-from-the-centre and the same dealt column waits, so a
 * box coming apart here reads as the box coming apart in the document. What it cannot borrow is
 * the *means* — a canvas has no per-element transitions and no filter it can afford three
 * hundred of — so the two things CSS was doing for a square are done here as they have to be:
 *
 *  - **The blur** is two pictures of a square rather than a filter on one. A square blurred by
 *    half its width is a fixed image, so it is baked once (see {@link makeCellTextures}) and the
 *    square cross-fades between that and its crisp self as it comes and goes. Blurring three
 *    hundred sprites a frame is a filter pass each; blending two is a sprite each.
 *  - **The thinning** rides along with it, as it must: blur alone never clears a tiled surface,
 *    since it only spreads a square's ink over its neighbours' room and the middle of the block
 *    stays as solid as it started.
 *
 * A surface says where its squares land and this runs them. Which plane they are laid in is the
 * caller's to say too, through `place`: the front's stand square, a bevel face's shear with the
 * face, and the lid's are laid down under its perspective — one grain across four planes, which
 * is what makes four surfaces read as one box coming apart.
 */

import {
	Application,
	BlurFilter,
	Color,
	Container,
	Graphics,
	Matrix,
	RenderTexture,
	Sprite,
	Texture
} from 'pixi.js';

// How long one square takes to go, how far apart the first square and the last one start, and
// how late a column can be on top of that. The three add up to the whole sweep. The sweep gets
// the larger share of the waiting: it is what crosses the plane, and the columns only break the
// line it crosses it in. VeilBlock's own numbers — a box that crumbled to a different clock than
// the veils a character arrives behind would be a second animation, not the same one.
const BLUR_MS = 500;
const STAGGER_MS = 350;
const COLUMN_MS = 150;
export const CRUMBLE_SWEEP_MS = STAGGER_MS + COLUMN_MS + BLUR_MS;

// How far a square blurs before it is gone, as a share of its own width: the point is that the
// squares dissolve rather than switch off, so the radius is measured against the thing being
// blurred and not in flat pixels.
const BLUR_SHARE = 0.5;

// The shading, as veils of black over whatever a square is painted rather than as greys of its
// own — black over a colour darkens it and leaves it that colour, where a grey would paint it
// out. Cycled in order, not drawn at random, so nothing shimmers while the grid sits there.
// Eleven of them against a column count that is never eleven, so the sequence slips along by a
// few cells each row and the grid comes out varied instead of striped.
const CELL_SHADES = [0.05, 0.15, 0.1, 0.25, 0.05, 0.2, 0.1, 0.05, 0.15, 0.25, 0.1];

// How late each column is, as a share of COLUMN_MS — dealt twice over, once for coming in and
// once for going out, so a column is not the same amount late both times and the wave breaks
// differently on the way to the picture than on the way from it.
const COLUMN_POOL = 16;
const COLUMN_RUN = 4;

/**
 * The two pictures of a square, one set per shade: crisp, and blurred by half a square. Baked
 * once for a whole box — every plane of it breaks into the same grain — and given back with it.
 */
export interface CellTextures {
	crisp: Texture[];
	soft: Texture[];
	/** Side of a square, in the units the box is drawn in. */
	cell: number;
	destroy(): void;
}

/**
 * Bake the square textures for a box whose grain is `cell` wide, at `resolution` device pixels
 * per unit — a box standing at three times the size it was built at wants three times the
 * pixels, and a render texture's resolution is exactly that question.
 *
 * Each is white so the surface's own tone can tint it, with the inner square darkened by its
 * shade and a hairline of undarkened white left round the edge: that rim is the grout, and it is
 * what makes the tiling read as a grid of squares rather than as one mottled block. Baked into
 * the picture rather than laid over it as a second sprite, so a square is still one sprite.
 */
export function makeCellTextures(app: Application, cell: number, resolution: number): CellTextures {
	const blur = cell * BLUR_SHARE;
	// A blur reaches about twice its strength, so the soft copy is drawn in a box that much
	// bigger all round; anything less and the square would come back with its own edges cut off.
	const pad = Math.ceil(blur * 2);
	const crisp: Texture[] = [];
	const soft: Texture[] = [];

	for (const shade of CELL_SHADES) {
		crisp.push(bake(app, cell, shade, 0, resolution));
		soft.push(bake(app, cell, shade, pad, resolution, blur));
	}

	return {
		crisp,
		soft,
		cell,
		destroy(): void {
			for (const texture of [...crisp, ...soft]) texture.destroy(true);
		}
	};
}

/**
 * Render one square into a texture of its own, padded and blurred by however much is asked. The
 * blur happens here and only here: a filter is a render pass, and one paid at bake time serves
 * every square that ever wears this picture.
 */
function bake(
	app: Application,
	cell: number,
	shade: number,
	pad: number,
	resolution: number,
	blur = 0
): Texture {
	const face = new Graphics();
	face.rect(0, 0, cell, cell);
	face.fill(0xffffff);
	// The shade as a grey rather than as black over the square: the sprite is tinted by the
	// surface's tone, and a tint multiplies — so a grey k inside a white rim comes out as the tone
	// at k, which is the tone with black over it at 1 − k. The rim is the grout.
	const level = Math.round(255 * (1 - shade));
	face.rect(1, 1, cell - 2, cell - 2);
	face.fill((level << 16) | (level << 8) | level);
	face.position.set(pad, pad);
	if (blur > 0) face.filters = [new BlurFilter({ strength: blur, quality: 3 })];

	const target = RenderTexture.create({
		width: cell + pad * 2,
		height: cell + pad * 2,
		resolution
	});
	const holder = new Container();
	holder.addChild(face);
	app.renderer.render({ container: holder, target });
	holder.destroy({ children: true });
	return target;
}

export interface BoxCrumbleOptions {
	app: Application;
	textures: CellTextures;
	/** How many squares across and down the plane takes. */
	columns: number;
	rows: number;
	/** The tone this surface crazes in — its own step off the stock. */
	tone: string;
	/**
	 * Where a square lands: the matrix that maps its own square (0…cell in both directions) into
	 * the surface's drawing space. Left out, the squares simply tile from the origin, which is
	 * what a plane standing square to the eye wants; a lid hands in its perspective and a bevel
	 * face its shear.
	 */
	place?: (column: number, row: number) => Matrix;
}

/** One square: the two pictures of it and the two moments it moves at. */
interface Cell {
	crisp: Sprite;
	soft: Sprite;
	waitIn: number;
	waitOut: number;
}

export class BoxCrumble extends Container {
	private app: Application;
	private cells: Cell[] = [];
	private phase: 'in' | 'held' | 'out' | 'gone' = 'in';
	private elapsed = 0;
	private ticking = false;
	private shownResolve: (() => void) | null = null;
	private goneResolve: (() => void) | null = null;
	private readonly shown: Promise<void>;
	private readonly gone: Promise<void>;

	constructor(options: BoxCrumbleOptions) {
		super();
		this.app = options.app;
		const { textures, columns, rows, tone } = options;
		const cell = textures.cell;
		const tint = new Color(tone).toNumber();
		const waitsIn = dealColumnWaits();
		const waitsOut = dealColumnWaits();

		for (let index = 0; index < columns * rows; index += 1) {
			const column = index % columns;
			const row = Math.floor(index / columns);
			const shade = index % CELL_SHADES.length;
			const box = new Container();
			box.setFromMatrix(
				options.place?.(column, row) ?? new Matrix(1, 0, 0, 1, column * cell, row * cell)
			);

			const soft = new Sprite(textures.soft[shade]);
			const crisp = new Sprite(textures.crisp[shade]);
			for (const sprite of [soft, crisp]) {
				sprite.anchor.set(0.5);
				sprite.position.set(cell / 2, cell / 2);
				sprite.tint = tint;
				sprite.alpha = 0;
				box.addChild(sprite);
			}
			this.addChild(box);

			// Where a square lies says most of when it moves — the square the sweep starts at goes
			// at once and each one further out waits a little longer — and its column adds the rest,
			// which is what stops a whole ring moving as one band. The reach is the same coming and
			// going: both sweeps run the same way out of the same place.
			const reachWait = reach(row, column, rows, columns) * STAGGER_MS;
			const pool = column % COLUMN_POOL;
			this.cells.push({
				crisp,
				soft,
				waitIn: reachWait + waitsIn[pool] * COLUMN_MS,
				waitOut: reachWait + waitsOut[pool] * COLUMN_MS
			});
		}

		this.shown = new Promise((resolve) => (this.shownResolve = resolve));
		this.gone = new Promise((resolve) => (this.goneResolve = resolve));
		this.app.ticker.add(this.tick);
		this.ticking = true;
		this.paint();
	}

	/** Resolves when every square is in and the plane is covered. What put it up waits for this
	 * before it counts towards taking it down — a grid caught halfway in and sent straight back
	 * out reads as a flicker rather than as a reveal. */
	whenShown(): Promise<void> {
		return this.shown;
	}

	/** Resolves when the last square has gone. */
	whenGone(): Promise<void> {
		return this.gone;
	}

	/** Away. The squares blur out in the same order they came in and do not come back. */
	fade(): void {
		if (this.phase !== 'held') return;
		this.phase = 'out';
		this.elapsed = 0;
	}

	override destroy(options?: Parameters<Container['destroy']>[0]): void {
		if (this.ticking && this.app.ticker) this.app.ticker.remove(this.tick);
		this.ticking = false;
		this.shownResolve?.();
		this.goneResolve?.();
		super.destroy(options);
	}

	private tick = (): void => {
		if (this.destroyed || this.phase === 'held' || this.phase === 'gone') return;
		this.elapsed += this.app.ticker.deltaMS;
		this.paint();
		if (this.elapsed < CRUMBLE_SWEEP_MS) return;
		if (this.phase === 'in') {
			this.phase = 'held';
			this.shownResolve?.();
		} else {
			this.phase = 'gone';
			this.visible = false;
			this.goneResolve?.();
		}
	};

	/**
	 * Every square at the moment it is at. A square is `presence` 0 when it is blurred away and 1
	 * when it is crisp and solid, and the two pictures of it are mixed off that: the crisp one
	 * comes in with the square of the presence, so it arrives late and leaves early, and the soft
	 * one carries the middle of the move, where a blurred square is all there is to see. Both are
	 * nothing at either end, which is what makes coming and going one animation run in opposite
	 * directions rather than two written to match.
	 *
	 * The soft one's share is a half again over the plain product, which is what puts the pair back
	 * where a flat fade would be: two pictures laid over one another do not add up — what shows
	 * through both is what neither covers — so mixed by the product alone a square is thinner in
	 * the middle of its move than the document's opacity leaves it.
	 */
	private paint(): void {
		const leaving = this.phase === 'out';
		for (const cell of this.cells) {
			const wait = leaving ? cell.waitOut : cell.waitIn;
			const t = Math.min(1, Math.max(0, (this.elapsed - wait) / BLUR_MS));
			const presence = leaving ? 1 - t : t;
			cell.crisp.alpha = presence * presence;
			cell.soft.alpha = Math.min(1, 1.5 * presence * (1 - presence));
		}
	}
}

/**
 * How far along the sweep a square is, 0 for the first to move and 1 for the last: its distance
 * out from the middle square, over the furthest any square in this grid is. Squares on a ring
 * about the middle move together, so what opens is a ring rather than a line — which is what a
 * box coming apart wants: it breaks in the middle of itself and the break travels to its edges,
 * where an edge that went first would only say which edge.
 *
 * Measured in squares and not in drawn pixels, which is what keeps a ring a ring on a plane the
 * caller has tilted: a lid draws it as the ellipse the perspective makes of it, as it must.
 */
function reach(row: number, column: number, rows: number, columns: number): number {
	const down = row - (rows - 1) / 2;
	const across = column - (columns - 1) / 2;
	const furthest = Math.hypot((rows - 1) / 2, (columns - 1) / 2);
	return furthest > 0 ? Math.hypot(across, down) / furthest : 0;
}

/**
 * A wait for every column the pool covers, in no order and with no long run in it. Drawn from
 * evenly spaced values and shuffled rather than taken at random one by one: the whole of the
 * range gets used that way, where independent draws clump and leave the scatter looking like two
 * or three columns going together. Reshuffled while any four columns in a row climb or fall
 * together — a run that long is a diagonal crossing the grid, which is the single thing the
 * scatter exists to break.
 */
function dealColumnWaits(): number[] {
	const waits = Array.from({ length: COLUMN_POOL }, (_, index) => index / (COLUMN_POOL - 1));
	for (let attempt = 0; attempt < 8; attempt += 1) {
		for (let i = waits.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[waits[i], waits[j]] = [waits[j], waits[i]];
		}
		if (!hasRun(waits)) break;
	}
	return waits;
}

/** Whether COLUMN_RUN columns anywhere in a row all climb or all fall. */
function hasRun(waits: number[]): boolean {
	for (let start = 0; start + COLUMN_RUN <= waits.length; start += 1) {
		let climbing = true;
		let falling = true;
		for (let i = start + 1; i < start + COLUMN_RUN; i += 1) {
			if (waits[i] <= waits[i - 1]) climbing = false;
			if (waits[i] >= waits[i - 1]) falling = false;
		}
		if (climbing || falling) return true;
	}
	return false;
}
