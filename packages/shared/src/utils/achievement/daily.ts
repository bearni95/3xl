// The three badges a player is set today.
//
// Every player gets three of the game's achievements to chase, and they are not
// drawn from a hat: the pick is a pure function of *who* is looking and *which
// day* it is, so the same player asking twice in a day is set the same three, two
// players on the same day are set different ones, and at Catalan midnight — the
// boundary every daily rule in the game turns on (see `festes/catalan-day`) —
// everybody's three change. Nothing is written down to make that true, which is
// the point: there is no table of today's assignments to seed, to migrate or to
// disagree with the client about.
//
// Which means the same pick has to be reachable from two places — the browser,
// which shows the three, and `claim_achievements`, which will only pay out for a
// badge that is one of them. So both the hash and the draw below are written to be
// mirrored exactly in PL/pgSQL (see `achievement_daily_seed` / the pick inside
// `claim_achievements` in packages/backend/supabase/achievement_templates.sql).
// Every step is 32-bit integer arithmetic that both languages do exactly:
//
//   * the seed is FNV-1a over `<user id>:<day>` — one xor and one 32-bit multiply
//     per character, and every character of a uuid and an ISO date is ASCII, so
//     "byte" and "character" are the same thing here;
//   * the draw steps a 32-bit linear congruential generator (Numerical Recipes'
//     multiplier), whose intermediate never exceeds 2^53 and so is exact in a
//     double as well as in a bigint;
//   * the pool is sorted by id before anything is drawn from it, so the order the
//     ids happened to arrive in — Supabase's row order, a JSON file's order —
//     cannot change what is picked.
//
// How many are drawn is a setting rather than a number written here: it is read from
// Supabase (see {@link DAILY_ACHIEVEMENT_COUNT}), so the game can be set to four a
// day, and both sides read it from the same place for the same reason they read the
// pool from the same place.

/**
 * How many badges a player is set each day — the number the database is
 * provisioned with, and what anything that has not read the setting yet assumes.
 *
 * It is **not** the authority. The count lives in Supabase
 * (`achievement_settings.daily_count`, read by `daily_achievement_count()`), so it
 * can be changed to four or to one without a deploy; `claim_achievements` reads it
 * there and the browser is handed it with everything else it loads. This constant is
 * the fallback for the moment before that arrives and for a game with no row yet.
 */
export const DAILY_ACHIEVEMENT_COUNT = 3;

/**
 * What the setting may be moved to, matching the check on
 * `achievement_settings.daily_count`. One is a game that sets a badge a day; twenty
 * is more than any pool is likely to hold, and a pool smaller than the count simply
 * yields the whole pool.
 */
export const DAILY_ACHIEVEMENT_COUNT_MIN = 1;
export const DAILY_ACHIEVEMENT_COUNT_MAX = 20;

/** 2^32: the ring all the arithmetic below is done in. */
const RING = 4294967296;

/**
 * A day's seed for one player: FNV-1a (32-bit) over `<userId>:<day>`, where `day`
 * is the Catalan calendar day as `YYYY-MM-DD`. `Math.imul` is what keeps the
 * multiply exact — a plain `*` on two 32-bit values overflows a double's 53 bits
 * and would drift from what Postgres computes.
 */
export function dailySeed(userId: string, day: string): number {
	const text = `${userId}:${day}`;
	let hash = 2166136261;
	for (let i = 0; i < text.length; i++) {
		hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
	}
	return hash;
}

/**
 * The next value of the 32-bit LCG the draw walks. Exported because the SQL side
 * has to match it step for step, and a test that pins one number of the sequence
 * is worth more than one that pins the three ids it happened to produce.
 */
export function nextSeed(seed: number): number {
	return (1664525 * (seed % RING) + 1013904223) % RING;
}

/**
 * Draw `count` distinct ids out of `pool`, deterministically from `seed`. The pool
 * is sorted first and each draw takes the id at `seed % remaining`, removing it —
 * so the result is a set of distinct ids in the order they were drawn, and a pool
 * no longer than `count` is simply the whole pool, sorted.
 */
export function drawIds(pool: readonly string[], seed: number, count: number): string[] {
	const remaining = [...pool].sort();
	const drawn: string[] = [];
	let state = seed;
	while (drawn.length < count && remaining.length > 0) {
		state = nextSeed(state);
		drawn.push(remaining.splice(state % remaining.length, 1)[0]);
	}
	return drawn;
}

/**
 * The ids of the badges set for `userId` on `day` — `count` of them, or the whole
 * pool where there are fewer.
 *
 * `pool` is the badges that can be set at all: the ones Supabase holds a
 * requirement for, since a badge with no requirement is one the server could never
 * confirm anybody had earned. `count` is Supabase's too. Both come from the same
 * read the caller already makes, which is what keeps the browser's pick and the
 * RPC's the same pick — a browser that guessed either would draw a different set
 * from the one that can actually be claimed.
 */
export function dailyAchievementIds(
	userId: string,
	day: string,
	pool: readonly string[],
	count: number = DAILY_ACHIEVEMENT_COUNT
): string[] {
	if (!userId || !day) return [];
	// A count that is not a whole number of badges is no count at all: fall back
	// rather than draw nothing, since the number arrives over the wire.
	const wanted = Number.isFinite(count) && count > 0 ? Math.floor(count) : DAILY_ACHIEVEMENT_COUNT;
	return drawIds(pool, dailySeed(userId, day), wanted);
}
