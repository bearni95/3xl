/**
 * Aggregates the admin dashboard reads out of Supabase. Every figure here is
 * derived server-side (see @3xl/backend's stats route) — the admin app only
 * paints what it is given.
 */

/** One day of the combats-fought series. */
export interface CombatsPerDay {
	/** The Catalan calendar day (Europe/Madrid), as `YYYY-MM-DD`. */
	date: string;
	/** Fights reported that day. Days with no fighting are present, as 0. */
	combats: number;
}

/** Payload of `GET /api/stats/combats-per-day`. */
export interface CombatsPerDayResponse {
	/** The requested window, oldest day first, with no gaps. */
	days: CombatsPerDay[];
}
