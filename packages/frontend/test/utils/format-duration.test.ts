import { describe, it, expect } from 'vitest';
import { formatDuration } from '$utils/time/format-duration';

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
