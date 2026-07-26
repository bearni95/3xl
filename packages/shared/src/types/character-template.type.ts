/**
 * A character "template": the minimal, frontend-facing identity of a playable
 * character, mirrored into Supabase so it can be referenced from the remote DB
 * (players, matches, …) without duplicating the heavy MUGEN definition.
 *
 * It keeps only what the frontend shows: the stable `id` (matches the
 * @3xl/data registry and the /assets/<id>/ folder), the human-readable `name`
 * (the registry `label`), and a Supabase-only `rarity` tier authored from the
 * admin. Everything else — animations, moves, stats — stays in the local JSON
 * definitions and is never pushed to Supabase.
 *
 * The local @3xl/data registry is the source of truth for `id`/`name`; `rarity`
 * is owned by Supabase (set manually from the admin `/characters` screen and
 * left untouched by the local→remote sync). The admin syncs the registry into
 * the `character_templates` table via @3xl/backend.
 */
export interface CharacterTemplate {
	/** Stable character id, e.g. `luffy`. Primary key of `character_templates`. */
	id: string;
	/** Display name shown on the frontend (the registry `label`), e.g. `Monkey D. Luffy`. */
	name: string;
	/**
	 * Rarity tier, a non-negative integer authored in the admin and stored only
	 * in Supabase. Defaults to {@link DEFAULT_RARITY} (0) for every character.
	 * Optional here because the local-registry projection of a template carries
	 * no rarity — only remote rows do.
	 */
	rarity?: number;
}

/** Rarity value used when a character has never had one set. */
export const DEFAULT_RARITY = 0;

/** Lowest rarity tier; also the default every character starts at. */
export const RARITY_MIN = 0;

/**
 * Sync state of a single character id across the local registry and the remote
 * `character_templates` table:
 * - `synced`   — present on both sides with matching names.
 * - `missing`  — present locally, absent remotely (needs a sync to push it up).
 * - `mismatch` — present on both sides but the names differ.
 * - `orphan`   — present remotely only (no local character; removed on next sync).
 */
export type CharacterTemplateStatus = 'synced' | 'missing' | 'mismatch' | 'orphan';

/** Outcome of a manual local→remote sync, returned by the backend sync endpoint. */
export interface CharacterTemplateSyncResult {
	/** The full remote template list after the sync completes. */
	templates: CharacterTemplate[];
	/** Ids inserted into Supabase (present locally, absent remotely). */
	added: string[];
	/** Ids whose name was updated to match the local registry. */
	updated: string[];
	/** Ids deleted from Supabase (present remotely, absent locally). */
	removed: string[];
}
