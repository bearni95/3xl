import { describe, expect, it } from 'vitest';
import { standingLine, type LineFighter, type StandingFighter } from '$utils/mugen/board-standing';
import { fallenColumn, PLAYER_CELLS } from '$services/combat.controller';

/** The player's line as the arena opens it: its first member nearest the viewer. */
const line: LineFighter[] = [...PLAYER_CELLS]
	.reverse()
	.map((opening, index) => ({ id: `info:spawn-${index}`, opening }));

const saved = (id: string, cell: { q: number; r: number } | null): StandingFighter => ({
	id,
	cell
});

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

	it('stands the fallen back up on the ground they retracted to', () => {
		// A fighter taken down withdraws to the back of its own half and stays there for the
		// rest of the fight, so a board that has one records where it went — and it is drawn
		// there like anybody else. Nobody is ever dropped from the line: a fight with a
		// fallen fighter in it still has six fighters standing on the board.
		const retracted = { q: fallenColumn('info'), r: line[1].opening.r };
		const placed = standingLine(line, [saved(line[1].id, retracted)]);

		expect(placed.map((fighter) => fighter.id)).toEqual(line.map((fighter) => fighter.id));
		expect(placed[1].cell).toEqual(retracted);
		// And nobody else is moved by it.
		expect(placed[0].cell).toEqual(line[0].opening);
		expect(placed[2].cell).toEqual(line[2].opening);
	});

	it('ignores a cell that is not on the board', () => {
		// The board comes back from a browser: a fighter standing off the grid cannot be
		// drawn at all, so it is stood where its slot opens instead of nowhere.
		const placed = standingLine(line, [saved(line[0].id, { q: 9, r: 9 })]);

		expect(placed[0].cell).toEqual(line[0].opening);
	});

	it('hands back the whole line whatever the fight did to it', () => {
		// Every fighter of a wiped-out half is standing at the back of that half, so all
		// three come back — there is no board this can be handed that draws fewer fighters
		// than the line has.
		const wiped = line.map((fighter) => ({
			q: fallenColumn('info'),
			r: fighter.opening.r
		}));
		const placed = standingLine(
			line,
			line.map((fighter, index) => saved(fighter.id, wiped[index]))
		);

		expect(placed).toEqual(line.map((fighter, index) => ({ id: fighter.id, cell: wiped[index] })));
	});
});
