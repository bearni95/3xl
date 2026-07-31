import { writable, type Readable } from 'svelte/store';
import { characters } from '@3xl/data';
import { getSupabaseClient } from '$services/supabase.client';
import { spawnAdapter } from '$adapters/classes/spawn.adapter';
import { playerAvatarAdapter } from '$adapters/classes/player-avatar.adapter';
import { DEFAULT_RARITY } from '$types/character-template.type';
import type {
	CharacterSpawn,
	CharacterSpawnRow,
	ClaimableShow
} from '$types/character-spawn.type';
import type { PlayerAvatar, PlayerAvatarRow } from '$types/player-avatar.type';

/** How many cards a single booster pack contains. Mirrors `claim_booster`'s roll count. */
export const BOOSTER_SIZE = 5;

/**
 * How many recycled cards earn one extra daily claim. Mirrors `recycle_spawns`'s
 * grant rule (integer division by this size). Drives the roster's recycle tally.
 */
export const RECYCLE_GROUP_SIZE = 10;

/** The outcome of a recycle: how many spawns were destroyed and claims granted. */
export interface RecycleResult {
	/** Spawns actually destroyed (the caller's own among those submitted). */
	recycled: number;
	/** Extra daily claims granted (`floor(recycled / RECYCLE_GROUP_SIZE)`). */
	granted: number;
}

/**
 * Everything one opened booster box gave: its {@link BOOSTER_SIZE} cards, and the
 * single avatar that came with them.
 *
 * The avatar is `null` only when the server could not deal one at all (an old
 * deployment of the RPC); a box that opens deals one, and one the player already
 * holds comes back as the row they hold rather than as nothing.
 */
export interface BoosterOpening {
	/** The cards the pack rolled, in pull order. */
	spawns: CharacterSpawn[];
	/** The avatar the pack granted — a character on its show, in one of its colours. */
	avatar: PlayerAvatar | null;
}

/**
 * The signed-in player's daily booster allowance, as reported by the
 * `boosters_status` RPC. `remaining` is what's left to open today (the day
 * resetting at midnight Europe/Madrid); `level` is the daily cap.
 */
export interface BoostersStatus {
	/** Player level — the number of packs allowed per day (1..20). */
	level: number;
	/** Packs already opened since Catalan midnight. */
	used: number;
	/** Packs still openable today (`level - used`, never negative). */
	remaining: number;
}

/**
 * Player-facing spawn state, backed by Supabase. Talks to Postgres directly from
 * the browser with the anon key (RLS-gated), the same pure-SPA pattern as
 * {@link authService}: it reads the show → character assignments synced by the
 * admin, rolls a random character for a chosen show, and persists the claim as a
 * `character_spawns` row owned by the signed-in user.
 *
 * Rendering data (labels, sprites) never touches Supabase — a spawn stores only
 * the character id, which resolves back into the local @3xl/data registry.
 */
class SpawnService {
	private spawnsStore = writable<CharacterSpawn[]>([]);

	/** Ids of characters that exist in the local registry, so spawns can render. */
	private renderableIds = new Set(characters.map((character) => character.id));

	/** The signed-in player's spawns, newest first. */
	get spawns(): Readable<CharacterSpawn[]> {
		return this.spawnsStore;
	}

	/**
	 * Load every show that has at least one renderable character assigned, so the
	 * claim panel can offer a show to roll from. Character ids not present in the
	 * local registry are dropped (they can't be rendered), and empty shows with
	 * nothing left are omitted.
	 */
	async loadShows(): Promise<ClaimableShow[]> {
		const supabase = getSupabaseClient();
		const [showsRes, assignmentsRes] = await Promise.all([
			supabase.from('show_templates').select('id, name'),
			supabase.from('show_characters').select('show_id, character_id')
		]);
		if (showsRes.error) throw showsRes.error;
		if (assignmentsRes.error) throw assignmentsRes.error;

		const byShow = new Map<number, string[]>();
		for (const row of assignmentsRes.data ?? []) {
			if (!this.renderableIds.has(row.character_id)) continue;
			const showId = Number(row.show_id);
			const ids = byShow.get(showId) ?? [];
			ids.push(row.character_id);
			byShow.set(showId, ids);
		}

		return (showsRes.data ?? [])
			.map((show) => ({
				id: Number(show.id),
				name: show.name as string,
				characterIds: byShow.get(Number(show.id)) ?? []
			}))
			.filter((show) => show.characterIds.length > 0)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Load every character's rarity tier from `character_templates`, so the claim
	 * result and roster can label a spawn with its rarity. Characters absent from
	 * the table (or with a null tier) read as {@link DEFAULT_RARITY}. The roll
	 * itself no longer consults this — `claim_booster` weights by rarity in the DB.
	 */
	async loadRarities(): Promise<Map<string, number>> {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.from('character_templates').select('id, rarity');
		if (error) throw error;

		const byCharacter = new Map<string, number>();
		for (const row of data ?? []) {
			const rarity = Number(row.rarity);
			byCharacter.set(row.id as string, Number.isFinite(rarity) ? rarity : DEFAULT_RARITY);
		}
		return byCharacter;
	}

	/**
	 * Map each character id to the Supabase shows it belongs to (via `show_characters`
	 * → `show_templates`), so the roster can say which show(s) its character is
	 * actually related to rather than the show it happened to be rolled from. Both
	 * halves of a show come back: the name the roster's filter lists it under, and the
	 * id whose glyph a statue stands on. Character ids may map to several shows; the
	 * shows are de-duplicated and sorted by name.
	 */
	async loadCharacterShows(): Promise<Map<string, { id: number; name: string }[]>> {
		const supabase = getSupabaseClient();
		const [showsRes, assignmentsRes] = await Promise.all([
			supabase.from('show_templates').select('id, name'),
			supabase.from('show_characters').select('show_id, character_id')
		]);
		if (showsRes.error) throw showsRes.error;
		if (assignmentsRes.error) throw assignmentsRes.error;

		const showById = new Map<number, { id: number; name: string }>(
			(showsRes.data ?? []).map((show) => [
				Number(show.id),
				{ id: Number(show.id), name: show.name as string }
			])
		);

		const byCharacter = new Map<string, { id: number; name: string }[]>();
		for (const row of assignmentsRes.data ?? []) {
			const show = showById.get(Number(row.show_id));
			if (!show) continue;
			const shows = byCharacter.get(row.character_id) ?? [];
			if (!shows.some((entry) => entry.id === show.id)) shows.push(show);
			byCharacter.set(row.character_id, shows);
		}
		for (const shows of byCharacter.values()) shows.sort((a, b) => a.name.localeCompare(b.name));
		return byCharacter;
	}

	/**
	 * Map every show id to its display name (from `show_templates`), so a booster —
	 * which stores only the `showId` it was rolled from — can be labelled with the
	 * show it came from. Unlike {@link loadShows} this keeps every show, including
	 * ones with no renderable characters left.
	 */
	async loadShowNames(): Promise<Map<number, string>> {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.from('show_templates').select('id, name');
		if (error) throw error;
		return new Map((data ?? []).map((show) => [Number(show.id), show.name as string]));
	}

	/**
	 * Load the signed-in player's spawns into the store, newest first.
	 *
	 * `team_slot` comes with them: the player's team is not a list kept anywhere,
	 * it is the three of these cards that hold a slot, so loading the roster loads
	 * the team with it (see {@link setTeam} and `teamService`).
	 */
	async loadSpawns(userId: string): Promise<CharacterSpawn[]> {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('character_spawns')
			.select('id, user_id, character_id, show_id, location_id, color, box, team_slot, created_at')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });
		if (error) throw error;

		const spawns = (data as CharacterSpawnRow[]).map((row) => spawnAdapter.fromRow(row));
		this.spawnsStore.set(spawns);
		return spawns;
	}

	/**
	 * Open a booster pack for `locationId` (a geojson municipality feature id),
	 * rolling from `showId`'s roster (or every show when `null`). The roll and all
	 * limits are enforced server-side by the `claim_booster` security-definer RPC —
	 * the frontend can no longer insert spawns directly:
	 *
	 *   - the town must be celebrating a festa major *today* (Europe/Madrid);
	 *   - the player may open at most (their level, capped at 20) packs per day,
	 *     the day resetting at midnight Europe/Madrid.
	 *
	 * The RPC rolls {@link BOOSTER_SIZE} cards — each weighted by rarity (every
	 * higher tier 2× rarer), plus a colour out of the three its box holds — and one
	 * **avatar**, drawn from those same two possibilities: a character on the box's
	 * show, in one of the box's three colours. Which box that is, the server decides
	 * for itself from the town's festivity dates: white (purple/green/orange) for a
	 * festa on the day, black (red/blue/yellow) for one past or still coming, stamped
	 * on every card it inserts. On a rejected claim it throws with a message
	 * describing why (limit reached, wrong day, …).
	 *
	 * The new spawns are prepended to the store and returned in pull order; the
	 * avatar is handed back rather than stored here — {@link avatarService} owns
	 * that collection, and the caller that shows the open is the one that tells it.
	 */
	async claimBooster(showId: number | null, locationId: string): Promise<BoosterOpening> {
		if (!locationId) {
			throw new Error('Claim your location before spawning a character.');
		}
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc('claim_booster', {
			p_show_id: showId,
			p_location_id: locationId
		});
		if (error) throw error;

		// One pack is one object, not a row set: the cards and the avatar are two
		// different shapes, so the RPC answers in jsonb and this reads both halves out
		// of it. An answer missing either half is an old deployment of the RPC, which
		// reads as no cards / no avatar rather than as a crash.
		const payload = (data ?? {}) as { spawns?: CharacterSpawnRow[]; avatar?: PlayerAvatarRow };
		const spawns = (payload.spawns ?? []).map((row) => spawnAdapter.fromRow(row));
		this.spawnsStore.update((current) => [...spawns, ...current]);
		return {
			spawns,
			avatar: payload.avatar ? playerAvatarAdapter.fromRow(payload.avatar) : null
		};
	}

	/**
	 * Recycle a batch of the player's spawns: destroy them from Supabase and earn
	 * one extra daily claim per full group of {@link RECYCLE_GROUP_SIZE}. The
	 * destroy + grant is applied atomically by the `recycle_spawns` security-definer
	 * RPC (the only path that can write `booster_grants` from the browser); it
	 * ignores any ids the caller doesn't own and rejects a batch too small to earn a
	 * single claim. The destroyed spawns are removed from the store and the recycled
	 * / granted tally is returned.
	 */
	async recycleSpawns(spawnIds: string[]): Promise<RecycleResult> {
		if (spawnIds.length < RECYCLE_GROUP_SIZE) {
			throw new Error(`Select at least ${RECYCLE_GROUP_SIZE} cards to recycle.`);
		}
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc('recycle_spawns', { p_spawn_ids: spawnIds });
		if (error) throw error;

		const row = Array.isArray(data) ? data[0] : data;
		const recycled = Number(row?.recycled ?? 0);
		const granted = Number(row?.granted ?? 0);
		const removed = new Set(spawnIds);
		this.spawnsStore.update((current) => current.filter((spawn) => !removed.has(spawn.id)));
		return { recycled, granted };
	}

	/**
	 * Field a team: `slots` is the line-up in fielded order (the lead first), as
	 * spawn ids with `null` for an empty slot, and it replaces whatever the player
	 * had — one team per player is the shape of the table, so saving a line-up is
	 * saving THE line-up.
	 *
	 * The `set_team` security-definer RPC is the only path to the `team_slot`
	 * column (the table takes no client update at all) and it is what decides
	 * whether the line-up is legal: the caller's own cards, each named once, every
	 * one of them sharing a colour with the lead. The store is moved first so the
	 * roster answers the tap immediately, and put back exactly as it was if the
	 * server refuses — a refused team never sits on screen as though it took.
	 */
	async setTeam(slots: (string | null)[]): Promise<void> {
		const supabase = getSupabaseClient();
		const previous = this.snapshot();
		this.applyTeamSlots(slots);
		const { error } = await supabase.rpc('set_team', { p_team: slots });
		if (error) {
			this.spawnsStore.set(previous);
			throw error;
		}
	}

	/** The spawn list as it stands, for restoring it after a refused write. */
	private snapshot(): CharacterSpawn[] {
		let current: CharacterSpawn[] = [];
		this.spawnsStore.subscribe((spawns) => (current = spawns))();
		return current;
	}

	/** Re-slot every spawn in the store to match `slots` (everything else clears). */
	private applyTeamSlots(slots: (string | null)[]): void {
		const slotById = new Map<string, number>();
		slots.forEach((id, index) => {
			if (id) slotById.set(id, index);
		});
		this.spawnsStore.update((current) =>
			current.map((spawn) => {
				const slot = slotById.get(spawn.id) ?? null;
				return spawn.teamSlot === slot ? spawn : { ...spawn, teamSlot: slot };
			})
		);
	}

	/**
	 * The signed-in player's daily booster allowance from the `boosters_status`
	 * RPC: their level (the daily cap), packs opened since Catalan midnight, and
	 * how many remain. Returns `null` when signed out (the RPC yields no row).
	 */
	async boostersStatus(): Promise<BoostersStatus | null> {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.rpc('boosters_status');
		if (error) throw error;
		const row = Array.isArray(data) ? data[0] : data;
		if (!row) return null;
		return {
			level: Number(row.level),
			used: Number(row.used),
			remaining: Number(row.remaining)
		};
	}
}

export const spawnService = new SpawnService();
