import { describe, expect, it } from 'vitest';
import { MugenBoard, type BoardGrid } from '$utils/mugen/mugen-board';
import { BOARD_HEIGHT, BOARD_WIDTH } from '$utils/mugen/grid';

/**
 * The room the canvas keeps above the board.
 *
 * A character stands with its feet on its cell's foot line and is taller than the cell,
 * so everybody on the top row is partly above the grid — and the things that reach highest
 * are not even drawn when the canvas is sized: a pose held on the top row, an aura lit
 * under a fighter, the callout that floats over its head. The canvas is scaled to fit its
 * box rather than overflowing it, so anything outside it is not scrolled to, it is simply
 * gone. Hence a whole empty cell width reserved on top, which is what this pins.
 *
 * Only the geometry is exercised: `dimensions` is arithmetic over the options, so no Pixi
 * app is booted and no WebGL context is asked for.
 */
const grids: [BoardGrid, BoardGrid] = [
	{ color: 0xff0000, character: { basePath: '/assets/a/frames' } },
	{ color: 0x2563eb, character: { basePath: '/assets/b/frames' } }
];

const board = (cellSize: number, padding: number) =>
	new MugenBoard({ grids, cellSize, padding });

describe('the room the canvas keeps over the board', () => {
	it('is a whole cell deep, on top of the grid and the characters', () => {
		const cellSize = 100;
		const padding = 10;
		const { width, height } = board(cellSize, padding).dimensions;

		// Across, there is nothing but the board and the padding at either end of it: the
		// gutter the row numbers and column letters used to stand in is gone, and with it
		// the third of a cell it took off two sides of a canvas that is scaled to fit its
		// box — so what it held is board now.
		expect(width).toBeCloseTo(padding * 2 + cellSize * BOARD_WIDTH);

		// Down, it is that same padding plus one cell width more than the board's own
		// height — the empty room kept above it.
		expect(height).toBeCloseTo(padding * 2 + cellSize * (BOARD_HEIGHT + 1));
	});

	it('is a width of the board’s own cells, so it scales with them', () => {
		// Reserved in cells rather than in pixels: a board drawn at twice the cell size
		// keeps twice the room over it, because what it is making room for — the part of a
		// character that rises out of its cell — is measured in cells too.
		const small = board(100, 10).dimensions.height;
		const large = board(200, 10).dimensions.height;
		expect(large - 10 * 2).toBeCloseTo((small - 10 * 2) * 2);
	});
});
