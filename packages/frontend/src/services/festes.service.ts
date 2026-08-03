import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';
import type { FestaLocationRow, FestaWindowRow } from '$types/festivity.type';
import { catalanDayIso } from '$utils/festes/catalan-day';
import { boosterWindow, isoDayDistance } from '$utils/festes/booster-window';

/**
 * Reads the festivity calendar back out of Supabase — the same `festa_locations`
 * / `festivities` tables the admin `/seasons` screen syncs from the baked
 * calendar. The claim screen uses this instead of the local `festes-locals.json`
 * so "les festes majors d'avui" reflects whatever the authoring side has pushed.
 *
 * Talks to Postgres directly from the browser with the anon key (RLS-gated), the
 * same pure-SPA pattern as {@link spawnService}. Only the location entity is read
 * back; which show a location flies is worked out from its own geometry and the
 * holders (see `utils/geo/municipality-show.ts`), never stored beside it.
 */

/** The nested row shape `festivities → festa_locations` selects resolve to. */
interface TodayFestivityRow {
	festa_locations: FestaLocationRow | FestaLocationRow[] | null;
}

/** The same join, carrying the festivity's own date — the window read needs it. */
interface WindowFestivityRow extends TodayFestivityRow {
	date: string;
}

/**
 * Today as a `YYYY-MM-DD` string in Catalan (Europe/Madrid) time — the same day
 * boundary the `claim_booster` RPC enforces against, so the list a player sees
 * matches the dates the server will accept regardless of the device's timezone.
 * Re-exported from the shared helper every daily rule now measures its day with.
 */
export function catalanTodayIso(): string {
	return catalanDayIso();
}

/**
 * Whether `candidate` is the festa a town's box should be printed from rather than
 * `held`: the nearer of the two to today, the earlier one winning a tie between a day
 * behind and a day ahead — which is what `claim_booster`'s `order by abs(...), date`
 * comes to.
 */
function nearerFesta(candidate: string, held: string, today: string): boolean {
	const near = Math.abs(isoDayDistance(candidate, today));
	const seen = Math.abs(isoDayDistance(held, today));
	return near < seen || (near === seen && candidate < held);
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
	 * read; which of them can actually be claimed against is the `claim_booster` RPC's
	 * call, and it takes the whole booster window ({@link loadFestesForWindow}), not
	 * one day. The map's booster boxes use this for today alone — it is what tells a
	 * white card from a black one, the window read being what stands a box on a town at
	 * all.
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
	 * The municipalities celebrating a local holiday anywhere in the booster window —
	 * three days back through four days ahead of today (see {@link boosterWindow}),
	 * which is exactly the set of towns `claim_booster` will mint a box for. A town
	 * whose celebration spans several of those days appears once, on its **nearest**
	 * day to today, so each town offers one box however long its festa runs.
	 *
	 * That day comes back with it, because it is the whole of what the box is: its
	 * stock (white on the day, black around it) and its year both, which is how the
	 * browser knows which of a town's two boxes this is and whether the player has
	 * already taken it. Nearest and not earliest for the same reason — the RPC picks
	 * the nearest festa, and a town holding two in one window would otherwise be drawn
	 * as one box and opened as another.
	 *
	 * Ordered by date and then by name: the window reads as the calendar does, oldest
	 * day first.
	 *
	 * Read in pages: PostgREST caps a response at 1000 rows, and eight days of a peak
	 * festa-major week run well past that — a truncated read would silently drop
	 * towns off the end of the window. Paged under a *total* order ((location, date)
	 * is unique), so no row can straddle two pages and arrive twice or not at all.
	 */
	async loadFestesForWindow(): Promise<FestaWindowRow[]> {
		if (!isSupabaseConfigured()) return [];

		const today = catalanTodayIso();
		const { from, to } = boosterWindow(today);
		const supabase = getSupabaseClient();
		const pageSize = 1000;
		const rows: WindowFestivityRow[] = [];
		for (let offset = 0; ; offset += pageSize) {
			const { data, error } = await supabase
				.from('festivities')
				.select('date, festa_locations!inner(id, name, comarca, prov, territory)')
				.gte('date', from)
				.lte('date', to)
				.order('date')
				.order('location_id')
				.range(offset, offset + pageSize - 1);
			if (error) throw error;

			const page = (data ?? []) as WindowFestivityRow[];
			rows.push(...page);
			if (page.length < pageSize) break;
		}

		// Keep each town's nearest day to today — the festivity claim_booster picks, so
		// the box drawn is the box opened — then sort by that day and name. Distances
		// are counted in whole days off the date strings, which is what the two ends of
		// the window are measured in too; a tie between a day behind and a day ahead
		// goes to the earlier one, as the RPC's `order by abs(...), date` does.
		const byId = new Map<string, FestaWindowRow>();
		for (const row of rows) {
			const location = Array.isArray(row.festa_locations)
				? row.festa_locations[0]
				: row.festa_locations;
			if (!location) continue;
			const seen = byId.get(location.id);
			if (!seen || nearerFesta(row.date, seen.date, today)) {
				byId.set(location.id, { ...location, date: row.date });
			}
		}

		return [...byId.values()].sort(
			(a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'ca')
		);
	}
}

export const festesService = new FestesService();
