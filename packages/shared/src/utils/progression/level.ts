/**
 * Player progression: translating an accumulated experience total into a level,
 * using the Dungeons & Dragons 5e experience-point table.
 *
 * The table is *cumulative* — `DND_LEVEL_THRESHOLDS[n]` is the total experience
 * needed to reach level `n + 1` (so index 0 → level 1 at 0 xp, index 1 → level 2
 * at 300 xp, …). Level 20 is the cap; experience beyond it does not raise the
 * level further. These functions are pure and framework-agnostic; the frontend
 * reads a player's stored `exp` from Supabase and derives everything else here.
 */

/**
 * Cumulative experience required to reach each level, D&D 5e (PHB, "Beyond 1st
 * Level"). `DND_LEVEL_THRESHOLDS[i]` is the xp total at which the player becomes
 * level `i + 1`. Level 1 starts at 0.
 */
export const DND_LEVEL_THRESHOLDS: readonly number[] = [
	0, // 1
	300, // 2
	900, // 3
	2_700, // 4
	6_500, // 5
	14_000, // 6
	23_000, // 7
	34_000, // 8
	48_000, // 9
	64_000, // 10
	85_000, // 11
	100_000, // 12
	120_000, // 13
	140_000, // 14
	165_000, // 15
	195_000, // 16
	225_000, // 17
	265_000, // 18
	305_000, // 19
	355_000 // 20
];

/** The highest attainable level (length of the D&D 5e table). */
export const MAX_LEVEL = DND_LEVEL_THRESHOLDS.length;

/** The lowest level a player can be. Experience below the level-2 threshold is level 1. */
export const MIN_LEVEL = 1;

/**
 * Experience awarded per card pulled from a booster pack. Chosen so a full
 * {@link BOOSTER_SIZE}-card pack (5 × 60 = 300) takes a fresh player from level 1
 * to level 2 — the D&D 5e level-2 threshold.
 */
export const EXP_PER_SPAWN = 60;

/**
 * The level a player of `exp` total experience has reached, in
 * [{@link MIN_LEVEL}, {@link MAX_LEVEL}]. Negative/NaN input reads as level 1.
 */
export function levelForExp(exp: number): number {
	if (!Number.isFinite(exp) || exp <= 0) return MIN_LEVEL;
	// Highest threshold not exceeding `exp`; the thresholds are ascending.
	let level = MIN_LEVEL;
	for (let i = 1; i < DND_LEVEL_THRESHOLDS.length; i++) {
		if (exp >= DND_LEVEL_THRESHOLDS[i]) level = i + 1;
		else break;
	}
	return level;
}

/** The cumulative experience required to reach `level` (clamped to the table). */
export function expForLevel(level: number): number {
	const clamped = Math.min(Math.max(Math.trunc(level), MIN_LEVEL), MAX_LEVEL);
	return DND_LEVEL_THRESHOLDS[clamped - 1];
}

/** A player's level and their progress through it, derived from an experience total. */
export interface LevelProgress {
	/** Current level, [{@link MIN_LEVEL}, {@link MAX_LEVEL}]. */
	level: number;
	/** The player's total accumulated experience (non-negative). */
	exp: number;
	/** Cumulative experience at which the current level began. */
	levelStartExp: number;
	/** Cumulative experience at which the next level begins, or `null` at the cap. */
	nextLevelExp: number | null;
	/** Experience earned since the current level began. */
	expIntoLevel: number;
	/** Experience the current level spans (next threshold − start), or `null` at the cap. */
	expForLevelSpan: number | null;
	/** Fraction through the current level, 0..1. Always 1 at the cap. */
	fraction: number;
	/** Whether the player has reached the maximum level. */
	atMax: boolean;
}

/**
 * Break an experience total down into a {@link LevelProgress}: the current level
 * plus how far the player is toward the next one, ready for a progress bar.
 */
export function levelProgress(exp: number): LevelProgress {
	const total = Number.isFinite(exp) && exp > 0 ? Math.trunc(exp) : 0;
	const level = levelForExp(total);
	const levelStartExp = expForLevel(level);
	const atMax = level >= MAX_LEVEL;
	const nextLevelExp = atMax ? null : expForLevel(level + 1);
	const expForLevelSpan = nextLevelExp === null ? null : nextLevelExp - levelStartExp;
	const expIntoLevel = total - levelStartExp;
	const fraction =
		expForLevelSpan && expForLevelSpan > 0 ? Math.min(1, expIntoLevel / expForLevelSpan) : 1;

	return {
		level,
		exp: total,
		levelStartExp,
		nextLevelExp,
		expIntoLevel,
		expForLevelSpan,
		fraction,
		atMax
	};
}
