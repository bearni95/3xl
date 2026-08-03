import { describe, it, expect } from 'vitest';
import {
	DND_LEVEL_THRESHOLDS,
	MAX_LEVEL,
	MIN_LEVEL,
	levelForExp,
	expForLevel,
	levelProgress,
	levelSpanExp,
	combatExpAward,
	LOSS_EXP_PER_RIVAL
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

	it('empties the fraction on the experience that reached the level', () => {
		// Exactly the level-2 threshold: level 2 is reached and none of its own 600 is
		// earned yet, so the bar starts from nothing again rather than carrying the 300
		// that got there. The card prints that 300 as its total beside the empty bar.
		const p = levelProgress(300);
		expect(p.level).toBe(2);
		expect(p.exp).toBe(300);
		expect(p.expIntoLevel).toBe(0);
		expect(p.fraction).toBe(0);
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

describe('level span', () => {
	it('spans a whole level, not the part still unearned', () => {
		expect(levelSpanExp(1)).toBe(300); // 0 → 300
		expect(levelSpanExp(2)).toBe(600); // 300 → 900
		expect(levelSpanExp(3)).toBe(1_800); // 900 → 2700
	});

	it('is zero at the cap and clamps out-of-range levels', () => {
		expect(levelSpanExp(MAX_LEVEL)).toBe(0);
		expect(levelSpanExp(99)).toBe(0);
		expect(levelSpanExp(0)).toBe(levelSpanExp(MIN_LEVEL));
		expect(levelSpanExp(-4)).toBe(levelSpanExp(MIN_LEVEL));
	});
});

describe('combat experience award', () => {
	it('pays a flawless win the whole span of the current level', () => {
		// Nobody down at level 1: exactly the 300 xp that reaches level 2.
		expect(combatExpAward({ exp: 0, outcome: 'win', survivors: 3, fielded: 3 })).toBe(300);
		// Level 2 (300..900) pays its own full 600 span, from the level's base —
		// so it overshoots into level 3 for a player who was already partway.
		expect(combatExpAward({ exp: 600, outcome: 'win', survivors: 3, fielded: 3 })).toBe(600);
	});

	it('scales linearly with the fighters the team kept standing', () => {
		expect(combatExpAward({ exp: 0, outcome: 'win', survivors: 2, fielded: 4 })).toBe(150);
		// Rounded to whole experience.
		expect(combatExpAward({ exp: 0, outcome: 'win', survivors: 1, fielded: 3 })).toBe(100);
		expect(combatExpAward({ exp: 0, outcome: 'win', survivors: 2, fielded: 3 })).toBe(200);
	});

	it('pays nothing for a draw or a wipeout win', () => {
		expect(combatExpAward({ exp: 0, outcome: 'draw', survivors: 3, fielded: 3 })).toBe(0);
		expect(combatExpAward({ exp: 0, outcome: 'win', survivors: 0, fielded: 3 })).toBe(0);
	});

	it('pays a loss ten for each rival it took down with it', () => {
		expect(LOSS_EXP_PER_RIVAL).toBe(10);
		const lost = (rivalsDefeated: number) =>
			combatExpAward({ exp: 0, outcome: 'lose', survivors: 0, fielded: 3, rivalsDefeated });
		// A whitewash is worth nothing; two lanes taken on the way out is worth twice one.
		expect(lost(0)).toBe(0);
		expect(lost(1)).toBe(10);
		expect(lost(2)).toBe(20);
		expect(lost(3)).toBe(30);
		// Not naming a count at all reads as none felled.
		expect(combatExpAward({ exp: 0, outcome: 'lose', survivors: 0, fielded: 3 })).toBe(0);
	});

	it('pays a loss the same at every level, and whatever became of the team', () => {
		// It is a flat amount rather than a share of anything, so the level it was lost
		// at makes no difference to it...
		const felled = { outcome: 'lose', survivors: 0, fielded: 3, rivalsDefeated: 2 } as const;
		expect(combatExpAward({ exp: 0, ...felled })).toBe(20);
		expect(combatExpAward({ exp: 1000, ...felled })).toBe(20);
		// ...and neither does what happened to the player's own side, wiped out or
		// barely scratched. It needs no team at all to be worked out.
		expect(combatExpAward({ exp: 0, ...felled, survivors: 3 })).toBe(20);
		expect(combatExpAward({ exp: 0, ...felled, fielded: 0 })).toBe(20);
	});

	it('pays no win at the level cap, and a loss its rivals even there', () => {
		// The win is a share of a span that is zero at level 20. The loss is measured
		// against no span at all, so it is still paid for the work — into a total that
		// has no level left to raise.
		expect(combatExpAward({ exp: 400_000, outcome: 'win', survivors: 3, fielded: 3 })).toBe(0);
		expect(
			combatExpAward({ exp: 400_000, outcome: 'lose', survivors: 3, fielded: 3, rivalsDefeated: 3 })
		).toBe(30);
	});

	it('never pays a loss more than one full rival team', () => {
		// The count is the browser's; the amount is not. A report claiming a hundred
		// felled buys the same three as a full sweep — the server bounds it too.
		expect(
			combatExpAward({ exp: 0, outcome: 'lose', survivors: 0, fielded: 3, rivalsDefeated: 100 })
		).toBe(30);
		expect(
			combatExpAward({ exp: 0, outcome: 'lose', survivors: 0, fielded: 3, rivalsDefeated: -5 })
		).toBe(0);
	});

	it('never exceeds the span or goes negative on an absurd count', () => {
		expect(combatExpAward({ exp: 0, outcome: 'win', survivors: 9_000, fielded: 3 })).toBe(300);
		expect(combatExpAward({ exp: 0, outcome: 'win', survivors: -5, fielded: 3 })).toBe(0);
		expect(combatExpAward({ exp: 0, outcome: 'win', survivors: 3, fielded: 0 })).toBe(0);
	});
});

