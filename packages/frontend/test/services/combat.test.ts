import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	MAX_CHARGES,
	type CombatState,
	type FighterSeed
} from '$services/combat.controller';
import type { CombatColor } from '$types/character-definition.type';

/**
 * The stand-off's rules, played out through the controller: what each of the three
 * orders does, what each colour bends about them, and how a finished game is
 * reported for experience.
 *
 * The rival side chooses for itself, so every test pins Math.random to 0 — which
 * settles both weighted picks (always the first option: `shoot` when it has a charge
 * and something to fear, `charge` when it doesn't) and the target it aims at (the
 * first of those holding the most charges). Rivals seeded on a colour with no head
 * start therefore open the game by charging, which is the quiet backdrop most of
 * these cases need; rivals seeded yellow open the game shooting.
 */

function seed(
	id: string,
	side: 'error' | 'info',
	color: CombatColor,
	extra: Partial<FighterSeed> = {}
): FighterSeed {
	return {
		id,
		spawnId: id,
		name: id.toUpperCase(),
		side,
		color,
		moves: [],
		spd: 5,
		hpPool: 5,
		...extra
	};
}

const fighterOf = (state: CombatState, id: string) =>
	state.fighters.find((fighter) => fighter.id === id)!;

/** Play the committed turn out — the controller's resolution is timed. */
async function playTurn(controller: CombatController): Promise<void> {
	controller.commit();
	await vi.runAllTimersAsync();
}

describe('the stand-off', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe('charges', () => {
		it("gives yellow's head start a charge to open on, and nobody else", () => {
			const state = get(
				new CombatController([
					seed('r0', 'error', 'blue'),
					seed('p0', 'info', 'yellow'),
					seed('p1', 'info', 'blue'),
					seed('p2', 'info', 'green') // green mixes yellow, so it opens armed too
				])
			);
			expect(fighterOf(state, 'p0').charges).toBe(1);
			expect(fighterOf(state, 'p2').charges).toBe(1);
			expect(fighterOf(state, 'p1').charges).toBe(0);
			expect(fighterOf(state, 'r0').charges).toBe(0);
		});

		it('refuses Shoot to a fighter with nothing banked', () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'blue')
			]);
			controller.setAction('p0', 'shoot');
			const state = get(controller);
			// The order never took, so the side is not ready to commit either.
			expect(fighterOf(state, 'p0').action).toBeNull();
			expect(fighterOf(state, 'p0').canShoot).toBe(false);
			expect(state.ready).toBe(false);
		});

		it('banks one charge a turn, and stops at the cap', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'blue')
			]);
			for (let turn = 1; turn <= MAX_CHARGES + 2; turn++) {
				controller.setAction('p0', 'charge');
				await playTurn(controller);
			}
			expect(fighterOf(get(controller), 'p0').charges).toBe(MAX_CHARGES);
		});

		it('spends a charge on the shot it fires', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'yellow')
			]);
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').charges).toBe(0);
		});
	});

	describe('what a turn does', () => {
		it('takes down a fighter caught charging', async () => {
			const controller = new CombatController([
				// A red rival with nothing banked can only load — and loading is the one
				// thing that leaves it open.
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'yellow')
			]);
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'r0').down).toBe(true);
			expect(state.outcome).toBe('win');
		});

		it('blocks every shot aimed at a fighter that defends', async () => {
			const controller = new CombatController([
				// Yellow rivals open armed, and with nobody opposite holding a charge they
				// have nothing to fear — so all three fire, and all three fire at P0.
				seed('r0', 'error', 'yellow'),
				seed('r1', 'error', 'yellow'),
				seed('r2', 'error', 'yellow'),
				seed('p0', 'info', 'red')
			]);
			controller.setAction('p0', 'defend');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(false);
		});

		it('leaves a shooter open — two who shoot each other both fall', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'yellow')
			]);
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'r0').down).toBe(true);
			expect(fighterOf(state, 'p0').down).toBe(true);
			expect(state.outcome).toBe('draw');
		});

		it('wastes a bullet on somebody already falling, rather than sparing them', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('r1', 'error', 'yellow'),
				seed('p0', 'info', 'red')
			]);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'p0').down).toBe(true);
			// Two shots, one target: the second one lands on a fighter already going down.
			expect(state.log.some((line) => line.includes('already falling'))).toBe(true);
			expect(state.outcome).toBe('lose');
		});
	});

	describe("blue's free guard", () => {
		it('turns aside one shot on a turn spent doing something else', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'blue')
			]);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'p0').down).toBe(false);
			// It still banked the charge it spent the turn on.
			expect(fighterOf(state, 'p0').charges).toBe(1);
		});

		it('stops one shot a turn, not two — focused fire is the answer to it', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('r1', 'error', 'yellow'),
				seed('p0', 'info', 'blue')
			]);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(true);
		});

		it('comes back the next turn — it is not spent for the battle', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'blue')
			]);
			// Turn one: the rival's opening shot is guarded away.
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'r0').charges).toBe(0);
			// Turn two: the rival reloads, turn three it fires again — and is guarded again.
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(false);
		});
	});

	describe("red's extra shot", () => {
		it('rides on a charge or a defend, but never on a shot', () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'orange') // orange = red + yellow: armed, and double-acting
			]);
			controller.setAction('p0', 'charge');
			expect(fighterOf(get(controller), 'p0').canBonus).toBe(true);

			controller.setBonus('p0', true);
			expect(fighterOf(get(controller), 'p0').bonus).toBe(true);

			// Taking the shot as the order itself gives the extra up — nobody fires twice.
			controller.setAction('p0', 'shoot');
			const state = get(controller);
			expect(fighterOf(state, 'p0').bonus).toBe(false);
			expect(fighterOf(state, 'p0').canBonus).toBe(false);
		});

		it('is never offered to a colour without red in it', () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'green') // green = blue + yellow: armed, but single-acting
			]);
			controller.setAction('p0', 'charge');
			expect(fighterOf(get(controller), 'p0').canBonus).toBe(false);
			controller.setBonus('p0', true);
			expect(fighterOf(get(controller), 'p0').bonus).toBe(false);
		});

		it('fires for real, and costs a charge of its own', async () => {
			const controller = new CombatController([
				// Red, so there is no free guard in the way of the extra shot.
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'orange')
			]);
			controller.setAction('p0', 'charge');
			controller.setBonus('p0', true);
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'r0').down).toBe(true);
			// One charge spent on the extra shot, one banked by the charge order.
			expect(fighterOf(state, 'p0').charges).toBe(1);
		});
	});

	describe('orders', () => {
		it('is not ready to commit until every fighter still standing has one', () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'blue')
			]);
			expect(get(controller).ready).toBe(false);
			controller.setAction('p0', 'charge');
			expect(get(controller).ready).toBe(false);
			controller.setAction('p1', 'defend');
			expect(get(controller).ready).toBe(true);
		});

		it('keeps the rival side secret until the turn is played out', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'blue')
			]);
			// The rival has already decided — the page just isn't told.
			expect(fighterOf(get(controller), 'r0').action).toBeNull();
			controller.setAction('p0', 'defend');
			await playTurn(controller);
			// Once carried out it is on the record, in the log of what the turn amounted to.
			expect(get(controller).log.join(' ')).toContain('R0');
		});

		it('aims a shot at the first rival by default, and lets it be re-aimed', () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('r1', 'error', 'blue'),
				seed('p0', 'info', 'yellow')
			]);
			controller.setAction('p0', 'shoot');
			expect(fighterOf(get(controller), 'p0').targetId).toBe('r0');
			controller.setTarget('p0', 'r1');
			expect(fighterOf(get(controller), 'p0').targetId).toBe('r1');
		});

		it('refuses a target that is not a live enemy', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('r1', 'error', 'red'),
				seed('p0', 'info', 'yellow'),
				seed('p1', 'info', 'blue')
			]);
			controller.setAction('p0', 'shoot');
			controller.setAction('p1', 'charge');
			await playTurn(controller); // r0 goes down
			controller.setAction('p0', 'charge');
			controller.setAction('p1', 'charge');
			// A teammate was never a target, and neither is the rival already down.
			controller.setAction('p0', 'charge');
			controller.setTarget('p0', 'p1');
			controller.setTarget('p0', 'r0');
			expect(fighterOf(get(controller), 'p0').targetId).not.toBe('p1');
			expect(fighterOf(get(controller), 'p0').targetId).not.toBe('r0');
		});
	});

	describe('the report', () => {
		it('says nothing at all until the game is decided', () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'blue')
			]);
			expect(controller.report()).toBeNull();
		});

		it('states the player side only, whole for the standing and empty for the lost', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'yellow', { hpPool: 7 }),
				seed('p1', 'info', 'red', { hpPool: 4 })
			]);
			// P0 trades shots with the rival: both fall, and P1 is left holding the field.
			controller.setAction('p0', 'shoot');
			controller.setAction('p1', 'charge');
			await playTurn(controller);

			const report = controller.report()!;
			expect(report.outcome).toBe('win');
			expect(report.fighters).toHaveLength(2);
			expect(report.fighters.map((f) => f.spawnId).sort()).toEqual(['p0', 'p1']);
			// A fighter is standing or it is not: no half-measures either way.
			const p0 = report.fighters.find((f) => f.spawnId === 'p0')!;
			const p1 = report.fighters.find((f) => f.spawnId === 'p1')!;
			expect(p0).toEqual({ spawnId: 'p0', hpLeft: 0, maxHp: 7 });
			expect(p1).toEqual({ spawnId: 'p1', hpLeft: 4, maxHp: 4 });
		});
	});
});
