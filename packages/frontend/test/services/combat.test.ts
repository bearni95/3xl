import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	MAX_CHARGES,
	RIVAL_RANKS,
	type CombatState,
	type FighterSeed
} from '$services/combat.controller';
import { cellSide, isBoardCell } from '$utils/mugen/hex';
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

/** What the controller asked the board to do about auras. */
interface AuraLog {
	lit: { id: string; color: string }[];
	doused: string[];
}

/**
 * A board that does nothing but remember what it was told. The controller drives the
 * canvas through this interface, so it is the only way to check what a fight actually
 * *shows* — the aura being the whole of what the board says about a fighter's charge
 * now that nothing is drawn under its feet. Every method the controller calls has to
 * be here: it invokes them as `this.board?.x(…)`, which throws rather than skips once
 * `board` is set.
 */
function fakeBoard(log: AuraLog) {
	const done = () => Promise.resolve();
	return {
		showAura: (id: string, color: string) => {
			log.lit.push({ id, color });
			return done();
		},
		clearAura: (id: string) => log.doused.push(id),
		clearAuras: () => {},
		clearCallouts: () => {},
		showCallout: () => {},
		showSlash: () => {},
		playMove: done,
		playHurt: done,
		shoot: done,
		knockOut: done,
		regroup: done
	} as unknown as Parameters<CombatController['attachBoard']>[0];
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
				seed('p0', 'info', 'blue'), // holds the only lane, and covers it every turn
				seed('p1', 'info', 'blue') // the empty lane: nothing can reach it, so it just loads
			]);
			for (let turn = 1; turn <= MAX_CHARGES + 2; turn++) {
				controller.setAction('p0', 'defend');
				controller.setAction('p1', 'charge');
				await playTurn(controller);
			}
			expect(fighterOf(get(controller), 'p1').charges).toBe(MAX_CHARGES);
		});

		it('holds one charge at most — loading again is a turn thrown away', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'blue') // the empty lane: nothing can reach it
			]);
			expect(MAX_CHARGES).toBe(1);
			controller.setAction('p0', 'defend');
			controller.setAction('p1', 'charge');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p1').charges).toBe(1);
			// A second turn spent loading buys nothing, and the fight says as much.
			controller.setAction('p0', 'defend');
			controller.setAction('p1', 'charge');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'p1').charges).toBe(1);
			expect(state.log.some((line) => line.includes('already full up'))).toBe(true);
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

		it('blocks the shot aimed at a fighter that defends', async () => {
			const controller = new CombatController([
				// A yellow rival opens armed, and with nobody opposite holding a charge it
				// has nothing to fear — so it fires on turn one.
				seed('r0', 'error', 'yellow'),
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

		it('takes a fighter down through the lane it stands in', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'red')
			]);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'p0').down).toBe(true);
			expect(state.outcome).toBe('lose');
		});
	});

	describe('the aura a charge burns with', () => {
		it('lights in the fighter\'s own colour the turn it loads, and stays lit', async () => {
			const log: AuraLog = { lit: [], doused: [] };
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'green') // empty lane, and green opens already loaded
			]);
			controller.attachBoard(fakeBoard(log));
			// Green mixes yellow, so it opens loaded — and alight — before a single order
			// is given, burning in its own colour rather than the primary it borrowed.
			expect(log.lit).toContainEqual({ id: 'p1', color: 'green' });

			controller.setAction('p0', 'defend');
			controller.setAction('p1', 'defend');
			await playTurn(controller);
			expect(log.lit.filter((entry) => entry.id === 'p0')).toHaveLength(0);

			controller.setAction('p0', 'charge');
			controller.setAction('p1', 'defend');
			await playTurn(controller);
			expect(log.lit).toContainEqual({ id: 'p0', color: 'blue' });

			// Held across turns without being re-lit, and never put out while it is held.
			const litOnce = log.lit.filter((entry) => entry.id === 'p0').length;
			controller.setAction('p0', 'defend');
			controller.setAction('p1', 'defend');
			await playTurn(controller);
			expect(log.lit.filter((entry) => entry.id === 'p0')).toHaveLength(litOnce);
			expect(log.doused).not.toContain('p0');
		});

		it('goes out the turn the charge is fired', async () => {
			const log: AuraLog = { lit: [], doused: [] };
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'yellow')
			]);
			controller.attachBoard(fakeBoard(log));
			expect(log.lit).toContainEqual({ id: 'p0', color: 'yellow' });

			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').charges).toBe(0);
			expect(log.doused).toContain('p0');
		});
	});

	describe('lanes', () => {
		it('faces every fighter the one holding the same place in the other line', () => {
			const state = get(
				new CombatController([
					seed('r0', 'error', 'blue'),
					seed('r1', 'error', 'blue'),
					seed('p0', 'info', 'blue'),
					seed('p1', 'info', 'blue')
				])
			);
			expect(fighterOf(state, 'p0').opponentId).toBe('r0');
			expect(fighterOf(state, 'p1').opponentId).toBe('r1');
			expect(fighterOf(state, 'r0').opponentId).toBe('p0');
			expect(fighterOf(state, 'r1').opponentId).toBe('p1');
		});

		it('leaves the odd fighter out of a longer line with nobody to shoot', () => {
			const state = get(
				new CombatController([
					seed('r0', 'error', 'blue'),
					seed('p0', 'info', 'yellow'),
					seed('p1', 'info', 'yellow') // armed, but its lane is empty
				])
			);
			expect(fighterOf(state, 'p0').canShoot).toBe(true);
			expect(fighterOf(state, 'p1').opponentId).toBeNull();
			expect(fighterOf(state, 'p1').canShoot).toBe(false);
		});

		it('re-pairs the lines as they thin', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('r1', 'error', 'red'),
				seed('p0', 'info', 'yellow'),
				seed('p1', 'info', 'yellow')
			]);
			expect(fighterOf(get(controller), 'p0').opponentId).toBe('r0');
			// P0 shoots its opposite down; the rival line closes up behind it.
			controller.setAction('p0', 'shoot');
			controller.setAction('p1', 'charge');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'r0').down).toBe(true);
			expect(fighterOf(state, 'p0').opponentId).toBe('r1');
			// And the fighter behind it now has the empty lane.
			expect(fighterOf(state, 'p1').opponentId).toBeNull();
		});

		it('refuses Shoot to a fighter whose lane is empty, however well charged', () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'yellow')
			]);
			controller.setAction('p1', 'shoot');
			expect(fighterOf(get(controller), 'p1').action).toBeNull();
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

		it('is spent for the battle — the next shot through the lane lands', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'blue')
			]);
			// Turn one: the rival's opening shot is guarded away, and the guard goes with it.
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(false);
			expect(fighterOf(get(controller), 'p0').guarded).toBe(false);
			// Turn two the rival reloads; turn three it fires again, and this one lands.
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(true);
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

		it('names the one fighter a shot can go to, rather than offering a choice', () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('r1', 'error', 'blue'),
				seed('p0', 'info', 'yellow'),
				seed('p1', 'info', 'yellow')
			]);
			controller.setAction('p0', 'shoot');
			const state = get(controller);
			// The order is complete the moment it is given: there was never anything to aim.
			expect(fighterOf(state, 'p0').ordered).toBe(true);
			expect(fighterOf(state, 'p0').opponentName).toBe('R0');
			expect(fighterOf(state, 'p1').opponentName).toBe('R1');
		});
	});

	describe('the ground the rivals give up', () => {
		it('has a rank per loss, each one cell smaller than the last', () => {
			expect(RIVAL_RANKS.map((rank) => rank.length)).toEqual([3, 2, 1]);
		});

		it('stands them on real cells — the opening rank purple, the rest their own half', () => {
			for (const cell of RIVAL_RANKS[0]) {
				expect(isBoardCell(cell.q, cell.r)).toBe(true);
				// They open as far forward as the board allows: the shared purple column.
				expect(cellSide(cell.q)).toBe('purple');
			}
			for (const rank of RIVAL_RANKS.slice(1)) {
				for (const cell of rank) {
					expect(isBoardCell(cell.q, cell.r)).toBe(true);
					expect(cellSide(cell.q)).toBe('red');
				}
			}
		});

		it('never sends two survivors to the same cell', () => {
			for (const rank of RIVAL_RANKS) {
				const keys = rank.map((cell) => `${cell.q},${cell.r}`);
				expect(new Set(keys).size).toBe(keys.length);
			}
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

		it('states the player side only, standing or down', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'yellow'),
				seed('p1', 'info', 'red')
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
			expect(p0).toEqual({ spawnId: 'p0', down: true });
			expect(p1).toEqual({ spawnId: 'p1', down: false });
		});
	});
});
