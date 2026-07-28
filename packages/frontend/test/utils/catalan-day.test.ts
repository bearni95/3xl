import { describe, it, expect } from 'vitest';
import { CATALAN_TIME_ZONE, catalanDayIso } from '$utils/festes/catalan-day';

describe('catalanDayIso', () => {
	it('formats an instant as the Catalan calendar date', () => {
		expect(catalanDayIso(new Date('2026-07-28T09:00:00.000Z'))).toBe('2026-07-28');
	});

	it('is Catalan midnight, not UTC midnight, that turns the day over', () => {
		// Summer: Europe/Madrid is UTC+2, so the day flips two hours before UTC does.
		expect(catalanDayIso(new Date('2026-07-27T21:59:00.000Z'))).toBe('2026-07-27');
		expect(catalanDayIso(new Date('2026-07-27T22:00:00.000Z'))).toBe('2026-07-28');
		// Winter: UTC+1, so one hour before.
		expect(catalanDayIso(new Date('2026-01-14T22:59:00.000Z'))).toBe('2026-01-14');
		expect(catalanDayIso(new Date('2026-01-14T23:00:00.000Z'))).toBe('2026-01-15');
	});

	it('zero-pads month and day', () => {
		expect(catalanDayIso(new Date('2026-03-05T12:00:00.000Z'))).toBe('2026-03-05');
	});

	it('names the zone every daily reset is measured in', () => {
		expect(CATALAN_TIME_ZONE).toBe('Europe/Madrid');
	});
});
