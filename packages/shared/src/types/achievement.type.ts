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

/** A variable name, as it is written between braces in the name/description. */
export const ACHIEVEMENT_VARIABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** A formula is one expression, not a program. */
export const ACHIEVEMENT_FORMULA_MAX_LENGTH = 200;

/** A requirement is one condition; the same bound as a formula, doubled for its two sides. */
export const ACHIEVEMENT_REQUIREMENT_MAX_LENGTH = 400;

/** How many variables one badge may declare — enough for a line, not a spreadsheet. */
export const ACHIEVEMENT_VARIABLES_MAX = 8;

/**
 * Icon folders that are NOT part of the game-icons.net set and so are not
 * offerable as an achievement's glyph. `shows` holds the Noun Project show
 * glyphs, which stand for a show and would read as one here.
 */
export const NON_GAME_ICON_FOLDERS: readonly string[] = ['shows'];

/**
 * One number a badge's wording can quote, computed for whoever is reading it.
 *
 * The formula is an arithmetic expression over what the game knows about that
 * player — their level and the cards they own, the latter countable through
 * compound filters (`cards(box = white and not color = orange)`). The language,
 * and the whole of what a formula can reach, is
 * `@3xl/shared/utils/achievement/formula`.
 *
 * A variable belongs to the achievement that declares it and is reachable from
 * nowhere else, so two badges may both call a number `target` and mean different
 * things by it. It is quoted by writing its name between braces in the badge's
 * name or description.
 */
export interface AchievementVariable {
	/** How the badge's text refers to it, written `{name}` there. */
	name: string;
	/** The expression that produces it, e.g. `level * 3`. */
	formula: string;
}

/** One authored achievement, as stored in `public/achievements.json`. */
export interface Achievement {
	/** Stable slug. Primary key of `achievement_templates`. */
	id: string;
	/** Display name, e.g. `First blood`. May template its own {@link variables}. */
	name: string;
	/** One line saying what earns it. May template its own {@link variables}. */
	description: string;
	/** Glyph, as `<artist>/<slug>` under /assets/icons — e.g. `lorc/broadsword`. */
	icon: string;
	/**
	 * The badge's own computed numbers, or absent when its wording is fixed text —
	 * which most badges' is, so the field is optional and is left out of the JSON
	 * entirely rather than written as an empty array.
	 */
	variables?: AchievementVariable[];
	/**
	 * What earns the badge, as a condition in the formula language — two amounts
	 * compared, optionally combined with `and`/`or`/`not`, and free to quote this
	 * badge's own {@link variables} by name:
	 *
	 * ```
	 * cards(color = red) >= 3
	 * cards >= target and level >= 5
	 * ```
	 *
	 * Absent means the badge says nothing a machine can check, and it is then not a
	 * badge the game can set or award: only templates whose requirement reached
	 * Supabase are drawn as one of a player's three for the day, and
	 * `claim_achievements` has nothing to hold a claim against without one. So this
	 * is the one field of an achievement that is compiled and pushed to the
	 * database — the wording stays in the git tree, but the *rule* has to live where
	 * the rule is enforced.
	 */
	requirement?: string;
}

/** The whole authored collection — the file's top-level shape. */
export interface AchievementsCollection {
	achievements: Achievement[];
}

/**
 * Where one achievement id stands between the two sides. `missing` is authored
 * locally but not yet synced, `orphan` is still in Supabase (possibly still worn by
 * players) after being retired locally, and `mismatch` is on both sides with a
 * compiled requirement up there that no longer matches the one on disk — the one
 * thing about a badge that *can* go stale in Supabase, since the rule is the one
 * part of it the database has to hold.
 */
export type AchievementStatus = 'synced' | 'missing' | 'orphan' | 'mismatch';

/** Outcome of a manual local→remote sync. */
export interface AchievementSyncResult {
	/** Every remote id after the sync completes. */
	ids: string[];
	/** Ids inserted into Supabase (present locally, absent remotely). */
	added: string[];
	/** Ids whose compiled requirement was rewritten to match the local one. */
	updated: string[];
	/** Ids deleted from Supabase, taking their awards with them (see the route). */
	removed: string[];
}

/**
 * What `claim_achievements` says about one of the badges it was asked about — one
 * of the three set for the player today. The RPC decides every field: which badges
 * were claimable, whether each was earned, and what it paid.
 */
export interface AchievementClaim {
	/** The badge in question. */
	achievementId: string;
	/** Awarded by this call: earned, and not already held. */
	granted: boolean;
	/** Already held before the call — there is nothing to pay twice. */
	held: boolean;
	/** Whether its requirement holds right now, granted or not. */
	met: boolean;
	/** Experience this badge paid: a third of the level's span, or 0. */
	expAwarded: number;
	/** The level the player was on when this badge was settled. */
	atLevel: number;
	/** Their experience total after it. */
	totalExp: number;
	/**
	 * Extra booster packs the call added to today's allowance: one per badge it
	 * granted, plus two for finishing the day's set. A fact about the call rather than
	 * about this badge, so it is the same on every row — as `totalExp` is. The server
	 * decides it; nothing here may name an amount.
	 */
	boostersGranted: number;
	/**
	 * Whether this call completed the whole of the day's set, every one of them earned
	 * today — which is what the two extra packs are paid for.
	 */
	setCompleted: boolean;
}

/**
 * One badge a player has completed, as `player_achievements` records it. The table
 * is the whole of what the game knows about a completion: which badge, when it
 * landed, and what it paid — the wording is still the file's, and the amount is kept
 * here because it was a third of the level the player was on at that moment and that
 * level is gone the instant the award lands.
 */
export interface AchievementAward {
	/** The badge completed. */
	achievementId: string;
	/** ISO timestamp the award landed. */
	awardedAt: string;
	/** Experience it paid. Zero for a badge earned at the level cap. */
	expAwarded: number;
}

/** The raw `player_achievements` row (snake_case, bigint as a string). */
export interface AchievementAwardRow {
	achievement_id: string;
	awarded_at: string;
	exp_awarded: string | number | null;
}

/** The raw `claim_achievements()` row (snake_case, bigints as strings). */
export interface AchievementClaimRow {
	achievement_id: string;
	granted: boolean | null;
	held: boolean | null;
	met: boolean | null;
	exp_awarded: string | number | null;
	at_level: string | number | null;
	total_exp: string | number | null;
	boosters_granted: string | number | null;
	set_completed: boolean | null;
}

/**
 * The achievement system's settings, as Supabase holds them — one row, one number.
 * A setting rather than a rule: it decides how much is *offered*, never whether
 * anything is earned.
 */
export interface AchievementSettings {
	/** How many badges a player is set each day. */
	dailyCount: number;
}

/**
 * One remote `achievement_templates` row as the admin reads it back: the id, and
 * whether the database is holding a rule for it. The compiled tree itself is not
 * something the screen shows — what matters is that there is one and that it says
 * the same as the local file, which is what {@link AchievementStatus} reports.
 */
export interface AchievementTemplateRow {
	id: string;
	/** The requirement source the compiled tree was made from, or null for none. */
	requirement: string | null;
}
