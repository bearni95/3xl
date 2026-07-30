import { describe, expect, it } from 'vitest';
import { crownOfPixels } from '$utils/mugen/character-crown';

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
