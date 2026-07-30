import { describe, it, expect } from 'vitest';
import { formatDuration, formatTrackLength } from '$utils/time/format-duration';

describe('formatDuration', () => {
	it('reads as a clock, hours unpadded and the rest padded', () => {
		expect(formatDuration(5 * 3600_000 + 7 * 60_000 + 2_000)).toBe('5:07:02');
		expect(formatDuration(23 * 3600_000 + 59 * 60_000 + 59_000)).toBe('23:59:59');
	});

	it('keeps the hour slot when there are no hours left', () => {
		expect(formatDuration(42_000)).toBe('0:00:42');
	});

	it('truncates part-seconds rather than rounding up', () => {
		expect(formatDuration(1_999)).toBe('0:00:01');
	});

	it('bottoms out at zero for a deadline already passed', () => {
		expect(formatDuration(0)).toBe('0:00:00');
		expect(formatDuration(-5_000)).toBe('0:00:00');
	});
});

describe('formatTrackLength', () => {
	it('reads as a song does, minutes unpadded and no hour slot', () => {
		expect(formatTrackLength(3 * 60 + 21)).toBe('3:21');
		expect(formatTrackLength(59)).toBe('0:59');
	});

	it('takes the hour slot only when there is an hour to say', () => {
		// Nothing here is ticking, so the shape is free to grow — and a song this long
		// is a set, not an opening.
		expect(formatTrackLength(3600 + 7 * 60 + 2)).toBe('1:07:02');
	});

	it('rounds to the nearest second, as a length is not a countdown', () => {
		expect(formatTrackLength(89.5)).toBe('1:30');
		expect(formatTrackLength(89.4)).toBe('1:29');
	});

	it('says nothing about a length it has not got', () => {
		// A file whose metadata has not been read yet, or that would not decode at all.
		expect(formatTrackLength(null)).toBe('—');
		expect(formatTrackLength(undefined)).toBe('—');
		expect(formatTrackLength(NaN)).toBe('—');
		expect(formatTrackLength(Infinity)).toBe('—');
		expect(formatTrackLength(-1)).toBe('—');
	});
});
