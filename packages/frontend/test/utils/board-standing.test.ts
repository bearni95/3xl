import { describe, expect, it } from 'vitest';
import { standingLine, type LineFighter, type StandingFighter } from '$utils/mugen/board-standing';
import { PLAYER_CELLS } from '$services/combat.controller';

/** The player's line as the arena opens it: its first member nearest the viewer. */
const line: LineFighter[] = [...PLAYER_CELLS]
	.reverse()
	.map((opening, index) => ({ id: `info:spawn-${index}`, opening }));

const saved = (
	id: string,
	cell: { q: number; r: number } | null,
	down = false
): StandingFighter => ({ id, cell, down });

describe('standing a line back up off a saved board', () => {
	it('opens the line where it opens when there is no board to resume', () => {
		expect(standingLine(line, [])).toEqual(
			line.map((fighter) => ({ id: fighter.id, cell: fighter.opening }))
		);
	});

	it('stands each fighter on the ground the fight left it holding', () => {
		// The white cell on its own row that the player's fighter walked up onto when it
		// won its lane.
		const won = { q: 0, r: line[0].opening.r };
		const placed = standingLine(line, [saved(line[0].id, won), saved(line[1].id, null)]);

		expect(placed[0].cell).toEqual(won);
		// A fighter the board says nothing about is where it started, not nowhere.
		expect(placed[1].cell).toEqual(line[1].opening);
		expect(placed[2].cell).toEqual(line[2].opening);
	});

	it('leaves the fallen off the board without moving anybody else', () => {
		const placed = standingLine(line, [saved(line[1].id, line[1].opening, true)]);

		expect(placed.map((fighter) => fighter.id)).toEqual([line[0].id, line[2].id]);
		// The survivors keep their own cells: dropping one is not the line closing up.
		expect(placed[0].cell).toEqual(line[0].opening);
		expect(placed[1].cell).toEqual(line[2].opening);
	});

	it('ignores a cell that is not on the board', () => {
		// The board comes back from a browser: a fighter standing off the grid cannot be
		// drawn at all, so it is stood where its slot opens instead of nowhere.
		const placed = standingLine(line, [saved(line[0].id, { q: 9, r: 9 })]);

		expect(placed[0].cell).toEqual(line[0].opening);
	});

	it('never hands back an empty line, whatever the board claims', () => {
		// Cannot come off a real board — a fight ends the moment a side is emptied, and a
		// finished fight is never written back — but a half must have somebody to draw.
		const placed = standingLine(
			line,
			line.map((fighter) => saved(fighter.id, fighter.opening, true))
		);

		expect(placed).toEqual([{ id: line[0].id, cell: line[0].opening }]);
	});
});
