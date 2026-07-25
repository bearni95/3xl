import { writable, type Readable } from 'svelte/store';
import { characters } from '@3xl/data';
import { getSupabaseClient } from '$services/supabase.client';
import { spawnAdapter } from '$adapters/classes/spawn.adapter';
import { randomSpawnColor } from '$utils/spawn/color';
import { randomSpawnStat } from '$utils/spawn/stat';
import type {
	CharacterSpawn,
	CharacterSpawnRow,
	ClaimableShow
} from '$types/character-spawn.type';

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
	 * Roll a random character from `characterIds` and persist it as a spawn owned
	 * by `userId`, tagged with the show it came from (`showId`, or `null` when
	 * rolled across all shows) and the municipality it was claimed in
	 * (`locationId`, a geojson feature id). A location is required — a spawn
	 * cannot be claimed without one. Each spawn also rolls a weighted colour and a
	 * gameplay stat (1..10). The new spawn is prepended to the store and returned.
	 */
	async claimRandom(
		userId: string,
		characterIds: string[],
		showId: number | null,
		locationId: string
	): Promise<CharacterSpawn> {
		if (characterIds.length === 0) {
			throw new Error('There are no claimable characters to roll from.');
		}
		if (!locationId) {
			throw new Error('Claim your location before spawning a character.');
		}
		const characterId = characterIds[Math.floor(Math.random() * characterIds.length)];
		const color = randomSpawnColor();
		const stat = randomSpawnStat();

		const supabase = getSupabaseClient();
		const { data, error } = await supabase
			.from('character_spawns')
			.insert({
				user_id: userId,
				character_id: characterId,
				show_id: showId,
				location_id: locationId,
				color,
				stat
			})
			.select('id, user_id, character_id, show_id, location_id, color, stat, created_at')
			.single();
		if (error) throw error;

		const spawn = spawnAdapter.fromRow(data as CharacterSpawnRow);
		this.spawnsStore.update((current) => [spawn, ...current]);
		return spawn;
	}
}

export const spawnService = new SpawnService();
