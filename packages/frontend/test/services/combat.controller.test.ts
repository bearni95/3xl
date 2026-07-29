import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	type CombatAction,
	type FighterSeed,
	type FighterView
} from '$services/combat.controller';
import type { CombatColor } from '$types/character-definition.type';

/** Three a side, in line-up order: the first three colours are the rivals', the
 * last three the player's. */
function seeds(colors: CombatColor[]): FighterSeed[] {
	const make = (side: 'error' | 'info', i: number, offset: number): FighterSeed => ({
		id: `${side}:${i}`,
		spawnId: `${i}`,
		name: `${side}-${i}`,
		side,
		color: colors[offset + i],
		moves: []
	});
	return [0, 1, 2]
		.map((i) => make('error', i, 0))
		.concat([0, 1, 2].map((i) => make('info', i, 3)));
}

/**
 * A tap on one of the buttons under a fighter, played exactly as `CombatArena`
 * plays it: the sword adds red's extra only when the turn is already spent on
 * something else, and reads as plain Shoot otherwise.
 */
function tap(controller: CombatController, fighter: FighterView, order: CombatAction): void {
	const onTop = fighter.bonus || fighter.canBonus;
	if (order === 'shoot' && onTop) {
		controller.setBonus(fighter.id, !fighter.bonus);
		return;
	}
	controller.setAction(fighter.id, order);
}

const playerFighters = (controller: CombatController): FighterView[] =>
	get(controller).fighters.filter((fighter) => fighter.side === 'info' && !fighter.down);

describe('CombatController — giving orders', () => {
	it('takes the sword as a plain Shoot from a fighter with no order yet', () => {
		// Orange carries red's extra *and* yellow's head start, so it stands loaded on
		// turn one with nothing else booked. The sword under it used to buy the extra
		// rather than the order itself, which lit the button while leaving the fighter
		// unordered — the side then never became commitable.
		const controller = new CombatController(
			seeds(['blue', 'blue', 'blue', 'orange', 'orange', 'orange'])
		);
		for (const fighter of playerFighters(controller)) tap(controller, fighter, 'shoot');
		for (const fighter of playerFighters(controller)) {
			expect(fighter.action).toBe('shoot');
			expect(fighter.bonus).toBe(false);
			expect(fighter.ordered).toBe(true);
		}
		expect(get(controller).ready).toBe(true);
	});

	it('adds the extra shot on top of an order already given, and takes it back', () => {
		// Orange is red and yellow both: it carries the extra shot *and* opens with a
		// charge banked, so it can fire on the very first turn.
		const controller = new CombatController(
			seeds(['blue', 'blue', 'blue', 'orange', 'blue', 'blue'])
		);
		const red = () => playerFighters(controller).find((fighter) => fighter.color === 'orange')!;
		// The sword is the order itself here — nothing else is booked.
		tap(controller, red(), 'shoot');
		expect(red().action).toBe('shoot');
		expect(red().bonus).toBe(false);

		// Cover instead, then add the extra shot on top of the cover.
		tap(controller, red(), 'defend');
		expect(red().action).toBe('defend');
		tap(controller, red(), 'shoot');
		expect(red().action).toBe('defend');
		expect(red().bonus).toBe(true);
		// Tapping it again takes the extra back, leaving the cover standing.
		tap(controller, red(), 'shoot');
		expect(red().action).toBe('defend');
		expect(red().bonus).toBe(false);
	});
});

describe('CombatController — the fight as it thins', () => {
	/** Play a whole fight through the buttons, asserting the side is commitable on
	 * every turn — including the turns after one of the player's fighters has fallen. */
	async function playOut(colors: CombatColor[], pick: (fighter: FighterView) => CombatAction) {
		const controller = new CombatController(seeds(colors));
		let sawLoss = false;
		for (let turn = 0; turn < 30; turn++) {
			const state = get(controller);
			if (state.outcome) break;
			sawLoss ||= state.fighters.some((fighter) => fighter.side === 'info' && fighter.down);
			for (const fighter of playerFighters(controller)) tap(controller, fighter, pick(fighter));
			expect(get(controller).ready).toBe(true);
			controller.commit();
			while (get(controller).phase === 'resolving') {
				await new Promise((resolve) => setTimeout(resolve, 20));
			}
		}
		return sawLoss;
	}

	it('stays commitable turn after turn once fighters start falling', async () => {
		let sawLoss = false;
		for (const colors of [
			['red', 'yellow', 'blue', 'red', 'yellow', 'blue'],
			['orange', 'purple', 'green', 'orange', 'purple', 'green'],
			['red', 'red', 'red', 'red', 'red', 'red']
		] as CombatColor[][]) {
			// Fire whenever there is a shot in hand, load otherwise — the fastest way to
			// thin both sides out.
			sawLoss ||= await playOut(colors, (fighter) => (fighter.canShoot ? 'shoot' : 'charge'));
		}
		// The point of the run: it went past a fighter of the player's going down.
		expect(sawLoss).toBe(true);
	}, 120000);
});
