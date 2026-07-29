import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	MAX_CHARGES,
	PLAYER_CELLS,
	RIVAL_CELLS,
	type CombatState,
	type FighterSeed
} from '$services/combat.controller';
import { cellSide, findPath, isBoardCell, type Hex } from '$utils/mugen/hex';
import { ORDER_ICONS } from '$utils/color/traits';
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

/**
 * Play the opening turn with every player fighter loading.
 *
 * No colour opens armed any more — a free charge is a gift like any other and has to
 * be given on a turn spent elsewhere — so **nobody can fire on turn one**, and any
 * test about shooting starts by getting past it. A fighter that spends turn one
 * charging takes its charge from the order, not from its colour, so this leaves every
 * side holding exactly one charge with every gift still in hand (the rivals load too:
 * with nothing opposite to fear they always do).
 */
async function openWithCharges(controller: CombatController): Promise<void> {
	for (const fighter of get(controller).fighters) {
		if (fighter.side === 'info') controller.setAction(fighter.id, 'charge');
	}
	await playTurn(controller);
}

/** What the controller asked the board to do about auras, and about the ground: a
 * lane's winner is walked onto (or off) the white cell it was fought over. */
interface AuraLog {
	lit: { id: string; color: string }[];
	doused: string[];
	moved: { id: string; cell: Hex }[];
	/** Every badge the board was asked to draw at a fighter's corner: the glyphs of
	 * what its colour grants it, whether each has been used up, and the colour they
	 * were drawn in. Appended to on every change, so the last entry for an id is what
	 * that fighter's corner currently shows. */
	badged: { id: string; traits: { icon: string; spent: boolean }[]; color: string }[];
}

const boardLog = (): AuraLog => ({ lit: [], doused: [], moved: [], badged: [] });

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
		setTraits: (id: string, traits: { icon: string; spent: boolean }[], color: string) => {
			log.badged.push({ id, traits: traits.map((trait) => ({ ...trait })), color });
		},
		clearAuras: () => {},
		clearCallouts: () => {},
		showCallout: () => {},
		showSlash: () => {},
		playMove: done,
		playHurt: done,
		shoot: done,
		knockOut: done,
		regroup: (id: string, cell: Hex) => {
			log.moved.push({ id, cell });
			return done();
		}
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
		it('opens everybody empty, whatever their colour', () => {
			const state = get(
				new CombatController([
					seed('r0', 'error', 'blue'),
					seed('p0', 'info', 'yellow'),
					seed('p1', 'info', 'blue'),
					seed('p2', 'info', 'green') // green mixes yellow
				])
			);
			// Yellow's charge is a gift, not a head start: it has to be given on a turn
			// spent doing something else, so nobody stands loaded before a turn is played.
			for (const id of ['r0', 'p0', 'p1', 'p2']) {
				expect(fighterOf(state, id).charges).toBe(0);
			}
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
				seed('p0', 'info', 'blue')
			]);
			await openWithCharges(controller);
			expect(fighterOf(get(controller), 'p0').charges).toBe(1);
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').charges).toBe(0);
		});
	});

	describe('what a turn does', () => {
		it('takes down a fighter caught reloading', async () => {
			const controller = new CombatController([
				// Red, whose gift is a shot: a rival whose gift were a charge would simply
				// re-arm for free the turn it fired, and never be caught empty.
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'yellow')
			]);
			await openWithCharges(controller);
			// Turn two the rival fires and the cover holds, which leaves it empty...
			controller.setAction('p0', 'defend');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(false);
			// ...so turn three it has to load again, and loading is the one thing that
			// leaves a fighter open.
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'r0').down).toBe(true);
			expect(state.outcome).toBe('win');
		});

		it('blocks the shot aimed at a fighter that defends', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				// Yellow, so nothing but the order itself is standing between it and the
				// bullet — its gift is a charge, and it is already full up.
				seed('p0', 'info', 'yellow')
			]);
			await openWithCharges(controller);
			controller.setAction('p0', 'defend');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(false);
		});

		it('leaves a shooter open — two who shoot each other both fall', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'yellow')
			]);
			await openWithCharges(controller);
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
				seed('p0', 'info', 'yellow')
			]);
			await openWithCharges(controller);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'p0').down).toBe(true);
			expect(state.outcome).toBe('lose');
		});
	});

	describe('the badge a colour wears', () => {
		/** What a fighter's corner shows now: the last badge the board was given for it. */
		const badgeOf = (log: AuraLog, id: string) =>
			[...log.badged].reverse().find((entry) => entry.id === id);

		it("gives every fighter its colour's glyphs, in its own colour", () => {
			const log = boardLog();
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'purple')
			]);
			controller.attachBoard(fakeBoard(log));

			// One glyph per primary — the very icon that order's button is drawn with —
			// and a compound carries both of its components', in component order. Nothing
			// is spent before a turn is played.
			expect(badgeOf(log, 'p0')).toEqual({
				id: 'p0',
				traits: [{ icon: ORDER_ICONS.defend, spent: false }],
				color: 'blue'
			});
			expect(badgeOf(log, 'p1')).toEqual({
				id: 'p1',
				traits: [
					{ icon: ORDER_ICONS.shoot, spent: false },
					{ icon: ORDER_ICONS.defend, spent: false }
				],
				color: 'purple'
			});
			// The rivals wear theirs too: their orders are the secret, their colour is not.
			expect(badgeOf(log, 'r0')).toEqual({
				id: 'r0',
				traits: [{ icon: ORDER_ICONS.charge, spent: false }],
				color: 'yellow'
			});
		});

		it('marks a gift spent the moment it is taken, and leaves the rest in hand', async () => {
			const log = boardLog();
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'green') // the free guard and the free charge
			]);
			controller.attachBoard(fakeBoard(log));
			await openWithCharges(controller);

			// The charge came off a turn spent loading? No — that was the order. The gift
			// is still in hand, and the corner still offers it.
			expect(badgeOf(log, 'p0')?.traits).toEqual([
				{ icon: ORDER_ICONS.defend, spent: false },
				{ icon: ORDER_ICONS.charge, spent: false }
			]);

			// A turn spent firing takes both: the guard turns the rival's bullet aside and
			// the charge pays back what the shot spent.
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			expect(badgeOf(log, 'p0')?.traits).toEqual([
				{ icon: ORDER_ICONS.defend, spent: true },
				{ icon: ORDER_ICONS.charge, spent: true }
			]);
		});
	});

	describe('the aura a charge burns with', () => {
		it("lights in the fighter's own colour the turn it loads, and stays lit", async () => {
			const log = boardLog();
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'green') // the empty lane: nothing can reach it
			]);
			controller.attachBoard(fakeBoard(log));
			// Nobody opens loaded, so nothing is alight before a turn is played.
			expect(log.lit).toHaveLength(0);

			controller.setAction('p0', 'defend');
			controller.setAction('p1', 'defend');
			await playTurn(controller);
			// Green mixes yellow: a turn spent covering is a turn its free charge pays out
			// on, and the aura it lights burns in its own colour rather than the primary it
			// borrowed. Blue banked nothing, so nothing lit.
			expect(log.lit).toContainEqual({ id: 'p1', color: 'green' });
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
			const log = boardLog();
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				// Blue: its free guard sees it through the answering shot, and its colour
				// hands it no charge to quietly re-light the aura with.
				seed('p0', 'info', 'blue')
			]);
			controller.attachBoard(fakeBoard(log));
			await openWithCharges(controller);
			expect(log.lit).toContainEqual({ id: 'p0', color: 'blue' });

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

		it('leaves the odd fighter out of a longer line with nobody to shoot', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'yellow'),
				seed('p1', 'info', 'yellow') // loaded like the rest, but its lane is empty
			]);
			await openWithCharges(controller);
			const state = get(controller);
			expect(fighterOf(state, 'p0').canShoot).toBe(true);
			expect(fighterOf(state, 'p1').opponentId).toBeNull();
			expect(fighterOf(state, 'p1').canShoot).toBe(false);
		});

		it('never re-pairs the lines: a settled lane is settled for good', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('r1', 'error', 'red'),
				// Blue both, so the rivals' answering volley is turned aside and the lanes
				// are settled one at a time rather than all at once.
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'blue')
			]);
			await openWithCharges(controller);
			expect(fighterOf(get(controller), 'p0').opponentId).toBe('r0');
			// P0 shoots its opposite down and wins that lane outright.
			controller.setAction('p0', 'shoot');
			controller.setAction('p1', 'charge');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'r0').down).toBe(true);
			// It has nothing left to shoot — the rival behind is not its to reach...
			expect(fighterOf(state, 'p0').opponentId).toBeNull();
			expect(fighterOf(state, 'p0').canShoot).toBe(false);
			// ...and that rival is still facing the fighter it always faced.
			expect(fighterOf(state, 'p1').opponentId).toBe('r1');
			expect(fighterOf(state, 'r1').opponentId).toBe('p1');
		});

		it('refuses Shoot to a fighter whose lane is empty, however well charged', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'yellow')
			]);
			await openWithCharges(controller);
			expect(fighterOf(get(controller), 'p1').charges).toBe(1);
			controller.setAction('p1', 'shoot');
			expect(fighterOf(get(controller), 'p1').action).toBeNull();
		});
	});

	describe('the free order a colour hands over', () => {
		it('comes on a turn spent on something else', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'yellow')
			]);
			// A turn spent covering still pays out yellow's charge — that is the whole
			// point of it. Nothing was ordered but the cover.
			controller.setAction('p0', 'defend');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'p0').charges).toBe(1);
			expect(fighterOf(state, 'p0').spent).toEqual(['charge']);
			expect(state.log.some((line) => line.includes('free charge'))).toBe(true);
		});

		it('never comes on the order it *is*', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'blue')
			]);
			await openWithCharges(controller);
			// Blue covering is blue *ordered* to cover: the shot is stopped by the order,
			// and the gift is not touched by a turn it was never a second action on.
			controller.setAction('p0', 'defend');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'p0').down).toBe(false);
			expect(fighterOf(state, 'p0').spent).toEqual([]);
			expect(state.log.some((line) => line.includes('blocked'))).toBe(true);
		});

		it('is worth one use in the whole battle', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'blue')
			]);
			await openWithCharges(controller);
			// The rival fires and blue's free guard turns it aside — and goes with it.
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(false);
			expect(fighterOf(get(controller), 'p0').spent).toEqual(['defend']);
			// The rival reloads, then fires again — and this one has nothing to stop it.
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(true);
		});

		it('is not taken by a turn it could do nothing on', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'yellow'),
				seed('p1', 'info', 'blue') // the empty lane: nothing is ever fired at it
			]);
			await openWithCharges(controller);
			controller.setAction('p0', 'defend');
			controller.setAction('p1', 'charge');
			await playTurn(controller);
			const state = get(controller);
			// A free charge on a fighter already full up puts nothing anywhere, so it is
			// not the gift being taken — it waits for a turn it can be.
			expect(fighterOf(state, 'p0').charges).toBe(1);
			expect(fighterOf(state, 'p0').spent).toEqual([]);
			// And a free guard nobody fires at has turned nothing aside.
			expect(fighterOf(state, 'p1').spent).toEqual([]);
		});

		it('brings both of a compound in the same turn', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'green') // green = blue + yellow: a free guard and a free charge
			]);
			await openWithCharges(controller);
			// Neither gift is the order given, so the turn it fires is the turn it gets
			// both: the guard turns the answering bullet aside and the charge pays back
			// what the shot spent.
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'r0').down).toBe(true);
			expect(fighterOf(state, 'p0').down).toBe(false);
			expect(fighterOf(state, 'p0').charges).toBe(1);
			expect(fighterOf(state, 'p0').spent).toEqual(['defend', 'charge']);
		});

		it("fires red's shot beside the order the fighter was given", async () => {
			const controller = new CombatController([
				// Red both ways, so no free guard stands between a bullet and anybody.
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'red')
			]);
			await openWithCharges(controller);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			const state = get(controller);
			// It was never ordered to shoot, and the rival went down all the same.
			expect(fighterOf(state, 'p0').action).toBe('charge');
			expect(fighterOf(state, 'r0').down).toBe(true);
			expect(fighterOf(state, 'p0').spent).toEqual(['shoot']);
			expect(state.log.some((line) => line.includes('free shot'))).toBe(true);
		});

		it("never doubles a fighter's own shot", async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('p0', 'info', 'red')
			]);
			await openWithCharges(controller);
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			const state = get(controller);
			// The order *is* the gift's order, so nobody fires twice and the gift is
			// still there to be had on some later turn.
			expect(fighterOf(state, 'p0').spent).toEqual([]);
			expect(state.log.some((line) => line.includes('free shot'))).toBe(false);
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
			await openWithCharges(controller);
			expect(fighterOf(get(controller), 'r0').action).toBeNull();
			controller.setAction('p0', 'defend');
			await playTurn(controller);
			// Once carried out it is on the record, in the log of what the turn amounted to.
			expect(get(controller).log.join(' ')).toContain('R0');
		});

		it('names the one fighter a shot can go to, rather than offering a choice', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'blue'),
				seed('r1', 'error', 'blue'),
				seed('p0', 'info', 'yellow'),
				seed('p1', 'info', 'yellow')
			]);
			await openWithCharges(controller);
			controller.setAction('p0', 'shoot');
			const state = get(controller);
			// The order is complete the moment it is given: there was never anything to aim.
			expect(fighterOf(state, 'p0').ordered).toBe(true);
			expect(fighterOf(state, 'p0').opponentName).toBe('R0');
			expect(fighterOf(state, 'p1').opponentName).toBe('R1');
		});
	});

	describe('the ground a lane is fought over', () => {
		it('opens with the rivals on the white column and the player facing them', () => {
			expect(RIVAL_CELLS).toHaveLength(PLAYER_CELLS.length);
			for (const cell of RIVAL_CELLS) {
				expect(isBoardCell(cell.q, cell.r)).toBe(true);
				// As far forward as the board allows: the shared white column, which is
				// the ground each lane is played for.
				expect(cellSide(cell.q)).toBe('purple');
			}
			for (const cell of PLAYER_CELLS) {
				expect(isBoardCell(cell.q, cell.r)).toBe(true);
				expect(cellSide(cell.q)).toBe('blue');
			}
			// Each pair is drawn a row apart, which is what puts the two of them in one
			// lane — and what makes the white cell in front of the player its own to take.
			RIVAL_CELLS.forEach((rival, lane) => {
				expect(PLAYER_CELLS[lane].r).toBe(rival.r - 1);
			});
			// Nobody shares a cell with anybody.
			const keys = [...RIVAL_CELLS, ...PLAYER_CELLS].map((cell) => `${cell.q},${cell.r}`);
			expect(new Set(keys).size).toBe(keys.length);
		});

		it('leaves both moves walkable — each side may cross its own half and the white column', () => {
			// The board only ever *walks* a fighter to its new ground, so the ground has to
			// be reachable: a route over its own half plus the shared white column, which
			// is exactly what the board allows. Without one the fighter would simply stay
			// where it was, with nothing to say so.
			const half = (side: 'red' | 'blue') => (cell: Hex) =>
				isBoardCell(cell.q, cell.r) && cellSide(cell.q) !== (side === 'blue' ? 'red' : 'blue');
			RIVAL_CELLS.forEach((rival, lane) => {
				expect(findPath(PLAYER_CELLS[lane], rival, half('blue'))).not.toBeNull();
				expect(findPath(rival, { q: rival.q - 1, r: rival.r }, half('red'))).not.toBeNull();
			});
		});

		it('walks the player up onto the white cell it just won', async () => {
			const log = boardLog();
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('p0', 'info', 'blue') // its free guard sees it through the answering shot
			]);
			controller.attachBoard(fakeBoard(log));
			await openWithCharges(controller);
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'r0').down).toBe(true);
			// The cell the rival was holding is the player's now.
			expect(log.moved).toEqual([{ id: 'p0', cell: RIVAL_CELLS[0] }]);
			expect(cellSide(log.moved[0].cell.q)).toBe('purple');
		});

		it('withdraws the rival a column into its own half when it wins its lane', async () => {
			const log = boardLog();
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				// Yellow, so the turn it spends loading it fires nothing back: a colour
				// with a free shot in it would take the rival down with it.
				seed('p0', 'info', 'yellow')
			]);
			controller.attachBoard(fakeBoard(log));
			await openWithCharges(controller);
			controller.setAction('p0', 'charge');
			await playTurn(controller);
			expect(fighterOf(get(controller), 'p0').down).toBe(true);
			// Off the white column, one column back the way it came.
			expect(log.moved).toEqual([{ id: 'r0', cell: { q: RIVAL_CELLS[0].q - 1, r: RIVAL_CELLS[0].r } }]);
			expect(cellSide(log.moved[0].cell.q)).toBe('red');
		});

		it('leaves the ground alone when both halves of a lane fall together', async () => {
			const log = boardLog();
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'yellow')
			]);
			controller.attachBoard(fakeBoard(log));
			await openWithCharges(controller);
			// Both are loaded and both fire: nobody is left standing to take the cell.
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'r0').down).toBe(true);
			expect(fighterOf(state, 'p0').down).toBe(true);
			expect(log.moved).toEqual([]);
		});

		it('moves nobody in the lanes the volley did not decide', async () => {
			const log = boardLog();
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('r1', 'error', 'red'),
				// Blue both, so each turns the rivals' answering shot aside and lane 1 is
				// left standing exactly as it was.
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'blue')
			]);
			controller.attachBoard(fakeBoard(log));
			await openWithCharges(controller);
			controller.setAction('p0', 'shoot');
			controller.setAction('p1', 'charge');
			await playTurn(controller);
			// Lane 0 was decided and only lane 0 moved.
			expect(log.moved).toEqual([{ id: 'p0', cell: RIVAL_CELLS[0] }]);
		});
	});

	describe('the score', () => {
		it('opens at nothing apiece', () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('r1', 'error', 'red'),
				seed('p0', 'info', 'blue'),
				seed('p1', 'info', 'blue')
			]);
			expect(get(controller).wins).toEqual({ info: 0, error: 0 });
		});

		it('counts an encounter to whoever is left standing in it', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('r1', 'error', 'red'),
				seed('p0', 'info', 'blue'), // takes its own lane and survives the answer
				seed('p1', 'info', 'yellow') // caught loading, with nothing to turn the shot aside
			]);
			await openWithCharges(controller);
			controller.setAction('p0', 'shoot');
			controller.setAction('p1', 'charge');
			await playTurn(controller);
			const state = get(controller);
			expect(fighterOf(state, 'r0').down).toBe(true);
			expect(fighterOf(state, 'p1').down).toBe(true);
			// One each: P0 took its lane, R1 took the other.
			expect(state.wins).toEqual({ info: 1, error: 1 });
		});

		it('gives an encounter to neither side when both of them fall', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'yellow'),
				seed('p0', 'info', 'yellow')
			]);
			await openWithCharges(controller);
			controller.setAction('p0', 'shoot');
			await playTurn(controller);
			expect(get(controller).wins).toEqual({ info: 0, error: 0 });
		});

		it('calls the fight as soon as every encounter is settled, on the score', async () => {
			const controller = new CombatController([
				seed('r0', 'error', 'red'),
				seed('r1', 'error', 'red'),
				seed('p0', 'info', 'blue'), // takes its lane and lives
				seed('p1', 'info', 'yellow') // loses its own
			]);
			await openWithCharges(controller);
			controller.setAction('p0', 'shoot');
			controller.setAction('p1', 'charge');
			await playTurn(controller);
			const state = get(controller);
			// Both lanes are decided on the one volley, and both sides still have a
			// fighter standing — the fight is over all the same, and it is a draw.
			expect(state.wins).toEqual({ info: 1, error: 1 });
			expect(state.turn).toBe(2);
			expect(state.outcome).toBe('draw');
			expect(state.phase).toBe('done');
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
			await openWithCharges(controller);
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
