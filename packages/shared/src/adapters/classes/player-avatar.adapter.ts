import { AdapterClass } from './adapter.class';
import { SpawnColor } from '../../types/character-spawn.type';
import type { PlayerAvatar, PlayerAvatarRow } from '../../types/player-avatar.type';
import { isSpawnColor } from '../../utils/spawn/color';

/**
 * Transforms `player_avatars` rows between Supabase's snake_case shape and the
 * internal {@link PlayerAvatar} model. Postgres serialises `bigint` (the show id)
 * as a string over the wire, so it is normalised back to a number here.
 */
export class PlayerAvatarAdapter extends AdapterClass {
	constructor() {
		super('player-avatar');
	}

	/** Transform a raw `player_avatars` row into the internal model. */
	fromRow(row: PlayerAvatarRow): PlayerAvatar {
		return {
			id: row.id,
			userId: row.user_id,
			characterId: row.character_id,
			// The column is `not null` and only ever written by claim_booster out of a
			// box's own three, so this fallback is a type guard rather than a case that
			// happens — an avatar without a colour is not an avatar.
			color: isSpawnColor(row.color) ? row.color : SpawnColor.Red,
			showId: row.show_id === null || row.show_id === undefined ? null : Number(row.show_id),
			locationId: row.location_id ?? null,
			grantedAt: row.granted_at
		};
	}
}

export const playerAvatarAdapter = new PlayerAvatarAdapter();
