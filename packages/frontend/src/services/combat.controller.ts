/**
 * Orchestrates a combat round on the board. Kept out of the Svelte component per
 * the project's separation rules: the page renders from this controller's store
 * and forwards user intent (color clicks); all sequencing, colors and strikes
 * live here.
 *
 * Every character has a compound combat color (purple, orange or green) fixed in
 * its definition JSON. Each round the player throws one of three colors per
 * (blue / `info`) fighter — the fighter's own compound color or either of its
 * two primary components. The rival (red / `error`) fighters each start the
 * round with a randomly pre-rolled color of their own, which the player may
 * override by clicking a different color on the rival's card. Once all players
 * are picked, the rivals lock in whatever color they hold, then the pairs duel
 * one at a time — player i vs rival i by selection order.
 *
 * Each duel is one encounter on a purple meeting cell: the player throws its
 * chosen color against the rival's *character* color, then the rival answers
 * back likewise. Every throw lands — the strike table (see
 * `$utils/color/compare`) maps the colour pairing to a multiplier (x0.5, x1 or
 * x2), and the defender takes that many strikes. Strikes only exist within the
 * encounter — whoever holds fewer when it ends claims the duel cell and stays on
 * it while the other walks home (equal strikes keep the status quo), and then
 * both tallies reset to zero.
 *
 * Rounds repeat: after a round the selections reset and control returns to
 * selection, so the player can fight again. The game ends at the end of any
 * round in which one side holds all three purple duel cells (claimed cells stay
 * tinted in their holder's colour until the holder fights again).
 *
 * A fighter holding a purple cell is pinned there: it cannot pick or act on its
 * turn and only fights when an enemy attacks it on its cell, auto-defending with
 * a random color (the attacker throws first). Unchallenged holders keep their
 * cell across rounds.
 */
import { writable } from 'svelte/store';
import type { Hex } from '$utils/mugen/hex';
import type { MugenBoard } from '$utils/mugen/mugen-board';
import {
	findMove,
	type CharacterMove,
	type CombatColor
} from '$types/character-definition.type';
import { strikeMultiplier, throwableColors } from '$utils/color/compare';
import { rollDie } from '$utils/dice/roll';

/** Blue fighters (`info`) are the player's; red (`error`) are the rivals (CPU). */
export type FighterSide = 'error' | 'info';

/** Most strikes one fighter can take in a single encounter: it is attacked
 * exactly once, so at most the table's top multiplier (x2). Only used for the
 * strike readout in the UI. */
export const MAX_DUEL_STRIKES = 2;

/** Animation for a fighter whose definition binds no melee move. */
const FALLBACK_MELEE: CharacterMove = { name: 'Melee', type: 'melee', source: '' };

/**
 * Fixed purple-column cells the duels meet on, in duel order: the first pair
 * clashes on (0,-1), the second on (0,-2), the third on (0,-3). The pair shares
 * the purple cell itself — red standing on its left half, blue on its right —
 * after walking in via the cell's east neighbour.
 */
const MELEE_MEETING_CELLS: Hex[] = [
	{ q: 0, r: -1 },
	{ q: 0, r: -2 },
	{ q: 0, r: -3 }
];

/** Map key for a cell, so ownership can be tracked per purple cell. */
const cellKey = (cell: Hex): string => `${cell.q},${cell.r}`;

/** The data the page hands the controller for one fighter. */
export interface FighterSeed {
	id: string;
	name: string;
	side: FighterSide;
	/** The character's combat color — the colour rolled for its Supabase spawn.
	 * A compound (purple/orange/green) can throw its two components too; a primary
	 * (red/yellow/blue) throws only itself (see {@link throwableColors}). */
	color: CombatColor;
	/** The moves this character's JSON definition declares (used for animation). */
	moves: CharacterMove[];
}

export interface Fighter extends FighterSeed {
	/** Strikes taken in the current encounter; resets to 0 when the duel ends. */
	strikes: number;
	/** True once a color has been selected (its area is locked). */
	disabled: boolean;
	/** The color thrown this round, or null before selection. */
	moveColor: CombatColor | null;
	/** Selection order within its side (0-based), or null before selection. */
	actionIndex: number | null;
}

export type CombatPhase = 'selecting' | 'fighting' | 'done';

/** How the game ended, from the player's point of view. */
export type CombatOutcome = 'win' | 'lose' | 'draw';

export interface CombatState {
	fighters: Fighter[];
	phase: CombatPhase;
	/** Short human-readable line describing what's happening. */
	status: string;
	/** Set once the game is over; drives the endgame modal. */
	outcome: CombatOutcome | null;
}

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 'purple' → 'Purple', for status lines. */
const colorLabel = (color: CombatColor | null): string =>
	color ? color.charAt(0).toUpperCase() + color.slice(1) : '—';

export class CombatController {
	private board: MugenBoard | null = null;
	private fighters: Fighter[];
	private phase: CombatPhase = 'selecting';
	private status = 'Pick a color for each of your fighters.';
	private outcome: CombatOutcome | null = null;
	/**
	 * Which fighter currently holds each purple duel cell (keyed by {@link cellKey}).
	 * A cell is held from the moment its duel's winner claims it until that fighter
	 * enters another duel; holding all three at the end of a round wins the game.
	 */
	private readonly cellOwners = new Map<string, Fighter>();

	private readonly store = writable<CombatState>({
		fighters: [],
		phase: 'selecting',
		status: '',
		outcome: null
	});
	/** Svelte store contract, so the page can use `$controller`. */
	readonly subscribe = this.store.subscribe;

	constructor(seed: FighterSeed[]) {
		this.fighters = seed.map((entry) => ({
			...entry,
			strikes: 0,
			disabled: false,
			moveColor: null,
			actionIndex: null
		}));
		this.rollRivalDefaults();
		this.emit();
	}

	/** Give the controller the running board engine so it can drive movement. */
	attachBoard(board: MugenBoard): void {
		this.board = board;
	}

	private emit(): void {
		this.store.set({
			// Copy so subscribers always see a fresh reference and re-render.
			fighters: this.fighters.map((fighter) => ({ ...fighter })),
			phase: this.phase,
			status: this.status,
			outcome: this.outcome
		});
	}

	private setStatus(status: string): void {
		this.status = status;
		this.emit();
	}

	/** End the game with an outcome; the page shows it in a blocking modal. */
	private end(outcome: CombatOutcome, detail: string): void {
		this.phase = 'done';
		this.outcome = outcome;
		this.setStatus(detail);
	}

	private players(): Fighter[] {
		return this.fighters.filter((fighter) => fighter.side === 'info');
	}

	private rivals(): Fighter[] {
		return this.fighters.filter((fighter) => fighter.side === 'error');
	}

	/** The purple cell this fighter currently holds, or null. */
	private heldCell(fighter: Fighter): Hex | null {
		for (const [key, owner] of this.cellOwners) {
			if (owner.id !== fighter.id) continue;
			const [q, r] = key.split(',').map(Number);
			return { q, r };
		}
		return null;
	}

	/** A random one of the three colors this fighter can throw. */
	private randomColor(fighter: Fighter): CombatColor {
		const options = throwableColors(fighter.color);
		return options[rollDie(options.length) - 1];
	}

	/** The animation played when this fighter throws a color: its own bound
	 * melee move, or the empty fallback. */
	private meleeMove(fighter: Fighter): CharacterMove {
		return findMove(fighter, 'melee') ?? FALLBACK_MELEE;
	}

	/**
	 * Give each rival a randomly pre-rolled default color for the round, shown on
	 * its card so the player can see — and override — what it will throw.
	 * Cell-holders are skipped: they sit their turn out unless attacked.
	 */
	private rollRivalDefaults(): void {
		for (const rival of this.rivals()) {
			if (this.heldCell(rival)) continue;
			rival.moveColor = this.randomColor(rival);
		}
	}

	/**
	 * Select the color a fighter throws this round — its compound color or either
	 * of that color's two primary components. For a player fighter this locks it
	 * and appends it to the action order; for a rival it just overwrites the
	 * rival's pre-rolled default without locking anything. Once all players are
	 * chosen, the rivals lock in whatever color they hold and combat begins.
	 */
	selectColor(id: string, color: CombatColor): void {
		if (this.phase !== 'selecting') return;
		const fighter = this.fighters.find((f) => f.id === id);
		// Cell-holders can't act this turn — they only fight if attacked.
		if (!fighter || fighter.actionIndex !== null || this.heldCell(fighter)) {
			return;
		}
		// Only the fighter's own compound color or its components can be thrown.
		if (!throwableColors(fighter.color).includes(color)) return;

		if (fighter.side === 'error') {
			// Overriding a rival's pre-rolled default — no lock, no action order.
			fighter.moveColor = color;
			this.emit();
			return;
		}

		const alreadyPicked = this.players().filter((f) => f.actionIndex !== null).length;
		fighter.moveColor = color;
		fighter.actionIndex = alreadyPicked;
		fighter.disabled = true;

		const pickers = this.players().filter((f) => !this.heldCell(f));
		if (pickers.every((f) => f.actionIndex !== null)) {
			// Every player who *can* act committed — each non-holder rival locks in
			// its held color (its pre-rolled default, unless overridden), in board order.
			this.rivals().forEach((rival, index) => {
				if (this.heldCell(rival)) return; // holders sit out unless attacked
				rival.moveColor = rival.moveColor ?? this.randomColor(rival);
				rival.actionIndex = index;
				rival.disabled = true;
			});
			// Combat starts: every fighter that will act flares an aura in its own
			// (native) colour — not the colour it throws (cell-holders sit out
			// aura-less unless attacked).
			for (const combatant of this.fighters) {
				if (combatant.moveColor) void this.board?.showAura(combatant.id, combatant.color);
			}
			this.phase = 'fighting';
			this.emit();
			void this.runSequence();
		} else {
			this.emit();
		}
	}

	/**
	 * Fight this round's duels, one per purple cell in order. A fighter holding a
	 * cell is pinned to that cell's duel — it fights only if an enemy arrives
	 * there (auto-defending with a random color, since it couldn't pick one) —
	 * while the fighters who selected colors fill the remaining slots in selection
	 * order. A cell whose duel can't be paired sees no fighting: an unchallenged
	 * holder simply keeps standing on it.
	 */
	private async runSequence(): Promise<void> {
		const byOrder = (a: Fighter, b: Fighter) => (a.actionIndex ?? 0) - (b.actionIndex ?? 0);
		const playersQueue = this.players()
			.filter((f) => !this.heldCell(f))
			.sort(byOrder);
		const rivalsQueue = this.rivals()
			.filter((f) => !this.heldCell(f))
			.sort(byOrder);
		for (let i = 0; i < MELEE_MEETING_CELLS.length; i++) {
			const holder = this.cellOwners.get(cellKey(MELEE_MEETING_CELLS[i]));
			const player = holder?.side === 'info' ? holder : playersQueue.shift();
			const rival = holder?.side === 'error' ? holder : rivalsQueue.shift();
			if (!player || !rival) continue;
			// An attacked holder never picked a color — it defends with a random one,
			// flaring its aura (in its own native colour) only now that it's dragged
			// into the duel.
			if (holder && !holder.moveColor) {
				holder.moveColor = this.randomColor(holder);
				void this.board?.showAura(holder.id, holder.color);
			}
			await this.duel(player, rival, i);
		}
		this.finishRound();
	}

	/**
	 * End-of-round bookkeeping. If one side holds all three purple cells the game
	 * is over; otherwise selections are cleared and we return to `selecting` so
	 * the player can run another round.
	 */
	private finishRound(): void {
		// The round's throws are spent — every aura burns out and the readouts clear.
		this.board?.clearAuras();
		this.board?.clearStrikeLabels();
		// Territory victory: holding all three purple duel cells when the round
		// ends wins outright.
		const owners = MELEE_MEETING_CELLS.map((cell) => this.cellOwners.get(cellKey(cell))?.side);
		if (owners.every((side) => side === 'info')) {
			this.end('win', 'You hold all three purple cells.');
			return;
		}
		if (owners.every((side) => side === 'error')) {
			this.end('lose', 'The rivals hold all three purple cells.');
			return;
		}

		for (const fighter of this.fighters) {
			fighter.moveColor = null;
			fighter.actionIndex = null;
			// Cell-holders stay locked: they can't act next round unless attacked.
			fighter.disabled = this.heldCell(fighter) !== null;
		}
		// Rivals pre-roll a fresh default for the next round.
		this.rollRivalDefaults();

		this.phase = 'selecting';
		this.setStatus('Round over — pick a color to fight another round.');
	}

	/** One encounter between a player fighter and a rival. `duelIndex` is the
	 * pair's position in the round's selection order, which picks its meeting cell. */
	private async duel(player: Fighter, rival: Fighter, duelIndex: number): Promise<void> {
		this.setStatus(
			`${player.name} (${colorLabel(player.moveColor)}) vs ${rival.name} (${colorLabel(rival.moveColor)}) — taking position…`
		);
		// A holder dragged into this duel was attacked: the attacker throws first
		// and the holder only answers back. Otherwise the player leads as usual.
		// Remember who held the cell coming in — a tie must not strip a defended cell.
		const priorHolder = [player, rival].find((f) => this.heldCell(f)) ?? null;
		const [first, second] = priorHolder === player ? [rival, player] : [player, rival];
		// Clear the previous duel's readouts before this pair throws.
		this.board?.clearStrikeLabels();
		// Fighting vacates whatever cell each participant held: its paint reverts to
		// purple for the duration, and only winning a duel earns a cell back.
		this.vacateCells(player);
		this.vacateCells(rival);
		await this.board?.meleeApproach(player.id, rival.id, MELEE_MEETING_CELLS[duelIndex]);
		await pause(250);

		await this.strike(first, second);
		await pause(500);
		await this.strike(second, first);
		await pause(500);

		// Whoever took fewer strikes this encounter claims the duel cell — striding
		// from its half onto the cell's centre, taking all of it — while the other
		// walks back to where it started. Equal strikes keep the status quo: a
		// defended cell stays with its prior holder, an unclaimed one sends both home.
		const cell = MELEE_MEETING_CELLS[duelIndex];
		const tie = player.strikes === rival.strikes;
		const playerStays = player.strikes < rival.strikes || (tie && priorHolder === player);
		const rivalStays = rival.strikes < player.strikes || (tie && priorHolder === rival);
		this.setStatus(this.encounterLine(player, rival, tie, playerStays));
		await Promise.all([
			this.settle(player, playerStays, cell),
			this.settle(rival, rivalStays, cell)
		]);
		// Strikes only live within the encounter — clear both tallies for the next one.
		player.strikes = 0;
		rival.strikes = 0;
		this.emit();
	}

	/**
	 * Post-duel movement for one fighter: the winner claims the whole duel cell —
	 * recording ownership and tinting the cell in its side's colour — the loser
	 * walks home.
	 */
	private settle(fighter: Fighter, stays: boolean, cell?: Hex): Promise<void> | undefined {
		if (stays) {
			if (!cell) return undefined;
			this.cellOwners.set(cellKey(cell), fighter);
			this.board?.paintCell(cell, fighter.side === 'error' ? 'red' : 'blue');
			return this.board?.claimCell(fighter.id, cell);
		}
		return this.board?.returnHome(fighter.id);
	}

	/** Release every cell a fighter holds, restoring its purple paint. */
	private vacateCells(fighter: Fighter): void {
		for (const [key, owner] of this.cellOwners) {
			if (owner.id !== fighter.id) continue;
			this.cellOwners.delete(key);
			const [q, r] = key.split(',').map(Number);
			this.board?.paintCell({ q, r }, null);
		}
	}

	/**
	 * `attacker` throws its chosen color against `defender`'s *character* color.
	 * Every throw lands: the strike table (see `$utils/color/compare`) gives the
	 * multiplier for that colour pairing, and the defender takes exactly that many
	 * strikes (0.5, 1 or 2). Plays the attacker's melee animation while the
	 * defender flinches.
	 */
	private async strike(attacker: Fighter, defender: Fighter): Promise<void> {
		const thrown = attacker.moveColor ?? attacker.color;
		const strikes = strikeMultiplier(thrown, defender.color);

		// Attacker and defender are always distinct actors, so the move, the flinch
		// and the slash landing on the defender all play together — the slash is
		// drawn in the attacker's thrown colour, over whoever takes the damage.
		await Promise.all([
			this.board?.playMove(attacker.id, this.meleeMove(attacker)),
			this.board?.playHurt(defender.id),
			this.board?.showSlash(defender.id, thrown)
		]);

		defender.strikes += strikes;
		// Float the throw's multiplier ×100 above the attacker, coloured in the
		// thrown colour, so the two fighters' numbers sit side by side — higher
		// deals more strikes and wins the duel.
		this.board?.showStrikeLabel(attacker.id, Math.round(strikes * 100), thrown);
		this.setStatus(this.strikeLine(attacker, defender, strikes));
	}

	/** One status line summarising a color throw and the strikes it dealt. */
	private strikeLine(attacker: Fighter, defender: Fighter, strikes: number): string {
		const clash = `${attacker.name} throws ${colorLabel(attacker.moveColor)} at ${defender.name} (${colorLabel(defender.color)})`;
		const hit = strikes === 1 ? '1 strike' : `${strikes} strikes`;
		return `${clash} — ×${strikes}, ${defender.name} takes ${hit}.`;
	}

	/** One status line summarising who won the encounter on strikes. */
	private encounterLine(
		player: Fighter,
		rival: Fighter,
		tie: boolean,
		playerWon: boolean
	): string {
		const score = `${player.strikes}–${rival.strikes}`;
		if (tie) return `Even at ${score} — the encounter is a stand-off.`;
		const winner = playerWon ? player : rival;
		return `${winner.name} wins the encounter ${score} and takes the cell.`;
	}
}
