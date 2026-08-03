import { SpawnBox } from '../../types/character-spawn.type';

/**
 * Which box a town is offering, and whether this player has already taken it.
 *
 * A town deals two booster boxes a year and no more: the white one printed on the
 * day of its festa major, the black one printed in the days around it (the booster
 * window runs three back through four ahead). Take either and it is taken — the
 * `claim_booster` RPC refuses a second, and `booster_claims` carries a unique index
 * on (player, town, year, stock) under it (see
 * packages/backend/supabase/booster_claims.sql).
 *
 * These are the browser's copy of the same three answers the server works out for
 * itself, so a box a player cannot open is drawn as one they cannot open rather than
 * sliced open onto a refusal. Both sides read them off the *festa's* date and not off
 * the day somebody is looking: the window reaches four days past the last celebration
 * of a year, so a festa on the 2nd of January is the new year's box even to a player
 * opening it on the 30th of December.
 */

/** The stock a festa on `date` is printed on, given today's Catalan day. */
export function boxForFesta(date: string, today: string): SpawnBox {
	return date === today ? SpawnBox.White : SpawnBox.Black;
}

/**
 * The year a festa's box belongs to, from its `YYYY-MM-DD` date. Read off the string
 * rather than through a `Date`, which would resolve a bare date in UTC and hand back
 * the year before it to anyone west of Greenwich.
 */
export function festaYear(date: string): number {
	return Number(date.slice(0, 4));
}

/**
 * The key one claim is remembered by: a town, a year and a stock. The same triple the
 * unique index is on, so a set of these is exactly the set of boxes already taken.
 */
export function claimedBoxKey(locationId: string, year: number, box: SpawnBox | string): string {
	return `${locationId}|${year}|${box}`;
}
