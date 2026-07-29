import { Router } from 'express';
import type { CombatsPerDay, CombatsPerDayResponse } from '@3xl/shared/types/admin-stats.type';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';
import { ensureTables } from './show-templates';

/**
 * Read-only aggregates over the live game, for the admin dashboard.
 *
 * A fight leaves a trace at each end of its life, in two different tables, and
 * the difference between them is the interesting part:
 *
 *   * STARTED — a `municipality_challenges` row, claimed by `start_battle` when
 *     the arena opens over a town (../../supabase/municipality_challenges.sql).
 *     It survives the fight: the day is spent whether or not a result ever comes.
 *   * COMPLETED — a `combat_results` row, written by `award_combat_exp` when the
 *     browser reports the result (../../supabase/combat_results.sql).
 *
 * So every fight is counted as started, and only a fight somebody saw through is
 * also counted as completed. The gap between the two lines is fights walked out
 * of — left open in the arena and never reported.
 *
 * Each is counted on its own day, not the other's: a fight opened before midnight
 * and reported after it is started on one day and completed on the next, which is
 * why the two series are aggregated separately rather than joined per fight.
 *
 * Days are the game's own days: the Catalan calendar day (Europe/Madrid), the
 * same boundary the daily claim and challenge limits reset on, not UTC.
 */

/** Default window when the request doesn't name one. */
const DEFAULT_DAYS = 30;
/** Widest window we'll aggregate in one go. */
const MAX_DAYS = 365;

/**
 * Count fights started and fights completed per Catalan day over the last `days`
 * days (today included). The series is generated from the calendar, not from the
 * rows, so a day nobody fought comes back as a 0 rather than a hole in the line.
 *
 * The two counts are aggregated apart and then hung off that calendar, so
 * neither table's rows can multiply the other's in a join.
 */
async function fetchCombatsPerDay(days: number): Promise<CombatsPerDay[]> {
	await ensureTables();
	const { rows } = await getPool().query<{ day: string; started: string; completed: string }>(
		`with span as (
			select generate_series(
				(now() at time zone 'Europe/Madrid')::date - ($1::int - 1),
				(now() at time zone 'Europe/Madrid')::date,
				interval '1 day'
			)::date as day
		),
		started as (
			select (started_at at time zone 'Europe/Madrid')::date as day, count(*) as total
			from municipality_challenges
			where (started_at at time zone 'Europe/Madrid')::date
				>= (now() at time zone 'Europe/Madrid')::date - ($1::int - 1)
			group by 1
		),
		completed as (
			select (fought_at at time zone 'Europe/Madrid')::date as day, count(*) as total
			from combat_results
			where (fought_at at time zone 'Europe/Madrid')::date
				>= (now() at time zone 'Europe/Madrid')::date - ($1::int - 1)
			group by 1
		)
		select
			to_char(span.day, 'YYYY-MM-DD') as day,
			coalesce(s.total, 0) as started,
			coalesce(c.total, 0) as completed
		from span
		left join started s on s.day = span.day
		left join completed c on c.day = span.day
		order by span.day`,
		[days]
	);
	return rows.map((row) => ({
		date: row.day,
		started: Number(row.started),
		completed: Number(row.completed)
	}));
}

export const statsRouter = Router();

// The combats-per-day series. `?days=` picks the window (1…365, default 30).
statsRouter.get(
	'/combats-per-day',
	asyncHandler(async (req, res) => {
		const raw = req.query.days;
		const days = raw === undefined ? DEFAULT_DAYS : Number(raw);
		if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
			httpError(400, `days must be an integer between 1 and ${MAX_DAYS}`);
		}

		const payload: CombatsPerDayResponse = { days: await fetchCombatsPerDay(days) };
		res.json(payload);
	})
);
