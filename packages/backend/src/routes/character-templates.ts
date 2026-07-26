import { Router } from 'express';
import { characters } from '@3xl/data';
import {
	DEFAULT_RARITY,
	RARITY_MIN,
	type CharacterTemplate,
	type CharacterTemplateSyncResult
} from '@3xl/shared/types/character-template.type';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';

/**
 * Read/sync API for character "templates" in Supabase — the minimal
 * frontend-facing identity of each character (id + display name) mirrored from
 * the local @3xl/data registry into the `character_templates` table.
 *
 * The local registry is the source of truth. `GET /` returns the remote state
 * (so the admin can visualise it); `POST /sync` makes the remote table mirror
 * the local registry (upsert every local character, delete remote rows that no
 * longer exist locally) and reports what changed.
 *
 * Talks to Supabase's Postgres directly via ../db (the DB password), so it can
 * provision the table itself — no manual SQL step. Follows the same "admin SPA
 * calls the backend" pattern as ./characters and ./shows.
 */

// Ensure the table exists exactly once per process, lazily on first use, so we
// never issue the DDL on a request that doesn't need it (and never at startup,
// where a bad config would crash the whole server).
let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
	if (!ensured) {
		ensured = getPool()
			.query(
				`create table if not exists character_templates (
					id text primary key,
					name text not null,
					updated_at timestamptz not null default now()
				);
				-- Rarity tier authored from the admin, Supabase-only. Not-null default 0
				-- so rows that predate the column (and every freshly synced row) get the
				-- common tier automatically; the local→remote sync never writes it.
				alter table character_templates
					add column if not exists rarity integer not null default 0`
			)
			.then(() => undefined)
			.catch((error: unknown) => {
				// Reset so a transient failure (e.g. bad password) can be retried on
				// the next request instead of being cached forever.
				ensured = null;
				const message = error instanceof Error ? error.message : String(error);
				httpError(502, `Supabase DB connection failed: ${message}`);
			});
	}
	return ensured;
}

/** The local registry projected to templates: only id + display name (label). */
function localTemplates(): CharacterTemplate[] {
	return characters
		.map((character) => ({ id: character.id, name: character.label }))
		.sort((a, b) => a.id.localeCompare(b.id));
}

/** Fetch the remote templates, ordered by id. */
async function fetchRemote(): Promise<CharacterTemplate[]> {
	await ensureTable();
	const { rows } = await getPool().query<CharacterTemplate>(
		'select id, name, rarity from character_templates order by id'
	);
	return rows;
}

/** Coerce an untrusted rarity value to a stored non-negative integer tier. */
function normalizeRarity(raw: unknown): number {
	const value = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : DEFAULT_RARITY;
	return Math.max(RARITY_MIN, value);
}

export const characterTemplatesRouter = Router();

// The remote template list, for the admin to compare against the local registry.
characterTemplatesRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		const templates = await fetchRemote();
		res.json({ templates });
	})
);

// Set one character's rarity tier — the only per-character field owned by
// Supabase rather than the local registry. Upserts by id (using the local
// display name) so rarity can be authored before an explicit sync has pushed the
// row up, and leaves the name/rarity of every other row untouched.
characterTemplatesRouter.put(
	'/:id/rarity',
	asyncHandler(async (req, res) => {
		const id = String(req.params.id);
		const character = characters.find((c) => c.id === id);
		if (!character) httpError(404, `No local character "${id}"`);
		const rarity = normalizeRarity((req.body as { rarity?: unknown }).rarity);

		await ensureTable();
		await getPool().query(
			`insert into character_templates (id, name, rarity)
			 values ($1, $2, $3)
			 on conflict (id) do update set rarity = excluded.rarity, updated_at = now()`,
			[id, character.label, rarity]
		);

		const template: CharacterTemplate = { id, name: character.label, rarity };
		res.json({ template });
	})
);

// Mirror the local registry into Supabase: upsert every local template, then
// delete any remote row that no longer exists locally. Idempotent — running it
// with nothing to change reports all-zero counts.
characterTemplatesRouter.post(
	'/sync',
	asyncHandler(async (_req, res) => {
		const pool = getPool();
		const local = localTemplates();
		const before = await fetchRemote();

		const beforeById = new Map(before.map((t) => [t.id, t]));
		const localIds = local.map((t) => t.id);
		const localIdSet = new Set(localIds);

		// Classify against the remote state before we touch it, so the response
		// describes exactly what this sync did.
		const added: string[] = [];
		const updated: string[] = [];
		for (const template of local) {
			const existing = beforeById.get(template.id);
			if (!existing) added.push(template.id);
			else if (existing.name !== template.name) updated.push(template.id);
		}
		const removed = before.map((t) => t.id).filter((id) => !localIdSet.has(id));

		// Bulk upsert via parallel arrays, then drop any id not in the local set.
		if (local.length > 0) {
			await pool.query(
				`insert into character_templates (id, name)
				 select * from unnest($1::text[], $2::text[])
				 on conflict (id) do update set name = excluded.name, updated_at = now()`,
				[localIds, local.map((t) => t.name)]
			);
		}
		if (removed.length > 0) {
			await pool.query('delete from character_templates where not (id = any($1::text[]))', [
				localIds
			]);
		}

		const result: CharacterTemplateSyncResult = {
			templates: await fetchRemote(),
			added,
			updated,
			removed
		};
		res.json(result);
	})
);
