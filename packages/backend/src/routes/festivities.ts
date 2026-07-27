import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { FestesCollection } from '@3xl/shared/types/festa.type';
import type {
	FestivityRemoteState,
	FestivitySyncResult,
	FestivityWindow
} from '@3xl/shared/types/festivity.type';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';

/**
 * Read/sync API for the festivity calendar in Supabase.
 *
 * The local baked calendar (@3xl/data's `public/festes-locals.json`, the same
 * file the frontend and admin `/seasons` pages paint) is the source of truth.
 * `GET /` reports the current remote state; `POST /sync` mirrors — for the
 * window from *today* through the calendar year's end — every municipality's
 * local-holiday dates into two normalized, FK-related tables:
 *
 *   - `festa_locations` — one row per municipality (id + name/comarca/prov/
 *     territory), the location entity.
 *   - `festivities`     — one row per (location, date), foreign-keyed to
 *     `festa_locations(id)` ON DELETE CASCADE.
 *
 * Follows the same "admin SPA calls the backend, backend owns the DB password
 * and provisions its own tables" pattern as ./character-templates.
 */

// The baked calendar lives in the @3xl/data package's public/ dir. Resolve from
// this file's location (packages/backend/src/routes → packages/data/...) so it
// works regardless of the process cwd.
const FESTES_PATH = fileURLToPath(
	new URL('../../../data/public/festes-locals.json', import.meta.url)
);

// Create both tables exactly once per process, lazily on first use — never at
// startup, where a bad config would crash the whole server.
let ensured: Promise<void> | null = null;
function ensureTables(): Promise<void> {
	if (!ensured) {
		ensured = getPool()
			.query(
				`create table if not exists festa_locations (
					id text primary key,
					name text not null,
					comarca text,
					prov text,
					territory text,
					updated_at timestamptz not null default now()
				);
				create table if not exists festivities (
					id bigserial primary key,
					location_id text not null references festa_locations(id) on delete cascade,
					date date not null,
					year integer not null,
					updated_at timestamptz not null default now(),
					unique (location_id, date)
				);
				create index if not exists festivities_date_idx on festivities (date);
				create index if not exists festivities_location_idx on festivities (location_id)`
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

/** Read and parse the baked festes-locals collection from @3xl/data. */
async function loadCollection(): Promise<FestesCollection> {
	try {
		return JSON.parse(await readFile(FESTES_PATH, 'utf8')) as FestesCollection;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		httpError(500, `Could not read festes-locals.json: ${message}`);
	}
}

/** Today as a `YYYY-MM-DD` string in the server's local time. */
function todayIso(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The sync window: from today through 31 December of the collection's year. */
function windowFor(collection: FestesCollection): FestivityWindow {
	return { from: todayIso(), to: `${collection.year}-12-31`, year: collection.year };
}

/**
 * The in-window target: every (location, date) local-holiday pair whose date
 * falls within the window, plus the location rows they reference. `YYYY-MM-DD`
 * strings compare lexically, so plain string bounds are correct.
 */
function buildTarget(collection: FestesCollection, window: FestivityWindow) {
	const locations = new Map<string, { name: string; comarca: string | null; prov: string | null; territory: string | null }>();
	const festivities: { locationId: string; date: string }[] = [];
	for (const festa of collection.festes) {
		let kept = false;
		for (const date of festa.dates) {
			if (date < window.from || date > window.to) continue;
			festivities.push({ locationId: festa.id, date });
			kept = true;
		}
		if (kept) {
			locations.set(festa.id, {
				name: festa.name,
				comarca: festa.comarca,
				prov: festa.prov,
				territory: festa.territory
			});
		}
	}
	return { locations, festivities };
}

/** Fetch the current remote state of the two tables, for the admin to display. */
async function fetchRemoteState(): Promise<FestivityRemoteState> {
	await ensureTables();
	const pool = getPool();
	const [{ rows: locRows }, { rows: festRows }] = await Promise.all([
		pool.query<{ count: string }>('select count(*)::int as count from festa_locations'),
		pool.query<{ count: string; earliest: string | null; latest: string | null }>(
			`select count(*)::int as count,
				to_char(min(date), 'YYYY-MM-DD') as earliest,
				to_char(max(date), 'YYYY-MM-DD') as latest
			 from festivities`
		)
	]);
	return {
		locations: Number(locRows[0].count),
		festivities: Number(festRows[0].count),
		earliest: festRows[0].earliest,
		latest: festRows[0].latest
	};
}

export const festivitiesRouter = Router();

// Current remote state plus the window the next sync would cover — so the admin
// can show what is stored and what a sync would push before running it.
festivitiesRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		const collection = await loadCollection();
		const window = windowFor(collection);
		const target = buildTarget(collection, window);
		const remote = await fetchRemoteState();
		res.json({
			window,
			remote,
			localFestivities: target.festivities.length,
			localLocations: target.locations.size
		});
	})
);

// Mirror the today→year-end window into Supabase: upsert the in-window
// locations, insert their festivities, then delete every festivity (and then
// every childless location) outside the window. Idempotent.
festivitiesRouter.post(
	'/sync',
	asyncHandler(async (_req, res) => {
		const collection = await loadCollection();
		const window = windowFor(collection);
		const target = buildTarget(collection, window);
		const pool = getPool();
		await ensureTables();

		// Snapshot before we touch anything, so the response reports exact deltas.
		const [{ rows: beforeFest }, { rows: beforeLoc }] = await Promise.all([
			pool.query<{ location_id: string; date: string }>(
				"select location_id, to_char(date, 'YYYY-MM-DD') as date from festivities"
			),
			pool.query<{ id: string }>('select id from festa_locations')
		]);
		const beforeFestKeys = new Set(beforeFest.map((r) => `${r.location_id}|${r.date}`));
		const beforeLocIds = new Set(beforeLoc.map((r) => r.id));

		const targetLocIds = [...target.locations.keys()];
		const targetFestKeys = new Set(
			target.festivities.map((f) => `${f.locationId}|${f.date}`)
		);

		// 1. Upsert the in-window locations (parents must exist before their rows).
		if (targetLocIds.length > 0) {
			await pool.query(
				`insert into festa_locations (id, name, comarca, prov, territory)
				 select * from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])
				 on conflict (id) do update set
					name = excluded.name,
					comarca = excluded.comarca,
					prov = excluded.prov,
					territory = excluded.territory,
					updated_at = now()`,
				[
					targetLocIds,
					targetLocIds.map((id) => target.locations.get(id)!.name),
					targetLocIds.map((id) => target.locations.get(id)!.comarca),
					targetLocIds.map((id) => target.locations.get(id)!.prov),
					targetLocIds.map((id) => target.locations.get(id)!.territory)
				]
			);
		}

		// 2. Insert the in-window festivities, leaving existing ones untouched.
		if (target.festivities.length > 0) {
			await pool.query(
				`insert into festivities (location_id, date, year)
				 select loc, dt, $3::int from unnest($1::text[], $2::date[]) as t(loc, dt)
				 on conflict (location_id, date) do nothing`,
				[
					target.festivities.map((f) => f.locationId),
					target.festivities.map((f) => f.date),
					window.year
				]
			);
		}

		// 3. Delete every festivity not in the target (past dates, or towns whose
		//    declared days changed). An empty target clears the whole table.
		if (target.festivities.length > 0) {
			await pool.query(
				`delete from festivities f
				 where not exists (
					select 1 from unnest($1::text[], $2::date[]) as t(loc, dt)
					where t.loc = f.location_id and t.dt = f.date
				 )`,
				[target.festivities.map((f) => f.locationId), target.festivities.map((f) => f.date)]
			);
		} else {
			await pool.query('delete from festivities');
		}

		// 4. Drop locations that no longer carry any festivity.
		await pool.query(
			'delete from festa_locations l where not exists (select 1 from festivities f where f.location_id = l.id)'
		);

		const targetLocIdSet = new Set(targetLocIds);
		const result: FestivitySyncResult = {
			window,
			remote: await fetchRemoteState(),
			locationsUpserted: targetLocIds.length,
			locationsRemoved: [...beforeLocIds].filter((id) => !targetLocIdSet.has(id)).length,
			festivitiesAdded: [...targetFestKeys].filter((key) => !beforeFestKeys.has(key)).length,
			festivitiesRemoved: [...beforeFestKeys].filter((key) => !targetFestKeys.has(key)).length,
			festivitiesTotal: target.festivities.length
		};
		res.json(result);
	})
);
