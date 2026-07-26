import { writable, type Readable } from 'svelte/store';
import { characters } from '@3xl/data';
import { getSupabaseClient } from '$services/supabase.client';
import { spawnAdapter } from '$adapters/classes/spawn.adapter';
import { randomSpawnColor } from '$utils/spawn/color';
import { randomSpawnStat } from '$utils/spawn/stat';
import { weightedRarityIndex } from '$utils/spawn/rarity';
import { DEFAULT_RARITY } from '$types/character-template.type';
import type {
	CharacterSpawn,
	CharacterSpawnRow,
	ClaimableShow
} from '$types/character-spawn.type';

/** How many cards a single booster pack contains. */
export const BOOSTER_SIZE = 5;

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

	/**
	 * Per-character rarity tier, loaded from Supabase `character_templates` and
	 * cached so {@link claimBooster} can weight its roll (higher tiers are rarer).
	 * Empty until {@link loadRarities} runs; a missing id reads as
	 * {@link DEFAULT_RARITY}, which makes the roll fall back to uniform.
	 */
	private rarityByCharacter = new Map<string, number>();

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
	 * Load every character's rarity tier from `character_templates` and cache it,
	 * so {@link claimBooster} can weight its roll by rarity. Characters absent from
	 * the table (or with a null tier) read as {@link DEFAULT_RARITY}. Returns the
	 * cache. Safe to call repeatedly — it just refreshes the map.
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
		this.rarityByCharacter = byCharacter;
		return byCharacter;
	}

	/**
	 * Map each character id to the display names of the Supabase shows it belongs
	 * to (via `show_characters` → `show_templates`), so the roster can label a
	 * spawn with the show(s) its character is actually related to rather than the
	 * show it happened to be rolled from. Character ids may map to several shows;
	 * names are de-duplicated and sorted.
	 */
	async loadCharacterShowNames(): Promise<Map<string, string[]>> {
		const supabase = getSupabaseClient();
		const [showsRes, assignmentsRes] = await Promise.all([
			supabase.from('show_templates').select('id, name'),
			supabase.from('show_characters').select('show_id, character_id')
		]);
		if (showsRes.error) throw showsRes.error;
		if (assignmentsRes.error) throw assignmentsRes.error;

		const nameById = new Map<number, string>(
			(showsRes.data ?? []).map((show) => [Number(show.id), show.name as string])
		);

		const byCharacter = new Map<string, string[]>();
		for (const row of assignmentsRes.data ?? []) {
			const name = nameById.get(Number(row.show_id));
			if (!name) continue;
			const names = byCharacter.get(row.character_id) ?? [];
			if (!names.includes(name)) names.push(name);
			byCharacter.set(row.character_id, names);
		}
		for (const names of byCharacter.values()) names.sort((a, b) => a.localeCompare(b));
		return byCharacter;
	}

	/** Load the signed-in player's spawns into the store, newest first. */
	async loadSpawns(userId: string): Promise<CharacterSpawn[]> {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('character_spawns')
			.select('id, user_id, character_id, show_id, location_id, color, stat, created_at')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });
		if (error) throw error;

		const spawns = (data as CharacterSpawnRow[]).map((row) => spawnAdapter.fromRow(row));
		this.spawnsStore.set(spawns);
		return spawns;
	}

	/**
	 * Open a booster pack: roll {@link BOOSTER_SIZE} characters from `characterIds`
	 * and persist each as a spawn owned by `userId`, tagged with the show it came
	 * from (`showId`, or `null` when rolled across all shows) and the municipality
	 * it was claimed in (`locationId`, a geojson feature id). A location is required
	 * — a booster cannot be claimed without one. Every card is drawn independently
	 * with the same criteria: weighted by rarity (each higher tier is 2× rarer than
	 * the one below — see {@link loadRarities} and `weightedRarityIndex`; a uniform
	 * roll if rarities haven't been loaded), plus its own weighted colour and
	 * gameplay stat (1..9). Duplicates are possible, exactly like a real booster.
	 * All new spawns are prepended to the store and returned in pull order.
	 */
	async claimBooster(
		userId: string,
		characterIds: string[],
		showId: number | null,
		locationId: string,
		size: number = BOOSTER_SIZE
	): Promise<CharacterSpawn[]> {
		if (characterIds.length === 0) {
			throw new Error('There are no claimable characters to roll from.');
		}
		if (!locationId) {
			throw new Error('Claim your location before spawning a character.');
		}
		const rarities = characterIds.map((id) => this.rarityByCharacter.get(id) ?? DEFAULT_RARITY);
		const rows = Array.from({ length: size }, () => ({
			user_id: userId,
			character_id: characterIds[weightedRarityIndex(rarities)],
			show_id: showId,
			location_id: locationId,
			color: randomSpawnColor(),
			stat: randomSpawnStat()
		}));

		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('character_spawns')
			.insert(rows)
			.select('id, user_id, character_id, show_id, location_id, color, stat, created_at');
		if (error) throw error;

		const spawns = (data as CharacterSpawnRow[]).map((row) => spawnAdapter.fromRow(row));
		this.spawnsStore.update((current) => [...spawns, ...current]);
		return spawns;
	}
}

export const spawnService = new SpawnService();
