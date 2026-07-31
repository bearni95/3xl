/**
 * Player progression: translating an accumulated experience total into a level,
 * using the Dungeons & Dragons 5e experience-point table.
 *
 * The table is *cumulative* — `DND_LEVEL_THRESHOLDS[n]` is the total experience
 * needed to reach level `n + 1` (so index 0 → level 1 at 0 xp, index 1 → level 2
 * at 300 xp, …). Level 20 is the cap; experience beyond it does not raise the
 * level further. These functions are pure and framework-agnostic; the frontend
 * reads a player's stored `exp` from Supabase and derives everything else here.
 *
 * Experience is earned in exactly one way: fighting ({@link combatExpAward}) — a win
 * for what it was worth, a loss for what it took down on its way out. Claiming cards
 * awards nothing. The authority for an award is the `award_combat_exp` Postgres RPC —
 * {@link combatExpAward} mirrors its arithmetic so the UI can show the same number,
 * and the two must be kept in sync.
 */
import { COMBAT_TEAM_SIZE, type CombatOutcome } from '../../types/combat.type';

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

/**
 * The full width of `level`: the experience separating its own threshold from the
 * next one — i.e. what a player who started the level from scratch would need to
 * earn to leave it. This is the *whole* level, not the part still unearned, and
 * it is the ceiling on a single fight's award. Zero at {@link MAX_LEVEL}, which
 * has no next threshold.
 */
export function levelSpanExp(level: number): number {
	const clamped = Math.min(Math.max(Math.trunc(level), MIN_LEVEL), MAX_LEVEL);
	if (clamped >= MAX_LEVEL) return 0;
	return expForLevel(clamped + 1) - expForLevel(clamped);
}

/**
 * What a lost fight pays for each rival it took down with it. A flat amount rather
 * than a share of anything: a loss is no longer measured against what winning would
 * have been worth, it is measured by what the losing side actually did — so it is the
 * same ten at level 1 and at level 19, and a fight lost having felled nobody pays
 * nothing at all.
 */
export const LOSS_EXP_PER_RIVAL = 10;

/** A finished fight, reduced to what decides its experience award. */
export interface CombatExpInput {
	/** The player's accumulated experience *before* the fight — fixes the level at stake. */
	exp: number;
	/** How it ended. A win is paid for the team it was won with, a loss for the rivals
	 * it took down, a draw nothing. */
	outcome: CombatOutcome;
	/** Fighters the player's team ended the fight still standing. */
	survivors: number;
	/** Fighters the player's team fielded. */
	fielded: number;
	/** Rivals taken down over the whole fight — what a loss is paid for, at
	 * {@link LOSS_EXP_PER_RIVAL} apiece. Read on a loss and nowhere else. */
	rivalsDefeated?: number;
}

/**
 * Experience for one finished fight.
 *
 * A **win** earns a share of {@link levelSpanExp} for the player's current level,
 * scaled linearly by how much of the team is left standing: a flawless win — nobody
 * taken down — earns the level's entire span, taking the player from the base of their
 * level to the next one, while a win with one of three left earns a third of it.
 *
 * A **loss** earns {@link LOSS_EXP_PER_RIVAL} for each rival it took down — nothing to
 * do with the level, the span or the player's own casualties: what is paid for is the
 * damage done on the way out, so a loss that felled two of the three is worth twice a
 * loss that felled one, and a whitewash is worth nothing. The count is capped at
 * {@link COMBAT_TEAM_SIZE}, a side never fielding more than that. A **draw** earns
 * nothing.
 *
 * A **win** earns nothing at {@link MAX_LEVEL}, whose span is zero; a loss still pays
 * there, being no longer measured against a span at all — experience past the cap
 * simply does not raise a level that has nowhere left to go.
 *
 * Rounded to whole experience, and never negative.
 *
 * Mirrors the `award_combat_exp` RPC, which is the authority — this exists so the
 * UI can preview and explain the same number.
 */
export function combatExpAward({
	exp,
	outcome,
	survivors,
	fielded,
	rivalsDefeated = 0
}: CombatExpInput): number {
	if (outcome === 'lose') {
		if (!Number.isFinite(rivalsDefeated)) return 0;
		const felled = Math.min(Math.max(Math.trunc(rivalsDefeated), 0), COMBAT_TEAM_SIZE);
		return felled * LOSS_EXP_PER_RIVAL;
	}
	if (outcome !== 'win') return 0;
	const span = levelSpanExp(levelForExp(exp));
	if (span <= 0) return 0;
	if (!Number.isFinite(fielded) || fielded <= 0) return 0;
	const left = Number.isFinite(survivors) ? Math.min(Math.max(survivors, 0), fielded) : 0;
	return Math.round((span * left) / fielded);
}

/**
 * Experience for completing one achievement: a third of the level the player is on
 * when they complete it — the gap between the experience their current level began
 * at and the experience the next one begins at, divided by three, rounded down.
 *
 * So it is worth more at every level rather than being a fixed number that stops
 * mattering, and the three badges a day (see `utils/achievement/daily`) come to one
 * level's worth if a player earns all of them. Zero at {@link MAX_LEVEL}, which has
 * no next threshold to reach — as a fight's award is.
 *
 * The level is the one they hold **at completion time**, which is why this takes a
 * level rather than an experience total: `claim_achievements` re-reads it for each
 * badge it grants, so a badge that levels a player up makes the next one worth more
 * in the same claim. That RPC is the authority; this mirrors its arithmetic so the
 * modal can print the number before the claim is made.
 */
export function achievementExpAward(level: number): number {
	return Math.floor(levelSpanExp(level) / 3);
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
	/**
	 * Fraction through the current level — {@link expIntoLevel} over
	 * {@link expForLevelSpan}, 0..1, always 1 at the cap. What a progression bar is
	 * drawn from: it measures the level the player is climbing, so it empties on
	 * every level-up and fills again over that level's own span, rather than
	 * carrying earlier levels' experience along as a head start.
	 */
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
