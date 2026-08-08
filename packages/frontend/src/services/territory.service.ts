import { writable, type Readable } from 'svelte/store';
import { getSupabaseClient, isSupabaseConfigured } from '$services/supabase.client';
import { territoryAdapter } from '$adapters/classes/territory.adapter';
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
 * won fight — which is also where a town's cooldown for that player is set — and
 * the challenge itself is opened by `start_battle` (see `battle.service`). This
 * service reads those ledgers back and mirrors what those RPCs report; it decides
 * nothing, and least of all how long a cooldown lasts.
 *
 * `municipality_holders_public` is world-readable, so the map can name every town's
 * occupant whether or not anyone is signed in; a town with no row is still on its
 * seeded OG team. `municipality_sieges` and `municipality_challenges_open` are
 * RLS-scoped to their owner, so the progress and the running cooldowns loaded here
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
	 * The towns closed to the signed-in player right now, keyed by municipality
	 * feature id: the one they are fighting over, plus every town still cooling
	 * down from a fight they finished. Each one carries the instant it opens up
	 * again.
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
		// Read through the view, not the table: neither the holder's name nor the avatar
		// they wear is stored beside the town (both live once, on their player_profiles
		// row) and the view joins the current ones on. So a player who renames themselves
		// or changes their face is changed on every town they hold, and a nameless holder
		// comes back null for the adapter to word.
		const { data, error } = await supabase
			.from('municipality_holders_public')
			.select(
				'location_id, user_id, holder_name, team, turnover, taken_at, avatar_character_id, avatar_color, exp'
			);
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
	 * Load the towns that are still closed to the signed-in player: the fight they
	 * are in, and every town whose cooldown has not run out yet. Empty when signed
	 * out.
	 *
	 * Read through `municipality_challenges_open`, not the table, so **the server**
	 * decides what is still running — a device with a wrong clock cannot talk itself
	 * into an extra fight, nor be told a town is shut that the RPC would have
	 * opened. The view is also what keeps this small: a player accumulates a row per
	 * town they have ever fought, and only the handful still counting down come back.
	 *
	 * Voided slots are behind it too. A slot is voided when the town changes hands
	 * while the fight is still open: that challenge was paid for but never really
	 * fought, so it is settled with no cooldown at all and the player may come
	 * straight back (see municipality_challenges.sql).
	 */
	async loadChallenges(): Promise<Map<string, MunicipalityChallenge>> {
		if (!isSupabaseConfigured()) return new Map();
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('municipality_challenges_open')
			.select('location_id, started_at, settled_at, available_at');
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
	 * Record a challenge the server has just opened, so the map closes that town's
	 * button without a reload.
	 *
	 * Opening it is not this service's to do: the slot is claimed inside
	 * `start_battle` (see {@link battleService}), in the same transaction that opens
	 * the fight it belongs to, so there is no challenge without a battle answering
	 * for it. This only mirrors the slot that came back — one with no cooldown on it
	 * yet, since the wait is measured from the end of the fight that is only now
	 * starting.
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
