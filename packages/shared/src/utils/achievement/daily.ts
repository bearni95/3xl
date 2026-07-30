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

/** How many badges a player is set each day. */
export const DAILY_ACHIEVEMENT_COUNT = 3;

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
 * The ids of the badges set for `userId` on `day` — {@link DAILY_ACHIEVEMENT_COUNT}
 * of them, or the whole pool where there are fewer.
 *
 * `pool` is the badges that can be set at all: the ones Supabase holds a
 * requirement for, since a badge with no requirement is one the server could never
 * confirm anybody had earned. Both sides read that same pool
 * (`achievement_templates where requirement is not null`), which is what keeps the
 * browser's three and the RPC's three the same three.
 */
export function dailyAchievementIds(
	userId: string,
	day: string,
	pool: readonly string[]
): string[] {
	if (!userId || !day) return [];
	return drawIds(pool, dailySeed(userId, day), DAILY_ACHIEVEMENT_COUNT);
}
