import { describe, expect, it } from 'vitest';
import { crownOfPixels, readCrownAlign } from '$utils/mugen/character-crown';
import type { CharacterDefinition } from '$types/character-definition.type';

/**
 * Where a fighter's head is, which is where the board stands it from.
 *
 * A frame is written here as rows of characters — `#` painted, `.` clear, `~` a pixel
 * faint enough to be the decoder's fringe rather than artwork — because the rule is
 * about a shape and a shape is worth being able to see in the test.
 */
const frame = (rows: string[]): { pixels: number[]; width: number; height: number } => {
	const width = rows[0].length;
	const pixels: number[] = [];
	for (const row of rows) {
		for (const mark of row) {
			pixels.push(255, 255, 255, mark === '#' ? 255 : mark === '~' ? 4 : 0);
		}
	}
	return { pixels, width, height: rows.length };
};

const crown = (rows: string[]) => {
	const { pixels, width, height } = frame(rows);
	return crownOfPixels(pixels, width, height);
};

describe('a character’s crown', () => {
	it('is the middle of the highest painted row', () => {
		// A head two pixels wide over a wider body: the crown is the head's middle, and
		// the body below it — which is what the sprite's own axis would answer — is not
		// consulted at all.
		expect(
			crown([
				'..##..',
				'.####.',
				'######'
			])
		).toEqual({ top: 0, x: 3 });
	});

	it('ignores everything below the first painted row', () => {
		// A limb thrown far out to one side lower down cannot pull the crown off the head.
		expect(
			crown([
				'.#....',
				'.#....',
				'.#####'
			])
		).toEqual({ top: 0, x: 1.5 });
	});

	it('answers a single painted pixel with its own middle, not its left edge', () => {
		expect(crown(['....#.'])).toEqual({ top: 0, x: 4.5 });
	});

	it('spans the gap when the highest row is not solid', () => {
		// Two horns and nothing between them: the crown is the middle of the pair, which
		// is the point a viewer reads as the top of the character.
		expect(crown(['#....#', '.####.'])).toEqual({ top: 0, x: 3 });
	});

	it('skips the rows above the artwork', () => {
		expect(
			crown([
				'......',
				'......',
				'..##..'
			])
		).toEqual({ top: 2, x: 3 });
	});

	it('does not count the decoder’s fringe as artwork', () => {
		// The nearly-transparent border decoded MUGEN art carries: invisible on screen,
		// and not the top of anybody's head.
		expect(crown(['~~~~~~', '..##..'])).toEqual({ top: 1, x: 3 });
	});

	it('has no answer for a frame with nothing on it', () => {
		expect(crown(['....', '....'])).toBeNull();
	});
});

describe('which characters are stood by it', () => {
	const definition = (fields: Partial<CharacterDefinition>) => fields;

	it('stands every character by its crown unless its own file refuses', () => {
		expect(readCrownAlign(definition({}))).toBe(true);
		expect(readCrownAlign(definition({ crownAlign: true }))).toBe(true);
		// A definition written before the field existed, and no definition at all: both
		// get the placement every character is meant to have.
		expect(readCrownAlign({ label: 'older than the field' })).toBe(true);
		expect(readCrownAlign(null)).toBe(true);
	});

	it('takes only an explicit refusal for one', () => {
		// Miroku is the case the escape exists for: what stands highest in his sheet is
		// the ringed head of the staff he holds up and out to one side, half a frame from
		// his own head, so the rule would centre the staff and put him off the cell.
		expect(readCrownAlign(definition({ crownAlign: false }))).toBe(false);
		// Anything that is not that `false` is not a refusal — a file cannot opt out by
		// being malformed.
		expect(readCrownAlign({ crownAlign: 'no' } as unknown as Partial<CharacterDefinition>)).toBe(
			true
		);
		expect(readCrownAlign({ crownAlign: 0 } as unknown as Partial<CharacterDefinition>)).toBe(true);
	});
});
