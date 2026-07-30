/**
 * The open battle: the one fight a player may have running at a time.
 *
 * A battle is not something the browser holds. Picking a fight on the map opens a
 * row in Supabase (`start_battle`), the board is written back to it as each turn
 * closes (`save_battle`), and reporting the result is what finally clears it
 * (`award_combat_exp`). So a player has **at most one** battle open — the table's
 * primary key is the player — and closing the arena, reloading the page or moving
 * to another device does not lose it or let them walk away from it: the fight is
 * still there, at the turn it was left on, and it is the only one they may play
 * until it is finished.
 *
 * That is what makes the once-a-day challenge limit mean anything. A fight going
 * badly cannot be abandoned for a fresh one, because there is no fresh one to be
 * had while this row exists.
 *
 * The row is also the server's own record of *what* is being fought, and this is
 * why the client no longer says: the town, the generation of the team sitting on
 * it, and the rival line-up are all fixed here when the battle opens, and
 * `award_combat_exp` reads them from here rather than believing a report. The
 * browser is left saying only what it is the only one that can know — how the
 * fight went.
 */
import type { TeamMemberRoll } from '../utils/spawn/municipality-team';

/**
 * Which line a fighter stands in: `info` is the player's (blue), `error` the
 * rivals' (red). Mirrors the combat controller's `FighterSide` — the same two
 * strings, restated here so the stored shape does not depend on the frontend.
 */
export type BattleSide = 'info' | 'error';

/**
 * One of the three orders, as stored. Mirrors the controller's `CombatAction`.
 * Held for the rivals' side, whose orders for the turn about to be played are
 * decided before the player gives theirs — a resumed battle must not re-roll them.
 */
export type BattleOrder = 'charge' | 'defend' | 'shoot';

/** One fighter's state at the moment a turn closed. */
export interface BattleFighterSnapshot {
	/** Which line it stands in. */
	side: BattleSide;
	/**
	 * Its place in that line, top→bottom — which is also its **lane**, since the two
	 * fighters holding the same slot in opposite lines are the pair that fight each
	 * other. Restoring by slot is what keeps the lanes as they were.
	 */
	slot: number;
	/**
	 * The spawn it was fielded from: a `character_spawns` id for the player's side,
	 * a synthetic `og:<n>` for a rival. The player's are what a resumed battle fields
	 * — the team that started the fight finishes it, whatever the roster says now.
	 */
	spawnId: string;
	/** Charges banked, 0..MAX_CHARGES. */
	charges: number;
	/** Whether it has been taken down. */
	down: boolean;
	/**
	 * Which of the free orders its colour granted it have been used up. Each is worth
	 * one use in the whole battle, so this is the difference between a card that still
	 * has its gift and one that has already had it — and it cannot be worked out again
	 * from anything else on the board, which is why it is stored.
	 */
	spent: BattleOrder[];
	/**
	 * Which of those it actually carried out, as against merely running out of turns to
	 * carry them out in — always a subset of `spent`. No rule of the fight reads it: it is
	 * what a fighter's column shows for what its colour did, which a resumed fight would
	 * otherwise have forgotten. Optional, because a board written before the two were told
	 * apart names none, and a fight resumed off one is a fight whose colours are recorded
	 * as having done nothing rather than as having done the wrong thing.
	 */
	used?: BattleOrder[];
	/** The order it is carrying into the turn about to be played, or null. */
	action: BattleOrder | null;
	/** The board cell it is standing on — ground won and given up is part of the
	 * fight's state, so a resumed board puts everyone back where they stood. */
	cell: { q: number; r: number } | null;
}

/** A battle's board, as stored between turns. */
export interface BattleBoardSnapshot {
	/** The turn about to be played, 1-based. */
	turn: number;
	/** Every fighter of both sides. */
	fighters: BattleFighterSnapshot[];
}

/** The player's open battle, as the browser reads it back. */
export interface OpenBattle {
	/** The town being fought over, as its geojson feature id. */
	locationId: string;
	/**
	 * The town's turnover when the battle opened — the generation of the team being
	 * fought. Reported from here, not from the browser, so a fight that started
	 * before somebody else took the town is still recognised as being against the
	 * team that has since been replaced.
	 */
	turnover: number;
	/** The rival line-up, in lane order: what was sitting on the town at the time. */
	rivals: TeamMemberRoll[];
	/**
	 * The player's own line-up, in fielded order, as `character_spawns` ids. Proved to
	 * be the player's own before the battle was opened (`start_battle`), so it is the
	 * team this fight is fought with — a roster changed since does not change it, and
	 * a report against it is one the server can accept.
	 */
	team: string[];
	/** The board as the last closed turn left it, or null if no turn has closed yet
	 * (the battle was opened and left before a single turn was played). */
	board: BattleBoardSnapshot | null;
	/** ISO timestamp the battle was opened. */
	startedAt: string;
}

/** Raw `battles` row as the Supabase client returns it. */
export interface OpenBattleRow {
	location_id: string;
	turnover: number | string | null;
	rivals: unknown;
	team: unknown;
	board: unknown;
	started_at: string;
}
