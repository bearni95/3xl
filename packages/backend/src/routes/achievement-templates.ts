import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type {
	AchievementsCollection,
	AchievementSyncResult
} from '@3xl/shared/types/achievement.type';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';

/**
 * Read/sync API for achievements in Supabase, and the ledger of who holds them.
 *
 * Supabase keeps **only the id**: `achievement_templates` is a table of one
 * column plus a timestamp, existing so that `player_achievements` has something
 * to foreign-key to. A badge's glyph, name and description live in the local
 * @3xl/data `public/achievements.json` (see ./achievements) and are never pushed
 * up — so rewording a badge is one edit in the git tree, and no row anywhere can
 * disagree with it.
 *
 * The local collection is the source of truth. `GET /` reports the remote ids;
 * `POST /sync` makes the remote table mirror the local file (insert every local
 * id, delete remote ids that no longer exist locally). Since the row is nothing
 * but its id there is no such thing as an out-of-date row — only a missing or a
 * surplus one.
 *
 * Deleting is the sync's one destructive act: `player_achievements` cascades off
 * the template, so removing an achievement locally and syncing takes every award
 * of it with it. That is the intended meaning of retiring a badge — a badge that
 * no longer exists cannot be held — and `removed` in the result names exactly
 * which ids it happened to.
 *
 * Mirrors ./character-templates: talks to Supabase's Postgres directly via ../db
 * (the DB password) so it can provision its own tables — no manual SQL step.
 */

// packages/backend/src/routes → packages/data. Same file as ./achievements writes.
const ACHIEVEMENTS_PATH = fileURLToPath(
	new URL('../../../data/public/achievements.json', import.meta.url)
);

// Create the tables exactly once per process, lazily on first use, so we never
// issue the DDL on a request that doesn't need it (and never at startup, where a
// bad config would crash the whole server). Both are idempotent.
//
// `player_achievements` is the users-to-achievements join, and the only part of
// this that holds player data. It is RLS-protected and readable by everyone —
// a badge is worn, so one player seeing another's is the point — but carries no
// insert/update/delete policy at all, so the anon key cannot award anything.
// Awarding is a rule, and rules belong on the server: when there is one, it
// arrives as a security-definer RPC that decides for itself whether the badge is
// earned, exactly as claim_booster and award_combat_exp do for packs and
// experience.
let ensured: Promise<void> | null = null;
function ensureTables(): Promise<void> {
	if (!ensured) {
		ensured = getPool()
			.query(
				`create table if not exists achievement_templates (
					id text primary key,
					updated_at timestamptz not null default now()
				);
				alter table achievement_templates enable row level security;
				drop policy if exists achievement_templates_select_all on achievement_templates;
				create policy achievement_templates_select_all on achievement_templates
						for select using (true);
				create table if not exists player_achievements (
					user_id uuid not null references auth.users (id) on delete cascade,
					achievement_id text not null
						references achievement_templates (id) on delete cascade,
					awarded_at timestamptz not null default now(),
					primary key (user_id, achievement_id)
				);
				create index if not exists player_achievements_achievement_idx
					on player_achievements (achievement_id);
				alter table player_achievements enable row level security;
				drop policy if exists player_achievements_select_all on player_achievements;
				create policy player_achievements_select_all on player_achievements
						for select using (true)`
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

/** The local collection's ids, sorted — everything Supabase is meant to hold. */
async function localIds(): Promise<string[]> {
	try {
		const raw = await readFile(ACHIEVEMENTS_PATH, 'utf-8');
		const parsed = JSON.parse(raw) as AchievementsCollection;
		return (parsed?.achievements ?? []).map((achievement) => achievement.id).sort();
	} catch {
		return [];
	}
}

/** Fetch the remote ids, ordered. */
async function fetchRemote(): Promise<string[]> {
	await ensureTables();
	const { rows } = await getPool().query<{ id: string }>(
		'select id from achievement_templates order by id'
	);
	return rows.map((row) => row.id);
}

export const achievementTemplatesRouter = Router();

// The remote id list, for the admin to compare against the local collection.
achievementTemplatesRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		res.json({ ids: await fetchRemote() });
	})
);

// How many players hold each achievement, keyed by id — the one thing about a
// badge that only Supabase can answer, and what makes deleting one legible
// before the sync does it.
achievementTemplatesRouter.get(
	'/holders',
	asyncHandler(async (_req, res) => {
		await ensureTables();
		const { rows } = await getPool().query<{ achievement_id: string; holders: string }>(
			'select achievement_id, count(*) as holders from player_achievements group by achievement_id'
		);
		const holders: Record<string, number> = {};
		for (const row of rows) holders[row.achievement_id] = Number(row.holders);
		res.json({ holders });
	})
);

// Mirror the local collection into Supabase: insert every local id, then delete
// any remote id that no longer exists locally (taking its awards with it).
// Idempotent — running it with nothing to change reports all-zero counts.
achievementTemplatesRouter.post(
	'/sync',
	asyncHandler(async (_req, res) => {
		const pool = getPool();
		const local = await localIds();
		const before = await fetchRemote();

		const beforeSet = new Set(before);
		const localSet = new Set(local);
		const added = local.filter((id) => !beforeSet.has(id));
		const removed = before.filter((id) => !localSet.has(id));

		// Bulk insert; `do nothing` because an id that is already there is already
		// correct — the row has no other column to bring up to date.
		if (local.length > 0) {
			await pool.query(
				`insert into achievement_templates (id)
				 select * from unnest($1::text[])
				 on conflict (id) do nothing`,
				[local]
			);
		}
		if (removed.length > 0) {
			await pool.query('delete from achievement_templates where id = any($1::text[])', [removed]);
		}

		const result: AchievementSyncResult = { ids: await fetchRemote(), added, removed };
		res.json(result);
	})
);
