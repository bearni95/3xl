/**
 * Aggregates the admin dashboard reads out of Supabase. Every figure here is
 * derived server-side (see @3xl/backend's stats route) — the admin app only
 * paints what it is given.
 */

/** One day of the combats series, split by how far each fight got. */
export interface CombatsPerDay {
	/** The Catalan calendar day (Europe/Madrid), as `YYYY-MM-DD`. */
	date: string;
	/** Fights opened that day — every arena that was entered. */
	started: number;
	/** Fights reported that day. Never more than were started, over a window. */
	completed: number;
}

/** Payload of `GET /api/stats/combats-per-day`. */
export interface CombatsPerDayResponse {
	/** The requested window, oldest day first, with no gaps. */
	days: CombatsPerDay[];
}
