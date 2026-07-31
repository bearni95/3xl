import type { SpawnColor } from './character-spawn.type';

/**
 * One avatar a player owns: a portrait item, stored in Supabase's `player_avatars`
 * table, that names the character it shows **and the colour it is printed in**.
 *
 * An avatar is not a permission any more — it is a thing you hold. The pair
 * (character, colour) is what an avatar *is*, and a player may hold the same
 * character in several colours, each its own item; the table is unique on
 * (player, character, colour), so holding one twice is not a state that exists.
 *
 * They are dealt by the booster boxes: opening a pack grants exactly one, drawn
 * from the same two possibilities its cards are — a character on that box's show,
 * in one of the three colours the box deals (see `claim_booster`). There is no
 * other way to get one, which is why the table takes no client writes at all.
 *
 * Nothing about how the portrait *looks* is stored here: the artwork is the
 * character definition's own face, authored in the admin, so re-cropping it there
 * moves every held avatar of that character with it.
 */
export interface PlayerAvatar {
	/** Stable avatar id (uuid). Primary key of `player_avatars`. */
	id: string;
	/** The owning player — matches the Supabase auth user id. */
	userId: string;
	/** The character it shows — matches the @3xl/data registry and `character_templates`. */
	characterId: string;
	/** The colour it is printed in, one of the three the box that dealt it holds. */
	color: SpawnColor;
	/** The show whose box dealt it, or `null` when that show has since been retired. */
	showId: number | null;
	/** The municipality the box was opened in (geojson feature id), when known. */
	locationId: string | null;
	/** ISO timestamp the avatar was granted. */
	grantedAt: string;
}

/**
 * Raw `player_avatars` row as returned by the Supabase client (snake_case, bigint
 * show id serialised as a string). Transformed into {@link PlayerAvatar} by the
 * player-avatar adapter.
 */
export interface PlayerAvatarRow {
	id: string;
	user_id: string;
	character_id: string;
	color: string | null;
	show_id?: string | number | null;
	location_id?: string | null;
	granted_at: string;
}
