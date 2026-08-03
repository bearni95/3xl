/**
 * Admin-facing view of a signed-up player, assembled by @3xl/backend's
 * `/api/users` route from Supabase's `auth.users` joined with the game's
 * per-player state (`player_profiles`, `booster_claims`).
 *
 * This is authoring/admin data only — it is never sent to the player app, and it
 * exposes fields (email, raw exp) that the player-facing RLS policies would not.
 */
export interface AdminUser {
	/** Supabase auth user id (uuid). */
	id: string;
	/** The user's email, or null for accounts without one (e.g. phone sign-ups). */
	email: string | null;
	/** When the account was created (ISO timestamp). */
	createdAt: string;
	/** Accumulated experience total from `player_profiles` (0 when no row yet). */
	exp: number;
	/** Level derived from {@link exp} via the D&D 5e table. */
	level: number;
	/** Booster boxes the player has ever opened — one row per town, year and stock. */
	boxesOpened: number;
	/** Of those, the ones printed for the current year. */
	boxesThisYear: number;
}
