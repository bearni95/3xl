import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	type CombatState,
	type FighterSeed
} from '$services/combat.controller';
import type { CombatColor } from '$types/character-definition.type';
import { attackHitChance, formatChancePercent } from '$utils/dice/roll';
import { combatStatsFromStat } from '$utils/spawn/stat';

/**
 * The matchup preview the arena's colour buttons read: who a fighter is next up
 * against, and — per colour it can throw — the handful of dice that colour buys and
 * the odds it lands there. The rival line-up is fixed (slot i always fights duel i),
 * so these pairings are knowable before a single colour is committed — that is the
 * whole point of the preview.
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

/** What one colour of a fighter's picker is worth in the duel it is lined up for. */
const throwOf = (state: CombatState, id: string, color: CombatColor) =>
	previewOf(state, id)?.throws.find((option) => option.color === color) ?? null;

describe('combat matchup preview', () => {
	it('lines every free player up against the first rival before anyone picks', () => {
		const state = get(new CombatController(lineup()));
		for (const id of ['p0', 'p1', 'p2']) {
			expect(previewOf(state, id)).toMatchObject({ duelIndex: 0, opponentId: 'r0' });
		}
	});

	it('reads the hit odds off the dice the colour buys and the opponent DEF', () => {
		const state = get(new CombatController(lineup()));
		// The players are purple, the rivals red: blue is an even ×1 match, so p0's
		// ATK 3 throws 3d10 against r0's DEF 6 → 1 − 0.5³.
		expect(throwOf(state, 'p0', 'blue')).toMatchObject({ multiplier: 1, dice: 3 });
		expect(throwOf(state, 'p0', 'blue')?.hitChance).toBeCloseTo(attackHitChance(3, 6));
		// Same opponent, more dice: p1's ATK 4 is likelier to connect than p2's ATK 1.
		expect(throwOf(state, 'p1', 'blue')!.hitChance).toBeGreaterThan(
			throwOf(state, 'p2', 'blue')!.hitChance
		);
	});

	it('scales the dice by the colour thrown, not the damage they do', () => {
		const state = get(new CombatController(lineup()));
		// p0 is purple with ATK 3, up against a red rival. Purple dominates red (×2) and
		// so does red itself; blue is even. The colour is a choice of handful.
		expect(throwOf(state, 'p0', 'purple')).toMatchObject({ multiplier: 2, dice: 6 });
		expect(throwOf(state, 'p0', 'red')).toMatchObject({ multiplier: 2, dice: 6 });
		expect(throwOf(state, 'p0', 'blue')).toMatchObject({ multiplier: 1, dice: 3 });
		// Doubling the dice really does improve the odds — the whole point of the pick.
		expect(throwOf(state, 'p0', 'purple')!.hitChance).toBeGreaterThan(
			throwOf(state, 'p0', 'blue')!.hitChance
		);
	});

	it('halves a weak colour down to whole dice', () => {
		const controller = new CombatController(lineup());
		controller.selectColor('p1', 'purple');
		const state = get(controller);
		// r0 is red, now facing purple p1 — red is weak into purple (×0.5), so its ATK 2
		// halves to a single die, and the odds it previews are that one die's.
		expect(throwOf(state, 'r0', 'red')).toMatchObject({ multiplier: 0.5, dice: 1 });
		expect(throwOf(state, 'r0', 'red')?.hitChance).toBeCloseTo(attackHitChance(1, 5));
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
		expect(throwOf(state, 'p0', 'blue')?.hitChance).toBeCloseTo(attackHitChance(3, 8));
	});

	it('previews the paired rival too, against the player it will meet', () => {
		const controller = new CombatController(lineup());
		controller.selectColor('p1', 'red');
		const state = get(controller);
		// r0's ATK 2 throws an even ×1 orange at purple p1's DEF 5.
		expect(previewOf(state, 'r0')).toMatchObject({ duelIndex: 0, opponentId: 'p1' });
		expect(throwOf(state, 'r0', 'orange')).toMatchObject({ multiplier: 1, dice: 2 });
		expect(throwOf(state, 'r0', 'orange')?.hitChance).toBeCloseTo(attackHitChance(2, 5));
		// r1 and r2 have nobody assigned yet, so they preview nothing.
		expect(previewOf(state, 'r1')).toBeNull();
		expect(previewOf(state, 'r2')).toBeNull();
	});

	it('reads 90% for a single die against the weakest defender', () => {
		// The whole path a card actually takes: rolled stat → ATK/DEF → colour multiplier
		// → preview → the string on the button. A stat-1 fighter throws 1d10 on an even
		// colour; a stat-9 rival defends on DEF 1. One die beats a 1 nine times in ten —
		// no more, no less.
		const from = (id: string, side: 'error' | 'info', stat: number): FighterSeed => {
			const { atk, def, spd } = combatStatsFromStat(stat);
			return { ...seed(id, side, { atk, def }), spd };
		};
		const controller = new CombatController([
			from('r0', 'error', 9),
			from('r1', 'error', 5),
			from('r2', 'error', 5),
			from('p0', 'info', 1),
			from('p1', 'info', 5),
			from('p2', 'info', 9)
		]);
		const state = get(controller);

		expect(previewOf(state, 'p0')).toMatchObject({ opponentId: 'r0', opponentDef: 1 });
		// Blue into red is the even match, so p0's ATK 1 stays a lone die.
		const lone = throwOf(state, 'p0', 'blue')!;
		expect(lone).toMatchObject({ multiplier: 1, dice: 1 });
		expect(lone.hitChance).toBeCloseTo(0.9);
		expect(formatChancePercent(lone.hitChance)).toBe('90%');
		// Purple doubles that same ATK into two dice, and the button says so.
		expect(throwOf(state, 'p0', 'purple')).toMatchObject({ dice: 2 });
		expect(formatChancePercent(throwOf(state, 'p0', 'purple')!.hitChance)).toBe('99%');

		// More dice against that same DEF 1 are near-certain, and must not read as the
		// same figure as the single die — nor as a flat 100%.
		expect(throwOf(state, 'p1', 'blue')).toMatchObject({ dice: 5 });
		expect(formatChancePercent(throwOf(state, 'p1', 'blue')!.hitChance)).toBe('99.9%');
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
