import { describe, it, expect } from 'vitest';
import {
	BOARD_COLUMNS,
	BOARD_HEIGHT,
	BOARD_ROWS,
	BOARD_WIDTH,
	boardCells,
	type Cell,
	cellCenter,
	cellDistance,
	cellFoot,
	cellSide,
	columnLabel,
	FIRST_COLUMN,
	FIRST_LANE_ROW,
	FIRST_ROW,
	findMeleeMeeting,
	findPath,
	HEX_HEIGHT,
	HEX_ROW_STEP,
	hexCorners,
	isBoardCell,
	LAST_COLUMN,
	LAST_ROW,
	MIDDLE_ROW,
	neighbors,
	rowLabel
} from '$utils/mugen/grid';

describe('board cells', () => {
	it('is four rows of five, with a sixth cell on the offset ones', () => {
		// Three lanes and the row of ground above them, which is board like any other.
		expect(BOARD_ROWS).toBe(4);
		expect(FIRST_ROW).toBe(FIRST_LANE_ROW - 1);
		// The middle lane is the middle of what is fought over, not of the board.
		expect(MIDDLE_ROW).toBe(1);
		// The widest rows span every column; the level rows are a column shorter.
		expect(BOARD_COLUMNS).toBe(6);
		expect(boardCells()).toHaveLength(6 + 5 + 6 + 5);
		for (let r = FIRST_ROW; r <= LAST_ROW; r++) {
			// The rows alternate, so they alternate upward from the first lane too: a row
			// laid the same way round as the one under it would stack instead of nesting.
			const offset = Math.abs(r - FIRST_LANE_ROW) % 2 === 1;
			expect(boardCells().filter((cell) => cell.r === r)).toHaveLength(offset ? 6 : 5);
		}
	});

	it('gives the outermost column to the offset rows alone', () => {
		// The cell that makes the field's outline symmetric, on every row staggered that
		// way — the middle lane, and the row of ground above the lanes.
		expect(isBoardCell(FIRST_COLUMN, MIDDLE_ROW)).toBe(true);
		expect(isBoardCell(FIRST_COLUMN, FIRST_ROW)).toBe(true);
		expect(isBoardCell(FIRST_COLUMN, FIRST_LANE_ROW)).toBe(false);
		expect(isBoardCell(FIRST_COLUMN, LAST_ROW)).toBe(false);
	});

	it('excludes everything off the field', () => {
		expect(isBoardCell(3, 0)).toBe(false); // no such column
		expect(isBoardCell(-4, 1)).toBe(false); // nor here — nothing is deeper than a3
		expect(isBoardCell(0, 3)).toBe(false); // below the bottom row
		expect(isBoardCell(0, FIRST_ROW - 1)).toBe(false); // above the top row
	});

	it('includes representative interior cells', () => {
		expect(isBoardCell(0, 0)).toBe(true);
		expect(isBoardCell(-2, 2)).toBe(true);
		expect(isBoardCell(1, 1)).toBe(true);
	});

	it('assigns colour side by column sign', () => {
		expect(cellSide(-3)).toBe('red');
		expect(cellSide(-2)).toBe('red');
		expect(cellSide(-1)).toBe('red');
		expect(cellSide(0)).toBe('purple');
		expect(cellSide(1)).toBe('blue');
		expect(cellSide(2)).toBe('blue');
	});

	it('runs every row the full width, the extra cell aside', () => {
		const cells = boardCells();
		for (const cell of cells) expect(isBoardCell(cell.q, cell.r)).toBe(true);
		// No column that runs the board's depth may be missing a row: leaving out the odd
		// column, every row holds the same five cells.
		for (let r = FIRST_ROW; r <= LAST_ROW; r++) {
			const lane = cells.filter((cell) => cell.r === r && cell.q > FIRST_COLUMN);
			expect(lane).toHaveLength(BOARD_COLUMNS - 1);
		}
	});
});

describe('cell names', () => {
	it('letters the columns from the left edge and numbers the rows from the top', () => {
		// A column's coordinate is signed and centred on the white one; its name is its
		// place across the board, so the left-hand column is `a` whatever q calls it.
		expect(columnLabel(FIRST_COLUMN)).toBe('a');
		expect(columnLabel(0)).toBe('d');
		expect(columnLabel(LAST_COLUMN)).toBe('f');
		// Rows read downward, so the top one is 1 and the numbering follows the rows —
		// the row above the lanes included, which is what makes the first lane row 2.
		expect(rowLabel(FIRST_ROW)).toBe('1');
		expect(rowLabel(FIRST_LANE_ROW)).toBe('2');
		expect(rowLabel(LAST_ROW)).toBe(String(BOARD_ROWS));
		// `a` names the cells of the offset rows: the middle lane's is a3.
		expect(`${columnLabel(FIRST_COLUMN)}${rowLabel(MIDDLE_ROW)}`).toBe('a3');
	});

	it('names every cell, and no two the same', () => {
		const cells = boardCells();
		const names = cells.map((cell) => `${columnLabel(cell.q)}${rowLabel(cell.r)}`);
		expect(names).toHaveLength(cells.length);
		expect(new Set(names).size).toBe(names.length);
	});
});

describe('adjacency and pathfinding', () => {
	it('neighbours are the six sides, all valid board cells at distance 1', () => {
		// The middle cell of the middle row: an offset row, and far enough inside the
		// board that all six of its sides land on real cells.
		const from: Cell = { q: 0, r: 1 };
		const around = neighbors(from.q, from.r);
		expect(around).toHaveLength(6);
		for (const nb of around) {
			expect(isBoardCell(nb.q, nb.r)).toBe(true);
			expect(cellDistance(from, nb)).toBe(1);
		}
		// A hexagon's six neighbours are six different cells.
		expect(new Set(around.map((c) => `${c.q},${c.r}`)).size).toBe(6);
	});

	it('reaches the next row by stepping half a cell across, either way', () => {
		// A level row overhangs the columns to its left, so from a cell on one the row
		// below is reached at its own column or the one before it — and never the one
		// after, which is a corner away rather than a side.
		expect(neighbors(0, 0)).toContainEqual({ q: 0, r: 1 });
		expect(neighbors(0, 0)).toContainEqual({ q: -1, r: 1 });
		expect(neighbors(0, 0)).not.toContainEqual({ q: 1, r: 1 });
		expect(cellDistance({ q: 0, r: 0 }, { q: 1, r: 1 })).toBe(2);

		// An offset row is shoved right, so its cells overhang the columns to their
		// right instead — the mirror of the above, and what makes the two rows nest.
		expect(neighbors(0, 1)).toContainEqual({ q: 0, r: 2 });
		expect(neighbors(0, 1)).toContainEqual({ q: 1, r: 2 });
		expect(neighbors(0, 1)).not.toContainEqual({ q: -1, r: 2 });
	});

	it('nests the row above the lanes into the first one, and measures it like any other', () => {
		// The top row is offset, so it overhangs the columns to its right: the two cells it
		// meets on the lane below are its own column and the next one along.
		expect(neighbors(0, FIRST_ROW)).toContainEqual({ q: 0, r: FIRST_LANE_ROW });
		expect(neighbors(0, FIRST_ROW)).toContainEqual({ q: 1, r: FIRST_LANE_ROW });
		expect(neighbors(0, FIRST_ROW)).not.toContainEqual({ q: -1, r: FIRST_LANE_ROW });
		// And the arithmetic that undoes the stagger holds above the lanes as well as below
		// them: every neighbour of a cell up there is one side away, counted negative rows
		// and all.
		for (const nb of neighbors(0, FIRST_ROW)) {
			expect(cellDistance({ q: 0, r: FIRST_ROW }, nb)).toBe(1);
		}
		// It is walkable ground, so it is on the paths that cross it — two rows down from
		// the top row is two steps, exactly as two rows down from anywhere else.
		expect(cellDistance({ q: 0, r: FIRST_ROW }, { q: 0, r: FIRST_LANE_ROW + 1 })).toBe(2);
	});

	it('measures a walk in sides crossed, not in rows plus columns', () => {
		// Two rows straight down from a level row: one step onto the offset row below
		// and one back, landing a column to the left of where it started. Counted as
		// two offset axes summed it would come to three.
		expect(cellDistance({ q: 0, r: 0 }, { q: -1, r: 2 })).toBe(2);
		// Across a whole row is the columns between, as it always was.
		expect(cellDistance({ q: -2, r: 1 }, { q: 2, r: 1 })).toBe(4);
	});

	it('agrees with the walk: a path is as long as the distance says', () => {
		const pairs: [Cell, Cell][] = [
			[{ q: -2, r: 0 }, { q: 2, r: 2 }],
			[{ q: -2, r: 2 }, { q: 2, r: 0 }],
			[{ q: 0, r: 0 }, { q: -1, r: 2 }],
			[{ q: -1, r: 1 }, { q: 1, r: 1 }]
		];
		for (const [start, goal] of pairs) {
			const path = findPath(start, goal, (c) => isBoardCell(c.q, c.r)) as Cell[];
			expect(path).not.toBeNull();
			expect(path.length - 1).toBe(cellDistance(start, goal));
		}
	});

	it('findPath returns a contiguous path including both endpoints', () => {
		const start: Cell = { q: -2, r: 2 };
		const goal: Cell = { q: 2, r: 0 };
		const path = findPath(start, goal, (c) => isBoardCell(c.q, c.r));
		expect(path).not.toBeNull();
		const cells = path as Cell[];
		expect(cells[0]).toEqual(start);
		expect(cells[cells.length - 1]).toEqual(goal);
		for (let i = 1; i < cells.length; i++) {
			expect(cellDistance(cells[i - 1], cells[i])).toBe(1);
		}
	});
});

describe('the shape of a cell', () => {
	it('is a hexagon standing on end: taller than it is wide, points top and bottom', () => {
		// Pointy-topped, so the long axis is the vertical one.
		expect(HEX_HEIGHT).toBeGreaterThan(1);
		const corners = hexCorners(0, 0);
		expect(corners).toHaveLength(6);
		const centre = cellCenter(0, 0);
		// Exactly two corners sit on the cell's own vertical centre line — its top and
		// bottom points — and they are a full height apart.
		const points = corners.filter((corner) => Math.abs(corner.x - centre.x) < 1e-9);
		expect(points).toHaveLength(2);
		expect(Math.abs(points[0].y - points[1].y)).toBeCloseTo(HEX_HEIGHT);
		// The four others are the ends of the two vertical sides, half a width out.
		for (const corner of corners.filter((c) => !points.includes(c))) {
			expect(Math.abs(corner.x - centre.x)).toBeCloseTo(0.5);
		}
	});

	it('meets its neighbours on a row side by side, a full width apart', () => {
		expect(cellCenter(1, 0).x - cellCenter(0, 0).x).toBeCloseTo(1);
		expect(cellCenter(0, 0).y).toBeCloseTo(cellCenter(2, 0).y);
	});

	it('nests the rows: three quarters of a height down, half a width across', () => {
		expect(HEX_ROW_STEP).toBeCloseTo(HEX_HEIGHT * 0.75);
		expect(cellCenter(0, 1).y - cellCenter(0, 0).y).toBeCloseTo(HEX_ROW_STEP);
		// The middle row is the offset one, so the top and bottom rows stay level with
		// each other and it is the one that steps out.
		expect(cellCenter(0, 1).x - cellCenter(0, 0).x).toBeCloseTo(0.5);
		expect(cellCenter(0, 2).x).toBeCloseTo(cellCenter(0, 0).x);
	});

	it('is exactly as big as the board says it is', () => {
		// Every cell of the board lies inside the extent the renderer sizes its canvas
		// from, and the extent is no bigger than it needs to be.
		const corners = boardCells().flatMap((cell) => hexCorners(cell.q, cell.r));
		expect(Math.min(...corners.map((c) => c.x))).toBeCloseTo(0);
		expect(Math.min(...corners.map((c) => c.y))).toBeCloseTo(0);
		expect(Math.max(...corners.map((c) => c.x))).toBeCloseTo(BOARD_WIDTH);
		expect(Math.max(...corners.map((c) => c.y))).toBeCloseTo(BOARD_HEIGHT);
		// Nothing hangs off either end: the middle row spans every column edge to edge.
		expect(BOARD_WIDTH).toBeCloseTo(BOARD_COLUMNS);
	});

	it('is symmetric left to right, which is what the odd cell buys', () => {
		// Mirroring the field about its own middle lands it back on itself: every cell's
		// reflection is a cell, which is the whole point of the sixth one.
		const middle = BOARD_WIDTH / 2;
		const at = (cells: Cell[]) =>
			new Set(cells.map((c) => `${cellCenter(c.q, c.r).x.toFixed(4)},${c.r}`));
		const board = at(boardCells());
		const mirrored = new Set(
			boardCells().map((c) => `${(2 * middle - cellCenter(c.q, c.r).x).toFixed(4)},${c.r}`)
		);
		expect(mirrored).toEqual(board);
	});

	it('stands a fighter where its cell is still full width, not on its bottom point', () => {
		const centre = cellCenter(0, FIRST_ROW);
		const foot = cellFoot(0, FIRST_ROW);
		expect(foot.x).toBeCloseTo(centre.x);
		// Below the centre, so the fighter reads as inside its cell — but above the
		// bottom point, which is the corner shared with the two cells underneath.
		expect(foot.y).toBeGreaterThan(centre.y);
		expect(foot.y).toBeLessThan(centre.y + HEX_HEIGHT / 2);
	});
});

describe('findMeleeMeeting', () => {
	it('lands the two fighters side by side on one row, on colour-legal cells', () => {
		const meeting = findMeleeMeeting({ q: -2, r: 1 }, { q: 2, r: 1 });
		expect(meeting).not.toBeNull();
		const { red, blue } = meeting!;
		// Immediately horizontal: adjacent, and on the same row.
		expect(cellDistance(red.destination, blue.destination)).toBe(1);
		expect(red.destination.r).toBe(blue.destination.r);
		// Red stays on red/white (q <= 0); blue stays strictly on blue (q >= 1).
		expect(red.destination.q).toBeLessThanOrEqual(0);
		expect(blue.destination.q).toBeGreaterThanOrEqual(1);
		// Paths are anchored at each fighter's start and their destination.
		expect(red.path[0]).toEqual({ q: -2, r: 1 });
		expect(red.path[red.path.length - 1]).toEqual(red.destination);
		expect(blue.path[0]).toEqual({ q: 2, r: 1 });
		expect(blue.path[blue.path.length - 1]).toEqual(blue.destination);
	});

	it('keeps red on its colour or white and blue strictly on blue', () => {
		const meeting = findMeleeMeeting({ q: -1, r: 0 }, { q: 1, r: 2 })!;
		for (const cell of meeting.red.path) expect(cell.q).toBeLessThanOrEqual(0);
		for (const cell of meeting.blue.path) expect(cell.q).toBeGreaterThanOrEqual(1);
	});
});
