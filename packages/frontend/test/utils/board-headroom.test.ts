import { describe, expect, it } from 'vitest';
import { MugenBoard, type BoardGrid } from '$utils/mugen/mugen-board';
import { BOARD_COLUMNS, BOARD_ROWS } from '$utils/mugen/grid';

/**
 * The room the canvas keeps above the board.
 *
 * A character stands with its feet on its cell's lower edge and is taller than the cell,
 * so everybody on the top row is partly above the grid — and the things that reach highest
 * are not even drawn when the canvas is sized: a pose held on the top row, an aura lit
 * under a fighter, the callout that floats over its head. The canvas is scaled to fit its
 * box rather than overflowing it, so anything outside it is not scrolled to, it is simply
 * gone. Hence a whole empty row reserved on top, which is what this pins.
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
	it('is a whole row deep, on top of the grid, the characters and the coordinates', () => {
		const cellSize = 100;
		const padding = 10;
		const { width, height } = board(cellSize, padding).dimensions;

		// The width says what a row of cells plus the surround costs: the padding at both
		// ends and the one gutter the row numbers stand in down the left.
		const gutter = width - (padding * 2 + cellSize * BOARD_COLUMNS);
		expect(gutter).toBeGreaterThan(0);

		// The height is that same surround plus one cell more than the board has rows —
		// the empty one kept above it.
		expect(height).toBe(padding * 2 + gutter + cellSize * (BOARD_ROWS + 1));
	});

	it('is a row of the board’s own cells, so it scales with them', () => {
		// Reserved in cells rather than in pixels: a board drawn at twice the cell size
		// keeps twice the room over it, because what it is making room for — the part of a
		// character that rises out of its cell — is measured in cells too.
		const small = board(100, 10).dimensions.height;
		const large = board(200, 10).dimensions.height;
		expect(large - 10 * 2).toBe((small - 10 * 2) * 2);
	});
});
