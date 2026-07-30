import { describe, it, expect } from 'vitest';
import {
	BOARD_COLUMNS,
	BOARD_ROWS,
	boardCells,
	type Cell,
	cellDistance,
	cellSide,
	FIRST_COLUMN,
	findMeleeMeeting,
	findPath,
	isBoardCell,
	LAST_COLUMN,
	MIDDLE_ROW,
	neighbors
} from '$utils/mugen/grid';

describe('board cells', () => {
	it('is five columns by five rows, symmetric about the white one', () => {
		expect(BOARD_COLUMNS).toBe(5);
		expect(BOARD_ROWS).toBe(5);
		// The white column is q = 0, so a board symmetric about it is one whose outermost
		// columns are the same distance out: two of red half, two of blue.
		expect(FIRST_COLUMN).toBe(-LAST_COLUMN);
		expect(MIDDLE_ROW).toBe(2);
	});

	it('excludes everything off the rectangle', () => {
		expect(isBoardCell(3, 0)).toBe(false); // no such column
		expect(isBoardCell(-3, 0)).toBe(false); // nor here — each half is two deep
		expect(isBoardCell(0, 5)).toBe(false); // below the bottom row
		expect(isBoardCell(0, -1)).toBe(false); // above the top row
	});

	it('includes representative interior cells', () => {
		expect(isBoardCell(0, 0)).toBe(true);
		expect(isBoardCell(-2, 4)).toBe(true);
		expect(isBoardCell(1, 2)).toBe(true);
	});

	it('assigns colour side by column sign', () => {
		expect(cellSide(-2)).toBe('red');
		expect(cellSide(-1)).toBe('red');
		expect(cellSide(0)).toBe('purple');
		expect(cellSide(1)).toBe('blue');
		expect(cellSide(2)).toBe('blue');
	});

	it('is a full rectangle — every column runs every row', () => {
		const cells = boardCells();
		expect(cells).toHaveLength(BOARD_COLUMNS * BOARD_ROWS);
		for (const cell of cells) expect(isBoardCell(cell.q, cell.r)).toBe(true);
		// Every row is a lane, so no column may be missing one: each row holds exactly
		// as many cells as the board has columns.
		for (let r = 0; r < BOARD_ROWS; r++) {
			expect(cells.filter((cell) => cell.r === r)).toHaveLength(BOARD_COLUMNS);
		}
	});
});

describe('adjacency and pathfinding', () => {
	it('neighbours are the four sides, all valid board cells at distance 1', () => {
		const from: Cell = { q: 0, r: 1 };
		const around = neighbors(from.q, from.r);
		expect(around).toHaveLength(4);
		for (const nb of around) {
			expect(isBoardCell(nb.q, nb.r)).toBe(true);
			expect(cellDistance(from, nb)).toBe(1);
		}
	});

	it('has no diagonal step: a corner is two moves away', () => {
		expect(cellDistance({ q: 0, r: 0 }, { q: 1, r: 1 })).toBe(2);
		expect(neighbors(0, 0)).not.toContainEqual({ q: 1, r: 1 });
	});

	it('findPath returns a contiguous path including both endpoints', () => {
		const start: Cell = { q: -2, r: 4 };
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

describe('findMeleeMeeting', () => {
	it('lands the two fighters side by side on one row, on colour-legal cells', () => {
		const meeting = findMeleeMeeting({ q: -2, r: 2 }, { q: 2, r: 2 });
		expect(meeting).not.toBeNull();
		const { red, blue } = meeting!;
		// Immediately horizontal: adjacent, and on the same row.
		expect(cellDistance(red.destination, blue.destination)).toBe(1);
		expect(red.destination.r).toBe(blue.destination.r);
		// Red stays on red/white (q <= 0); blue stays strictly on blue (q >= 1).
		expect(red.destination.q).toBeLessThanOrEqual(0);
		expect(blue.destination.q).toBeGreaterThanOrEqual(1);
		// Paths are anchored at each fighter's start and their destination.
		expect(red.path[0]).toEqual({ q: -2, r: 2 });
		expect(red.path[red.path.length - 1]).toEqual(red.destination);
		expect(blue.path[0]).toEqual({ q: 2, r: 2 });
		expect(blue.path[blue.path.length - 1]).toEqual(blue.destination);
	});

	it('keeps red on its colour or white and blue strictly on blue', () => {
		const meeting = findMeleeMeeting({ q: -1, r: 0 }, { q: 1, r: 4 })!;
		for (const cell of meeting.red.path) expect(cell.q).toBeLessThanOrEqual(0);
		for (const cell of meeting.blue.path) expect(cell.q).toBeGreaterThanOrEqual(1);
	});
});
