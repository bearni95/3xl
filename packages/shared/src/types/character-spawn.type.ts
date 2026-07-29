/**
 * The colour rolled for a spawn. Which three a card can be is decided by the box
 * it came out of, not by the roll: a white box holds the secondaries
 * (purple/green/orange) and a black one the primaries (red/blue/yellow) — see
 * {@link SpawnBox} and `BOX_SPAWN_COLORS` in `@3xl/shared/utils/spawn/color`.
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
 * The stock a booster box was printed on, which is the whole of what decides the
 * colours inside it. A town celebrating its festa major *today* hands out white
 * boxes; a town whose day is past or still to come within the booster window hands
 * out black ones — the same two colours the map's circles and the Booster tab's
 * tiles are drawn in, so a white tile is a white box.
 *
 * The server decides it, not the browser: `claim_booster` reads the town's
 * festivity dates itself and stamps the box on every card it rolls.
 */
export enum SpawnBox {
	/** Printed on white card — a town de festa today. Gives purple/green/orange. */
	White = 'white',
	/** Printed on black card — a festa past or still coming. Gives red/blue/yellow. */
	Black = 'black'
}

/**
 * A character "spawn": a concrete instance of a playable character claimed by a
 * signed-in player, stored in Supabase's `character_spawns` table.
 *
 * A spawn links a user to a character *template* (never the heavy MUGEN
 * definition) and records which show it was rolled from. It's the persistent
 * record behind the frontend's claim panel, where a player spawns a random
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
	/** The colour rolled for this spawn, out of the three its box holds (see
	 * {@link SpawnColor}). It is the whole of what one claimed card brings to a
	 * fight that another doesn't. */
	color: SpawnColor;
	/**
	 * The booster box this card came out of — white for a town de festa on the day,
	 * black for one whose festa is past or still coming. Stamped by the server at
	 * roll time, and the reason the card is one of the three colours it is.
	 */
	box: SpawnBox;
	/**
	 * The lane this card fields in on the player's team, or `null` when it is not
	 * on it. Slot 0 is the lead — the card whose colour every other slot has to
	 * share. A player holds each slot with at most one card, which is the whole of
	 * the one-team-per-player rule: the team is not a list kept anywhere, it is
	 * simply the cards that hold a slot.
	 */
	teamSlot: number | null;
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
	/** Box stock ('white' | 'black'), or null/absent on rows that predate it. */
	box?: string | null;
	/** Team lane (0..2), or null/absent when the card is not on the team. */
	team_slot?: number | string | null;
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
