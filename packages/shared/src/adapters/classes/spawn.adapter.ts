import { AdapterClass } from './adapter.class';
import { SpawnColor, type CharacterSpawn, type CharacterSpawnRow } from '../../types/character-spawn.type';
import { isSpawnColor } from '../../utils/spawn/color';

/**
 * Transforms `character_spawns` rows between Supabase's snake_case shape and the
 * internal {@link CharacterSpawn} model. Postgres serialises `bigint` (the show
 * id) as a string over the wire, so it's normalised back to a number here.
 */
export class SpawnAdapter extends AdapterClass {
	constructor() {
		super('spawn');
	}

	/** Transform a raw `character_spawns` row into the internal model. */
	fromRow(row: CharacterSpawnRow): CharacterSpawn {
		return {
			id: row.id,
			userId: row.user_id,
			characterId: row.character_id,
			showId: row.show_id === null ? null : Number(row.show_id),
			locationId: row.location_id ?? '',
			// Legacy rows predate colours; fall back to a stable primary.
			color: isSpawnColor(row.color) ? row.color : SpawnColor.Red,
			createdAt: row.created_at
		};
	}
}

export const spawnAdapter = new SpawnAdapter();
