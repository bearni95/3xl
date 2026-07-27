import {
	DEFAULT_SPAWN_STAT,
	SPAWN_STAT_MAX,
	SPAWN_STAT_MIN
} from '../../types/character-spawn.type';

/**
 * Roll a spawn's gameplay stat: a uniform integer in
 * [{@link SPAWN_STAT_MIN}, {@link SPAWN_STAT_MAX}]. Called once when a character
 * is claimed, the same way {@link randomSpawnColor} rolls the spawn colour.
 */
export function randomSpawnStat(): number {
	const span = SPAWN_STAT_MAX - SPAWN_STAT_MIN + 1;
	return SPAWN_STAT_MIN + Math.floor(Math.random() * span);
}

/**
 * Coerce a raw spawn stat (possibly null — legacy rows — non-integer, or out of
 * range) to a valid integer in [{@link SPAWN_STAT_MIN}, {@link SPAWN_STAT_MAX}],
 * defaulting to {@link DEFAULT_SPAWN_STAT} when absent or invalid.
 */
export function normalizeSpawnStat(value: unknown): number {
	const stat = Math.round(Number(value));
	if (!Number.isFinite(stat)) return DEFAULT_SPAWN_STAT;
	return Math.min(SPAWN_STAT_MAX, Math.max(SPAWN_STAT_MIN, stat));
}

/** A spawn's four combat attributes, derived from its rolled gameplay stat. */
export interface CombatStats {
	/** Attack: how many d10 the fighter rolls per attack. */
	atk: number;
	/** Defence: the d10 hit threshold and the ATK complement. */
	def: number;
	/** Speed: a derived rating (ATK − 1). */
	spd: number;
	/** HP attribute (DEF + 1): the fighter's HP pool at battle start. */
	hp: number;
}

/**
 * Derive a spawn's four combat attributes from its rolled gameplay stat. ATK is the
 * stat itself and DEF its complement (`SPAWN_STAT_MAX + SPAWN_STAT_MIN − stat`); both
 * are clamped to [{@link SPAWN_STAT_MIN}, {@link SPAWN_STAT_MAX}] (1..9), so a low
 * stat is a glass cannon (high ATK, low DEF) and a high stat the reverse, and neither
 * can fall to 0 or exceed 9. SPD is ATK − 1 and the HP attribute is DEF + 1. Both the
 * card renderer and the combat controller read these, so a spawn's card always shows
 * the stats it actually fights with.
 */
export function combatStatsFromStat(stat: number): CombatStats {
	const clamp = (value: number) => Math.min(SPAWN_STAT_MAX, Math.max(SPAWN_STAT_MIN, value));
	const atk = clamp(stat);
	const def = clamp(SPAWN_STAT_MAX + SPAWN_STAT_MIN - stat);
	return { atk, def, spd: atk - 1, hp: def + 1 };
}
