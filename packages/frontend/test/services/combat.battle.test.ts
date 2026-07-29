import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	type CombatState,
	type FighterSeed,
	type FighterView
} from '$services/combat.controller';
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
		guarded: fighter.guarded,
		opponentId: fighter.opponentId,
		canShoot: fighter.canShoot
	}));

describe('CombatController — leaving a fight and coming back to it', () => {
	it('resumes on the turn it was left on, with the fight exactly as it stood', async () => {
		const controller = new CombatController(seeds(COLORS));
		await playTurns(controller, 4);

		const before = get(controller);
		const snapshot = controller.snapshot();
		// Only worth asserting on a fight that actually moved.
		expect(snapshot.turn).toBeGreaterThan(1);

		const resumed = new CombatController(seeds(COLORS), snapshot);
		const after = get(resumed);

		expect(after.turn).toBe(before.turn);
		expect(after.phase).toBe('planning');
		expect(after.outcome).toBeNull();
		// Charges, the fallen, spent guards, who is left facing whom, and who may fire:
		// all of it comes back, and all of it is derived again from the restored flags.
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
});
