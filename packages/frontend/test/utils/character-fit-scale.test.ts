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

	it('holds a centred sweep inside the whole box, not half of it', () => {
		// Frieza's shape: a body on the axis and a tail reaching a long way to one side. A
		// surface that centres the sweep (a card, a statue) fits the sweep — the axis rule
		// would fit only its longer half and throw away the rest of the box.
		const tailed = frame(140, 118, 0.7);
		const sweep = characterFitScale(tailed, BOARD_BOX, 1, 'sweep');
		expect(140 * sweep).toBeCloseTo(BOARD_BOX.width, 10);
		expect(sweep).toBeGreaterThan(characterFitScale(tailed, BOARD_BOX, 1, 'axis'));
	});

	it('reads the same sweep whichever way the art is mirrored', () => {
		// A mirror swaps the axis's two reaches, and their sum is what the sweep is: the
		// character comes out the same size facing either way.
		const left = characterFitScale(frame(140, 118, 0.7), BOARD_BOX, 1, 'sweep');
		const right = characterFitScale(frame(140, 118, 0.3), BOARD_BOX, 1, 'sweep');
		expect(left).toBeCloseTo(right, 10);
	});

	it('pins the axis by default, for the surface that pins the axis', () => {
		// The board stands a fighter on its cell's mark, so the default is the strict rule:
		// asking for nothing must not quietly let a long-limbed character over the next cell.
		const tailed = frame(140, 118, 0.7);
		expect(characterFitScale(tailed, BOARD_BOX)).toBeCloseTo(
			characterFitScale(tailed, BOARD_BOX, 1, 'axis'),
			10
		);
	});

	it('measures the whole cycle, not just its first frame', () => {
		const cycle = [
			{ width: 60, height: 100, anchorX: 0.5 },
			{ width: 60, height: 190, anchorX: 0.5 }
		];
		expect(characterFitScale(cycle, BOARD_BOX)).toBeCloseTo(BOARD_BOX.height / 190, 10);
	});

	it('draws a character up by its own render scale', () => {
		// Inuyasha's sheet is drawn at about two thirds of the roster's scale, so his
		// definition asks for 1.4 and he comes out 1.4× the size his pixels alone would
		// give — which is what puts him beside Goku instead of beside Chopper.
		const inuyasha = frame(68, 98);
		const plain = characterFitScale(inuyasha, CARD_BOX);
		expect(characterFitScale(inuyasha, CARD_BOX, 1.4)).toBeCloseTo(plain * 1.4, 10);
	});

	it('puts a scaled-up character at the size of a natively bigger one', () => {
		// The whole point of the field: 98 px drawn at 1.4 must read as ~137 px does at 1.
		const scaled = characterFitScale(frame(68, 98), CARD_BOX, 1.4) * 98;
		const native = characterFitScale(frame(80, 137), CARD_BOX) * 137;
		expect(scaled).toBeCloseTo(native, 0);
	});

	it('still holds a scaled-up character inside its box', () => {
		// The scale lowers what the character is measured against, never the box: Sango
		// (~109 px) asking for 1.4 wants an effective reference of ~107, so she is over
		// it and the height cap brings her back to the box exactly as Perfect Cell is.
		const sango = frame(59, 109);
		const scale = characterFitScale(sango, BOARD_BOX, 1.4);
		expect(109 * scale).toBeLessThanOrEqual(BOARD_BOX.height + 1e-9);
		expect(scale).toBeGreaterThan(characterFitScale(sango, BOARD_BOX));
	});

	it('ignores a missing or out-of-range scale rather than shrinking a character', () => {
		// A definition with no scale, and any value a hand-edit or a bad fetch could
		// produce, must draw the character exactly as it always was.
		const goku = frame(96, 135);
		const plain = characterFitScale(goku, CARD_BOX);
		for (const bad of [undefined, 0, -1, NaN, Infinity, 40, 0.01]) {
			expect(characterFitScale(goku, CARD_BOX, bad as number)).toBeCloseTo(plain, 10);
		}
	});
});
