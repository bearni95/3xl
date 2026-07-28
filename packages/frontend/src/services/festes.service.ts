import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';
import type { FestaLocationRow } from '$types/festivity.type';

/**
 * Reads the festivity calendar back out of Supabase — the same `festa_locations`
 * / `festivities` tables the admin `/seasons` screen syncs from the baked
 * calendar. The claim screen uses this instead of the local `festes-locals.json`
 * so "les festes majors d'avui" reflects whatever the authoring side has pushed.
 *
 * Talks to Postgres directly from the browser with the anon key (RLS-gated), the
 * same pure-SPA pattern as {@link spawnService}. Only the location entity is read
 * back; the (location → show) assignment stays a separate baked dataset.
 */

/** The nested row shape `festivities → festa_locations` selects resolve to. */
interface TodayFestivityRow {
	festa_locations:
		| { id: string; name: string; comarca: string | null; prov: string | null; territory: string | null }
		| { id: string; name: string; comarca: string | null; prov: string | null; territory: string | null }[]
		| null;
}

/**
 * Today as a `YYYY-MM-DD` string in Catalan (Europe/Madrid) time — the same day
 * boundary the `claim_booster` RPC enforces against, so the list a player sees
 * matches the dates the server will accept regardless of the device's timezone.
 * `en-CA` formats a Gregorian date as `YYYY-MM-DD`.
 */
export function catalanTodayIso(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
}

class FestesService {
	/**
	 * The municipalities celebrating a local holiday today, name-sorted. Each is
	 * read from `festivities` (filtered to today's date) joined to its
	 * `festa_locations` parent. Returns an empty list when Supabase is not
	 * configured, so auth-less local dev degrades to "cap municipi de festa".
	 */
	async loadTodayFestes(): Promise<FestaLocationRow[]> {
		return this.loadFestesForDate(catalanTodayIso());
	}

	/**
	 * The municipalities celebrating a local holiday on `date` (a `YYYY-MM-DD` in
	 * Catalan time, as {@link catalanTodayIso} produces), name-sorted. Any day can be
	 * read — the map's booster panel browses the calendar back and forth — but only
	 * today's towns can actually be claimed against; the `claim_booster` RPC enforces
	 * that server-side regardless of what is on screen.
	 */
	async loadFestesForDate(date: string): Promise<FestaLocationRow[]> {
		if (!isSupabaseConfigured()) return [];

		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('festivities')
			.select('festa_locations!inner(id, name, comarca, prov, territory)')
			.eq('date', date);
		if (error) throw error;

		// Flatten the join (one location per festivity row) and de-duplicate by id
		// in case a town declares today more than once.
		const byId = new Map<string, FestaLocationRow>();
		for (const row of (data ?? []) as TodayFestivityRow[]) {
			const location = Array.isArray(row.festa_locations)
				? row.festa_locations[0]
				: row.festa_locations;
			if (location && !byId.has(location.id)) byId.set(location.id, location);
		}

		return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'ca'));
	}

	/**
	 * How many municipalities are de festa on each date between `from` and `to`
	 * (inclusive, `YYYY-MM-DD`) — what the booster panel's calendar prints on each
	 * day. `festivities` holds one row per (location, date), so the tally is just
	 * the row count per date.
	 *
	 * Read in pages: PostgREST caps a response at 1000 rows and a peak festa-major
	 * month runs well past that, which would silently under-count the busiest days.
	 */
	async loadFestaCountsForRange(from: string, to: string): Promise<Map<string, number>> {
		const counts = new Map<string, number>();
		if (!isSupabaseConfigured()) return counts;

		const supabase = getSupabaseClient();
		const pageSize = 1000;
		for (let offset = 0; ; offset += pageSize) {
			const { data, error } = await supabase
				.from('festivities')
				.select('date')
				.gte('date', from)
				.lte('date', to)
				.order('date')
				.range(offset, offset + pageSize - 1);
			if (error) throw error;

			const rows = (data ?? []) as { date: string }[];
			for (const row of rows) counts.set(row.date, (counts.get(row.date) ?? 0) + 1);
			if (rows.length < pageSize) break;
		}

		return counts;
	}
}

export const festesService = new FestesService();
