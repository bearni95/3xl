import { describe, expect, it } from 'vitest';
import { characterFitScale, REFERENCE_SOURCE_HEIGHT } from '$utils/card/character-fit';

/** A one-frame idle cycle of the given native size, its body axis centred. */
const frame = (width: number, height: number, anchorX = 0.5) => [{ width, height, anchorX }];

// The card's art box and the board's cell are different sizes; what has to hold is
// that both hand the *same* character the same size relative to the others.
const CARD_BOX = { width: 180, height: 240 };
const BOARD_BOX = { width: 120, height: 156 };

describe('characterFitScale', () => {
	it('draws a character at the same fraction of its box on either surface', () => {
		// Krillin against Trunks: a short character comes out visibly shorter than a
		// tall one instead of both being stretched to fill their box.
		const krillin = frame(70, 81);
		const trunks = frame(80, 136);
		const ratio = (box: { width: number; height: number }) =>
			(characterFitScale(krillin, box) * 81) / (characterFitScale(trunks, box) * 136);
		expect(ratio(CARD_BOX)).toBeCloseTo(81 / 136, 10);
		expect(ratio(BOARD_BOX)).toBeCloseTo(81 / 136, 10);
	});

	it('scales every character under the reference height by one shared ratio', () => {
		const shared = BOARD_BOX.height / REFERENCE_SOURCE_HEIGHT;
		for (const height of [33, 81, 136, REFERENCE_SOURCE_HEIGHT]) {
			expect(characterFitScale(frame(40, height), BOARD_BOX)).toBeCloseTo(shared, 10);
		}
	});

	it('brings a character taller than the reference back to the box', () => {
		// Perfect Cell (~185 source px) stands out of the box at the shared ratio, so
		// the cap holds it to exactly the box's height.
		const cell = frame(109, 185);
		const scale = characterFitScale(cell, BOARD_BOX);
		expect(185 * scale).toBeCloseTo(BOARD_BOX.height, 10);
		expect(scale).toBeLessThan(BOARD_BOX.height / REFERENCE_SOURCE_HEIGHT);
	});

	it('holds a wide character inside half the box, axis to edge', () => {
		// A frame whose body axis sits off-centre reaches further one way than the
		// other; the far side is what has to fit.
		const wide = frame(300, 100, 0.2);
		const scale = characterFitScale(wide, BOARD_BOX);
		expect(0.8 * 300 * scale).toBeCloseTo(BOARD_BOX.width / 2, 10);
	});

	it('measures the whole cycle, not just its first frame', () => {
		const cycle = [
			{ width: 60, height: 100, anchorX: 0.5 },
			{ width: 60, height: 190, anchorX: 0.5 }
		];
		expect(characterFitScale(cycle, BOARD_BOX)).toBeCloseTo(BOARD_BOX.height / 190, 10);
	});
});
