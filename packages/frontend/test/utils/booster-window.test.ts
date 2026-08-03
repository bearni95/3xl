import { describe, it, expect } from 'vitest';
import {
	BOOSTER_DAYS_AHEAD,
	BOOSTER_DAYS_BEHIND,
	boosterWindow,
	isoDayDistance,
	shiftIsoDate
} from '$utils/festes/booster-window';

describe('shiftIsoDate', () => {
	it('steps whole calendar days', () => {
		expect(shiftIsoDate('2026-07-29', 1)).toBe('2026-07-30');
		expect(shiftIsoDate('2026-07-29', -1)).toBe('2026-07-28');
		expect(shiftIsoDate('2026-07-29', 0)).toBe('2026-07-29');
	});

	it('rolls over month and year ends', () => {
		expect(shiftIsoDate('2026-07-31', 1)).toBe('2026-08-01');
		expect(shiftIsoDate('2026-03-01', -1)).toBe('2026-02-28');
		expect(shiftIsoDate('2024-03-01', -1)).toBe('2024-02-29'); // leap year
		expect(shiftIsoDate('2026-12-30', 4)).toBe('2027-01-03');
		expect(shiftIsoDate('2026-01-02', -3)).toBe('2025-12-30');
	});

	it('is unmoved by summer-time switches', () => {
		// Europe/Madrid springs forward on 2026-03-29 and back on 2026-10-25; the
		// arithmetic is calendar days, so neither day is doubled or skipped.
		expect(shiftIsoDate('2026-03-28', 1)).toBe('2026-03-29');
		expect(shiftIsoDate('2026-03-29', 1)).toBe('2026-03-30');
		expect(shiftIsoDate('2026-10-24', 1)).toBe('2026-10-25');
		expect(shiftIsoDate('2026-10-25', 1)).toBe('2026-10-26');
	});
});

describe('isoDayDistance', () => {
	it('counts whole days either side of today', () => {
		expect(isoDayDistance('2026-07-29', '2026-07-29')).toBe(0);
		expect(isoDayDistance('2026-08-02', '2026-07-29')).toBe(4);
		expect(isoDayDistance('2026-07-26', '2026-07-29')).toBe(-3);
	});

	it('counts across the year end, and over a summer-time switch', () => {
		expect(isoDayDistance('2026-01-01', '2025-12-30')).toBe(2);
		// Europe/Madrid springs forward on 2026-03-29: a day is still a day.
		expect(isoDayDistance('2026-03-30', '2026-03-28')).toBe(2);
	});

	it('is what picks a town’s festa when it holds two in one window', () => {
		// The nearest wins, whichever side of today it falls — the same festa
		// `claim_booster`'s `order by abs(...)` picks, so the box drawn is the box opened.
		const today = '2026-07-29';
		const behind = Math.abs(isoDayDistance('2026-07-27', today));
		const ahead = Math.abs(isoDayDistance('2026-08-02', today));
		expect(behind).toBeLessThan(ahead);
	});
});

describe('boosterWindow', () => {
	it('reaches three days back and four ahead of the given day', () => {
		expect(boosterWindow('2026-07-29')).toEqual({ from: '2026-07-26', to: '2026-08-02' });
	});

	it('spans eight days in all, today included', () => {
		expect(BOOSTER_DAYS_BEHIND + 1 + BOOSTER_DAYS_AHEAD).toBe(8);
	});

	it('crosses the year end', () => {
		expect(boosterWindow('2026-01-01')).toEqual({ from: '2025-12-29', to: '2026-01-05' });
	});
});
