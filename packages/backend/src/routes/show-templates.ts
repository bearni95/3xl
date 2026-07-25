import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { characters } from '@3xl/data';
import type { ShowEntry, ShowsCollection } from '@3xl/shared/types/show.type';
import type {
	ShowCharacterAssignments,
	ShowTemplate,
	ShowTemplateSyncResult
} from '@3xl/shared/types/show-template.type';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';

/**
 * Read/sync API for show "templates" in Supabase — the minimal frontend-facing
 * identity of each saved show (id + display name) mirrored from the local
 * `@3xl/data` `public/shows.json` collection into the `show_templates` table,
 * plus the many-to-many `show_characters` join that assigns characters to shows.
 *
 * The local collection is the source of truth for templates. `GET /` returns the
 * remote state; `POST /sync` makes the remote table mirror the local collection
 * (upsert every local show, delete remote rows that no longer exist locally).
 *
 * Character assignments live only in Supabase — there is no local file for them.
 * `GET /assignments` returns the whole show→characters map; `PUT /:showId/characters`
 * replaces the assignment list for one show.
 *
 * Mirrors ./character-templates: talks to Supabase's Postgres directly via ../db
 * (the DB password) so it can provision the tables itself — no manual SQL step.
 */

// packages/backend/src/routes → packages/data. Same file as ./shows writes.
const SHOWS_PATH = fileURLToPath(new URL('../../../data/public/shows.json', import.meta.url));

// Ensure the tables exist exactly once per process, lazily on first use. We also
// (re)declare `character_templates` here because `show_characters` references it,
// and that table is otherwise only created lazily by ./character-templates —
// which may not have run yet. `character_spawns` (the per-player claimed
// instances behind the frontend /claim panel) is provisioned here too, since it
// references both `character_templates` and `show_templates`; unlike the other
// tables it's RLS-protected (each player only sees/creates their own spawns), as
// the frontend writes it directly with the anon key. All DDL is idempotent.
let ensured: Promise<void> | null = null;
function ensureTables(): Promise<void> {
	if (!ensured) {
		ensured = getPool()
			.query(
				`create table if not exists character_templates (
					id text primary key,
					name text not null,
					updated_at timestamptz not null default now()
				);
				create table if not exists show_templates (
					id bigint primary key,
					name text not null,
					updated_at timestamptz not null default now()
				);
				create table if not exists show_characters (
					show_id bigint not null references show_templates (id) on delete cascade,
					character_id text not null references character_templates (id) on delete cascade,
					primary key (show_id, character_id)
				);
				create table if not exists character_spawns (
						id uuid primary key default gen_random_uuid(),
						user_id uuid not null references auth.users (id) on delete cascade,
						character_id text not null references character_templates (id) on delete cascade,
						show_id bigint references show_templates (id) on delete set null,
						created_at timestamptz not null default now()
					);
				alter table character_spawns enable row level security;
				drop policy if exists character_spawns_select_own on character_spawns;
				create policy character_spawns_select_own on character_spawns
						for select using (auth.uid() = user_id);
				drop policy if exists character_spawns_insert_own on character_spawns;
				create policy character_spawns_insert_own on character_spawns
						for insert with check (auth.uid() = user_id);
				drop policy if exists character_spawns_delete_own on character_spawns;
				create policy character_spawns_delete_own on character_spawns
						for delete using (auth.uid() = user_id)`
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

/** The local saved-show collection projected to templates: only id + name. */
async function localTemplates(): Promise<ShowTemplate[]> {
	let shows: ShowEntry[] = [];
	try {
		const raw = await readFile(SHOWS_PATH, 'utf-8');
		const parsed = JSON.parse(raw) as ShowsCollection;
		if (Array.isArray(parsed?.shows)) shows = parsed.shows;
	} catch {
		shows = [];
	}
	return shows
		.map((entry) => ({ id: entry.show.id, name: entry.show.name }))
		.sort((a, b) => a.id - b.id);
}

/** Fetch the remote templates, ordered by id. pg returns bigint as string. */
async function fetchRemote(): Promise<ShowTemplate[]> {
	await ensureTables();
	const { rows } = await getPool().query<{ id: string; name: string }>(
		'select id, name from show_templates order by id'
	);
	return rows.map((row) => ({ id: Number(row.id), name: row.name }));
}

/** Fetch every show→characters assignment as a { [showId]: characterId[] } map. */
async function fetchAssignments(): Promise<ShowCharacterAssignments> {
	await ensureTables();
	const { rows } = await getPool().query<{ show_id: string; character_id: string }>(
		'select show_id, character_id from show_characters order by show_id, character_id'
	);
	const map: ShowCharacterAssignments = {};
	for (const row of rows) {
		const showId = Number(row.show_id);
		(map[showId] ??= []).push(row.character_id);
	}
	return map;
}

export const showTemplatesRouter = Router();

// The remote template list, for the admin to compare against the local shows.
showTemplatesRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		const templates = await fetchRemote();
		res.json({ templates });
	})
);

// Mirror the local collection into Supabase: upsert every local template, then
// delete any remote row that no longer exists locally. Idempotent.
showTemplatesRouter.post(
	'/sync',
	asyncHandler(async (_req, res) => {
		const pool = getPool();
		const local = await localTemplates();
		const before = await fetchRemote();

		const beforeById = new Map(before.map((t) => [t.id, t]));
		const localIds = local.map((t) => t.id);
		const localIdSet = new Set(localIds);

		// Classify against the remote state before we touch it, so the response
		// describes exactly what this sync did.
		const added: number[] = [];
		const updated: number[] = [];
		for (const template of local) {
			const existing = beforeById.get(template.id);
			if (!existing) added.push(template.id);
			else if (existing.name !== template.name) updated.push(template.id);
		}
		const removed = before.map((t) => t.id).filter((id) => !localIdSet.has(id));

		// Bulk upsert via parallel arrays, then drop any id not in the local set.
		// Deleting a show cascades to its `show_characters` rows.
		if (local.length > 0) {
			await pool.query(
				`insert into show_templates (id, name)
				 select * from unnest($1::bigint[], $2::text[])
				 on conflict (id) do update set name = excluded.name, updated_at = now()`,
				[localIds, local.map((t) => t.name)]
			);
		}
		if (removed.length > 0) {
			await pool.query('delete from show_templates where not (id = any($1::bigint[]))', [localIds]);
		}

		const result: ShowTemplateSyncResult = {
			templates: await fetchRemote(),
			added,
			updated,
			removed
		};
		res.json(result);
	})
);

// The whole show→characters assignment map.
showTemplatesRouter.get(
	'/assignments',
	asyncHandler(async (_req, res) => {
		const assignments = await fetchAssignments();
		res.json({ assignments });
	})
);

// Replace the character assignments for one show. Body: { characterIds: string[] }.
// The show template row is upserted first (from the local collection) so the FK
// holds without a separate sync; the characters, however, must already be synced
// into `character_templates` — an unsynced id trips the FK and returns a 400.
showTemplatesRouter.put(
	'/:showId/characters',
	asyncHandler(async (req, res) => {
		const showId = Number(req.params.showId);
		if (!Number.isInteger(showId)) httpError(400, 'showId must be an integer');

		const body = req.body as { characterIds?: unknown };
		if (!body || !Array.isArray(body.characterIds)) {
			httpError(400, 'Body must be { characterIds: string[] }');
		}
		const characterIds = [...new Set(body.characterIds as unknown[])];
		if (!characterIds.every((id) => typeof id === 'string')) {
			httpError(400, 'characterIds must all be strings');
		}

		// Reject ids that aren't in the local registry up front, with a clearer
		// message than the FK violation would give.
		const known = new Set(characters.map((c) => c.id));
		const unknown = (characterIds as string[]).filter((id) => !known.has(id));
		if (unknown.length > 0) {
			httpError(400, `Unknown character id(s): ${unknown.join(', ')}`);
		}

		// The show must exist in the local collection so we can upsert its name.
		const local = await localTemplates();
		const template = local.find((t) => t.id === showId);
		if (!template) httpError(404, `Show ${showId} is not in the saved collection`);

		const pool = getPool();
		const client = await pool.connect();
		try {
			await client.query('begin');
			await client.query(
				`insert into show_templates (id, name) values ($1, $2)
				 on conflict (id) do update set name = excluded.name, updated_at = now()`,
				[template!.id, template!.name]
			);
			await client.query('delete from show_characters where show_id = $1', [showId]);
			if ((characterIds as string[]).length > 0) {
				await client.query(
					`insert into show_characters (show_id, character_id)
					 select $1::bigint, * from unnest($2::text[])`,
					[showId, characterIds as string[]]
				);
			}
			await client.query('commit');
		} catch (error) {
			await client.query('rollback').catch(() => undefined);
			const message = error instanceof Error ? error.message : String(error);
			// A FK violation here means a character isn't synced to Supabase yet.
			httpError(400, `Could not save assignments: ${message}`);
		} finally {
			client.release();
		}

		res.json({ assignments: await fetchAssignments() });
	})
);
