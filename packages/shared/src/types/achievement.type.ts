// An achievement: one badge a player can be awarded, authored in the admin.
//
// The definition — its glyph, its name, the line that says what it is for —
// lives in the git tree, in @3xl/data's `public/achievements.json` (served to the
// apps at `/data/achievements.json`), exactly as show entries and character
// definitions do. Supabase keeps **only the id**: an `achievement_templates` row
// is a foreign key target and nothing else, so the wording of a badge is edited
// in one place and is never stale anywhere, and `player_achievements` — who holds
// what — is the only thing the database actually knows.
//
// The glyph is one of the game-icons.net SVGs already in @3xl/assets under
// `public/icons/<artist>/`, named `<artist>/<slug>` — the same `<folder>/<slug>`
// form show icons use. Those files carry a baked white fill (they exist to be
// tinted into a Pixi texture, see CLAUDE.md), so wherever one is drawn in the
// document it needs a dark tile under it to be visible at all.

/** Ids map to nothing on disk but are the Supabase primary key: keep them slugs. */
export const ACHIEVEMENT_ID_PATTERN = /^[a-z0-9-]+$/;

/** `<artist>/<slug>`, the path under /assets/icons without the `.svg`. */
export const ACHIEVEMENT_ICON_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+$/;

export const ACHIEVEMENT_NAME_MAX_LENGTH = 60;
export const ACHIEVEMENT_DESCRIPTION_MAX_LENGTH = 240;

/**
 * Icon folders that are NOT part of the game-icons.net set and so are not
 * offerable as an achievement's glyph. `shows` holds the Noun Project show
 * glyphs, which stand for a show and would read as one here.
 */
export const NON_GAME_ICON_FOLDERS: readonly string[] = ['shows'];

/** One authored achievement, as stored in `public/achievements.json`. */
export interface Achievement {
	/** Stable slug. Primary key of `achievement_templates`. */
	id: string;
	/** Display name, e.g. `First blood`. */
	name: string;
	/** One line saying what earns it. */
	description: string;
	/** Glyph, as `<artist>/<slug>` under /assets/icons — e.g. `lorc/broadsword`. */
	icon: string;
}

/** The whole authored collection — the file's top-level shape. */
export interface AchievementsCollection {
	achievements: Achievement[];
}

/**
 * Where one achievement id stands between the two sides. There is no `mismatch`
 * counterpart to the character/show templates': the remote row is the id alone,
 * so it either exists or it doesn't — `missing` is authored locally but not yet
 * synced, `orphan` is still in Supabase (possibly still worn by players) after
 * being retired locally.
 */
export type AchievementStatus = 'synced' | 'missing' | 'orphan';

/**
 * Outcome of a manual local→remote sync. There is no `updated` list: the remote
 * row is the id alone, so an id either exists on both sides or on one of them —
 * renaming a badge or redrawing its glyph changes nothing Supabase holds.
 */
export interface AchievementSyncResult {
	/** Every remote id after the sync completes. */
	ids: string[];
	/** Ids inserted into Supabase (present locally, absent remotely). */
	added: string[];
	/** Ids deleted from Supabase, taking their awards with them (see the route). */
	removed: string[];
}
