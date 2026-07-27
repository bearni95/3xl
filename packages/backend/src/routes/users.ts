import { Router } from 'express';
import { levelForExp } from '@3xl/shared/utils/progression/level';
import type { AdminUser, GrantClaimsResult } from '@3xl/shared/types/player-user.type';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';

/**
 * Admin API over the game's players — the Supabase `auth.users` table joined with
 * their per-player game state, plus the ability to grant a player extra daily
 * booster claims for the current day.
 *
 * The daily claim limit the frontend /claim panel enforces is a player's level
 * (from accumulated experience) capped at 20, resetting at midnight Europe/Madrid
 * (see ../../supabase/booster_claims.sql and ./show-templates.ts). A grant is an
 * additive, day-scoped bump to that cap: a row in `booster_grants` for today's
 * Catalan date, which `claim_booster` / `boosters_status` add on top of the level.
 * Grants written for one day never carry over — they lapse at Catalan midnight.
 *
 * Talks to Supabase's Postgres directly via ../db (the DB password), so it can
 * read `auth.users` (which the anon key cannot) and provision `booster_grants`
 * itself. The RPCs that actually consume grants are provisioned in
 * ./show-templates.ts; this route re-declares the table idempotently so listing
 * and granting work even before that path has run.
 */

// Ensure the grants table exists exactly once per process, lazily on first use.
// The RPCs that read it live in ./show-templates.ts; `create table if not exists`
// here is idempotent and harmless if that path already created it.
let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
	if (!ensured) {
		ensured = getPool()
			.query(
				`create table if not exists booster_grants (
					id uuid primary key default gen_random_uuid(),
					user_id uuid not null references auth.users (id) on delete cascade,
					-- The Europe/Madrid (Catalan) date the extra claims apply to.
					grant_date date not null,
					-- Extra daily claims granted for that day (may be negative to revoke).
					amount integer not null,
					created_at timestamptz not null default now()
				);
				create index if not exists booster_grants_user_day_idx
					on booster_grants (user_id, grant_date)`
			)
			.then(() => undefined)
			.catch((error: unknown) => {
				// Reset so a transient failure (e.g. bad password) can be retried on the
				// next request instead of being cached forever.
				ensured = null;
				const message = error instanceof Error ? error.message : String(error);
				httpError(502, `Supabase DB connection failed: ${message}`);
			});
	}
	return ensured;
}

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
	await ensureTable();
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
	await ensureTable();
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

		await ensureTable();
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
