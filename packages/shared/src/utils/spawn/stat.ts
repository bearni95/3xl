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
