/**
 * Orchestrates a combat round on the board. Kept out of the Svelte component per
 * the project's separation rules: the page renders from this controller's store
 * and forwards user intent (action clicks); all sequencing, dice and HP live here.
 *
 * Flow: the player picks an action — Melee or Range — on each of their surviving
 * (red / `error`) fighters, which disables that fighter and records a selection
 * order. Once all are picked, the surviving rival (blue / `info`) fighters
 * auto-select an action, then the pairs duel one at a time — player i vs rival i by
 * selection order. Each duel is a single exchange: the two take position according
 * to their actions (melee fighters close in; ranged fighters back off toward their
 * own edge), the player attacks first, the rival attacks back if it survived, then
 * the survivors walk home.
 *
 * Actions interact: a melee attacker striking a foe who chose Range only lands
 * half its damage — the shooter kept its distance. Ranged attacks always land full.
 *
 * Rounds repeat: after a round the survivors' selections reset (their HP damage
 * persists) and control returns to selection, so the player can fight again until
 * one side is wiped out.
 */
import { writable } from 'svelte/store';
import type { MugenBoard } from '$utils/mugen/mugen-board';
import type { CharacterStats } from '$types/character-definition.type';
import { resolveAttack, rollDie } from '$utils/dice/roll';

/** Red fighters (`error`) are the player's; blue (`info`) are the rivals. */
export type FighterSide = 'error' | 'info';

/** The combat action a fighter commits to for a round. */
export type CombatAction = 'melee' | 'ranged';

/** The data the page hands the controller for one fighter. */
export interface FighterSeed {
	id: string;
	name: string;
	side: FighterSide;
	stats: CharacterStats;
	maxHp: number;
}

export interface Fighter extends FighterSeed {
	/** Remaining HP this fight; starts at {@link FighterSeed.maxHp}. */
	currentHp: number;
	/** True once currentHp hits 0. */
	defeated: boolean;
	/** True once an action has been selected (its area is locked). */
	disabled: boolean;
	/** The action chosen this round, or null before selection. */
	action: CombatAction | null;
	/** Selection order within its side (0-based), or null before selection. */
	actionIndex: number | null;
}

export type CombatPhase = 'selecting' | 'fighting' | 'done';

export interface CombatState {
	fighters: Fighter[];
	phase: CombatPhase;
	/** Short human-readable line describing what's happening. */
	status: string;
}

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class CombatController {
	private board: MugenBoard | null = null;
	private fighters: Fighter[];
	private phase: CombatPhase = 'selecting';
	private status = 'Pick an action for each of your fighters.';

	private readonly store = writable<CombatState>({ fighters: [], phase: 'selecting', status: '' });
	/** Svelte store contract, so the page can use `$controller`. */
	readonly subscribe = this.store.subscribe;

	constructor(seed: FighterSeed[]) {
		this.fighters = seed.map((entry) => ({
			...entry,
			currentHp: entry.maxHp,
			defeated: false,
			disabled: false,
			action: null,
			actionIndex: null
		}));
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
			status: this.status
		});
	}

	private setStatus(status: string): void {
		this.status = status;
		this.emit();
	}

	private players(): Fighter[] {
		return this.fighters.filter((fighter) => fighter.side === 'error');
	}

	private rivals(): Fighter[] {
		return this.fighters.filter((fighter) => fighter.side === 'info');
	}

	/** Player fighters still standing (eligible to fight another round). */
	private activePlayers(): Fighter[] {
		return this.players().filter((fighter) => !fighter.defeated);
	}

	/** Rival fighters still standing (eligible to fight another round). */
	private activeRivals(): Fighter[] {
		return this.rivals().filter((fighter) => !fighter.defeated);
	}

	/**
	 * Select an action (Melee or Range) for one of the player's fighters. Locks that
	 * fighter and appends it to the action order. Once all surviving players are
	 * chosen, the rivals auto-select an action and combat begins.
	 */
	selectAction(id: string, action: CombatAction): void {
		if (this.phase !== 'selecting') return;
		const fighter = this.fighters.find((f) => f.id === id);
		if (!fighter || fighter.side !== 'error' || fighter.defeated || fighter.actionIndex !== null) {
			return;
		}

		const alreadyPicked = this.activePlayers().filter((f) => f.actionIndex !== null).length;
		fighter.action = action;
		fighter.actionIndex = alreadyPicked;
		fighter.disabled = true;

		if (this.activePlayers().every((f) => f.actionIndex !== null)) {
			// Every surviving player committed — rivals pick their own action (a coin
			// flip between Melee and Range) in board order.
			this.activeRivals().forEach((rival, index) => {
				rival.action = rollDie(2) === 1 ? 'melee' : 'ranged';
				rival.actionIndex = index;
				rival.disabled = true;
			});
			this.phase = 'fighting';
			this.emit();
			void this.runSequence();
		} else {
			this.emit();
		}
	}

	/** Duel each surviving pair in selection order, one at a time, then wrap up. */
	private async runSequence(): Promise<void> {
		const players = this.activePlayers().sort((a, b) => (a.actionIndex ?? 0) - (b.actionIndex ?? 0));
		const rivals = this.activeRivals().sort((a, b) => (a.actionIndex ?? 0) - (b.actionIndex ?? 0));
		const pairs = Math.min(players.length, rivals.length);
		for (let i = 0; i < pairs; i++) {
			await this.duel(players[i], rivals[i]);
		}
		this.finishRound();
	}

	/**
	 * End-of-round bookkeeping. If either side has been wiped out, combat is over;
	 * otherwise the survivors' selections are cleared — their accumulated HP damage
	 * carries over — and we return to `selecting` so the player can run another round.
	 */
	private finishRound(): void {
		const playersLeft = this.activePlayers().length;
		const rivalsLeft = this.activeRivals().length;
		if (playersLeft === 0 || rivalsLeft === 0) {
			this.phase = 'done';
			this.setStatus(
				playersLeft === 0 && rivalsLeft === 0
					? 'Everyone is down — combat over.'
					: playersLeft === 0
						? 'Your fighters are defeated — combat over.'
						: 'All rivals defeated — you win!'
			);
			return;
		}
		for (const fighter of this.fighters) {
			if (fighter.defeated) continue;
			fighter.action = null;
			fighter.actionIndex = null;
			fighter.disabled = false;
		}
		this.phase = 'selecting';
		this.setStatus('Round over — pick an action to fight another round.');
	}

	/** A single exchange between a player fighter and a rival. */
	private async duel(player: Fighter, rival: Fighter): Promise<void> {
		this.setStatus(
			`${player.name} (${this.actionLabel(player)}) vs ${rival.name} (${this.actionLabel(rival)}) — taking position…`
		);
		await this.position(player, rival);
		await pause(250);

		// Player attacks first.
		const playerResult = await this.strike(player, rival);
		this.setStatus(this.strikeLine(player, rival, playerResult));
		await pause(500);

		// Rival attacks back only if it's still standing.
		if (!rival.defeated) {
			const rivalResult = await this.strike(rival, player);
			this.setStatus(this.strikeLine(rival, player, rivalResult));
			await pause(500);
		} else {
			this.setStatus(`${rival.name} is down!`);
			await pause(400);
		}

		// Survivors walk back to where they started.
		await Promise.all([
			player.defeated ? Promise.resolve() : this.board?.returnHome(player.id),
			rival.defeated ? Promise.resolve() : this.board?.returnHome(rival.id)
		]);
	}

	/**
	 * Move both fighters into place for their chosen actions. Two melee fighters
	 * close in on each other; a ranged fighter first backs off toward its own edge,
	 * then any melee opponent advances toward it — up to the central purple line,
	 * which nobody crosses — from where its (halved) blow still lands.
	 */
	private async position(player: Fighter, rival: Fighter): Promise<void> {
		const playerRanged = player.action === 'ranged';
		const rivalRanged = rival.action === 'ranged';

		if (!playerRanged && !rivalRanged) {
			await this.board?.meleeApproach(player.id, rival.id);
			return;
		}

		// Ranged fighters back off to their firing spot first…
		await Promise.all([
			playerRanged ? this.board?.retreat(player.id) : Promise.resolve(),
			rivalRanged ? this.board?.retreat(rival.id) : Promise.resolve()
		]);
		// …then any melee fighter advances on its now-positioned foe.
		await Promise.all([
			!playerRanged ? this.board?.advance(player.id, rival.id) : Promise.resolve(),
			!rivalRanged ? this.board?.advance(rival.id, player.id) : Promise.resolve()
		]);
	}

	/**
	 * `attacker` rolls its ATK in d10s against `defender`'s DEF; each success is one
	 * hit. A melee attacker only lands **half** its hits (rounded down) against a foe
	 * who chose Range, since the shooter kept its distance; ranged attacks land full.
	 * Plays the matching poses (or a projectile), applies the damage and returns the
	 * raw hit count alongside the damage actually dealt.
	 */
	private async strike(
		attacker: Fighter,
		defender: Fighter
	): Promise<{ hits: number; damage: number }> {
		const { hits } = resolveAttack(attacker.stats.atk, defender.stats.def);
		let damage = hits;

		if (attacker.action === 'ranged') {
			// Fire the projectile across the board, then the target flinches on impact.
			await this.board?.shoot(attacker.id, defender.id);
			await this.board?.playOnce(defender.id, 'hurt');
		} else {
			if (defender.action === 'ranged') damage = Math.floor(hits / 2);
			await Promise.all([
				this.board?.playOnce(attacker.id, 'melee'),
				this.board?.playOnce(defender.id, 'hurt')
			]);
		}

		defender.currentHp = Math.max(0, defender.currentHp - damage);
		if (defender.currentHp === 0) defender.defeated = true;
		this.emit();
		return { hits, damage };
	}

	/** Human-readable label for a fighter's chosen action. */
	private actionLabel(fighter: Fighter): string {
		return fighter.action === 'ranged' ? 'Range' : 'Melee';
	}

	/** One status line summarising an attack, noting when melee damage was halved. */
	private strikeLine(
		attacker: Fighter,
		defender: Fighter,
		result: { hits: number; damage: number }
	): string {
		const verb = attacker.action === 'ranged' ? 'shoots' : 'strikes';
		const note = result.damage !== result.hits ? ` — halved to ${result.damage} vs Range` : '';
		return `${attacker.name} ${verb} ${defender.name}: ${attacker.stats.atk}d10 → ${result.hits} hit(s), ${result.damage} dmg${note}.`;
	}
}
