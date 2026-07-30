import { describe, it, expect } from 'vitest';
import {
	DAILY_ACHIEVEMENT_COUNT,
	dailyAchievementIds,
	dailySeed,
	drawIds,
	nextSeed
} from '$utils/achievement/daily';

/**
 * The three badges of the day are computed rather than stored, in two places — here
 * and in `claim_achievements` — so what these cases pin is every step Postgres has
 * to reproduce: the exact seed for a known (user, day), the exact next value of the
 * generator, and the exact three ids out of a known pool. If any of them changes,
 * the SQL mirror in packages/backend/supabase/achievement_templates.sql has to
 * change with it, and today's three would move under every player at once.
 */

const USER = '11111111-2222-3333-4444-555555555555';
const POOL = ['alpha', 'beta', 'delta', 'epsilon', 'gamma', 'zeta'];

describe('the daily seed', () => {
	it('is FNV-1a over "<user>:<day>", to the number', () => {
		// Pinned values: the SQL side must return exactly these.
		expect(dailySeed(USER, '2026-07-30')).toBe(2283031805);
		expect(dailySeed(USER, '2026-07-31')).toBe(2266254186);
		expect(dailySeed('00000000-0000-0000-0000-000000000000', '2026-07-30')).toBe(1215132437);
	});

	it('is a 32-bit unsigned number for any input', () => {
		for (const day of ['2026-01-01', '2026-06-15', '2026-12-31']) {
			const seed = dailySeed(USER, day);
			expect(Number.isInteger(seed)).toBe(true);
			expect(seed).toBeGreaterThanOrEqual(0);
			expect(seed).toBeLessThan(4294967296);
		}
	});

	it('changes with the day and with the player', () => {
		expect(dailySeed(USER, '2026-07-30')).not.toBe(dailySeed(USER, '2026-07-31'));
		expect(dailySeed(USER, '2026-07-30')).not.toBe(dailySeed('other-user', '2026-07-30'));
	});
});

describe('the generator', () => {
	it('steps exactly as the Numerical Recipes LCG does', () => {
		expect(nextSeed(0)).toBe(1013904223);
		expect(nextSeed(1)).toBe(1015568748);
		expect(nextSeed(4294967295)).toBe(1012239698);
		// Every step stays in the ring, and stays exact — no drift from a double.
		let state = 2283031805;
		for (let i = 0; i < 1000; i++) {
			state = nextSeed(state);
			expect(Number.isInteger(state)).toBe(true);
			expect(state).toBeGreaterThanOrEqual(0);
			expect(state).toBeLessThan(4294967296);
		}
	});
});

describe('the three of the day', () => {
	it('draws three distinct ids, deterministically', () => {
		const today = dailyAchievementIds(USER, '2026-07-30', POOL);
		expect(today).toHaveLength(DAILY_ACHIEVEMENT_COUNT);
		expect(new Set(today).size).toBe(3);
		expect(dailyAchievementIds(USER, '2026-07-30', POOL)).toEqual(today);
		// Pinned, so a change to the algorithm is a decision rather than a surprise.
		expect(today).toEqual(['gamma', 'delta', 'epsilon']);
	});

	it('sets a different three tomorrow, and a different three for somebody else', () => {
		const mine = dailyAchievementIds(USER, '2026-07-30', POOL);
		expect(dailyAchievementIds(USER, '2026-07-31', POOL)).not.toEqual(mine);
		expect(dailyAchievementIds('another-player', '2026-07-30', POOL)).not.toEqual(mine);
	});

	it('does not care what order the pool arrived in', () => {
		const shuffled = ['zeta', 'gamma', 'alpha', 'epsilon', 'beta', 'delta'];
		expect(dailyAchievementIds(USER, '2026-07-30', shuffled)).toEqual(
			dailyAchievementIds(USER, '2026-07-30', POOL)
		);
	});

	it('sets the whole pool where there is not enough of it', () => {
		expect(dailyAchievementIds(USER, '2026-07-30', ['beta', 'alpha'])).toEqual(['alpha', 'beta']);
		expect(dailyAchievementIds(USER, '2026-07-30', ['only'])).toEqual(['only']);
		expect(dailyAchievementIds(USER, '2026-07-30', [])).toEqual([]);
	});

	it('sets nothing for nobody', () => {
		expect(dailyAchievementIds('', '2026-07-30', POOL)).toEqual([]);
		expect(dailyAchievementIds(USER, '', POOL)).toEqual([]);
	});

	it('spreads across the pool rather than favouring one id', () => {
		// 400 days of draws: every id in a pool of six should come up, and none of them
		// should take more than half the days.
		const counts = new Map<string, number>();
		for (let day = 0; day < 400; day++) {
			const iso = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
			for (const id of dailyAchievementIds(USER, iso, POOL)) {
				counts.set(id, (counts.get(id) ?? 0) + 1);
			}
		}
		expect(counts.size).toBe(POOL.length);
		for (const count of counts.values()) expect(count).toBeLessThan(300);
	});

	it('draws from a seed directly, for the count the caller asks for', () => {
		expect(drawIds(POOL, 1, 6)).toHaveLength(6);
		expect(new Set(drawIds(POOL, 1, 6)).size).toBe(6);
		expect(drawIds(POOL, 1, 0)).toEqual([]);
	});
});
