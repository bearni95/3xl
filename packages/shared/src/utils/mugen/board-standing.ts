/**
 * Where a line of fighters stands when a fight is picked up again.
 *
 * A battle outlives the tab playing it: the board is written back to the player's
 * open battle as each turn closes (see `types/battle.type`), and coming back to the
 * fight has to put the line where that board left it — not where it opened. Ground
 * won is part of the fight's state, and so is having been taken off the board.
 *
 * Pure, and deliberately ignorant of everything else about a fighter: it is handed a
 * line in the order it opens and the fighters a saved board carries, and answers with
 * the ones still standing and the cell each of them is on. What a fighter *is* — its
 * sprite, its colour, its moves — is the caller's business.
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
	/** Whether it has been taken down: it is off the board for the rest of the fight. */
	down: boolean;
}

/** A fighter that is still standing, and the cell to stand it on. */
export interface PlacedFighter {
	id: string;
	cell: Cell;
}

/**
 * The line as it should be drawn: every fighter the saved board still has standing, on
 * the ground it holds, in opening order.
 *
 * Rules, all of them about refusing to draw a fight that isn't the one being resumed:
 *
 *   · A fighter the board does not mention keeps its opening cell — that is a fight
 *     that has not moved it, which is what an unsaved (freshly opened) battle is.
 *   · A cell that is not on the board is ignored rather than trusted: the board comes
 *     back from a browser, and a fighter standing off the grid cannot be drawn at all.
 *   · The fallen are dropped, because a knocked-out fighter is removed from the canvas
 *     when it falls and must not be standing there again on the next load.
 *   · A line with nobody left standing comes back as its opening line. It cannot happen
 *     off a real board — a fight ends the moment a side is emptied, and a finished fight
 *     is never written back — but a half is a half, and a caller that needs somebody to
 *     draw must not be handed nothing by a board that claims otherwise.
 */
export function standingLine(
	line: readonly LineFighter[],
	resumed: readonly StandingFighter[]
): PlacedFighter[] {
	const saved = new Map(resumed.map((fighter) => [fighter.id, fighter]));
	const standing: PlacedFighter[] = [];
	for (const fighter of line) {
		const entry = saved.get(fighter.id);
		if (entry?.down) continue;
		const ground = entry?.cell;
		standing.push({
			id: fighter.id,
			cell: ground && isBoardCell(ground.q, ground.r) ? ground : fighter.opening
		});
	}
	if (standing.length > 0) return standing;
	return line.slice(0, 1).map((fighter) => ({ id: fighter.id, cell: fighter.opening }));
}
