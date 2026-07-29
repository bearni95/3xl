import { AdapterClass } from './adapter.class';
import {
	SpawnBox,
	SpawnColor,
	type CharacterSpawn,
	type CharacterSpawnRow
} from '../../types/character-spawn.type';
import { isSpawnBox, isSpawnColor } from '../../utils/spawn/color';

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
		// Legacy rows predate colours; fall back to a stable primary.
		const color = isSpawnColor(row.color) ? row.color : SpawnColor.Red;
		return {
			id: row.id,
			userId: row.user_id,
			characterId: row.character_id,
			showId: row.show_id === null ? null : Number(row.show_id),
			locationId: row.location_id ?? '',
			color,
			// A row that carries no box is black, full stop. The colour is NOT consulted:
			// which box a card came out of is a fact about where it was claimed, and the
			// colours a box deals are free to change — a black box dealing a purple is a
			// thing this game means to allow — so guessing the stock from `purple` would
			// print a black card in white ink the day that happens.
			box: isSpawnBox(row.box) ? row.box : SpawnBox.Black,
			teamSlot: this.teamSlot(row.team_slot),
			createdAt: row.created_at
		};
	}

	/**
	 * A row's team lane as a number, or null when the card holds no slot. Absent
	 * (a row read before the column existed) and unparseable both read as "not on
	 * the team", so a card is only ever fielded because Postgres says it is.
	 */
	private teamSlot(value: CharacterSpawnRow['team_slot']): number | null {
		if (value === null || value === undefined) return null;
		const slot = Number(value);
		return Number.isInteger(slot) ? slot : null;
	}
}

export const spawnAdapter = new SpawnAdapter();
