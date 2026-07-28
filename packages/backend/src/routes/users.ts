import { Router } from 'express';
import { levelForExp } from '@3xl/shared/utils/progression/level';
import type { AdminUser, GrantClaimsResult } from '@3xl/shared/types/player-user.type';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';
import { ensureTables } from './show-templates';

/**
 * Admin API over the game's players — the Supabase `auth.users` table joined with
 * their per-player game state, plus the ability to grant a player extra daily
 * booster claims for the current day.
 *
 * The daily claim limit the frontend's claim panel enforces is a player's level
 * (from accumulated experience) capped at 20, resetting at midnight Europe/Madrid
 * (see ../../supabase/booster_claims.sql and ./show-templates.ts). A grant is an
 * additive, day-scoped bump to that cap: a row in `booster_grants` for today's
 * Catalan date, which `claim_booster` / `boosters_status` add on top of the level.
 * Grants written for one day never carry over — they lapse at Catalan midnight.
 *
 * Talks to Supabase's Postgres directly via ../db (the DB password), so it can
 * read `auth.users` (which the anon key cannot). Every entry point first runs the
 * shared {@link ensureTables} provisioning from ./show-templates, so `booster_grants`
 * AND the grant-aware `claim_booster` / `boosters_status` RPCs are guaranteed
 * deployed before we read or write — a grant is otherwise silently ignored by
 * stale RPCs that predate the grants feature.
 */

/** Uuid shape auth.users ids take — validated before it reaches a query param. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The daily booster cap ignores levels past 20, matching claim_booster. */
const MAX_DAILY_LEVEL = 20;

/**
 * Load every player with their game state and today's claim standing. One query:
 * `auth.users` left-joined with `player_profiles` (exp) and today's aggregated
 * `booster_grants` / `booster_claims` (Europe/Madrid). Level and the effective
 * cap are derived here in JS (via the shared progression table) so the row does
 * not depend on the DB `level_for_exp` function existing yet.
 */
async function fetchUsers(): Promise<AdminUser[]> {
	await ensureTables();
	const { rows } = await getPool().query<{
		id: string;
		email: string | null;
		created_at: Date;
		exp: string;
		granted_today: string;
		used_today: string;
	}>(
		`select
			u.id,
			u.email,
			u.created_at,
			coalesce(pp.exp, 0) as exp,
			coalesce(g.granted, 0) as granted_today,
			coalesce(c.used, 0) as used_today
		from auth.users u
		left join player_profiles pp on pp.user_id = u.id
		left join (
			select user_id, sum(amount) as granted
			from booster_grants
			where grant_date = (now() at time zone 'Europe/Madrid')::date
			group by user_id
		) g on g.user_id = u.id
		left join (
			select user_id, count(*) as used
			from booster_claims
			where claimed_at >= date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
			group by user_id
		) c on c.user_id = u.id
		order by u.created_at desc`
	);

	return rows.map((row) => toAdminUser(row));
}

/** Load one player's refreshed admin row (or null when the user is gone). */
async function fetchUser(id: string): Promise<AdminUser | null> {
	await ensureTables();
	const { rows } = await getPool().query<{
		id: string;
		email: string | null;
		created_at: Date;
		exp: string;
		granted_today: string;
		used_today: string;
	}>(
		`select
			u.id,
			u.email,
			u.created_at,
			coalesce(pp.exp, 0) as exp,
			coalesce(g.granted, 0) as granted_today,
			coalesce(c.used, 0) as used_today
		from auth.users u
		left join player_profiles pp on pp.user_id = u.id
		left join (
			select user_id, sum(amount) as granted
			from booster_grants
			where grant_date = (now() at time zone 'Europe/Madrid')::date and user_id = $1
			group by user_id
		) g on g.user_id = u.id
		left join (
			select user_id, count(*) as used
			from booster_claims
			where claimed_at >= date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
				and user_id = $1
			group by user_id
		) c on c.user_id = u.id
		where u.id = $1`,
		[id]
	);
	return rows[0] ? toAdminUser(rows[0]) : null;
}

/** Shape one joined DB row into the admin view, deriving level and today's cap. */
function toAdminUser(row: {
	id: string;
	email: string | null;
	created_at: Date;
	exp: string;
	granted_today: string;
	used_today: string;
}): AdminUser {
	const exp = Number(row.exp);
	// Same cap as claim_booster: level from exp, but never above the level-20 tier.
	const level = Math.min(levelForExp(exp), MAX_DAILY_LEVEL);
	const grantedToday = Number(row.granted_today);
	const usedToday = Number(row.used_today);
	const capToday = level + grantedToday;
	return {
		id: row.id,
		email: row.email,
		createdAt: new Date(row.created_at).toISOString(),
		exp,
		level,
		grantedToday,
		usedToday,
		capToday,
		remainingToday: Math.max(0, capToday - usedToday)
	};
}

export const usersRouter = Router();

// Every player with their game state and today's claim standing, newest first.
usersRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		const users = await fetchUsers();
		res.json({ users });
	})
);

// Grant a player extra daily claims for today. Body: { amount: number } — a
// non-zero integer (negative revokes). Appends a booster_grants row for today's
// Catalan date, so it lifts today's cap and lapses at midnight. Returns the
// player's refreshed row.
usersRouter.post(
	'/:id/grant',
	asyncHandler(async (req, res) => {
		const id = String(req.params.id);
		if (!UUID_RE.test(id)) httpError(400, 'id must be a user uuid');

		const rawAmount = (req.body as { amount?: unknown }).amount;
		const amount = typeof rawAmount === 'number' ? Math.trunc(rawAmount) : NaN;
		if (!Number.isInteger(amount) || amount === 0) {
			httpError(400, 'amount must be a non-zero integer');
		}

		await ensureTables();
		// FK-check the user exists up front, for a clear 404 rather than an FK error.
		const existing = await fetchUser(id);
		if (!existing) httpError(404, `No user "${id}"`);

		await getPool().query(
			`insert into booster_grants (user_id, grant_date, amount)
			 values ($1, (now() at time zone 'Europe/Madrid')::date, $2)`,
			[id, amount]
		);

		const user = await fetchUser(id);
		if (!user) httpError(404, `No user "${id}"`);
		const result: GrantClaimsResult = { user: user! };
		res.json(result);
	})
);
