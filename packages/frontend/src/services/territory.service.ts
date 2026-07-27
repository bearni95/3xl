import { writable, type Readable } from 'svelte/store';
import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';
import { territoryAdapter } from '$adapters/classes/territory.adapter';
import {
	siegeProgress,
	type MunicipalityHolder,
	type MunicipalityHolderRow,
	type MunicipalitySiege,
	type MunicipalitySiegeRow,
	type SiegeProgress
} from '$types/territory.type';

/**
 * Who occupies each municipality, read back out of Supabase.
 *
 * Talks to Postgres directly from the browser with the anon key, the same
 * pure-SPA pattern as {@link spawnService}. **Read-only**: a town changes hands
 * only inside the `award_combat_exp` RPC, as part of settling a won fight — this
 * service never writes.
 *
 * `municipality_holders` is world-readable, so the map can name every town's
 * occupant whether or not anyone is signed in; a town with no row is still on its
 * seeded OG team. `municipality_sieges` is RLS-scoped to its owner, so the
 * progress loaded here is always the signed-in player's own.
 *
 * Everything degrades to "nothing taken yet" when Supabase is unconfigured, so
 * auth-less local dev still gets a map full of seeded teams.
 */
class TerritoryService {
	private holdersStore = writable<Map<string, MunicipalityHolder>>(new Map());
	private siegesStore = writable<Map<string, MunicipalitySiege>>(new Map());

	/** Every taken town, keyed by municipality feature id. */
	get holders(): Readable<Map<string, MunicipalityHolder>> {
		return this.holdersStore;
	}

	/** The signed-in player's siege progress, keyed by municipality feature id. */
	get sieges(): Readable<Map<string, MunicipalitySiege>> {
		return this.siegesStore;
	}

	/**
	 * Load every occupied town into the store. Only towns that have actually been
	 * taken have a row, so this stays small next to the ~5000 municipality polygons
	 * the map already carries — there is nothing to page.
	 */
	async loadHolders(): Promise<Map<string, MunicipalityHolder>> {
		if (!isSupabaseConfigured()) return new Map();
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('municipality_holders')
			.select('location_id, user_id, holder_name, team, turnover, taken_at');
		if (error) throw error;

		const holders = new Map<string, MunicipalityHolder>();
		for (const row of (data ?? []) as MunicipalityHolderRow[]) {
			const holder = territoryAdapter.fromHolderRow(row);
			holders.set(holder.locationId, holder);
		}
		this.holdersStore.set(holders);
		return holders;
	}

	/**
	 * Load the signed-in player's own siege progress. RLS returns only their rows,
	 * so no filter is needed. Empty when signed out.
	 */
	async loadSieges(): Promise<Map<string, MunicipalitySiege>> {
		if (!isSupabaseConfigured()) return new Map();
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('municipality_sieges')
			.select('location_id, user_id, wins, turnover');
		if (error) throw error;

		const sieges = new Map<string, MunicipalitySiege>();
		for (const row of (data ?? []) as MunicipalitySiegeRow[]) {
			const siege = territoryAdapter.fromSiegeRow(row);
			sieges.set(siege.locationId, siege);
		}
		this.siegesStore.set(sieges);
		return sieges;
	}

	/** Reload both, after a fight that may have moved a town. */
	async reload(): Promise<void> {
		await Promise.all([this.loadHolders(), this.loadSieges()]);
	}

	/**
	 * The wins a player has banked towards taking `locationId`, and the number it
	 * takes. The sets are passed in rather than read off the stores so a caller
	 * (the map) can derive this reactively from the copies it is already rendering.
	 */
	progressFor(
		locationId: string,
		holders: ReadonlyMap<string, MunicipalityHolder>,
		sieges: ReadonlyMap<string, MunicipalitySiege>
	): SiegeProgress {
		return siegeProgress(locationId, holders, sieges);
	}
}

export const territoryService = new TerritoryService();
