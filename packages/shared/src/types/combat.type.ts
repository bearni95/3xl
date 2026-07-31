/**
 * Combat's cross-package contract: how a finished fight is reported to Supabase
 * and what the server hands back.
 *
 * Combat runs entirely in the browser (the board engine and the combat
 * controller), so the *result* is reported rather than replayed server-side. The
 * report is therefore treated as a claim, not as truth: the `award_combat_exp`
 * RPC (see @3xl/backend's schema, mirrored in supabase/combat_results.sql) checks
 * every spawn in it belongs to the caller and counts the survivors itself — a team
 * is at most {@link COMBAT_TEAM_SIZE} fighters, so an inflated report buys nothing
 * — then computes the award from the player's *stored* experience. The browser
 * never states an amount. A **loss** is paid for the rivals it took down instead, and
 * that count is bounded the same way: against the rival line-up the server froze on
 * the battle, so the most it can claim is the team it was actually fielded against.
 *
 * The same RPC also settles **territory** in the same transaction: a fight picked
 * on the map names the town it was fought over, and a win banks one siege win
 * against that town's sitting team — flipping the town to the winner once they
 * have banked enough of them (see `territory.type`). Here too the browser only
 * says what it fought; the win count, the bar to clear and the occupancy change
 * are all the server's.
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
	/** Whether it was taken down. There is no health in this game — a fighter is
	 * standing or it is out — so this is the whole of its state at the end. */
	down: boolean;
}

/**
 * A finished fight, as reported by the browser to `award_combat_exp`.
 *
 * What is *not* here is the point: the fight names neither the town it was over
 * nor the generation of the team it beat. Both were fixed server-side when the
 * battle was opened and are read back off the player's `battles` row (see
 * `battle.type`), so the browser cannot pick a richer town to have won, nor claim
 * to have fought the team currently sitting there when it fought the one before.
 * All that is left to say is how the fight went, which is the one thing only the
 * browser knows.
 */
export interface CombatReport {
	outcome: CombatOutcome;
	/** The player's side only — the rivals are not fielded from anything the player
	 * owns, so there is nothing about them to name here beyond the count below. */
	fighters: CombatFighterReport[];
	/**
	 * How many of the rival line-up were taken down, which is the whole of what a
	 * **loss** is paid for: `LOSS_EXP_PER_RIVAL` apiece (see
	 * `utils/progression/level`). A win ignores it — it is paid for the team that came
	 * through, as it always was.
	 *
	 * It is a count and not a line-up because there is nothing to check a line-up
	 * against: the rivals are the town's garrison, not the caller's cards. What the
	 * server does instead is bound it — to the size of the rival line-up it froze on
	 * the battle when the fight was opened, and to {@link COMBAT_TEAM_SIZE} — so the
	 * most a report can talk itself into is one full team's worth.
	 */
	rivalsDefeated: number;
}

/**
 * How a reported fight moved the needle on the town it was fought over. Present
 * on the reward only when the report named a location; every figure in it is the
 * server's, read back after the bookkeeping.
 */
export interface TerritoryResult {
	/** The town the fight was over. */
	locationId: string;
	/** True when this fight took the town — the player is now its holder. */
	captured: boolean;
	/** Wins the player has banked against the town's sitting team, this one included. */
	wins: number;
	/** Wins needed to take it — one more than the town's turnover at fight time. */
	required: number;
	/** The town's turnover count now, after any capture this fight caused. */
	turnover: number;
	/**
	 * True when the town changed hands while the fight was running, so the team
	 * beaten was no longer the sitting one and nothing was banked. The map should
	 * reload the town and the player fight the new occupant.
	 */
	stale: boolean;
}

/**
 * What `award_combat_exp` gives back: the experience it decided to award — a win's
 * share of the level's span, ten a rival felled for a loss, nothing for a draw — plus
 * the state that produced it, so the endgame screen can show the player exactly how
 * the number was reached.
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
	/** Fighters left standing at the end, as the server counted them. */
	survivors: number;
	/** Fighters the team fielded, as the server counted them. */
	fielded: number;
	/** Rivals taken down, as the server *bounded* the reported count — what a loss was
	 * paid for. Zero on a win or a draw, neither of which reads it. */
	rivalsDefeated: number;
	/** What the fight did to the town it was fought over, or null when no town was
	 * at stake (a report with no `locationId`, or one the server credited nothing for). */
	territory: TerritoryResult | null;
}
