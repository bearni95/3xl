import { Router } from 'express';
import { levelForExp } from '@3xl/shared/utils/progression/level';
import type { AdminUser } from '@3xl/shared/types/player-user.type';
import { asyncHandler } from '../http-error';
import { getPool } from '../db';
import { ensureTables } from './show-templates';

/**
 * Admin API over the game's players — the Supabase `auth.users` table joined with
 * their per-player game state.
 *
 * Read-only. It used to grant a player extra daily booster claims as well, back when a
 * day had an allowance of boxes to top up: a base off the level, two on the day the
 * account was created, and a ledger that a level reached, a town taken, a town held and
 * this route all paid into. A box is the calendar's now — one per player, per town, per
 * year, per stock (see ../../supabase/booster_claims.sql) — so there is no balance to add
 * to, and no amount an admin could name that would mean anything. What is left is what a
 * player has taken of that offer.
 *
 * Talks to Supabase's Postgres directly via ../db (the DB password), so it can read
 * `auth.users` (which the anon key cannot). Runs the shared {@link ensureTables}
 * provisioning from ./show-templates first, since it reads columns that deploys.
 */

/**
 * Load every player with their game state and what they have opened. One query:
 * `auth.users` left-joined with `player_profiles` (exp) and their `booster_claims`,
 * counted whole and for the current Catalan year. The level is derived here in JS
 * (via the shared progression table) so the row does not depend on the DB
 * `level_for_exp` function existing yet.
 */
async function fetchUsers(): Promise<AdminUser[]> {
	await ensureTables();
	const { rows } = await getPool().query<UserRow>(
		`select
			u.id,
			u.email,
			u.created_at,
			coalesce(pp.exp, 0) as exp,
			coalesce(c.opened, 0) as boxes_opened,
			coalesce(c.opened_this_year, 0) as boxes_this_year
		from auth.users u
		left join player_profiles pp on pp.user_id = u.id
		left join (
			select
				user_id,
				count(*) as opened,
				count(*) filter (
					where year = extract(year from (now() at time zone 'Europe/Madrid'))::int
				) as opened_this_year
			from booster_claims
			group by user_id
		) c on c.user_id = u.id
		order by u.created_at desc`
	);

	return rows.map((row) => toAdminUser(row));
}

/** One joined row as the query above returns it. */
interface UserRow {
	id: string;
	email: string | null;
	created_at: Date;
	exp: string;
	boxes_opened: string;
	boxes_this_year: string;
}

/** Shape one joined DB row into the admin view, deriving the level from the exp. */
function toAdminUser(row: UserRow): AdminUser {
	const exp = Number(row.exp);
	return {
		id: row.id,
		email: row.email,
		createdAt: new Date(row.created_at).toISOString(),
		exp,
		level: levelForExp(exp),
		boxesOpened: Number(row.boxes_opened),
		boxesThisYear: Number(row.boxes_this_year)
	};
}

export const usersRouter = Router();

// Every player with their game state and what they have opened, newest first.
usersRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		const users = await fetchUsers();
		res.json({ users });
	})
);
