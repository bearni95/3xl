import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	type CombatState,
	type FighterSeed
} from '$services/combat.controller';
import type { CombatColor } from '$types/character-definition.type';
import { combatStatsFromStat } from '$utils/spawn/stat';

/**
 * The matchup preview the arena's colour buttons read: who a fighter is next up
 * against, and — per colour it can throw — the handful of dice that colour buys and
 * the HP that handful can take off. The rival line-up is fixed (slot i always fights
 * duel i), so these pairings are knowable before a single colour is committed — that
 * is the whole point of the preview.
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

	it('reads the damage on offer off the dice the colour buys', () => {
		const state = get(new CombatController(lineup()));
		// The players are purple, the rivals red: blue is an even ×1 match, so p0's
		// ATK 3 throws 3d10 at r0 — nothing at worst, three HP at best.
		expect(throwOf(state, 'p0', 'blue')).toMatchObject({
			multiplier: 1,
			dice: 3,
			minDamage: 0,
			maxDamage: 3
		});
		// Same opponent, more dice: p1's ATK 4 puts more damage on the table than p2's 1.
		expect(throwOf(state, 'p1', 'blue')!.maxDamage).toBeGreaterThan(
			throwOf(state, 'p2', 'blue')!.maxDamage
		);
	});

	it('scales the dice by the colour thrown, not the damage each one does', () => {
		const state = get(new CombatController(lineup()));
		// p0 is purple with ATK 3, up against a red rival. Purple dominates red (×2) and
		// so does red itself; blue is even. The colour is a choice of handful — and every
		// die that lands is still a flat 1 HP, so the handful is the damage ceiling.
		expect(throwOf(state, 'p0', 'purple')).toMatchObject({ multiplier: 2, dice: 6, maxDamage: 6 });
		expect(throwOf(state, 'p0', 'red')).toMatchObject({ multiplier: 2, dice: 6, maxDamage: 6 });
		expect(throwOf(state, 'p0', 'blue')).toMatchObject({ multiplier: 1, dice: 3, maxDamage: 3 });
	});

	it('halves a weak colour down to whole dice', () => {
		const controller = new CombatController(lineup());
		controller.selectColor('p1', 'purple');
		const state = get(controller);
		// r0 is red, now facing purple p1 — red is weak into purple (×0.5), so its ATK 2
		// halves to a single die: one HP on the table, and it may well miss.
		expect(throwOf(state, 'r0', 'red')).toMatchObject({
			multiplier: 0.5,
			dice: 1,
			minDamage: 0,
			maxDamage: 1
		});
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
		// The throws follow the new opponent — r1 is red too, so blue stays an even
		// three dice, now thrown at its DEF 8.
		expect(previewOf(state, 'p0')?.opponentDef).toBe(8);
		expect(throwOf(state, 'p0', 'blue')).toMatchObject({ dice: 3, maxDamage: 3 });
	});

	it('previews the paired rival too, against the player it will meet', () => {
		const controller = new CombatController(lineup());
		controller.selectColor('p1', 'red');
		const state = get(controller);
		// r0's ATK 2 throws an even ×1 orange at purple p1's DEF 5.
		expect(previewOf(state, 'r0')).toMatchObject({ duelIndex: 0, opponentId: 'p1', opponentDef: 5 });
		expect(throwOf(state, 'r0', 'orange')).toMatchObject({
			multiplier: 1,
			dice: 2,
			minDamage: 0,
			maxDamage: 2
		});
		// r1 and r2 have nobody assigned yet, so they preview nothing.
		expect(previewOf(state, 'r1')).toBeNull();
		expect(previewOf(state, 'r2')).toBeNull();
	});

	it('offers a single HP for the weakest card, and twice that on its best colour', () => {
		// The whole path a card actually takes: rolled stat → ATK/DEF → colour multiplier
		// → dice → the damage on the button. A stat-1 fighter throws 1d10 on an even
		// colour, so it has exactly one HP to take off a stat-9 rival (DEF 1).
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
		// Blue into red is the even match, so p0's ATK 1 stays a lone die: 0–1 HP.
		expect(throwOf(state, 'p0', 'blue')).toMatchObject({
			multiplier: 1,
			dice: 1,
			minDamage: 0,
			maxDamage: 1
		});
		// Purple doubles that same ATK into two dice, and the button offers twice the HP.
		expect(throwOf(state, 'p0', 'purple')).toMatchObject({ dice: 2, minDamage: 0, maxDamage: 2 });
		// A middling card has five of those dice, so five HP is on the table.
		expect(throwOf(state, 'p1', 'blue')).toMatchObject({ dice: 5, minDamage: 0, maxDamage: 5 });
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
