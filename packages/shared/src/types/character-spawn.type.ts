/**
 * The colour rolled for a spawn. The three primaries (red/yellow/blue) are common;
 * the three secondaries (orange/green/purple) are each three times as rare — see
 * `randomSpawnColor` in `@3xl/shared/utils/spawn/color`.
 */
export enum SpawnColor {
	Red = 'red',
	Yellow = 'yellow',
	Blue = 'blue',
	Orange = 'orange',
	Green = 'green',
	Purple = 'purple'
}

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
	/** The colour rolled for this spawn (weighted — see {@link SpawnColor}). */
	color: SpawnColor;
	/**
	 * The gameplay stat rolled for this spawn, an integer in
	 * [{@link SPAWN_STAT_MIN}, {@link SPAWN_STAT_MAX}]. Rolled once at claim time
	 * (like {@link color}); legacy spawns that predate the stat read as
	 * {@link DEFAULT_SPAWN_STAT}.
	 */
	stat: number;
	/** ISO timestamp the spawn was created. */
	createdAt: string;
}

/**
 * One booster pack a player has opened: the group of {@link CharacterSpawn}s that
 * were rolled together in a single {@link claimBooster} insert. A pack isn't a row
 * of its own — it's reconstructed from its cards, which all share one `createdAt`
 * (Postgres `now()` is constant within a statement) plus the same show and place.
 */
export interface Booster {
	/** Stable id for the pack — its cards' shared `createdAt`, show and location. */
	id: string;
	/** ISO timestamp the pack was opened (its cards' shared `createdAt`). */
	openedAt: string;
	/** The show the pack was opened from, or `null` if rolled across all shows. */
	showId: number | null;
	/** The municipality the pack was opened in (geojson feature id). */
	locationId: string;
	/** The cards the pack contained, in the order they were pulled. */
	spawns: CharacterSpawn[];
}

/** Inclusive bounds a rolled spawn stat is constrained to. */
export const SPAWN_STAT_MIN = 1;
export const SPAWN_STAT_MAX = 9;

/** Value legacy spawns (or invalid/out-of-range ones) read as. */
export const DEFAULT_SPAWN_STAT = 1;

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
	color: string | null;
	stat: number | string | null;
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
