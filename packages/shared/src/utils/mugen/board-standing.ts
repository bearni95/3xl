/**
 * Where a line of fighters stands when a fight is picked up again.
 *
 * A battle outlives the tab playing it: the board is written back to the player's
 * open battle as each turn closes (see `types/battle.type`), and coming back to the
 * fight has to put the line where that board left it — not where it opened. Ground won
 * is part of the fight's state, and so is ground given up: nobody ever leaves this
 * board, so every fighter of the line is drawn, wherever the fight left it standing.
 *
 * Pure, and deliberately ignorant of everything else about a fighter: it is handed a
 * line in the order it opens and the fighters a saved board carries, and answers with
 * the cell each of them is on. What a fighter *is* — its sprite, its colour, its moves,
 * whether it is still in the fight — is the caller's business.
 */
import { type Cell, isBoardCell } from './grid';

/** One fighter of a line, and the cell its slot opens on. */
export interface LineFighter {
	/** Whatever the caller identifies a fighter by; matched against `StandingFighter.id`. */
	id: string;
	/** The cell this slot stands on at the start of the fight. */
	opening: Cell;
}

/** One fighter as a saved board records it. */
export interface StandingFighter {
	id: string;
	/** The cell it holds, or null when the board says nothing about where it stood. */
	cell: Cell | null;
}

/** A fighter and the cell to stand it on. */
export interface PlacedFighter {
	id: string;
	cell: Cell;
}

/**
 * The line as it should be drawn: every fighter of it, on the ground the saved board
 * holds it on, in opening order.
 *
 * Whether a fighter is still in the fight is not asked, because it no longer decides
 * anything about where it is drawn. A fighter taken down retracts to the back of its own
 * half and stands there for the rest of the fight — it is out of the fight, not off the
 * board — so a board that has one records the cell it retracted to, and the fallen are
 * stood back up on it like everybody else. Dropping them would redraw a fight as having
 * fewer fighters in it than it has.
 *
 * The two rules left are both about refusing to draw a fight that isn't the one being
 * resumed:
 *
 *   · A fighter the board does not mention keeps its opening cell — that is a fight
 *     that has not moved it, which is what an unsaved (freshly opened) battle is.
 *   · A cell that is not on the board is ignored rather than trusted: the board comes
 *     back from a browser, and a fighter standing off the grid cannot be drawn at all,
 *     so it is stood where its slot opens instead of nowhere.
 */
export function standingLine(
	line: readonly LineFighter[],
	resumed: readonly StandingFighter[]
): PlacedFighter[] {
	const saved = new Map(resumed.map((fighter) => [fighter.id, fighter]));
	return line.map((fighter) => {
		const ground = saved.get(fighter.id)?.cell;
		return {
			id: fighter.id,
			cell: ground && isBoardCell(ground.q, ground.r) ? ground : fighter.opening
		};
	});
}
