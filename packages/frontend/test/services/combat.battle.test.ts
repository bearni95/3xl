import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	PLAYER_CELLS,
	RIVAL_CELLS,
	type CombatState,
	type FighterSeed,
	type FighterView
} from '$services/combat.controller';
import { cellScreenY } from '$utils/mugen/mugen-board';
import type { CombatColor } from '$types/character-definition.type';
import type { BattleBoardSnapshot } from '$types/battle.type';

/** Three a side, in line-up order: the first three colours are the rivals', the
 * last three the player's. Mirrors the seeding in combat.controller.test. */
function seeds(colors: CombatColor[]): FighterSeed[] {
	const make = (side: 'error' | 'info', i: number, offset: number): FighterSeed => ({
		id: `${side}:${i}`,
		spawnId: `${side}-spawn-${i}`,
		name: `${side}-${i}`,
		side,
		color: colors[offset + i],
		moves: []
	});
	return [0, 1, 2]
		.map((i) => make('error', i, 0))
		.concat([0, 1, 2].map((i) => make('info', i, 3)));
}

const COLORS: CombatColor[] = ['red', 'yellow', 'blue', 'red', 'yellow', 'blue'];

/** Play `turns` turns out, every standing player fighter shooting when it can and
 * charging when it can't — enough to bank charges, spend guards and fell fighters. */
async function playTurns(controller: CombatController, turns: number): Promise<void> {
	for (let turn = 0; turn < turns; turn++) {
		if (get(controller).outcome) return;
		for (const fighter of get(controller).fighters) {
			if (fighter.side !== 'info' || fighter.down) continue;
			controller.setAction(fighter.id, fighter.canShoot ? 'shoot' : 'charge');
		}
		if (!get(controller).ready) return;
		controller.commit();
		while (get(controller).phase === 'resolving') {
			await new Promise((resolve) => setTimeout(resolve, 20));
		}
	}
}

/** Everything about a fighter that a resumed fight has to agree on. */
const readable = (state: CombatState) =>
	state.fighters.map((fighter: FighterView) => ({
		id: fighter.id,
		charges: fighter.charges,
		down: fighter.down,
		spent: [...fighter.spent],
		opponentId: fighter.opponentId,
		canShoot: fighter.canShoot
	}));

describe('CombatController — leaving a fight and coming back to it', () => {
	it('resumes on the turn it was left on, with the fight exactly as it stood', async () => {
		const controller = new CombatController(seeds(COLORS));
		await playTurns(controller, 4);

		const before = get(controller);
		const snapshot = controller.snapshot();
		// Only worth asserting on a fight that actually moved — and one in which some
		// colour's gift has been had, since that is the part of a fighter's state that
		// cannot be worked out again from anything else on the board.
		expect(snapshot.turn).toBeGreaterThan(1);
		expect(before.fighters.some((fighter) => fighter.spent.length > 0)).toBe(true);

		const resumed = new CombatController(seeds(COLORS), snapshot);
		const after = get(resumed);

		expect(after.turn).toBe(before.turn);
		expect(after.phase).toBe('planning');
		expect(after.outcome).toBeNull();
		// Charges, the fallen, the gifts already had, who is left facing whom, and who
		// may fire: all of it comes back, and all of it is derived again from the flags.
		expect(readable(after)).toEqual(readable(before));
		expect(after.wins).toEqual(before.wins);
	}, 120000);

	it('keeps the rivals to the orders they had already committed to', async () => {
		const controller = new CombatController(seeds(COLORS));
		await playTurns(controller, 3);

		const snapshot = controller.snapshot();
		const rivalOrders = snapshot.fighters
			.filter((fighter) => fighter.side === 'error')
			.map((fighter) => `${fighter.slot}:${fighter.action}`);

		const resumed = new CombatController(seeds(COLORS), snapshot);
		const resumedOrders = resumed
			.snapshot()
			.fighters.filter((fighter) => fighter.side === 'error')
			.map((fighter) => `${fighter.slot}:${fighter.action}`);

		// The rivals commit before the player does, so re-rolling them on resume would
		// hand the player a fresh guess at a turn that was already decided.
		expect(resumedOrders).toEqual(rivalOrders);
	}, 120000);

	it('survives a round trip through JSON, which is how it is stored', async () => {
		const controller = new CombatController(seeds(COLORS));
		await playTurns(controller, 5);

		const snapshot = controller.snapshot();
		const stored = JSON.parse(JSON.stringify(snapshot)) as BattleBoardSnapshot;
		const resumed = new CombatController(seeds(COLORS), stored);

		expect(resumed.snapshot()).toEqual(snapshot);
	}, 120000);

	it('starts the fight rather than half-restoring a board that is not this line-up', async () => {
		const controller = new CombatController(seeds(COLORS));
		await playTurns(controller, 4);
		const snapshot = controller.snapshot();

		// The same fight, fielded from different spawns — a team changed since, or a
		// board belonging to another battle altogether.
		const otherSeeds = seeds(COLORS).map((seed) => ({ ...seed, spawnId: `${seed.spawnId}-other` }));
		const fresh = new CombatController(otherSeeds, snapshot);
		const state = get(fresh);

		expect(state.turn).toBe(1);
		expect(state.fighters.every((fighter) => !fighter.down)).toBe(true);
	}, 120000);

	it('refuses a board with the wrong number of fighters', () => {
		const controller = new CombatController(seeds(COLORS));
		const snapshot = controller.snapshot();
		const short: BattleBoardSnapshot = { turn: 6, fighters: snapshot.fighters.slice(0, 4) };

		expect(get(new CombatController(seeds(COLORS), short)).turn).toBe(1);
	});

	/**
	 * The player's line-up out of a board, back in team order — the same mapping
	 * `CombatArena.fieldedTeam` performs, and the one that has to be the exact inverse
	 * of how the arena places a team on the board.
	 */
	const fieldedTeam = (snapshot: BattleBoardSnapshot): string[] =>
		snapshot.fighters
			.filter((fighter) => fighter.side === 'info')
			.sort((a, b) => b.slot - a.slot)
			.map((fighter) => fighter.spawnId);

	it('gives the fielded team back in the order it was fielded, not in lane order', () => {
		// The arena's own placement, replicated: the team fills its column with its
		// first member nearest the viewer (PLAYER_CELLS reversed), and each side is then
		// seeded in the order it stands top→bottom on screen.
		const team = ['team-a', 'team-b', 'team-c'];
		const lineupCells = [...PLAYER_CELLS].reverse();
		const place = (ids: string[], cells: typeof PLAYER_CELLS, side: 'error' | 'info') =>
			ids
				.map((spawnId, index) => ({ spawnId, side, gridY: cellScreenY(cells[index].q, cells[index].r) }))
				.sort((a, b) => a.gridY - b.gridY);
		const seeded = [
			...place(['og-0', 'og-1', 'og-2'], RIVAL_CELLS, 'error'),
			...place(team, lineupCells, 'info')
		].map(
			(entry, index): FighterSeed => ({
				id: `${entry.side}:${entry.spawnId}`,
				spawnId: entry.spawnId,
				name: `f${index}`,
				side: entry.side,
				color: 'red',
				moves: []
			})
		);

		// A team read back off its own board must be the team that was put on it. Read
		// in lane order it comes back reversed, which silently moves every fighter into
		// somebody else's duel — and, because the line-up drives the board's identity,
		// makes the board rebuild itself on every save.
		expect(fieldedTeam(new CombatController(seeded).snapshot())).toEqual(team);
	});
});
