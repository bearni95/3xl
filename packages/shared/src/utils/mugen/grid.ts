/**
 * Pure hex-grid helpers for the board, shared between the renderer
 * ({@link file://./mugen-board.ts}) and combat pathfinding so the two can never
 * disagree about which cells exist.
 *
 * The board is a field of **pointy-topped** hexagons — each cell standing on end, a
 * point at its top and another at its bottom, taller than it is wide — addressed by
 * column (`q`, across the width) and row (`r`, down the screen): row 0 is the top row,
 * and rows count downward exactly as they are read, because nothing here is tilted.
 * A hexagon in this orientation has two vertical sides and four slanted ones, which is
 * what decides everything below: a row is a straight, level line of cells meeting side
 * by side, and the rows above and below it nest into its slants, each offset half a
 * cell across (the odd ones, so the board's middle row is the one that steps out and
 * its top and bottom rows stay level with each other).
 *
 * The coordinates are the offset kind — the column a cell is drawn in, and the row it
 * sits on — because that is what the board's rules are written in: a column has a
 * colour and a row is a lane, and both have to survive being counted. What the offset
 * costs is that a step's arithmetic depends on which row it is taken from, so
 * {@link neighbors} and {@link cellDistance} are the only two places in the codebase
 * that know it, and everything else goes on asking them.
 *
 * It is five columns by three rows, and symmetric about its middle column: two
 * columns of red half, the shared white one at q = 0, two of blue. So the ground both
 * sides are playing for sits dead centre, and each half is the same two columns deep
 * — one to be pushed back onto, and one behind that.
 *
 * Cells left of centre are the red half, right the blue half. Every column runs the
 * full depth of the board, so a row is a **lane**: the two fighters holding the same
 * row face each other across it, and the ground between them is the white cell they
 * are playing for. Three rows is three lanes, which is a side's whole line — so every
 * row of the board is fought over and none of it is ground nobody stands on (see the
 * combat controller's opening cells).
 */

/** A cell coordinate: column across, row down. */
export interface Cell {
	q: number;
	r: number;
}

/** Which half of the board a column belongs to. */
export type CellSide = 'red' | 'purple' | 'blue';

/** The board's outermost columns: two red, the white one at zero, two blue. */
export const FIRST_COLUMN = -2;
export const LAST_COLUMN = 2;
/** The board's rows — a lane apiece, counted downward from the top of the screen. */
export const FIRST_ROW = 0;
export const LAST_ROW = 2;

/** The board's extent in cells, which is what sizes the drawn grid. */
export const BOARD_COLUMNS = LAST_COLUMN - FIRST_COLUMN + 1;
export const BOARD_ROWS = LAST_ROW - FIRST_ROW + 1;

/** The board's middle row: the lane halfway down it. */
export const MIDDLE_ROW = Math.floor((FIRST_ROW + LAST_ROW) / 2);

/**
 * What a column is called, the way a chess file is: a letter, counted from `a` at the
 * board's left edge. A column's own coordinate is signed and centred on the white one
 * (`q = 0`), which is the right way to write the board's rules and the wrong way to
 * point at a cell out loud — so the name is the column's position across the board
 * rather than its distance from the middle.
 */
export const columnLabel = (q: number): string => String.fromCharCode(97 + (q - FIRST_COLUMN));

/**
 * What a row is called: a number, counted from 1 at the top row. Chess numbers its
 * ranks up from the bottom because the bottom is white's own end; here the two sides
 * are the left and right halves and no row belongs to either, so the numbering follows
 * the board's own rows instead and runs the way they are read — row `r` is row
 * `r + 1`, and the letter/number pair never disagrees with the coordinate behind it.
 */
export const rowLabel = (r: number): string => String(r - FIRST_ROW + 1);

/**
 * Whether a row is one of the offset ones — the rows shoved half a cell to the right so
 * they nest into the slants of the rows either side. Counted off the board's own first
 * row rather than off zero, so it is the board's middle row that steps out however the
 * rows happen to be numbered.
 */
const isOffsetRow = (r: number): boolean => Math.abs(r - FIRST_ROW) % 2 === 1;

/**
 * The six neighbours of a hexagon, as the offset coordinates reach them: the two
 * alongside it on its own row, and two apiece on the rows above and below. Which two
 * depends on whether the row is an offset one — a cell on a level row overhangs the
 * columns to its own left, one on an offset row the columns to its own right — which is
 * the whole of what the offset costs, and it is paid here and in {@link cellDistance}
 * and nowhere else.
 *
 * Every one of the six is a full side of the hexagon, so unlike the square board this
 * replaced there is no such thing as a diagonal here: the four steps that used to be two
 * moves apart across a corner are one move apart across an edge, and a step off a row is
 * a step half a cell across as well as a row down.
 */
const NEIGHBOR_DELTAS: Record<'level' | 'offset', Cell[]> = {
	level: [
		{ q: 1, r: 0 },
		{ q: -1, r: 0 },
		{ q: 0, r: -1 },
		{ q: -1, r: -1 },
		{ q: 0, r: 1 },
		{ q: -1, r: 1 }
	],
	offset: [
		{ q: 1, r: 0 },
		{ q: -1, r: 0 },
		{ q: 1, r: -1 },
		{ q: 0, r: -1 },
		{ q: 1, r: 1 },
		{ q: 0, r: 1 }
	]
};

/**
 * A cell in cube coordinates — the three axes a hex grid measures distance along, one
 * per pair of opposite sides, summing to zero. The board is not addressed this way
 * (see the module note), so this is a conversion used for the one thing offset
 * coordinates cannot answer directly.
 */
function cube(cell: Cell): { x: number; y: number; z: number } {
	const offset = isOffsetRow(cell.r) ? 1 : 0;
	const x = cell.q - (cell.r - FIRST_ROW - offset) / 2;
	const z = cell.r - FIRST_ROW;
	return { x, y: -x - z, z };
}

/** Whether [q, r] is a real, occupiable board cell. */
export function isBoardCell(q: number, r: number): boolean {
	return q >= FIRST_COLUMN && q <= LAST_COLUMN && r >= FIRST_ROW && r <= LAST_ROW;
}

/** Every valid board cell, in a stable order (by column, then row). */
export function boardCells(): Cell[] {
	const cells: Cell[] = [];
	for (let q = FIRST_COLUMN; q <= LAST_COLUMN; q++) {
		for (let r = FIRST_ROW; r <= LAST_ROW; r++) {
			cells.push({ q, r });
		}
	}
	return cells;
}

/** Colour side of a column: negative q is red, positive blue, zero white. */
export function cellSide(q: number): CellSide {
	if (q < 0) return 'red';
	if (q > 0) return 'blue';
	return 'purple';
}

/** The (up to six) valid board neighbours of a cell. */
export function neighbors(q: number, r: number): Cell[] {
	const deltas = NEIGHBOR_DELTAS[isOffsetRow(r) ? 'offset' : 'level'];
	return deltas.map((d) => ({ q: q + d.q, r: r + d.r })).filter((c) => isBoardCell(c.q, c.r));
}

/**
 * Step distance between two cells: how many sides a fighter crosses walking from one to
 * the other, which on a hex grid is half the cube coordinates' spread. Not the two offset
 * axes summed — a row's cells are staggered against the next row's, so the same difference
 * in `q` means a different walk depending on which rows it is measured between.
 */
export function cellDistance(a: Cell, b: Cell): number {
	const from = cube(a);
	const to = cube(b);
	return (Math.abs(from.x - to.x) + Math.abs(from.y - to.y) + Math.abs(from.z - to.z)) / 2;
}

const key = (q: number, r: number): string => `${q},${r}`;

// --- The shape of a cell, and where it sits ---------------------------------
// Everything below is measured in **cell widths**: one unit is the width of a hexagon,
// which is also the distance between two neighbours' centres along a row. That unit is
// the renderer's `cellSize`, so a board is drawn by scaling these figures by it and
// nothing else — and the shape of the board stays here, next to the rules written on
// it, rather than being re-derived by whatever happens to be drawing.
//
// A pointy-topped hexagon is taller than it is wide by a fixed ratio, and its rows nest:
// each one is drawn three quarters of a hexagon's height below the last, the top quarter
// of every row tucked into the slants of the row above. So three rows are not three
// heights tall — they are two steps plus one hexagon.

/** A point on the board, in cell widths off the grid's top-left corner. */
export interface GridPoint {
	x: number;
	y: number;
}

/** A hexagon's height, as a multiple of its width: point to point down the long axis. */
export const HEX_HEIGHT = 2 / Math.sqrt(3);

/** How far below one row's centres the next row's sit — three quarters of a hexagon,
 * because the rows interlock rather than stack. */
export const HEX_ROW_STEP = HEX_HEIGHT * 0.75;

/** The board's own extent in cell widths: the columns, plus the half-cell the offset
 * rows hang out to the right by, and the rows' interlocked height. */
export const BOARD_WIDTH = BOARD_COLUMNS + 0.5;
export const BOARD_HEIGHT = (BOARD_ROWS - 1) * HEX_ROW_STEP + HEX_HEIGHT;

/** Centre of the cell at [q, r]. */
export function cellCenter(q: number, r: number): GridPoint {
	return {
		x: q - FIRST_COLUMN + 0.5 + (isOffsetRow(r) ? 0.5 : 0),
		y: (r - FIRST_ROW) * HEX_ROW_STEP + HEX_HEIGHT / 2
	};
}

/**
 * The line a fighter standing in the cell at [q, r] plants its feet on: the cell's
 * centre across, and down at the foot of its two vertical sides.
 *
 * Not the bottom point. A hexagon standing on end tapers to a single vertex shared with
 * the two cells below it, and a fighter stood on that reads as balancing on the crack
 * between them; the foot of the vertical sides is the lowest line at which the cell is
 * still its full width, so a fighter stood there has the whole width of its own cell
 * under it and is plainly inside it.
 */
export function cellFoot(q: number, r: number): GridPoint {
	const centre = cellCenter(q, r);
	return { x: centre.x, y: centre.y + HEX_HEIGHT / 4 };
}

/**
 * The six corners of the cell at [q, r], from the top point clockwise. Stated as exact
 * fractions of the hexagon rather than swept out with trigonometry: a pointy-topped
 * hexagon's corners are its two points, top and bottom, and the four ends of its
 * vertical sides, which stand a quarter of its height either side of centre.
 */
export function hexCorners(q: number, r: number): GridPoint[] {
	const { x, y } = cellCenter(q, r);
	const half = HEX_HEIGHT / 2;
	const quarter = HEX_HEIGHT / 4;
	return [
		{ x, y: y - half },
		{ x: x + 0.5, y: y - quarter },
		{ x: x + 0.5, y: y + quarter },
		{ x, y: y + half },
		{ x: x - 0.5, y: y + quarter },
		{ x: x - 0.5, y: y - quarter }
	];
}

/**
 * Breadth-first search from `start` to `goal` across cells for which
 * `isAllowed` returns true. Returns the cell path **including** both endpoints,
 * or null if unreachable. `start` and `goal` are assumed allowed by the caller.
 */
export function findPath(start: Cell, goal: Cell, isAllowed: (c: Cell) => boolean): Cell[] | null {
	if (start.q === goal.q && start.r === goal.r) return [start];
	const cameFrom = new Map<string, Cell | null>();
	cameFrom.set(key(start.q, start.r), null);
	const queue: Cell[] = [start];
	while (queue.length > 0) {
		const current = queue.shift() as Cell;
		if (current.q === goal.q && current.r === goal.r) {
			const path: Cell[] = [];
			let node: Cell | null = current;
			while (node) {
				path.unshift(node);
				node = cameFrom.get(key(node.q, node.r)) ?? null;
			}
			return path;
		}
		for (const next of neighbors(current.q, current.r)) {
			if (!isAllowed(next)) continue;
			const k = key(next.q, next.r);
			if (cameFrom.has(k)) continue;
			cameFrom.set(k, current);
			queue.push(next);
		}
	}
	return null;
}

/** BFS distance map from `start` across allowed cells. */
function distanceMap(start: Cell, isAllowed: (c: Cell) => boolean): Map<string, number> {
	const dist = new Map<string, number>();
	dist.set(key(start.q, start.r), 0);
	const queue: Cell[] = [start];
	while (queue.length > 0) {
		const current = queue.shift() as Cell;
		const base = dist.get(key(current.q, current.r)) as number;
		for (const next of neighbors(current.q, current.r)) {
			if (!isAllowed(next)) continue;
			const k = key(next.q, next.r);
			if (dist.has(k)) continue;
			dist.set(k, base + 1);
			queue.push(next);
		}
	}
	return dist;
}

/** A fighter's computed approach: destination cell and the path to reach it. */
export interface Approach {
	destination: Cell;
	path: Cell[];
}

/**
 * Work out where a red (left-half) fighter and a blue (right-half) fighter
 * should meet for melee: the pair of **immediately horizontal** cells — the two
 * cells either side of one vertical grid line, one legal for red (q ≤ 0), one legal
 * for blue (q ≥ 1) — that minimises the two fighters' combined walking distance
 * from their starts. Meeting side by side on one row is what makes the duel read
 * horizontally on screen, and a row of pointy-topped hexagons is level all the way
 * across — every cell of it at the same height, meeting its neighbours on their
 * vertical sides, which is why the cells are drawn standing on end.
 * Red may stand on its own colour or the shared white column; blue stays strictly
 * on blue. When `redCell` is given the meeting spot is fixed instead of searched:
 * red walks to that exact cell and blue to its east neighbour on the same row.
 * Returns each fighter's destination + path, or null if they can't meet.
 */
export function findMeleeMeeting(
	startRed: Cell,
	startBlue: Cell,
	redCell?: Cell,
	blocked?: (c: Cell) => boolean
): { red: Approach; blue: Approach } | null {
	// A cell is walkable for a side if it obeys the side rule and isn't occupied by
	// another (non-dueling) character; the two fighters' own cells are never blocked
	// because the caller excludes them from `blocked`.
	const free = (c: Cell) => !blocked?.(c);
	const redAllowed = (c: Cell) => cellSide(c.q) !== 'blue' && free(c); // red or white (q ≤ 0)
	const blueAllowed = (c: Cell) => cellSide(c.q) === 'blue' && free(c); // blue only (q ≥ 1)

	if (redCell) {
		// Fixed meeting spot: red on the given cell, blue facing it from the east
		// neighbour, mirroring the side-by-side rule of the search below.
		const blueCell: Cell = { q: redCell.q + 1, r: redCell.r };
		if (!isBoardCell(redCell.q, redCell.r) || !redAllowed(redCell)) return null;
		if (!isBoardCell(blueCell.q, blueCell.r) || !blueAllowed(blueCell)) return null;
		const redPath = findPath(startRed, redCell, redAllowed);
		const bluePath = findPath(startBlue, blueCell, blueAllowed);
		if (!redPath || !bluePath) return null;
		return {
			red: { destination: redCell, path: redPath },
			blue: { destination: blueCell, path: bluePath }
		};
	}

	const redDist = distanceMap(startRed, redAllowed);
	const blueDist = distanceMap(startBlue, blueAllowed);

	let best: {
		redCell: Cell;
		blueCell: Cell;
		cost: number;
		central: number;
	} | null = null;
	for (const cell of boardCells()) {
		if (!redAllowed(cell)) continue;
		const rd = redDist.get(key(cell.q, cell.r));
		if (rd === undefined) continue;
		for (const nb of neighbors(cell.q, cell.r)) {
			// Only the east/west neighbour (same row) counts: the fighters must
			// face each other from immediately horizontal cells.
			if (nb.r !== cell.r) continue;
			if (!blueAllowed(nb)) continue;
			const bd = blueDist.get(key(nb.q, nb.r));
			if (bd === undefined) continue;
			const cost = rd + bd;
			// Tie-break toward the centre so duels happen near the middle white column.
			const central = Math.abs(cell.q) + Math.abs(nb.q);
			if (!best || cost < best.cost || (cost === best.cost && central < best.central)) {
				best = { redCell: cell, blueCell: nb, cost, central };
			}
		}
	}

	if (!best) return null;
	const redPath = findPath(startRed, best.redCell, redAllowed);
	const bluePath = findPath(startBlue, best.blueCell, blueAllowed);
	if (!redPath || !bluePath) return null;
	return {
		red: { destination: best.redCell, path: redPath },
		blue: { destination: best.blueCell, path: bluePath }
	};
}

/**
 * How close a fighter can legally get to `target`: the allowed cell that minimises
 * step distance to `target`, breaking ties first toward the target's row (so the
 * melee strike lines up horizontally on screen, matching how fighters meet in
 * {@link findMeleeMeeting}) and then toward the shortest walk from `start`. Used
 * when a melee fighter closes on a foe whose own cell it cannot have — `isAllowed`
 * is what keeps it out of the cells it may not stand in, so it stops beside them
 * rather than walking through. Returns the destination + path, or null if it can't
 * move.
 */
export function findClosestApproach(
	start: Cell,
	target: Cell,
	isAllowed: (c: Cell) => boolean
): Approach | null {
	const dist = distanceMap(start, isAllowed);
	let best: {
		cell: Cell;
		toTarget: number;
		offRow: number;
		walk: number;
	} | null = null;
	for (const cell of boardCells()) {
		if (!isAllowed(cell)) continue;
		const walk = dist.get(key(cell.q, cell.r));
		if (walk === undefined) continue;
		const toTarget = cellDistance(cell, target);
		const offRow = Math.abs(cell.r - target.r);
		if (
			!best ||
			toTarget < best.toTarget ||
			(toTarget === best.toTarget &&
				(offRow < best.offRow || (offRow === best.offRow && walk < best.walk)))
		) {
			best = { cell, toTarget, offRow, walk };
		}
	}
	if (!best) return null;
	const path = findPath(start, best.cell, isAllowed);
	if (!path) return null;
	return { destination: best.cell, path };
}
