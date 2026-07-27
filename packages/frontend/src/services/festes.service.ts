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

/** Today as a `YYYY-MM-DD` string in the browser's local time. */
function todayIso(): string {
	const now = new Date();
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

class FestesService {
	/**
	 * The municipalities celebrating a local holiday today, name-sorted. Each is
	 * read from `festivities` (filtered to today's date) joined to its
	 * `festa_locations` parent. Returns an empty list when Supabase is not
	 * configured, so auth-less local dev degrades to "cap municipi de festa".
	 */
	async loadTodayFestes(): Promise<FestaLocationRow[]> {
		if (!isSupabaseConfigured()) return [];

		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('festivities')
			.select('festa_locations!inner(id, name, comarca, prov, territory)')
			.eq('date', todayIso());
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
}

export const festesService = new FestesService();
