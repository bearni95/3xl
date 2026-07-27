/**
 * Orchestrates a combat round on the board. Kept out of the Svelte component per
 * the project's separation rules: the page renders from this controller's store
 * and forwards user intent (color clicks); all sequencing, dice and damage live
 * here.
 *
 * Every character carries combat attributes seeded from its Supabase spawn: ATK
 * (how many d10 it rolls per attack) and DEF (the d10 threshold an attacker must
 * meet to hit it). At battle start each fighter also rolls its HP pool — ATK d6
 * summed — carried across the whole game. Each round the player picks a color per
 * (blue / `info`) fighter and the rivals (red / `error`) pre-roll one, then the
 * pairs duel one at a time — player i vs rival i by selection order.
 *
 * Each duel is one encounter on a purple meeting cell: one fighter attacks, then
 * the other answers back. An attack rolls ATK d10 and every die at or above the
 * defender's DEF is a hit; the thrown colour vs the defender's colour then scales
 * those hits (the strike table's ×0.5 / ×1 / ×2, rounded) into the HP of damage
 * dealt. A fighter reduced to 0 HP is knocked out — it holds its hurt pose, fades
 * off the board and is removed from the game entirely. Barring a knockout,
 * whoever is left with the most current HP claims the duel cell (a tie in HP keeps
 * the status quo); HP persists across encounters.
 *
 * Rounds repeat: after a round the selections reset and control returns to
 * selection. The game ends when one side is wiped out (all its fighters knocked
 * out), at the end of any round in which one side holds all three purple duel
 * cells (claimed cells stay tinted in their holder's colour until it fights
 * again), or when no fighter can make a move next round (every survivor is a
 * pinned cell-holder) — a stalemate decided by which side occupies more purple
 * cells.
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
import { resolveAttack, rollDie } from '$utils/dice/roll';

/** Blue fighters (`info`) are the player's; red (`error`) are the rivals (CPU). */
export type FighterSide = 'error' | 'info';

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
	/** Attack rating — the number of d10 this fighter rolls on each attack (its
	 * Supabase spawn stat). Every die at or above the defender's {@link def} is a hit. */
	atk: number;
	/** Defence rating — the d10 threshold an attacker's die must meet to hit this
	 * fighter (derived as SPAWN_STAT_MAX − atk). Also sets the fighter's HP pool
	 * (def + 1) at battle start. */
	def: number;
	/** Speed rating — a derived stat alongside atk/def (atk − 1). */
	spd: number;
}

export interface Fighter extends FighterSeed {
	/** Hit points this fighter starts (and tops out) at: its {@link def} + 1. */
	maxHp: number;
	/** Current hit points, carried across the whole game. At 0 the fighter is
	 * {@link defeated}. */
	hp: number;
	/** True once the fighter has been knocked out (0 HP): it returns home at half
	 * opacity and takes no further part in any round. */
	defeated: boolean;
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
		this.fighters = seed.map((entry) => {
			// HP pool at battle start is the fighter's DEF + 1: a sturdier defender is
			// also tougher, and the pool is deterministic rather than rolled.
			const maxHp = entry.def + 1;
			return {
				...entry,
				maxHp,
				hp: maxHp,
				defeated: false,
				disabled: false,
				moveColor: null,
				actionIndex: null
			};
		});
		this.rollRivalDefaults();
		this.emit();
	}

	/** Give the controller the running board engine so it can drive movement. */
	attachBoard(board: MugenBoard): void {
		this.board = board;
		// Seed every fighter's board HP bar with its rolled pool so the numbers show
		// from the start, before the first hit lands.
		for (const fighter of this.fighters) {
			board.setHp(fighter.id, fighter.hp, fighter.maxHp);
		}
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
			if (this.heldCell(rival) || rival.defeated) continue;
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
		// Cell-holders can't act this turn — they only fight if attacked; knocked-out
		// fighters can't act at all.
		if (!fighter || fighter.actionIndex !== null || fighter.defeated || this.heldCell(fighter)) {
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

		const pickers = this.players().filter((f) => !this.heldCell(f) && !f.defeated);
		if (pickers.every((f) => f.actionIndex !== null)) {
			// Every player who *can* act committed — each non-holder rival locks in
			// its held color (its pre-rolled default, unless overridden), in board order.
			this.rivals().forEach((rival, index) => {
				if (this.heldCell(rival) || rival.defeated) return; // out or holding: sit out
				rival.moveColor = rival.moveColor ?? this.randomColor(rival);
				rival.actionIndex = index;
				rival.disabled = true;
			});
			// Combat starts: every fighter that will act flares an aura in the
			// colour it throws this round — not its own native colour (cell-holders
			// sit out aura-less unless attacked).
			for (const combatant of this.fighters) {
				if (combatant.moveColor) void this.board?.showAura(combatant.id, combatant.moveColor);
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
			.filter((f) => !this.heldCell(f) && !f.defeated)
			.sort(byOrder);
		const rivalsQueue = this.rivals()
			.filter((f) => !this.heldCell(f) && !f.defeated)
			.sort(byOrder);
		for (let i = 0; i < MELEE_MEETING_CELLS.length; i++) {
			const holder = this.cellOwners.get(cellKey(MELEE_MEETING_CELLS[i]));
			const player = holder?.side === 'info' ? holder : playersQueue.shift();
			const rival = holder?.side === 'error' ? holder : rivalsQueue.shift();
			if (!player || !rival) continue;
			// An attacked holder never picked a color — it defends with a random one,
			// flaring its aura (in the colour it now throws) only once it's dragged
			// into the duel.
			if (holder && !holder.moveColor) {
				holder.moveColor = this.randomColor(holder);
				void this.board?.showAura(holder.id, holder.moveColor);
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
		// Elimination victory: a side with no fighters left standing loses outright.
		if (this.players().every((f) => f.defeated)) {
			this.end('lose', 'Your whole team has been knocked out.');
			return;
		}
		if (this.rivals().every((f) => f.defeated)) {
			this.end('win', 'The rival team has been knocked out.');
			return;
		}
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

		// Stalemate: now that fighters can be knocked out, a side can be left with
		// nothing but pinned cell-holders (and the defeated). A holder can't pick a
		// colour — it only fights if attacked — and since the player drives each
		// round, if no player fighter can act the round can never start (its move
		// buttons are all locked), so the fight can never progress. When that
		// happens, end the game there and decide it by purple-cell occupancy:
		// whoever holds the most cells wins (an even split is a draw).
		const canAct = (fighter: Fighter) => !fighter.defeated && this.heldCell(fighter) === null;
		if (!this.players().some(canAct)) {
			const infoCells = owners.filter((side) => side === 'info').length;
			const errorCells = owners.filter((side) => side === 'error').length;
			if (infoCells > errorCells) {
				this.end('win', `Nobody left to move — you hold the most purple cells (${infoCells}–${errorCells}).`);
			} else if (errorCells > infoCells) {
				this.end('lose', `Nobody left to move — the rivals hold the most purple cells (${errorCells}–${infoCells}).`);
			} else {
				this.end('draw', `Nobody left to move — the purple cells are split ${infoCells}–${errorCells}.`);
			}
			return;
		}

		for (const fighter of this.fighters) {
			fighter.moveColor = null;
			fighter.actionIndex = null;
			// Cell-holders and knocked-out fighters stay locked: they can't act next
			// round (holders only fight if attacked; the defeated never fight again).
			fighter.disabled = fighter.defeated || this.heldCell(fighter) !== null;
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
		// A fighter knocked out by the first blow can't answer back.
		if (!second.defeated) {
			await this.strike(second, first);
			await pause(500);
		}

		// Claim the duel cell. A knockout decides it outright — the survivor takes the
		// cell while the fallen has already walked home dimmed. Otherwise whoever is
		// left with the most current HP claims it, with a tie (equal HP) keeping the
		// status quo (a defended cell stays with its prior holder, an unclaimed one
		// sends both home).
		const cell = MELEE_MEETING_CELLS[duelIndex];
		let playerStays: boolean;
		let rivalStays: boolean;
		if (player.defeated || rival.defeated) {
			playerStays = !player.defeated && rival.defeated;
			rivalStays = !rival.defeated && player.defeated;
		} else {
			const tie = player.hp === rival.hp;
			playerStays = player.hp > rival.hp || (tie && priorHolder === player);
			rivalStays = rival.hp > player.hp || (tie && priorHolder === rival);
		}
		this.setStatus(this.encounterLine(player, rival, priorHolder));
		// A knocked-out fighter has already faded off the board — only the survivors
		// settle onto (or back off) the cell here.
		await Promise.all([
			player.defeated ? undefined : this.settle(player, playerStays, cell),
			rival.defeated ? undefined : this.settle(rival, rivalStays, cell)
		]);
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
	 * `attacker` makes one attack against `defender`: it rolls one d10 per point of
	 * its ATK and every die at or above the defender's DEF counts as a hit. Each hit
	 * costs the defender one HP; reaching 0 knocks it out. Plays the attacker's melee
	 * animation while the defender flinches.
	 *
	 * (Colour matching is on hold: the thrown colour still tints the animation and
	 * the floating readout, but no longer scales the damage — that reworks later.)
	 */
	private async strike(attacker: Fighter, defender: Fighter): Promise<void> {
		const thrown = attacker.moveColor ?? attacker.color;
		const { hits } = resolveAttack(attacker.atk, defender.def);
		// The colour pairing scales the raw hits into damage: the strike table maps
		// the thrown colour against the defender's colour to ×0.5 / ×1 / ×2, and the
		// product is rounded to whole HP of damage.
		const multiplier = strikeMultiplier(thrown, defender.color);
		const damage = Math.round(hits * multiplier);

		// Attacker and defender are always distinct actors, so the move, the flinch
		// and the slash landing on the defender all play together — the slash is
		// drawn in the attacker's thrown colour, over whoever takes the damage.
		await Promise.all([
			this.board?.playMove(attacker.id, this.meleeMove(attacker)),
			this.board?.playHurt(defender.id),
			this.board?.showSlash(defender.id, thrown)
		]);

		// Damage dents the defender's persistent HP; whoever is left with more HP
		// when the encounter ends claims the duel cell.
		defender.hp = Math.max(0, defender.hp - damage);
		// Ease the defender's board HP bar down to its new health (green→red).
		this.board?.setHp(defender.id, defender.hp, defender.maxHp);
		// Float the damage dealt above the attacker, coloured in the thrown colour.
		this.board?.showStrikeLabel(attacker.id, damage, thrown);
		// setStatus emits, so the cards' live HP updates the moment a hit lands.
		this.setStatus(this.strikeLine(attacker, defender, hits, multiplier, damage));

		// At 0 HP the defender is knocked out: home it goes, dimmed and done.
		if (defender.hp === 0 && !defender.defeated) {
			await this.knockOut(defender);
		}
	}

	/**
	 * Knock a fighter out of the game: flag it, release any cell it held, and fade
	 * it off the board (it holds its hurt pose, dissolves, and is removed for good).
	 * It never fights again.
	 */
	private async knockOut(fighter: Fighter): Promise<void> {
		fighter.defeated = true;
		fighter.disabled = true;
		fighter.moveColor = null;
		this.vacateCells(fighter);
		this.emit();
		await this.board?.knockOut(fighter.id);
	}

	/** One status line summarising an attack roll, the colour multiplier and the
	 * damage it dealt. */
	private strikeLine(
		attacker: Fighter,
		defender: Fighter,
		hits: number,
		multiplier: number,
		damage: number
	): string {
		const roll = `${attacker.name} rolls ${attacker.atk}d10 vs ${defender.name}'s DEF ${defender.def}`;
		if (hits === 0) return `${roll} — no hits.`;
		const hit = hits === 1 ? '1 hit' : `${hits} hits`;
		return `${roll} — ${hit} ×${multiplier} = ${damage} dmg, ${defender.name} down to ${defender.hp} HP.`;
	}

	/** One status line summarising how the encounter resolved. */
	private encounterLine(player: Fighter, rival: Fighter, priorHolder: Fighter | null): string {
		if (player.defeated && !rival.defeated)
			return `${player.name} is knocked out — ${rival.name} takes the cell.`;
		if (rival.defeated && !player.defeated)
			return `${rival.name} is knocked out — ${player.name} takes the cell.`;
		const score = `${player.hp}–${rival.hp} HP`;
		if (player.hp === rival.hp) {
			const held = priorHolder ? `${priorHolder.name} keeps the cell` : 'neither takes the cell';
			return `A stand-off at ${score} — ${held}.`;
		}
		const winner = player.hp > rival.hp ? player : rival;
		return `${winner.name} is left standing stronger (${score}) and claims the cell.`;
	}
}
