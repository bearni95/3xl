/**
 * Pure hex-grid helpers for the board, shared between the renderer
 * ({@link file://./mugen-board.ts}) and combat pathfinding so the two can never
 * disagree about which cells exist. The board is a single flat-top hexagon of
 * radius {@link HEX_RADIUS} in axial coordinates (q across the width, r into the
 * depth); cells left of centre are the red half, right the blue half, and the
 * central column (q = 0) is the shared purple row.
 */

/** An axial hex coordinate. */
export interface Hex {
	q: number;
	r: number;
}

/** Which half of the board a column belongs to. */
export type CellSide = 'red' | 'purple' | 'blue';

/** Rings out from the centre hex (must match mugen-board's HEX_RADIUS). */
export const HEX_RADIUS = 3;

/**
 * Front edge of the board: per column, the nearest cell (smallest r) still
 * rendered. Anything closer to the viewer is trimmed. Mirrors the FRONT_ROW map
 * in mugen-board's drawBoard — keep the two in sync.
 */
const FRONT_ROW = new Map<number, number>([
	[-2, 1],
	[-1, 0],
	[0, 0],
	[1, -1],
	[2, -1]
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
	const R = HEX_RADIUS;
	if (Math.abs(q + r) > R) return false; // outside the hexagon
	if (Math.abs(q) === R) return false; // outermost red / blue column removed
	if (q === 0 && Math.abs(r) === R) return false; // top / bottom purple cell removed
	const front = FRONT_ROW.get(q);
	if (front !== undefined && r < front) return false; // nearer than the front edge
	return true;
}

/** Every valid board cell, in a stable order. */
export function boardCells(): Hex[] {
	const cells: Hex[] = [];
	const R = HEX_RADIUS;
	for (let q = -R; q <= R; q++) {
		for (let r = -R; r <= R; r++) {
			if (isBoardCell(q, r)) cells.push({ q, r });
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
 * should meet for melee: the pair of **adjacent** cells — one legal for red
 * (q ≤ 0), one legal for blue (q ≥ 1) — that minimises the two fighters'
 * combined walking distance from their starts. Red may stand on its own colour or
 * the shared purple column; blue stays strictly on blue. Returns each fighter's
 * destination + path, or null if they can't meet.
 */
export function findMeleeMeeting(startRed: Hex, startBlue: Hex): { red: Approach; blue: Approach } | null {
	const redAllowed = (c: Hex) => cellSide(c.q) !== 'blue'; // red or purple (q ≤ 0)
	const blueAllowed = (c: Hex) => cellSide(c.q) === 'blue'; // blue only (q ≥ 1), never purple

	const redDist = distanceMap(startRed, redAllowed);
	const blueDist = distanceMap(startBlue, blueAllowed);

	let best: { redCell: Hex; blueCell: Hex; cost: number; central: number } | null = null;
	for (const cell of boardCells()) {
		if (!redAllowed(cell)) continue;
		const rd = redDist.get(key(cell.q, cell.r));
		if (rd === undefined) continue;
		for (const nb of neighbors(cell.q, cell.r)) {
			if (!blueAllowed(nb)) continue;
			if (nb.q === cell.q && nb.r === cell.r) continue;
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
 * minimises hex distance to `target`, breaking ties toward the shortest walk from
 * `start`. Used when a melee fighter advances on a foe who backed off to shoot —
 * `isAllowed` enforces the side rule (nobody crosses the central purple column), so
 * it stops at the boundary rather than chasing across it. Returns the destination +
 * path, or null if it can't move.
 */
export function findClosestApproach(
	start: Hex,
	target: Hex,
	isAllowed: (c: Hex) => boolean
): Approach | null {
	const dist = distanceMap(start, isAllowed);
	let best: { cell: Hex; toTarget: number; walk: number } | null = null;
	for (const cell of boardCells()) {
		if (!isAllowed(cell)) continue;
		const walk = dist.get(key(cell.q, cell.r));
		if (walk === undefined) continue;
		const toTarget = hexDistance(cell, target);
		if (!best || toTarget < best.toTarget || (toTarget === best.toTarget && walk < best.walk)) {
			best = { cell, toTarget, walk };
		}
	}
	if (!best) return null;
	const path = findPath(start, best.cell, isAllowed);
	if (!path) return null;
	return { destination: best.cell, path };
}
