/**
 * A character "spawn": a concrete instance of a playable character claimed by a
 * signed-in player, stored in Supabase's `character_spawns` table.
 *
 * A spawn links a user to a character *template* (never the heavy MUGEN
 * definition) and records which show it was rolled from. It's the persistent
 * record behind the frontend `/claim` panel, where a player spawns a random
 * character drawn from a show's assigned roster (`show_characters`).
 */
export interface CharacterSpawn {
	/** Stable spawn id (uuid). Primary key of `character_spawns`. */
	id: string;
	/** The owning player — matches the Supabase auth user id. */
	userId: string;
	/** Claimed character id — matches the @3xl/data registry and `character_templates`. */
	characterId: string;
	/** The show the character was rolled from, or `null` if rolled across all shows. */
	showId: number | null;
	/**
	 * The municipality the spawn was claimed in, as the geojson feature id
	 * (e.g. `ES_08028`) resolved from the player's browser location. Always set —
	 * a spawn cannot be claimed without a location.
	 */
	locationId: string;
	/** ISO timestamp the spawn was created. */
	createdAt: string;
}

/**
 * Raw `character_spawns` row as returned by the Supabase client (snake_case,
 * bigint show id serialised as string). Transformed into {@link CharacterSpawn}
 * by the spawn adapter.
 */
export interface CharacterSpawnRow {
	id: string;
	user_id: string;
	character_id: string;
	show_id: string | number | null;
	location_id: string | null;
	created_at: string;
}

/**
 * A show a player can roll a character from: the show identity plus the list of
 * character ids assigned to it (via `show_characters`), filtered to characters
 * that exist in the local @3xl/data registry so they can actually be rendered.
 */
export interface ClaimableShow {
	/** TMDB show id — matches `show_templates`. */
	id: number;
	/** Display name shown in the show picker. */
	name: string;
	/** Assigned, renderable character ids. Never empty (empty shows are dropped). */
	characterIds: string[];
}
