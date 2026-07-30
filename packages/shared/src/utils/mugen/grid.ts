/**
 * Pure square-grid helpers for the board, shared between the renderer
 * ({@link file://./mugen-board.ts}) and combat pathfinding so the two can never
 * disagree about which cells exist.
 *
 * The board is a plain rectangle of square cells, addressed by column (`q`, across
 * the width) and row (`r`, down the screen): row 0 is the top row, and rows count
 * downward exactly as they are read, because nothing here is tilted — a cell is a
 * square drawn face-on, so the grid's coordinates and the screen's are the same
 * two axes.
 *
 * Cells left of centre are the red half, right the blue half, and the central
 * column (q = 0) is the shared white one. Every column runs the full depth of the
 * board, so a row is a **lane**: the two fighters holding the same row face each
 * other across it, and the ground between them is the white cell they are playing
 * for.
 *
 * The red half is a single column deep: the rivals open on the white column itself
 * and have exactly one column of their own to be pushed back onto. The blue half is
 * two, so the player's line opens a column clear of the white one and has ground to
 * cross to take it.
 */

/** A cell coordinate: column across, row down. */
export interface Cell {
	q: number;
	r: number;
}

/** Which half of the board a column belongs to. */
export type CellSide = 'red' | 'purple' | 'blue';

/** The board's outermost columns: one red, the white one, two blue. */
export const FIRST_COLUMN = -1;
export const LAST_COLUMN = 2;
/** The board's rows — one per lane, counted downward from the top of the screen. */
export const FIRST_ROW = 0;
export const LAST_ROW = 2;

/** The board's extent in cells, which is what sizes the drawn grid. */
export const BOARD_COLUMNS = LAST_COLUMN - FIRST_COLUMN + 1;
export const BOARD_ROWS = LAST_ROW - FIRST_ROW + 1;

/** The four neighbours of a square cell: no diagonals, so a step is one side. */
const NEIGHBOR_DELTAS: Cell[] = [
	{ q: 1, r: 0 },
	{ q: -1, r: 0 },
	{ q: 0, r: 1 },
	{ q: 0, r: -1 }
];

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

/** The (up to four) valid board neighbours of a cell. */
export function neighbors(q: number, r: number): Cell[] {
	return NEIGHBOR_DELTAS.map((d) => ({ q: q + d.q, r: r + d.r })).filter((c) =>
		isBoardCell(c.q, c.r)
	);
}

/** Step distance between two cells: no diagonal move, so it is the two axes summed. */
export function cellDistance(a: Cell, b: Cell): number {
	return Math.abs(a.q - b.q) + Math.abs(a.r - b.r);
}

const key = (q: number, r: number): string => `${q},${r}`;

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
 * horizontally on screen, and on a square grid a row is level all the way across.
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

	let best: { redCell: Cell; blueCell: Cell; cost: number; central: number } | null = null;
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
	let best: { cell: Cell; toTarget: number; offRow: number; walk: number } | null = null;
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
