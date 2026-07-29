import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	CombatController,
	type CombatAction,
	type CombatState,
	type FighterSeed,
	type FighterView
} from '$services/combat.controller';
import type { CombatColor } from '$types/character-definition.type';
import type { MugenBoard } from '$utils/mugen/mugen-board';

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

/**
 * A board that draws nothing and records what it was asked to do. Every call
 * answers with a settled promise, so the controller's beats play out at once.
 */
function recordingBoard(): { calls: string[]; board: MugenBoard } {
	const calls: string[] = [];
	const board = new Proxy(
		{},
		{
			get:
				(_target, property) =>
				(...args: unknown[]) => {
					calls.push(String(property) + (typeof args[1] === 'string' ? `:${args[1]}` : ''));
					return Promise.resolve();
				}
		}
	);
	return { calls, board: board as MugenBoard };
}

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
	/**
	 * Who each fighter faces, worked out from the line-ups alone: the fight is three
	 * private duels, one per slot, and a slot is a fighter's for the whole fight. So
	 * the two in a lane face each other while both stand, and once either falls that
	 * lane is over — nobody is handed a new opposite by a death anywhere on the board.
	 * Derived here independently of the controller, which must agree with it.
	 */
	function facingByLane(state: CombatState): Map<string, string | null> {
		const lines = {
			error: state.fighters.filter((fighter) => fighter.side === 'error'),
			info: state.fighters.filter((fighter) => fighter.side === 'info')
		};
		const facing = new Map<string, string | null>();
		for (const side of ['error', 'info'] as const) {
			const across = side === 'error' ? lines.info : lines.error;
			lines[side].forEach((fighter, lane) => {
				const other = across[lane];
				facing.set(fighter.id, fighter.down || !other || other.down ? null : other.id);
			});
		}
		return facing;
	}

	/** Play a whole fight through the buttons, asserting on every turn that the side is
	 * commitable and that nobody is aimed at anyone but the fighter across from it. */
	async function playOut(colors: CombatColor[], pick: (fighter: FighterView) => CombatAction) {
		const controller = new CombatController(seeds(colors));
		let sawLoss = false;
		// What each standing player faced last turn, to catch any re-pairing at all.
		let facedBefore = new Map<string, string | null>();
		for (let turn = 0; turn < 30; turn++) {
			const state = get(controller);
			if (state.outcome) break;
			sawLoss ||= state.fighters.some((fighter) => fighter.side === 'info' && fighter.down);

			const byLane = facingByLane(state);
			for (const fighter of state.fighters) {
				expect(`${fighter.id} faces ${fighter.opponentId}`).toBe(
					`${fighter.id} faces ${byLane.get(fighter.id) ?? null}`
				);
			}
			// A fighter's opposite never changes hands: it is the one it always had, or
			// none at all once that one has fallen. It is never somebody else.
			for (const fighter of state.fighters) {
				if (fighter.side !== 'info' || fighter.down) continue;
				const before = facedBefore.get(fighter.id);
				if (!before) continue;
				expect([before, null]).toContain(fighter.opponentId);
			}
			facedBefore = new Map(
				state.fighters
					.filter((fighter) => fighter.side === 'info' && !fighter.down)
					.map((fighter) => [fighter.id, fighter.opponentId])
			);

			for (const fighter of playerFighters(controller)) tap(controller, fighter, pick(fighter));
			expect(get(controller).ready).toBe(true);
			controller.commit();
			while (get(controller).phase === 'resolving') {
				await new Promise((resolve) => setTimeout(resolve, 20));
			}
		}
		return sawLoss;
	}

	it('stays commitable, and keeps everyone in their lane, as fighters fall', async () => {
		let sawLoss = false;
		for (const colors of [
			['red', 'yellow', 'blue', 'red', 'yellow', 'blue'],
			['orange', 'purple', 'green', 'orange', 'purple', 'green'],
			['red', 'red', 'red', 'red', 'red', 'red'],
			['blue', 'blue', 'blue', 'blue', 'blue', 'blue']
		] as CombatColor[][]) {
			// Fire whenever there is a shot in hand, load otherwise — the fastest way to
			// thin both sides out.
			sawLoss ||= await playOut(colors, (fighter) => (fighter.canShoot ? 'shoot' : 'charge'));
		}
		// The point of the run: it went past a fighter of the player's going down.
		expect(sawLoss).toBe(true);
	}, 120000);

	it('opens with each line facing the one across from it', () => {
		const controller = new CombatController(
			seeds(['blue', 'blue', 'blue', 'blue', 'blue', 'blue'])
		);
		const state = get(controller);
		// Top→bottom on screen, a fighter faces its opposite number in the other line.
		for (let slot = 0; slot < 3; slot++) {
			expect(state.fighters.find((f) => f.id === `info:${slot}`)?.opponentId).toBe(
				`error:${slot}`
			);
			expect(state.fighters.find((f) => f.id === `error:${slot}`)?.opponentId).toBe(
				`info:${slot}`
			);
		}
	});
});

describe('CombatController — what the board is left showing', () => {
	it('takes the turn’s callouts down as the next turn is handed over', async () => {
		const { calls, board } = recordingBoard();
		const controller = new CombatController(
			seeds(['blue', 'blue', 'blue', 'blue', 'blue', 'blue'])
		);
		controller.attachBoard(board);

		for (const fighter of playerFighters(controller)) tap(controller, fighter, 'charge');
		controller.commit();
		while (get(controller).phase === 'resolving') {
			await new Promise((resolve) => setTimeout(resolve, 20));
		}

		// The words went up while the turn played out...
		expect(calls.some((call) => call.startsWith('showCallout'))).toBe(true);
		// ...and came down before the pickers were handed back, so nothing said about
		// the turn just played is still on the board while the next one is being given.
		expect(get(controller).phase).toBe('planning');
		expect(calls.lastIndexOf('clearCallouts')).toBeGreaterThan(
			calls.findLastIndex((call) => call.startsWith('showCallout'))
		);
	});
});
