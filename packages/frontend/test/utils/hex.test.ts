import { describe, it, expect } from 'vitest';
import {
	boardCells,
	cellSide,
	findMeleeMeeting,
	findPath,
	hexDistance,
	isBoardCell,
	neighbors,
	type Hex
} from '$utils/mugen/hex';

describe('hex board cells', () => {
	it('excludes columns off the board and rows outside a column range', () => {
		expect(isBoardCell(3, 0)).toBe(false); // no such column
		expect(isBoardCell(-3, 0)).toBe(false);
		expect(isBoardCell(-2, -1)).toBe(false); // the red half is one column deep
		expect(isBoardCell(0, 3)).toBe(false); // above the purple column's range
		expect(isBoardCell(2, 2)).toBe(false); // above the far blue column's range
	});

	it('includes representative interior cells', () => {
		expect(isBoardCell(0, -1)).toBe(true);
		expect(isBoardCell(-1, 0)).toBe(true);
		expect(isBoardCell(1, -1)).toBe(true);
	});

	it('assigns colour side by column sign', () => {
		expect(cellSide(-1)).toBe('red');
		expect(cellSide(0)).toBe('purple');
		expect(cellSide(2)).toBe('blue');
	});

	it('every listed cell passes isBoardCell', () => {
		for (const cell of boardCells()) {
			expect(isBoardCell(cell.q, cell.r)).toBe(true);
		}
	});
});

describe('hex adjacency and pathfinding', () => {
	it('neighbours are all valid board cells at distance 1', () => {
		for (const nb of neighbors(0, -1)) {
			expect(isBoardCell(nb.q, nb.r)).toBe(true);
			expect(hexDistance({ q: 0, r: -1 }, nb)).toBe(1);
		}
	});

	it('findPath returns a contiguous path including both endpoints', () => {
		const start: Hex = { q: -1, r: 0 };
		const goal: Hex = { q: 0, r: -1 };
		const path = findPath(start, goal, (c) => isBoardCell(c.q, c.r));
		expect(path).not.toBeNull();
		const cells = path as Hex[];
		expect(cells[0]).toEqual(start);
		expect(cells[cells.length - 1]).toEqual(goal);
		for (let i = 1; i < cells.length; i++) {
			expect(hexDistance(cells[i - 1], cells[i])).toBe(1);
		}
	});
});

describe('findMeleeMeeting', () => {
	it('lands the two fighters on adjacent, colour-legal cells', () => {
		const meeting = findMeleeMeeting({ q: -1, r: -1 }, { q: 2, r: -2 });
		expect(meeting).not.toBeNull();
		const { red, blue } = meeting!;
		// Adjacent.
		expect(hexDistance(red.destination, blue.destination)).toBe(1);
		// Red stays on red/purple (q <= 0); blue stays strictly on blue (q >= 1).
		expect(red.destination.q).toBeLessThanOrEqual(0);
		expect(blue.destination.q).toBeGreaterThanOrEqual(1);
		// Paths are anchored at each fighter's start and their destination.
		expect(red.path[0]).toEqual({ q: -1, r: -1 });
		expect(red.path[red.path.length - 1]).toEqual(red.destination);
		expect(blue.path[0]).toEqual({ q: 2, r: -2 });
		expect(blue.path[blue.path.length - 1]).toEqual(blue.destination);
	});

	it('keeps red on its colour or purple and blue strictly on blue', () => {
		const meeting = findMeleeMeeting({ q: -1, r: 0 }, { q: 1, r: -2 })!;
		for (const cell of meeting.red.path) expect(cell.q).toBeLessThanOrEqual(0);
		for (const cell of meeting.blue.path) expect(cell.q).toBeGreaterThanOrEqual(1);
	});
});
