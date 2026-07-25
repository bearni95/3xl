/**
 * A show "template": the minimal, frontend-facing identity of a saved TV show,
 * mirrored into Supabase so it can be referenced from the remote DB (and joined
 * to characters) without duplicating the heavy TMDB record + image set.
 *
 * It keeps only what identifies a show: the stable TMDB `id` and its display
 * `name`. Everything else — overview, images, ratings — stays in the local
 * `@3xl/data` `public/shows.json` collection and is never pushed to Supabase.
 *
 * The local `shows.json` is the source of truth; the admin `/shows` screen syncs
 * it into the `show_templates` table via @3xl/backend, mirroring how characters
 * sync into `character_templates`.
 */
export interface ShowTemplate {
	/** Stable TMDB show id. Primary key of `show_templates`. */
	id: number;
	/** Display name shown on the frontend, e.g. `Dragon Ball GT`. */
	name: string;
}

/** Outcome of a manual local→remote show-template sync, from the sync endpoint. */
export interface ShowTemplateSyncResult {
	/** The full remote template list after the sync completes. */
	templates: ShowTemplate[];
	/** Ids inserted into Supabase (present locally, absent remotely). */
	added: number[];
	/** Ids whose name was updated to match the local collection. */
	updated: number[];
	/** Ids deleted from Supabase (present remotely, absent locally). */
	removed: number[];
}

/**
 * Which characters are assigned to which shows: a map from show id to the list
 * of assigned character ids. Backs the many-to-many `show_characters` join
 * table (a show has many characters; a character can appear in many shows).
 */
export type ShowCharacterAssignments = Record<number, string[]>;
