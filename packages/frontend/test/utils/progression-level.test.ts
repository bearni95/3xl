import { describe, it, expect } from 'vitest';
import {
	DND_LEVEL_THRESHOLDS,
	MAX_LEVEL,
	MIN_LEVEL,
	levelForExp,
	expForLevel,
	levelProgress
} from '$utils/progression/level';

describe('D&D experience-to-level', () => {
	it('starts at level 1 for zero, negative, or NaN experience', () => {
		expect(levelForExp(0)).toBe(1);
		expect(levelForExp(-500)).toBe(1);
		expect(levelForExp(Number.NaN)).toBe(1);
		expect(levelForExp(299)).toBe(1);
	});

	it('advances a level exactly at each 5e threshold', () => {
		expect(levelForExp(300)).toBe(2);
		expect(levelForExp(899)).toBe(2);
		expect(levelForExp(900)).toBe(3);
		expect(levelForExp(6_500)).toBe(5);
	});

	it('caps at the maximum level and never exceeds it', () => {
		expect(levelForExp(355_000)).toBe(MAX_LEVEL);
		expect(levelForExp(10_000_000)).toBe(MAX_LEVEL);
		expect(MAX_LEVEL).toBe(20);
	});

	it('round-trips level → threshold → level', () => {
		for (let level = MIN_LEVEL; level <= MAX_LEVEL; level++) {
			expect(levelForExp(expForLevel(level))).toBe(level);
		}
	});

	it('clamps expForLevel to the table bounds', () => {
		expect(expForLevel(0)).toBe(DND_LEVEL_THRESHOLDS[0]);
		expect(expForLevel(-3)).toBe(DND_LEVEL_THRESHOLDS[0]);
		expect(expForLevel(999)).toBe(DND_LEVEL_THRESHOLDS[MAX_LEVEL - 1]);
	});
});

describe('level progress', () => {
	it('reports progress through the current level', () => {
		// 600 xp: level 2 (starts at 300), next is 900, so halfway through.
		const p = levelProgress(600);
		expect(p.level).toBe(2);
		expect(p.levelStartExp).toBe(300);
		expect(p.nextLevelExp).toBe(900);
		expect(p.expIntoLevel).toBe(300);
		expect(p.expForLevelSpan).toBe(600);
		expect(p.fraction).toBeCloseTo(0.5);
		expect(p.atMax).toBe(false);
	});

	it('treats invalid experience as zero at level 1', () => {
		const p = levelProgress(-10);
		expect(p.exp).toBe(0);
		expect(p.level).toBe(1);
		expect(p.expIntoLevel).toBe(0);
	});

	it('is full and capped at the maximum level', () => {
		const p = levelProgress(400_000);
		expect(p.level).toBe(MAX_LEVEL);
		expect(p.atMax).toBe(true);
		expect(p.nextLevelExp).toBeNull();
		expect(p.expForLevelSpan).toBeNull();
		expect(p.fraction).toBe(1);
	});
});
