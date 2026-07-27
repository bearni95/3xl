import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	type CombatState,
	type FighterSeed
} from '$services/combat.controller';
import { attackHitChance } from '$utils/dice/roll';

/**
 * The matchup preview the arena's colour buttons read: who a fighter is next up
 * against, and the odds its attack lands there. The rival line-up is fixed (slot i
 * always fights duel i), so these pairings are knowable before a single colour is
 * committed — that is the whole point of the preview.
 */

/** One fighter seed; compound-coloured players so they have three colours to throw. */
function seed(
	id: string,
	side: 'error' | 'info',
	stats: { atk: number; def: number }
): FighterSeed {
	return {
		id,
		spawnId: id,
		name: id.toUpperCase(),
		side,
		color: side === 'info' ? 'purple' : 'red',
		moves: [],
		atk: stats.atk,
		def: stats.def,
		spd: stats.atk - 1
	};
}

/** Rivals then players, each in line-up order — the order the board draws the cards. */
function lineup(): FighterSeed[] {
	return [
		seed('r0', 'error', { atk: 2, def: 6 }),
		seed('r1', 'error', { atk: 2, def: 8 }),
		seed('r2', 'error', { atk: 2, def: 3 }),
		seed('p0', 'info', { atk: 3, def: 5 }),
		seed('p1', 'info', { atk: 4, def: 5 }),
		seed('p2', 'info', { atk: 1, def: 5 })
	];
}

const previewOf = (state: CombatState, id: string) =>
	state.fighters.find((fighter) => fighter.id === id)?.preview ?? null;

describe('combat matchup preview', () => {
	it('lines every free player up against the first rival before anyone picks', () => {
		const state = get(new CombatController(lineup()));
		for (const id of ['p0', 'p1', 'p2']) {
			expect(previewOf(state, id)).toMatchObject({ duelIndex: 0, opponentId: 'r0' });
		}
	});

	it('reads the hit odds off the attacker ATK and the opponent DEF', () => {
		const state = get(new CombatController(lineup()));
		// p0 rolls 3d10 against r0's DEF 6 → 1 − 0.5³.
		expect(previewOf(state, 'p0')?.hitChance).toBeCloseTo(attackHitChance(3, 6));
		// Same opponent, more dice: p1's 4d10 are likelier to connect than p2's single one.
		expect(previewOf(state, 'p1')!.hitChance).toBeGreaterThan(previewOf(state, 'p2')!.hitChance);
	});

	it('moves the remaining players on to the next rival as each colour is committed', () => {
		const controller = new CombatController(lineup());
		controller.selectColor('p1', 'purple');
		const state = get(controller);

		// The fighter that just committed is locked into the duel it filled…
		expect(previewOf(state, 'p1')).toMatchObject({ duelIndex: 0, opponentId: 'r0' });
		// …and both fighters still free queue for the next cell — whichever picks next
		// is the one that walks into it, so they preview the same rival.
		expect(previewOf(state, 'p0')).toMatchObject({ duelIndex: 1, opponentId: 'r1' });
		expect(previewOf(state, 'p2')).toMatchObject({ duelIndex: 1, opponentId: 'r1' });
		// The odds follow the new opponent: r1's DEF 8 is a harder target than r0's 6.
		expect(previewOf(state, 'p0')?.hitChance).toBeCloseTo(attackHitChance(3, 8));
	});

	it('previews the paired rival too, against the player it will meet', () => {
		const controller = new CombatController(lineup());
		controller.selectColor('p1', 'red');
		const state = get(controller);
		// r0 rolls 2d10 against p1's DEF 5.
		expect(previewOf(state, 'r0')).toMatchObject({ duelIndex: 0, opponentId: 'p1' });
		expect(previewOf(state, 'r0')?.hitChance).toBeCloseTo(attackHitChance(2, 5));
		// r1 and r2 have nobody assigned yet, so they preview nothing.
		expect(previewOf(state, 'r1')).toBeNull();
		expect(previewOf(state, 'r2')).toBeNull();
	});

	it('keeps the rival line-up fixed to its slots as picks accumulate', () => {
		const controller = new CombatController(lineup());
		controller.selectColor('p2', 'purple');
		controller.selectColor('p0', 'purple');
		const state = get(controller);
		// Picking order decides which player meets which rival, but never which rival
		// stands on which cell: slot order r0, r1, r2 holds throughout.
		expect(previewOf(state, 'p2')).toMatchObject({ duelIndex: 0, opponentId: 'r0' });
		expect(previewOf(state, 'p0')).toMatchObject({ duelIndex: 1, opponentId: 'r1' });
		expect(previewOf(state, 'p1')).toMatchObject({ duelIndex: 2, opponentId: 'r2' });
	});
});
