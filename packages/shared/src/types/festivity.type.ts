/**
 * Festivity-sync types — the shapes moved between the admin `/seasons` screen,
 * the @3xl/backend sync endpoint, and the two normalized Supabase tables it
 * provisions.
 *
 * The local baked calendar (@3xl/data's `public/festes-locals.json`, the same
 * file the frontend `/seasons` page paints) is the source of truth. The sync
 * mirrors, for the window running from three days before today (the booster
 * window's lower bound) through the calendar year's end,
 * every local-holiday date of every municipality into Supabase, split across:
 *
 *   - `festa_locations` — one row per municipality (its stable feature id plus
 *     name/comarca/prov/territory), the normalized location entity.
 *   - `festivities`     — one row per (location, date), each foreign-keyed to
 *     `festa_locations(id)` (ON DELETE CASCADE). No location attributes are
 *     duplicated here — that is what the FK is for.
 *
 * The dataset keeps both of a town's local holidays and does not flag which is
 * the festa major, so the sync pushes every in-window local-holiday date; a
 * town's festa major is among them.
 */

/** A normalized location row — mirrors one municipality into `festa_locations`. */
export interface FestaLocationRow {
	/** Municipality feature id (e.g. `ES_25001`), matching the geo layers. Primary key. */
	id: string;
	name: string;
	comarca: string | null;
	prov: string | null;
	territory: string | null;
}

/**
 * One celebrating municipality, paired with the series it flies — the show the
 * town's own geometry seeds it with, or its occupier's team's show wherever a
 * player has taken it, so a conquest re-stocks the town's boxes. `show` is
 * undefined when the town has no show at all (so it offers no booster). Composed
 * by the claim screen from the festes fetch, the seeded assignment and the holders, and
 * shared so the festes list and the pack grid agree on the shape.
 */
export interface FestaShowPair {
	festa: FestaLocationRow;
	show: import('../utils/geo/region-tree').RegionShow | undefined;
}

/** A single festivity row — one (location, date) pair in `festivities`. */
export interface FestivityRow {
	/** Foreign key into `festa_locations(id)`. */
	locationId: string;
	/** The festival day, a `YYYY-MM-DD` string. */
	date: string;
}

/**
 * The date window a sync targets: from the oldest still-claimable day (three days
 * back — the booster window's lower bound, so a pack whose festa has just passed is
 * not pruned out from under it) through the calendar year's end.
 */
export interface FestivityWindow {
	/** Inclusive lower bound — three days before today, as `YYYY-MM-DD`. */
	from: string;
	/** Inclusive upper bound — 31 December of the calendar year, as `YYYY-MM-DD`. */
	to: string;
	/** The calendar year the baked collection covers. */
	year: number;
}

/** A snapshot of what the two Supabase tables currently hold, for the admin. */
export interface FestivityRemoteState {
	/** Rows in `festa_locations`. */
	locations: number;
	/** Rows in `festivities`. */
	festivities: number;
	/** Earliest stored festivity date (`YYYY-MM-DD`), or null when empty. */
	earliest: string | null;
	/** Latest stored festivity date (`YYYY-MM-DD`), or null when empty. */
	latest: string | null;
}

/**
 * What a local→remote sync did: the window it covered, the remote state after
 * it ran, and the per-table change counts. Idempotent — re-running with nothing
 * to change reports all-zero deltas.
 */
export interface FestivitySyncResult {
	/** The window this sync mirrored, from the oldest claimable day to year-end. */
	window: FestivityWindow;
	/** Remote state after the sync completed. */
	remote: FestivityRemoteState;
	/** Locations inserted or refreshed in `festa_locations`. */
	locationsUpserted: number;
	/** Locations deleted (no longer carry an in-window festivity). */
	locationsRemoved: number;
	/** Festivity rows inserted into `festivities`. */
	festivitiesAdded: number;
	/** Festivity rows deleted (fell outside the window or no longer declared). */
	festivitiesRemoved: number;
	/** Total in-window festivities the window contains after the sync. */
	festivitiesTotal: number;
}
