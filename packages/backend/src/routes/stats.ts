import { Router } from 'express';
import type { CombatsPerDay, CombatsPerDayResponse } from '@3xl/shared/types/admin-stats.type';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';
import { ensureTables } from './show-templates';

/**
 * Read-only aggregates over the live game, for the admin dashboard.
 *
 * A fight leaves exactly one `combat_results` row, written by the
 * `award_combat_exp` RPC when the browser reports the result (see
 * ../../supabase/combat_results.sql), so counting those rows counts the fights
 * that were actually finished — an abandoned battle never lands here.
 *
 * Days are the game's own days: the Catalan calendar day (Europe/Madrid), the
 * same boundary the daily claim and challenge limits reset on, not UTC.
 */

/** Default window when the request doesn't name one. */
const DEFAULT_DAYS = 30;
/** Widest window we'll aggregate in one go. */
const MAX_DAYS = 365;

/**
 * Count finished fights per Catalan day over the last `days` days (today
 * included). The series is generated from the calendar, not from the rows, so a
 * day nobody fought comes back as a 0 rather than a hole in the line.
 */
async function fetchCombatsPerDay(days: number): Promise<CombatsPerDay[]> {
	await ensureTables();
	const { rows } = await getPool().query<{ day: string; combats: string }>(
		`with span as (
			select generate_series(
				(now() at time zone 'Europe/Madrid')::date - ($1::int - 1),
				(now() at time zone 'Europe/Madrid')::date,
				interval '1 day'
			)::date as day
		)
		select to_char(span.day, 'YYYY-MM-DD') as day, count(cr.id) as combats
		from span
		left join combat_results cr
			on (cr.fought_at at time zone 'Europe/Madrid')::date = span.day
		group by span.day
		order by span.day`,
		[days]
	);
	return rows.map((row) => ({ date: row.day, combats: Number(row.combats) }));
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
