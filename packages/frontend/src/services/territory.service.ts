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
 * pure-SPA pattern as {@link spawnService}. Everything here is **read-only**: a
 * town changes hands only inside the `award_combat_exp` RPC, as part of settling a
 * won fight, and the day's challenge is spent by `start_battle` as part of opening
 * one (see `battle.service`). This service reads those ledgers back and mirrors
 * what those RPCs report; it decides nothing.
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
	 * time — the same day boundary `start_battle` enforces). RLS returns only
	 * their rows, so the date is the only filter needed; yesterday's rows are left
	 * on the server, since nothing on screen is about them. Empty when signed out.
	 *
	 * Voided slots are left behind too, so the set keeps meaning "the towns that
	 * cannot be challenged again today" for everyone reading it. A slot is voided
	 * when the town changes hands while the fight is still open: that challenge was
	 * paid for but never really fought, so the server hands the day back and
	 * `start_battle` will revive the row (see municipality_challenges.sql).
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
	 * Record a challenge slot the server has just spent, so the map closes that
	 * town's button without a reload.
	 *
	 * Spending it is not this service's to do any more: the day is claimed inside
	 * `start_battle` (see {@link battleService}), in the same transaction that opens
	 * the fight it pays for, so there is no way to spend a day without ending up in
	 * a battle. This only mirrors the slot that came back.
	 */
	noteChallenge(challenge: MunicipalityChallenge): void {
		this.challengesStore.update((current) =>
			new Map(current).set(challenge.locationId, challenge)
		);
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
