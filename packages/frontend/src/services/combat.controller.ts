/**
 * Combat: the schoolyard stand-off, three a side.
 *
 * The game is the playground one — **charge, defend, shoot** — played by two teams
 * of three at once. Every turn each fighter still standing is given one of those
 * three orders; both sides' orders are locked in blind and carried out together, so
 * a turn is a guess about what the other side is about to do, not a reaction to it.
 *
 *   · **Charge** banks one charge (up to {@link MAX_CHARGES}). It is also the only
 *     way to get one, and it leaves the fighter wide open.
 *   · **Defend** turns aside every shot aimed at the fighter that turn, but banks
 *     nothing — spend the whole fight defending and you never fire.
 *   · **Shoot** spends a charge and fires **straight across the lane**. Nobody
 *     shoots sideways: a fighter can only ever hit the one holding the same place in
 *     the enemy line that it holds in its own, so a turn asks whether to fire, never
 *     at whom. A shot that isn't turned aside takes its target down: **one hit is all
 *     it takes**, whoever it lands on. Shooting is also not defending, so two fighters
 *     who shoot each other across a lane both fall.
 *
 * What separates one card from another is nothing but its **colour** (see
 * `colorTraits` in @3xl/shared): red may fire *on top of* a charge or a defend,
 * yellow opens the battle with a charge already banked, and blue turns one shot aside
 * for free — once in the battle, on a turn it wasn't defending anyway. A compound
 * colour carries the two traits of the primaries it mixes, so every colour gives
 * something up.
 *
 * The rivals open **on the central column**, as far forward as the board allows, and
 * are pushed further out every time one of them is taken down — the survivors fall
 * back to what is from then on their starting ground (see {@link RIVAL_RANKS}). So
 * the board itself shows how the fight is going, with nothing drawn under anybody's
 * feet: there is no health to track, and an aura says who is holding a charge.
 *
 * The game ends when a side is wiped out (both at once is a draw), or at
 * {@link MAX_TURNS}, where the side with more fighters left wins. Winning is the
 * game's only source of experience: {@link CombatController.report} then summarises
 * the player's side for the `award_combat_exp` RPC, which pays out a share of the
 * player's current level — all of it for a flawless win, nothing for a loss.
 */
import { writable } from 'svelte/store';
import type { Hex } from '$utils/mugen/hex';
import type { MugenBoard } from '$utils/mugen/mugen-board';
import { findMove, type CharacterMove, type CombatColor } from '$types/character-definition.type';
import type { CombatOutcome, CombatReport } from '$types/combat.type';
import { colorTraits, type ColorTraits } from '$utils/color/traits';
import { pickWeighted } from '$utils/dice/roll';

/** Blue fighters (`info`) are the player's; red (`error`) are the rivals (CPU). */
export type FighterSide = 'error' | 'info';

/** The three orders of the stand-off. */
export type CombatAction = 'charge' | 'defend' | 'shoot';

/** Orders in the fixed display order the pickers list them in. */
export const COMBAT_ACTIONS: CombatAction[] = ['charge', 'defend', 'shoot'];

/** The most charges a fighter can hold at once — charging past it is wasted. */
export const MAX_CHARGES = 3;

/**
 * Turns before the stand-off is called. Two sides that only ever charge and defend
 * would circle forever, so the fight is decided on fighters left standing once the
 * clock runs out (an even count is a draw).
 */
export const MAX_TURNS = 20;

/**
 * The ground the rival line holds, a rank per fighter it has lost: they open on the
 * central column (rank 0) and are pushed further from it every time one of them goes
 * down, so `RIVAL_RANKS[n]` holds exactly the `3 − n` cells the survivors stand on
 * after `n` knockouts. The red half is one column deep, so the last two ranks are
 * both on it — the retreat carries on along the column, each rank sitting further
 * out to the left than the one before.
 *
 * Each rank is listed top→bottom on screen (which on a given column is `r`
 * descending), the same order the board draws that side's cards in and the order the
 * survivors are walked back in, so nobody crosses anybody on the way.
 */
export const RIVAL_RANKS: Hex[][] = [
	[
		{ q: 0, r: -1 },
		{ q: 0, r: -2 },
		{ q: 0, r: -3 }
	],
	[
		{ q: -1, r: -1 },
		{ q: -1, r: -2 }
	],
	[{ q: -1, r: -3 }]
];

/** Animation played when a fighter fires and its definition binds no ranged move. */
const FALLBACK_SHOT: CharacterMove = { name: 'Shot', type: 'ranged', source: '' };

/** The data the page hands the controller for one fighter. */
export interface FighterSeed {
	id: string;
	/** The `character_spawns` row this fighter is fielded from. Both sides carry one
	 * (the two sides can field the same spawn in a mirror match, hence the separate
	 * instance {@link id}); only the player's are ever reported for experience. */
	spawnId: string;
	name: string;
	side: FighterSide;
	/** The character's combat colour — the colour rolled for its Supabase spawn. It
	 * is the whole of what makes this fighter play differently from any other; see
	 * {@link ColorTraits}. */
	color: CombatColor;
	/** The moves this character's JSON definition declares (used for animation). */
	moves: CharacterMove[];
	/** Speed rating. Nothing in the rules turns on it — it only orders the bullets of
	 * a single turn, so the fastest shooter's is the one a passive guard eats. */
	spd: number;
	/** The spawn's HP attribute. No longer health — one hit takes anybody down — but
	 * it is the pool {@link CombatController.report} states a survivor came through
	 * whole, which is how the RPC weighs the fight's experience. */
	hpPool: number;
}

export interface Fighter extends FighterSeed {
	/** What this fighter's colour lets it do. */
	traits: ColorTraits;
	/** Charges banked, 0..{@link MAX_CHARGES}. Shooting spends one. */
	charges: number;
	/** True once a shot has landed on it: it is out of the fight for good. */
	down: boolean;
	/** The order it will carry out this turn, or null before one is given. */
	action: CombatAction | null;
	/** Red's extra: a shot fired on top of a charge or a defend. */
	bonus: boolean;
	/** Set once blue's free guard has been spent — it is worth one shot a battle. */
	guardSpent: boolean;
}

/** A fighter as the page renders it. A rival's orders are withheld until they are
 * carried out — the whole game is guessing them. */
export interface FighterView {
	id: string;
	spawnId: string;
	name: string;
	side: FighterSide;
	color: CombatColor;
	traits: ColorTraits;
	charges: number;
	maxCharges: number;
	down: boolean;
	/** The order this fighter is carrying out, or null — for a rival, null also
	 * means "not yet revealed". */
	action: CombatAction | null;
	bonus: boolean;
	/** Whether blue's free guard is still in hand (false once spent, or on a colour
	 * that never had one). */
	guarded: boolean;
	/** The fighter directly opposite — the only one it can shoot, and the only one
	 * that can shoot it. Null when its lane has been emptied. */
	opponentId: string | null;
	opponentName: string | null;
	/** Whether Shoot is a legal order for it right now: a charge to spend, and
	 * somebody opposite to spend it on. */
	canShoot: boolean;
	/** Whether its colour and charges let it add a shot to a charge or a defend. */
	canBonus: boolean;
	/** Whether its order is complete — given, and firing only when it can. */
	ordered: boolean;
}

export type CombatPhase = 'planning' | 'resolving' | 'done';

export interface CombatState {
	fighters: FighterView[];
	phase: CombatPhase;
	/** 1-based turn number, counted to {@link MAX_TURNS}. */
	turn: number;
	/** Short human-readable line describing what's happening. */
	status: string;
	/** What the turn being resolved amounted to, one line per event. */
	log: string[];
	/** True when every player fighter still standing has a complete order. */
	ready: boolean;
	/** Set once the game is over; drives the endgame modal. */
	outcome: CombatOutcome | null;
}

/** One shot fired this turn, resolved after every shot has been fired. */
interface Shot {
	shooter: Fighter;
	target: Fighter;
	/** True for red's extra shot, so the log can name it as such. */
	extra: boolean;
}

/** A fighter taken down this turn, and the shot that did it. */
interface Casualty {
	fighter: Fighter;
	by: Fighter;
}

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** How long the revealed orders are left to be read before the shooting starts. */
const REVEAL_MS = 600;

/** The beat held after each shot has been answered, before the next is taken. */
const SHOT_BEAT_MS = 320;

/** 'charge' → 'Charge', for the pickers' labels and the status lines. */
export const actionLabel = (action: CombatAction): string =>
	action.charAt(0).toUpperCase() + action.slice(1);

export class CombatController {
	private board: MugenBoard | null = null;
	private fighters: Fighter[];
	private phase: CombatPhase = 'planning';
	private turn = 1;
	private status = '';
	private log: string[] = [];
	private outcome: CombatOutcome | null = null;
	/** Which fighters are currently wearing an aura, so it is only redrawn when a
	 * fighter's charges cross between empty and holding something. */
	private readonly aura = new Set<string>();

	private readonly store = writable<CombatState>({
		fighters: [],
		phase: 'planning',
		turn: 1,
		status: '',
		log: [],
		ready: false,
		outcome: null
	});
	/** Svelte store contract, so the page can use `$controller`. */
	readonly subscribe = this.store.subscribe;

	/**
	 * @param seed every fighter of both sides, in **line-up order** within each side —
	 * the top→bottom order that side's characters stand in, which is the left→right
	 * order its cards are drawn in. For the rivals it is also the order they hold
	 * {@link RIVAL_RANKS}.
	 */
	constructor(seed: FighterSeed[]) {
		this.fighters = seed.map((entry) => {
			const traits = colorTraits(entry.color);
			return {
				...entry,
				traits,
				// Yellow's head start: it opens with a charge already banked, so it can
				// fire on the very first turn while everyone else is still loading.
				charges: traits.headStart ? 1 : 0,
				down: false,
				action: null,
				bonus: false,
				guardSpent: false
			};
		});
		this.planRivals();
		this.status = 'Give each of your fighters an order, then commit.';
		this.emit();
	}

	/**
	 * The finished game as an experience claim: the outcome plus every fighter the
	 * player fielded. A fighter is not damaged in this game, it is standing or it is
	 * not — so a survivor is reported as having come through its whole HP pool intact
	 * and a casualty as having none of it left, which is what makes the RPC's award
	 * (a share of the level scaled by compound HP) come out as the share of the team
	 * still on its feet. Only the player's side is reported — the rivals earn nothing
	 * — and only once the game is actually over, so a fight abandoned mid-turn yields
	 * `null` and pays out nothing. The server re-derives the award from this; nothing
	 * here decides an amount.
	 */
	report(): CombatReport | null {
		if (this.phase !== 'done' || !this.outcome) return null;
		return {
			outcome: this.outcome,
			fighters: this.players().map((fighter) => ({
				spawnId: fighter.spawnId,
				hpLeft: fighter.down ? 0 : fighter.hpPool,
				maxHp: fighter.hpPool
			}))
		};
	}

	/** Give the controller the running board engine so it can drive it. */
	attachBoard(board: MugenBoard): void {
		this.board = board;
		// Light the aura of anyone already holding a charge, so yellow's head start
		// shows on the board before a single order is given.
		for (const fighter of this.fighters) {
			if (fighter.charges > 0) void this.raiseAura(fighter);
		}
	}

	// --- Orders ---------------------------------------------------------------

	/** Give a player fighter its order for this turn. Freely changed until commit. */
	setAction(id: string, action: CombatAction): void {
		const fighter = this.playerReady(id);
		if (!fighter) return;
		if (action === 'shoot' && !this.canShoot(fighter)) return;
		fighter.action = action;
		// The extra shot rides on a *non-attacking* order, so taking the shot as the
		// order itself gives it up — nobody fires twice.
		if (action === 'shoot') fighter.bonus = false;
		this.emit();
	}

	/** Turn red's extra shot on or off for a player fighter that can fire one. */
	setBonus(id: string, on: boolean): void {
		const fighter = this.playerReady(id);
		if (!fighter) return;
		if (on && !this.canBonus(fighter)) return;
		fighter.bonus = on;
		this.emit();
	}

	/** Lock both sides' orders in and carry them out together. */
	commit(): void {
		if (this.phase !== 'planning' || !this.isReady()) return;
		this.phase = 'resolving';
		this.emit();
		void this.resolve();
	}

	// --- Resolution -----------------------------------------------------------

	/**
	 * Carry out the turn both sides committed to.
	 *
	 * The turn *happens* all at once — every charge is spent and every shot is aimed
	 * off the state the orders were given in, before a single bullet is measured — but
	 * it is *shown* one shot at a time. A volley resolved simultaneously on screen is
	 * six things to read in one instant and reads as a stutter; taken in turn, each
	 * shot flies, is answered, and is seen to be answered before the next is fired.
	 *
	 * Serialising the playback changes nothing about the outcome: the shot list is
	 * fixed before any of it plays, so a fighter felled early in the volley still
	 * fires the shot it had already taken, and only falls when the shooting stops.
	 */
	private async resolve(): Promise<void> {
		const acting = this.fighters.filter((fighter) => !fighter.down && fighter.action);

		// Every shot of the turn, aimed straight across the lane and worked out before
		// any of it plays, so who is opposite whom is settled by where everybody stood
		// when the orders were given — not by who has fallen part-way through the volley.
		const shots: Shot[] = [];
		for (const fighter of acting) {
			// A charge is only ever spent on a shot that is actually fired: at the fighter
			// opposite, and only while there is a charge left to pay for it.
			const fire = (extra: boolean): void => {
				const target = this.opposite(fighter);
				if (!target || fighter.charges < 1) return;
				fighter.charges -= 1;
				shots.push({ shooter: fighter, target, extra });
			};
			if (fighter.action === 'shoot') fire(false);
			if (fighter.bonus) fire(true);
		}
		// The order the bullets land in: the fastest shooter's arrives first.
		shots.sort((a, b) => b.shooter.spd - a.shooter.spd);

		this.log = [];
		this.setStatus('Orders are revealed.');
		this.showOrders(acting);
		await pause(REVEAL_MS);

		const felled: Casualty[] = [];
		for (const shot of shots) await this.playShot(shot, felled);

		// The fallen have held their flinch through the rest of the volley; now the
		// shooting is over they leave the board together.
		if (felled.length > 0) {
			await Promise.all(
				felled.map(({ fighter }) => {
					// The board removes the actor outright, aura and all.
					this.aura.delete(fighter.id);
					return this.board?.knockOut(fighter.id);
				})
			);
		}

		// Charging pays out last, and only for those still standing: a fighter shot
		// while loading never gets to bank it.
		for (const fighter of acting) {
			if (fighter.action !== 'charge' || fighter.down) continue;
			if (fighter.charges >= MAX_CHARGES) {
				this.log.push(`${fighter.name} is already full up on charges.`);
				continue;
			}
			fighter.charges += 1;
		}
		this.syncCharges();

		// Ground given up: the rival line falls back for every one of them that has gone
		// down.
		if (felled.some(({ fighter }) => fighter.side === 'error')) await this.fallBack();

		this.finishTurn();
	}

	/**
	 * One shot, played out on its own: it flies, and what its target chose to do about
	 * it is settled and shown before the next shot is taken. A target already hit
	 * earlier in the volley takes this one too — it just changes nothing, because it
	 * was already going down.
	 */
	private async playShot(shot: Shot, felled: Casualty[]): Promise<void> {
		const { shooter, target, extra } = shot;
		const from = extra ? `${shooter.name}'s extra shot` : `${shooter.name} shoots`;
		this.setStatus(`${shooter.name} fires at ${target.name}.`);
		await this.board?.shoot(shooter.id, target.id, this.shotMove(shooter));

		if (target.down) {
			this.log.push(`${from} — ${target.name} was already falling.`);
		} else if (target.action === 'defend') {
			this.log.push(`${from} at ${target.name}, who blocked it.`);
			this.board?.showCallout(target.id, 'BLOCK', target.color);
			// Brace again on the bullet, so the block is seen and not just labelled.
			const guard = findMove(target, 'defend');
			if (guard) void this.board?.playMove(target.id, guard);
		} else if (target.traits.passiveGuard && !target.guardSpent) {
			target.guardSpent = true;
			this.log.push(`${from} at ${target.name} — turned aside by its guard.`);
			this.board?.showCallout(target.id, 'GUARD', target.color);
		} else {
			target.down = true;
			felled.push({ fighter: target, by: shooter });
			this.log.push(`${from} — ${target.name} is down.`);
			// The slash is drawn in the colour of whoever's bullet got through.
			this.board?.showSlash(target.id, shooter.color);
			this.board?.showCallout(target.id, 'HIT!', shooter.color);
			await this.board?.playHurt(target.id);
		}
		this.emit();
		await pause(SHOT_BEAT_MS);
	}

	/**
	 * Put every acting fighter's order on the board at once: the loaders flare, the
	 * guards brace, and the shooters are left to their own firing pose. Both are
	 * started and left to run — the turn is not held up while an aura's textures are
	 * fetched, nor while a pose plays out, since the reveal is one thing to read and
	 * the shooting is what unfolds after it.
	 */
	private showOrders(acting: Fighter[]): void {
		this.board?.clearCallouts();
		for (const fighter of acting) {
			if (fighter.action === 'charge') {
				this.board?.showCallout(fighter.id, 'CHARGE', fighter.color);
				void this.raiseAura(fighter);
			} else if (fighter.action === 'defend') {
				this.board?.showCallout(fighter.id, 'GUARD', fighter.color);
				const move = findMove(fighter, 'defend');
				if (move) void this.board?.playMove(fighter.id, move);
			}
		}
	}

	/**
	 * Walk the rival survivors back onto the rank their losses have cost them. They
	 * keep their top→bottom order, so nobody crosses anybody on the way, and the cells
	 * they land on become their new home ground.
	 */
	private async fallBack(): Promise<void> {
		const standing = this.rivals().filter((fighter) => !fighter.down);
		const rank = RIVAL_RANKS[RIVAL_RANKS.length - standing.length];
		if (!rank) return;
		this.setStatus('The rival line falls back.');
		// One at a time: a survivor's own start cell can sit on another's route.
		for (let i = 0; i < standing.length; i++) {
			await this.board?.regroup(standing[i].id, rank[i]);
		}
	}

	/** End-of-turn bookkeeping: settle the game, or hand the next turn back. */
	private finishTurn(): void {
		const playersLeft = this.players().filter((fighter) => !fighter.down).length;
		const rivalsLeft = this.rivals().filter((fighter) => !fighter.down).length;
		if (playersLeft === 0 && rivalsLeft === 0) {
			this.end('draw', 'Both teams went down together.');
			return;
		}
		if (playersLeft === 0) {
			this.end('lose', 'Your whole team has been taken down.');
			return;
		}
		if (rivalsLeft === 0) {
			this.end('win', 'The rival team has been taken down.');
			return;
		}
		if (this.turn >= MAX_TURNS) {
			if (playersLeft > rivalsLeft) {
				this.end(
					'win',
					`Time — you finish with more fighters standing (${playersLeft}–${rivalsLeft}).`
				);
			} else if (rivalsLeft > playersLeft) {
				this.end(
					'lose',
					`Time — the rivals finish with more standing (${rivalsLeft}–${playersLeft}).`
				);
			} else {
				this.end('draw', `Time — both sides finish with ${playersLeft} standing.`);
			}
			return;
		}

		this.turn += 1;
		for (const fighter of this.fighters) {
			fighter.action = null;
			fighter.bonus = false;
		}
		this.planRivals();
		this.phase = 'planning';
		this.setStatus(`Turn ${this.turn} — give your orders.`);
	}

	/** End the game with an outcome; the arena reports it and closes. */
	private end(outcome: CombatOutcome, detail: string): void {
		this.phase = 'done';
		this.outcome = outcome;
		this.board?.clearAuras();
		this.aura.clear();
		this.setStatus(detail);
	}

	// --- The rival side -------------------------------------------------------

	/**
	 * Give every rival its order for the turn, before the player gives theirs — they
	 * are committing blind to each other, so the rivals' choices must already be made
	 * (and kept out of {@link view}) while the player is still deciding.
	 *
	 * With nothing to aim, the whole decision is the lane it stands in. A rival reads
	 * only the fighter opposite, because that is the only one that can shoot it and the
	 * only one it can shoot: with nothing banked it loads (ducking behind a guard now
	 * and then, but only while the one opposite could fire), and with a charge in hand
	 * it weighs firing against covering. Against somebody who cannot shoot back this
	 * turn, covering is worthless and it never picks it.
	 */
	private planRivals(): void {
		for (const rival of this.rivals()) {
			if (rival.down) continue;
			const target = this.opposite(rival);
			if (!target) {
				// Nobody in this lane: there is nothing to shoot and nothing to fear, so
				// it may as well go on loading.
				rival.action = 'charge';
				rival.bonus = false;
				continue;
			}
			const threatened = target.charges > 0;
			if (rival.charges < 1) {
				rival.action = threatened
					? (pickWeighted(['charge', 'defend'], [3, 1]) ?? 'charge')
					: 'charge';
			} else if (!threatened) {
				rival.action = 'shoot';
			} else {
				rival.action =
					pickWeighted<CombatAction>(['shoot', 'defend', 'charge'], [9, 7, 4]) ?? 'shoot';
			}
			// Red's extra: free damage on a turn it was spending on something else.
			rival.bonus = rival.action === 'shoot' ? false : this.canBonus(rival);
		}
	}

	// --- State ----------------------------------------------------------------

	private emit(): void {
		this.store.set({
			fighters: this.fighters.map((fighter) => this.view(fighter)),
			phase: this.phase,
			turn: this.turn,
			status: this.status,
			log: [...this.log],
			ready: this.isReady(),
			outcome: this.outcome
		});
	}

	/**
	 * One fighter as the page sees it. A rival's orders are withheld while they are
	 * still secret — during planning they read as no order at all, and only once the
	 * turn is being carried out does the page (and the player) learn what they were.
	 */
	private view(fighter: Fighter): FighterView {
		const secret = fighter.side === 'error' && this.phase === 'planning';
		const opponent = this.opposite(fighter);
		return {
			id: fighter.id,
			spawnId: fighter.spawnId,
			name: fighter.name,
			side: fighter.side,
			color: fighter.color,
			traits: fighter.traits,
			charges: fighter.charges,
			maxCharges: MAX_CHARGES,
			down: fighter.down,
			action: secret ? null : fighter.action,
			bonus: secret ? false : fighter.bonus,
			guarded: fighter.traits.passiveGuard && !fighter.guardSpent,
			opponentId: opponent?.id ?? null,
			opponentName: opponent?.name ?? null,
			canShoot: this.canShoot(fighter),
			canBonus: this.canBonus(fighter),
			ordered: this.isOrdered(fighter)
		};
	}

	private setStatus(status: string): void {
		this.status = status;
		this.emit();
	}

	private find(id: string): Fighter | undefined {
		return this.fighters.find((fighter) => fighter.id === id);
	}

	private players(): Fighter[] {
		return this.fighters.filter((fighter) => fighter.side === 'info');
	}

	private rivals(): Fighter[] {
		return this.fighters.filter((fighter) => fighter.side === 'error');
	}

	/** One side's fighters still standing, in line-up order — which is the order they
	 * hold the board, top→bottom, and so the order the lanes are counted in. */
	private standing(side: FighterSide): Fighter[] {
		return this.fighters.filter((fighter) => fighter.side === side && !fighter.down);
	}

	/**
	 * The fighter directly opposite: the one holding the same place in the enemy line
	 * that this one holds in its own. Nobody shoots across the board — a fighter's lane
	 * is the whole of who it can hit and who can hit it, so the choice a turn offers is
	 * only ever *whether* to fire, never at whom.
	 *
	 * The count is taken over those still standing, so the two lines re-pair as they
	 * thin: the rivals physically close up (they fall back onto a rank with a cell per
	 * survivor, see {@link RIVAL_RANKS}) and the player's line closes up with them.
	 * A fighter left over when its side outnumbers the other has an empty lane — it can
	 * neither shoot nor be shot until the lines even out again, which is what keeps a
	 * side that is a fighter down from simply being outgunned three to one.
	 */
	private opposite(fighter: Fighter): Fighter | null {
		if (fighter.down) return null;
		const lane = this.standing(fighter.side).indexOf(fighter);
		if (lane < 0) return null;
		return this.standing(fighter.side === 'info' ? 'error' : 'info')[lane] ?? null;
	}

	/** The player fighter this id names, if it may still be given orders. */
	private playerReady(id: string): Fighter | null {
		if (this.phase !== 'planning') return null;
		const fighter = this.find(id);
		if (!fighter || fighter.side !== 'info' || fighter.down) return null;
		return fighter;
	}

	/** Whether this fighter could fire at all right now: a charge to spend, and
	 * somebody standing in the lane to spend it on. */
	private canShoot(fighter: Fighter): boolean {
		return !fighter.down && fighter.charges > 0 && this.opposite(fighter) !== null;
	}

	/** Whether this fighter could add red's extra shot to its order right now: its
	 * colour allows it, it can fire, and its order is a non-attacking one. */
	private canBonus(fighter: Fighter): boolean {
		if (!fighter.traits.doubleAction || fighter.action === 'shoot') return false;
		return this.canShoot(fighter);
	}

	/** Whether a fighter's order is complete: given, and only firing where it can. */
	private isOrdered(fighter: Fighter): boolean {
		if (fighter.down) return true;
		if (!fighter.action) return false;
		if (fighter.action === 'shoot' && !this.canShoot(fighter)) return false;
		if (fighter.bonus && this.opposite(fighter) === null) return false;
		return true;
	}

	/** Whether the player's whole side is ready to commit. */
	private isReady(): boolean {
		if (this.phase !== 'planning') return false;
		return this.players().every((fighter) => this.isOrdered(fighter));
	}

	// --- Board ----------------------------------------------------------------

	/** Light (or put out) the aura that says at a glance who is holding a charge. The
	 * count itself is read off the pips beside each fighter's picker, not the board. */
	private syncCharges(): void {
		for (const fighter of this.fighters) {
			if (fighter.down) continue;
			if (fighter.charges > 0) void this.raiseAura(fighter);
			else this.dropAura(fighter);
		}
	}

	/** Light a fighter's aura, unless it is already burning (re-lighting restarts it). */
	private raiseAura(fighter: Fighter): Promise<void> | undefined {
		if (this.aura.has(fighter.id)) return undefined;
		this.aura.add(fighter.id);
		return this.board?.showAura(fighter.id, fighter.color);
	}

	private dropAura(fighter: Fighter): void {
		if (!this.aura.delete(fighter.id)) return;
		this.board?.clearAura(fighter.id);
	}

	/** The animation a fighter fires with: its own ranged move, or the empty
	 * fallback (which still flies a plain shot) for the melee-only fighters. */
	private shotMove(fighter: Fighter): CharacterMove {
		return findMove(fighter, 'ranged') ?? FALLBACK_SHOT;
	}
}
