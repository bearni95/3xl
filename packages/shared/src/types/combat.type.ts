/**
 * Combat's cross-package contract: how a finished fight is reported to Supabase
 * and what the server hands back.
 *
 * Combat runs entirely in the browser (the board engine and the combat
 * controller), so the *result* is reported rather than replayed server-side. The
 * report is therefore treated as a claim, not as truth: the `award_combat_exp`
 * RPC (see @3xl/backend's schema, mirrored in supabase/combat_results.sql) checks
 * every spawn in it belongs to the caller and clamps each fighter's HP into the
 * range that spawn's stat could possibly have rolled, then computes the award
 * itself from the player's *stored* experience. The browser never states an
 * amount.
 */

/** How a fight ended, from the player's (blue / `info`) point of view. */
export type CombatOutcome = 'win' | 'lose' | 'draw';

/**
 * How many fighters a side fields — the size of the team reported after a fight.
 * The `award_combat_exp` RPC rejects reports larger than this. Mirrored by
 * `TEAM_SIZE` in the frontend's team service, which derives from this.
 */
export const COMBAT_TEAM_SIZE = 3;

/** One of the player's fighters as it stood when the fight ended. */
export interface CombatFighterReport {
	/** The `character_spawns` row this fighter was fielded from. Must be the caller's. */
	spawnId: string;
	/** HP left at the end (0 for a knocked-out fighter). */
	hpLeft: number;
	/** The HP pool this fighter rolled at battle start. */
	maxHp: number;
}

/** A finished fight, as reported by the browser to `award_combat_exp`. */
export interface CombatReport {
	outcome: CombatOutcome;
	/** The player's side only — the rivals earn nothing and are not reported. */
	fighters: CombatFighterReport[];
}

/**
 * What `award_combat_exp` gives back: the experience it decided to award (0 on
 * anything but a win) plus the state that produced it, so the endgame screen can
 * show the player exactly how the number was reached.
 */
export interface CombatReward {
	/** Experience actually added to the player's total. */
	awarded: number;
	/** The player's new accumulated experience. */
	total: number;
	/** The player's level *before* the award — the level whose span was at stake. */
	level: number;
	/** The full span of that level: the maximum a flawless win could earn. */
	span: number;
	/** Compound HP the team ended with, after server-side clamping. */
	hpLeft: number;
	/** Compound HP the team started with, after server-side clamping. */
	hpMax: number;
}
