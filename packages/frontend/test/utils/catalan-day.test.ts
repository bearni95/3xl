import { describe, it, expect } from 'vitest';
import {
	CATALAN_TIME_ZONE,
	catalanDayIso,
	msUntilCatalanMidnight,
	nextCatalanMidnight
} from '$utils/festes/catalan-day';

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

describe('nextCatalanMidnight', () => {
	it('is the start of the next Catalan day, not the next UTC one', () => {
		// Summer: UTC+2, so midnight in Madrid falls at 22:00 UTC the day before.
		expect(nextCatalanMidnight(new Date('2026-07-28T09:00:00.000Z')).toISOString()).toBe(
			'2026-07-28T22:00:00.000Z'
		);
		// Winter: UTC+1.
		expect(nextCatalanMidnight(new Date('2026-01-14T09:00:00.000Z')).toISOString()).toBe(
			'2026-01-14T23:00:00.000Z'
		);
	});

	it('rolls over the month and the year', () => {
		expect(nextCatalanMidnight(new Date('2026-01-31T12:00:00.000Z')).toISOString()).toBe(
			'2026-01-31T23:00:00.000Z'
		);
		expect(nextCatalanMidnight(new Date('2026-12-31T12:00:00.000Z')).toISOString()).toBe(
			'2026-12-31T23:00:00.000Z'
		);
	});

	it('is measured from the instant just after a day turns over', () => {
		// 22:00 UTC in summer is already the next Catalan day, so the midnight owed
		// is a further 24 hours out.
		expect(nextCatalanMidnight(new Date('2026-07-27T22:00:00.000Z')).toISOString()).toBe(
			'2026-07-28T22:00:00.000Z'
		);
	});

	it('accounts for the summer-time switch inside the day it counts', () => {
		// Clocks go forward at 02:00 on 2026-03-29, making that Catalan day 23 hours
		// long: from its midnight (23:00 UTC on the 28th) to the next (22:00 UTC).
		expect(nextCatalanMidnight(new Date('2026-03-29T01:00:00.000Z')).toISOString()).toBe(
			'2026-03-29T22:00:00.000Z'
		);
		// And back at 03:00 on 2026-10-25, a 25-hour day: 22:00 UTC to 23:00 UTC.
		expect(nextCatalanMidnight(new Date('2026-10-25T01:00:00.000Z')).toISOString()).toBe(
			'2026-10-25T23:00:00.000Z'
		);
	});
});

describe('msUntilCatalanMidnight', () => {
	it('is what is left of the Catalan day', () => {
		// 09:00 UTC in summer is 11:00 in Madrid: 13 hours to go.
		expect(msUntilCatalanMidnight(new Date('2026-07-28T09:00:00.000Z'))).toBe(13 * 3600_000);
	});

	it('is a whole day the moment the day turns over', () => {
		expect(msUntilCatalanMidnight(new Date('2026-07-27T22:00:00.000Z'))).toBe(24 * 3600_000);
	});

	it('counts a short summer-time day as 23 hours', () => {
		expect(msUntilCatalanMidnight(new Date('2026-03-28T23:00:00.000Z'))).toBe(23 * 3600_000);
	});
});
