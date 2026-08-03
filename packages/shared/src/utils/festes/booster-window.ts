import { catalanDayIso } from './catalan-day';

// The stretch of the festivity calendar a booster pack can be opened on. A festa
// major is not a single evening — a town's celebration runs over a weekend, and a
// player who was not around on the day itself would otherwise never see its pack —
// so the packs on offer are every town de festa from three days back through four
// days ahead, today included: eight days in all.
//
// This is the client's copy of a rule the `claim_booster` RPC enforces the same way
// (see packages/backend/supabase/booster_claims.sql); keep the two in step, and keep
// the festivity sync's own lower bound at least this far back (see
// packages/backend/src/routes/festivities.ts) or the days behind would be pruned out
// of `festivities` before anyone could claim them.

/** Days before today whose festes are still openable. */
export const BOOSTER_DAYS_BEHIND = 3;

/** Days after today whose festes are already openable. */
export const BOOSTER_DAYS_AHEAD = 4;

/** An inclusive `YYYY-MM-DD` date range. */
export interface BoosterWindow {
	from: string;
	to: string;
}

/**
 * Shift a `YYYY-MM-DD` date by whole calendar days. Rebuilt from its own parts in
 * UTC rather than parsed and offset, so no summer-time switch can shift the result
 * onto the neighbouring day.
 */
export function shiftIsoDate(iso: string, days: number): string {
	const [year, month, day] = iso.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * Whole calendar days from `today` to `iso`, negative for a date behind it. Both are
 * rebuilt from their own parts in UTC, as {@link shiftIsoDate} does, so no summer-time
 * switch can put the answer half a day out.
 *
 * It is what picks a town's festa when it holds more than one inside the window: the
 * nearest to today, which is the one `claim_booster` prints the box from.
 */
export function isoDayDistance(iso: string, today: string): number {
	const [year, month, day] = iso.split('-').map(Number);
	const [nowYear, nowMonth, nowDay] = today.split('-').map(Number);
	const ms = Date.UTC(year, month - 1, day) - Date.UTC(nowYear, nowMonth - 1, nowDay);
	return Math.round(ms / 86_400_000);
}

/**
 * The booster window around `today` (the current Catalan day by default, the same
 * day boundary the server claims against) — inclusive on both ends.
 */
export function boosterWindow(today: string = catalanDayIso()): BoosterWindow {
	return {
		from: shiftIsoDate(today, -BOOSTER_DAYS_BEHIND),
		to: shiftIsoDate(today, BOOSTER_DAYS_AHEAD)
	};
}
