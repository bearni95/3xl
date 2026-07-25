/**
 * Pure hex-grid helpers for the board, shared between the renderer
 * ({@link file://./mugen-board.ts}) and combat pathfinding so the two can never
 * disagree about which cells exist. The board is a single pointy-top cluster of
 * hexes in axial coordinates (q across the width, r into the depth); cells left
 * of centre are the red half, right the blue half, and the central column
 * (q = 0) is the shared purple row.
 *
 * The cluster is tilted diagonally so the red half sits **lower** on screen
 * (nearer the viewer, smaller r) and to the left, while the blue half sits
 * higher (further into the board) and to the right. Each column therefore spans
 * its own explicit [minR, maxR] range ({@link ROW_RANGE}) — the red columns run
 * through low r, the blue columns through high r — rather than the symmetric
 * upright hexagon the field used to be.
 */

/** An axial hex coordinate. */
export interface Hex {
	q: number;
	r: number;
}

/** Which half of the board a column belongs to. */
export type CellSide = 'red' | 'purple' | 'blue';

/** Widest column reach out from the centre column (used to size the projection). */
export const HEX_RADIUS = 3;

/**
 * The [minR, maxR] row range each column occupies (inclusive). Columns not
 * listed have no cells. This is the whole board shape: red columns (q < 0) run
 * through the low (near, lower-on-screen) rows, blue columns (q > 0) through the
 * high (far, higher-on-screen) rows, so the halves read as a diagonal — red
 * lower-left, blue upper-right. The central purple column sits a row lower than
 * its neighbours (its top cell recessed), and the inner blue column runs the
 * full depth so every purple duel cell keeps a blue east-neighbour to face.
 */
const ROW_RANGE = new Map<number, [number, number]>([
	[-2, [-3, -1]],
	[-1, [-3, 0]],
	[0, [-3, -1]],
	[1, [-5, -1]],
	[2, [-4, -2]]
]);

/** Standard axial neighbour deltas (6 directions). */
const NEIGHBOR_DELTAS: Hex[] = [
	{ q: 1, r: 0 },
	{ q: 1, r: -1 },
	{ q: 0, r: -1 },
	{ q: -1, r: 0 },
	{ q: -1, r: 1 },
	{ q: 0, r: 1 }
];

/** Whether axial [q, r] is a real, occupiable board cell. */
export function isBoardCell(q: number, r: number): boolean {
	const range = ROW_RANGE.get(q);
	if (!range) return false; // column not on the board
	return r >= range[0] && r <= range[1];
}

/** Every valid board cell, in a stable order (by column, then row). */
export function boardCells(): Hex[] {
	const cells: Hex[] = [];
	for (const [q, [minR, maxR]] of ROW_RANGE) {
		for (let r = minR; r <= maxR; r++) {
			cells.push({ q, r });
		}
	}
	return cells;
}

/** Colour side of a column: negative q is red, positive blue, zero purple. */
export function cellSide(q: number): CellSide {
	if (q < 0) return 'red';
	if (q > 0) return 'blue';
	return 'purple';
}

/** The (up to six) valid board neighbours of a cell. */
export function neighbors(q: number, r: number): Hex[] {
	return NEIGHBOR_DELTAS.map((d) => ({ q: q + d.q, r: r + d.r })).filter((c) =>
		isBoardCell(c.q, c.r)
	);
}

/** Axial hex distance between two cells. */
export function hexDistance(a: Hex, b: Hex): number {
	const dq = a.q - b.q;
	const dr = a.r - b.r;
	return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

const key = (q: number, r: number): string => `${q},${r}`;

/**
 * Breadth-first search from `start` to `goal` across cells for which
 * `isAllowed` returns true. Returns the cell path **including** both endpoints,
 * or null if unreachable. `start` and `goal` are assumed allowed by the caller.
 */
export function findPath(start: Hex, goal: Hex, isAllowed: (c: Hex) => boolean): Hex[] | null {
	if (start.q === goal.q && start.r === goal.r) return [start];
	const cameFrom = new Map<string, Hex | null>();
	cameFrom.set(key(start.q, start.r), null);
	const queue: Hex[] = [start];
	while (queue.length > 0) {
		const current = queue.shift() as Hex;
		if (current.q === goal.q && current.r === goal.r) {
			const path: Hex[] = [];
			let node: Hex | null = current;
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
function distanceMap(start: Hex, isAllowed: (c: Hex) => boolean): Map<string, number> {
	const dist = new Map<string, number>();
	dist.set(key(start.q, start.r), 0);
	const queue: Hex[] = [start];
	while (queue.length > 0) {
		const current = queue.shift() as Hex;
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
	destination: Hex;
	path: Hex[];
}

/**
 * Work out where a red (left-half) fighter and a blue (right-half) fighter
 * should meet for melee: the pair of **immediately horizontal** cells — east/west
 * neighbours on the same row, one legal for red (q ≤ 0), one legal for blue
 * (q ≥ 1) — that minimises the two fighters' combined walking distance from
 * their starts. Meeting side by side on one row keeps the duel reading
 * horizontally on screen (pointy-top rows are level). Red may stand on its own
 * colour or the shared purple column; blue stays strictly on blue. When
 * `redCell` is given the meeting spot is fixed instead of searched: red walks
 * to that exact cell and blue to its east neighbour on the same row. Returns
 * each fighter's destination + path, or null if they can't meet.
 */
export function findMeleeMeeting(
	startRed: Hex,
	startBlue: Hex,
	redCell?: Hex
): { red: Approach; blue: Approach } | null {
	const redAllowed = (c: Hex) => cellSide(c.q) !== 'blue'; // red or purple (q ≤ 0)
	const blueAllowed = (c: Hex) => cellSide(c.q) === 'blue'; // blue only (q ≥ 1), never purple

	if (redCell) {
		// Fixed meeting spot: red on the given cell, blue facing it from the east
		// neighbour, mirroring the side-by-side rule of the search below.
		const blueCell: Hex = { q: redCell.q + 1, r: redCell.r };
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

	let best: { redCell: Hex; blueCell: Hex; cost: number; central: number } | null = null;
	for (const cell of boardCells()) {
		if (!redAllowed(cell)) continue;
		const rd = redDist.get(key(cell.q, cell.r));
		if (rd === undefined) continue;
		for (const nb of neighbors(cell.q, cell.r)) {
			// Only the east/west neighbour (same row) counts: the fighters must
			// face each other from immediately horizontal cells, not diagonals.
			if (nb.r !== cell.r) continue;
			if (!blueAllowed(nb)) continue;
			const bd = blueDist.get(key(nb.q, nb.r));
			if (bd === undefined) continue;
			const cost = rd + bd;
			// Tie-break toward the centre so duels happen near the middle purple column.
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
 * Where a fighter going ranged should back off to: the reachable allowed cell
 * that sits **furthest from the central column** (largest |q|), so it shoots
 * from as deep in its own territory as it can. Ties (several cells in the outer
 * column) break toward the shortest walk from `start`. Returns the destination +
 * path, or null if it can't move.
 */
export function findRetreatCell(start: Hex, isAllowed: (c: Hex) => boolean): Approach | null {
	const dist = distanceMap(start, isAllowed);
	let best: { cell: Hex; far: number; walk: number } | null = null;
	for (const cell of boardCells()) {
		if (!isAllowed(cell)) continue;
		const walk = dist.get(key(cell.q, cell.r));
		if (walk === undefined) continue;
		const far = Math.abs(cell.q); // hex columns away from the centre column
		if (!best || far > best.far || (far === best.far && walk < best.walk)) {
			best = { cell, far, walk };
		}
	}
	if (!best) return null;
	const path = findPath(start, best.cell, isAllowed);
	if (!path) return null;
	return { destination: best.cell, path };
}

/**
 * How close a fighter can legally get to `target`: the allowed cell that
 * minimises hex distance to `target`, breaking ties first toward the target's
 * row (so the melee strike lines up horizontally on screen, matching how
 * fighters meet in {@link findMeleeMeeting}) and then toward the shortest walk
 * from `start`. Used when a melee fighter advances on a foe who backed off to
 * shoot — `isAllowed` enforces the side rule (nobody crosses the central purple
 * column), so it stops at the boundary rather than chasing across it. Returns
 * the destination + path, or null if it can't move.
 */
export function findClosestApproach(
	start: Hex,
	target: Hex,
	isAllowed: (c: Hex) => boolean
): Approach | null {
	const dist = distanceMap(start, isAllowed);
	let best: { cell: Hex; toTarget: number; offRow: number; walk: number } | null = null;
	for (const cell of boardCells()) {
		if (!isAllowed(cell)) continue;
		const walk = dist.get(key(cell.q, cell.r));
		if (walk === undefined) continue;
		const toTarget = hexDistance(cell, target);
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
