import { writable, type Readable } from 'svelte/store';
import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';
import { territoryAdapter } from '$adapters/classes/territory.adapter';
import { catalanDayIso } from '$utils/festes/catalan-day';
import {
	siegeProgress,
	type MunicipalityChallenge,
	type MunicipalityChallengeRow,
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
 * pure-SPA pattern as {@link spawnService}. The occupancy tables are **read-only**
 * here: a town changes hands only inside the `award_combat_exp` RPC, as part of
 * settling a won fight. The one write is {@link startChallenge}, and even that
 * only asks the server to spend the day's challenge on a town — the RPC decides
 * whether there is one left to spend.
 *
 * `municipality_holders` is world-readable, so the map can name every town's
 * occupant whether or not anyone is signed in; a town with no row is still on its
 * seeded OG team. `municipality_sieges` and `municipality_challenges` are
 * RLS-scoped to their owner, so the progress and the spent challenges loaded here
 * are always the signed-in player's own.
 *
 * Everything degrades to "nothing taken yet" when Supabase is unconfigured, so
 * auth-less local dev still gets a map full of seeded teams.
 */
class TerritoryService {
	private holdersStore = writable<Map<string, MunicipalityHolder>>(new Map());
	private siegesStore = writable<Map<string, MunicipalitySiege>>(new Map());
	private challengesStore = writable<Map<string, MunicipalityChallenge>>(new Map());

	/** Every taken town, keyed by municipality feature id. */
	get holders(): Readable<Map<string, MunicipalityHolder>> {
		return this.holdersStore;
	}

	/** The signed-in player's siege progress, keyed by municipality feature id. */
	get sieges(): Readable<Map<string, MunicipalitySiege>> {
		return this.siegesStore;
	}

	/**
	 * The towns the signed-in player has already challenged today, keyed by
	 * municipality feature id. A town in here cannot be challenged again until
	 * Catalan midnight.
	 */
	get challenges(): Readable<Map<string, MunicipalityChallenge>> {
		return this.challengesStore;
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

	/**
	 * Load the challenges the signed-in player has already spent **today** (Catalan
	 * time — the same day boundary `start_challenge` enforces). RLS returns only
	 * their rows, so the date is the only filter needed; yesterday's rows are left
	 * on the server, since nothing on screen is about them. Empty when signed out.
	 *
	 * Voided slots are left behind too, so the set keeps meaning "the towns that
	 * cannot be challenged again today" for everyone reading it. A slot is voided
	 * when the town changes hands while the fight is still open: that challenge was
	 * paid for but never really fought, so the server hands the day back and
	 * `start_challenge` will revive the row (see municipality_challenges.sql).
	 */
	async loadChallenges(): Promise<Map<string, MunicipalityChallenge>> {
		if (!isSupabaseConfigured()) return new Map();
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('municipality_challenges')
			.select('location_id, challenge_date, started_at, settled_at')
			.eq('challenge_date', catalanDayIso())
			.is('voided_at', null);
		if (error) throw error;

		const challenges = new Map<string, MunicipalityChallenge>();
		for (const row of (data ?? []) as MunicipalityChallengeRow[]) {
			const challenge = territoryAdapter.fromChallengeRow(row);
			challenges.set(challenge.locationId, challenge);
		}
		this.challengesStore.set(challenges);
		return challenges;
	}

	/**
	 * Spend today's challenge on `locationId`, before the fight is opened.
	 *
	 * The limit is the server's to apply, not the button's: the `start_challenge`
	 * security-definer RPC claims the day's slot for this town atomically and throws
	 * when it is already taken (or when the caller holds the town, or is signed
	 * out), so two tabs cannot both open a fight for the same town on the same day.
	 * The claimed slot is merged into the store on success, so the map disables the
	 * town's Challenge button without a reload.
	 *
	 * Returns `null` when Supabase is unconfigured — auth-less local dev has no
	 * ledger to spend from and fights freely.
	 */
	async startChallenge(locationId: string): Promise<MunicipalityChallenge | null> {
		if (!locationId) throw new Error('A town is required to start a challenge.');
		if (!isSupabaseConfigured()) return null;

		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc('start_challenge', {
			p_location_id: locationId
		});
		if (error) throw error;

		const row = Array.isArray(data) ? data[0] : data;
		// The RPC's OUT names deliberately differ from the table's columns (plpgsql
		// would otherwise have to disambiguate them), so the row is mapped by hand
		// rather than through the row adapter.
		const challenge: MunicipalityChallenge = {
			locationId,
			date: String(row?.challenge_day ?? catalanDayIso()),
			startedAt: String(row?.opened_at ?? new Date().toISOString()),
			settledAt: null
		};
		this.challengesStore.update((current) => new Map(current).set(locationId, challenge));
		return challenge;
	}

	/** Reload all three, after a fight that may have moved a town. */
	async reload(): Promise<void> {
		await Promise.all([this.loadHolders(), this.loadSieges(), this.loadChallenges()]);
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
