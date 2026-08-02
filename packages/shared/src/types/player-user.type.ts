/**
 * Admin-facing view of a signed-up player, assembled by @3xl/backend's
 * `/api/users` route from Supabase's `auth.users` joined with the game's
 * per-player state (`player_profiles`, `booster_claims`, `booster_grants`).
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
	/** What the level alone is worth today: `floor(level / 4) + 1` boxes. */
	baseToday: number;
	/** Two boxes on the day the account was created, 0 on every other day. */
	signupToday: number;
	/**
	 * Everything today's `booster_grants` have added (Europe/Madrid): levels
	 * reached, towns taken, towns held against a challenger, cards recycled, and
	 * an admin's own grants. Only the last of those is written from here.
	 */
	grantedToday: number;
	/** Booster packs the player has already opened today (Europe/Madrid). */
	usedToday: number;
	/**
	 * Today's effective daily cap: {@link baseToday} + {@link signupToday} +
	 * {@link grantedToday}. Mirrors `booster_allowance` in Postgres, which is the
	 * authority — derived here so a row does not depend on that function being
	 * deployed yet.
	 */
	capToday: number;
	/** Packs the player may still open today: `max(0, capToday - usedToday)`. */
	remainingToday: number;
}

/** The result of granting a player extra daily claims: their refreshed row. */
export interface GrantClaimsResult {
	user: AdminUser;
}
