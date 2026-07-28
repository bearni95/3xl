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
 *   · **Shoot** spends a charge and fires at a chosen enemy. A shot that isn't
 *     turned aside takes its target down: **one hit is all it takes**, whoever it
 *     lands on. Shooting is also not defending, so two fighters who shoot each other
 *     on the same turn both fall.
 *
 * What separates one card from another is nothing but its **colour** (see
 * `colorTraits` in @3xl/shared): red may fire *on top of* a charge or a defend,
 * yellow opens the battle with a charge already banked, and blue turns aside the
 * first shot of any turn it doesn't spend defending. A compound colour carries the
 * two traits of the primaries it mixes — so the counter to blue's free guard is two
 * shots at it in the one turn, and the counter to red's second action is not being
 * where it is aiming.
 *
 * The rivals open **on the central column**, as far forward as the board allows, and
 * are pushed back a column every time one of them is taken down — the survivors fall
 * back to what is from then on their starting ground (see {@link RIVAL_RANKS}). So
 * the board itself shows how the fight is going, without a single HP bar: the meter
 * under each fighter counts its charges, not its health.
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
import { pickOne, pickWeighted } from '$utils/dice/roll';

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
 * central column (rank 0) and give up a column every time one of them goes down, so
 * `RIVAL_RANKS[n]` holds exactly the `3 − n` cells the survivors stand on after `n`
 * knockouts. Each rank is listed top→bottom on screen, the same order the board
 * draws that side's cards in.
 */
export const RIVAL_RANKS: Hex[][] = [
	[
		{ q: 0, r: -3 },
		{ q: 0, r: -2 },
		{ q: 0, r: -1 }
	],
	[
		{ q: -1, r: -2 },
		{ q: -1, r: -1 }
	],
	[{ q: -2, r: -1 }]
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
	/** Who its shot is aimed at, when {@link action} is `shoot`. */
	targetId: string | null;
	/** Red's extra: a shot fired on top of a charge or a defend. */
	bonus: boolean;
	/** Who that extra shot is aimed at. */
	bonusTargetId: string | null;
	/** Set while a turn resolves, once blue's free guard has eaten a shot. */
	guarded: boolean;
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
	targetId: string | null;
	bonus: boolean;
	bonusTargetId: string | null;
	/** Whether Shoot is a legal order for it right now (it has a charge to spend). */
	canShoot: boolean;
	/** Whether its colour and charges let it add a shot to a charge or a defend. */
	canBonus: boolean;
	/** Whether its order is complete — given, and with a live target for every shot. */
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
				targetId: null,
				bonus: false,
				bonusTargetId: null,
				guarded: false
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
		// Seed every fighter's meter with the charges it opens on, so yellow's head
		// start is visible before a single order is given.
		for (const fighter of this.fighters) {
			board.setMeter(fighter.id, fighter.charges, MAX_CHARGES);
			if (fighter.charges > 0) void this.raiseAura(fighter);
		}
	}

	// --- Orders ---------------------------------------------------------------

	/** Give a player fighter its order for this turn. Freely changed until commit. */
	setAction(id: string, action: CombatAction): void {
		const fighter = this.playerReady(id);
		if (!fighter) return;
		if (action === 'shoot' && fighter.charges < 1) return;
		fighter.action = action;
		if (action === 'shoot') {
			// A shot always needs somebody to be aimed at; default to whoever this
			// fighter was already aiming at, else the first rival standing.
			fighter.targetId = this.liveTarget(fighter, fighter.targetId);
			// The extra shot rides on a *non-attacking* order, so taking the shot as the
			// order itself gives it up — nobody fires twice.
			fighter.bonus = false;
			fighter.bonusTargetId = null;
		}
		this.emit();
	}

	/** Aim a player fighter's shot at a rival. */
	setTarget(id: string, targetId: string): void {
		const fighter = this.playerReady(id);
		if (!fighter || !this.isLiveEnemy(fighter, targetId)) return;
		fighter.targetId = targetId;
		this.emit();
	}

	/** Turn red's extra shot on or off for a player fighter that can fire one. */
	setBonus(id: string, on: boolean): void {
		const fighter = this.playerReady(id);
		if (!fighter) return;
		if (on && !this.canBonus(fighter)) return;
		fighter.bonus = on;
		fighter.bonusTargetId = on ? this.liveTarget(fighter, fighter.bonusTargetId) : null;
		this.emit();
	}

	/** Aim a player fighter's extra shot at a rival. */
	setBonusTarget(id: string, targetId: string): void {
		const fighter = this.playerReady(id);
		if (!fighter || !fighter.bonus || !this.isLiveEnemy(fighter, targetId)) return;
		fighter.bonusTargetId = targetId;
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
	 * Carry out the turn both sides committed to. Everything happens at once, so the
	 * whole turn is worked out from the state the orders were given in: charges are
	 * spent, every shot is fired, and only then is each one measured against what its
	 * target chose to do. A fighter felled by one bullet still fires its own.
	 */
	private async resolve(): Promise<void> {
		const acting = this.fighters.filter((fighter) => !fighter.down && fighter.action);
		for (const fighter of acting) fighter.guarded = false;

		// Every shot of the turn, in the order the bullets land: the fastest shooter's
		// arrives first, so a blue fighter's free guard eats that one and the shots
		// behind it go through.
		const shots: Shot[] = [];
		for (const fighter of acting) {
			// A charge is only ever spent on a shot that is actually fired: at somebody
			// still standing, and only while there is a charge left to pay for it.
			const fire = (targetId: string | null, extra: boolean): void => {
				const target = targetId ? this.find(targetId) : undefined;
				if (!target || target.down || fighter.charges < 1) return;
				fighter.charges -= 1;
				shots.push({ shooter: fighter, target, extra });
			};
			if (fighter.action === 'shoot') fire(fighter.targetId, false);
			if (fighter.bonus) fire(fighter.bonusTargetId, true);
		}
		shots.sort((a, b) => b.shooter.spd - a.shooter.spd);

		this.log = [];
		this.setStatus('Orders revealed.');
		await this.showOrders(acting);
		await pause(500);

		// Fire everything together — the point of the game is that nobody sees the
		// other side's bullet leave in time to do anything about it.
		await Promise.all(
			shots.map((shot) =>
				this.board?.shoot(shot.shooter.id, shot.target.id, this.shotMove(shot.shooter))
			)
		);

		// Now measure each shot against what its target chose. A target already felled
		// this turn takes the extra bullet all the same — it just changes nothing.
		const felled: Casualty[] = [];
		for (const shot of shots) {
			const { shooter, target } = shot;
			const from = shot.extra ? `${shooter.name}'s extra shot` : `${shooter.name} shoots`;
			if (target.down) {
				this.log.push(`${from} — ${target.name} was already falling.`);
				continue;
			}
			if (target.action === 'defend') {
				this.log.push(`${from} at ${target.name}, who blocked it.`);
				this.board?.showCallout(target.id, 'BLOCK', target.color);
				continue;
			}
			if (target.traits.passiveGuard && !target.guarded) {
				target.guarded = true;
				this.log.push(`${from} at ${target.name} — turned aside by its guard.`);
				this.board?.showCallout(target.id, 'GUARD', target.color);
				continue;
			}
			target.down = true;
			felled.push({ fighter: target, by: shooter });
			this.log.push(`${from} — ${target.name} is down.`);
		}

		if (felled.length > 0) {
			this.emit();
			await Promise.all(
				felled.map(({ fighter, by }) => {
					// The slash is drawn in the colour of whoever's bullet got through.
					this.board?.showSlash(fighter.id, by.color);
					this.board?.showCallout(fighter.id, 'HIT!', by.color);
					return this.board?.playHurt(fighter.id);
				})
			);
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

		// Ground given up: the rival line falls back a column for every one of them
		// that has gone down.
		if (felled.some(({ fighter }) => fighter.side === 'error')) await this.fallBack();

		this.finishTurn();
	}

	/** Put each acting fighter's order on the board: the loaders flare, the guards
	 * brace, and the shooters are left to their own firing pose. */
	private async showOrders(acting: Fighter[]): Promise<void> {
		this.board?.clearCallouts();
		await Promise.all(
			acting.map((fighter) => {
				if (fighter.action === 'charge') {
					this.board?.showCallout(fighter.id, 'CHARGE', fighter.color);
					return this.raiseAura(fighter);
				}
				if (fighter.action === 'defend') {
					this.board?.showCallout(fighter.id, 'GUARD', fighter.color);
					const move = findMove(fighter, 'defent');
					return move ? this.board?.playMove(fighter.id, move) : undefined;
				}
				return undefined;
			})
		);
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
			fighter.targetId = null;
			fighter.bonus = false;
			fighter.bonusTargetId = null;
			fighter.guarded = false;
		}
		this.planRivals();
		this.phase = 'planning';
		this.setStatus(`Turn ${this.turn} — give your orders.`);
	}

	/** End the game with an outcome; the page shows it in a blocking modal. */
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
	 * The reasoning is short: a rival with nothing banked has to load (though it will
	 * sometimes duck behind a guard instead if anything opposite could fire), and one
	 * with a charge weighs firing against covering. When nobody opposite can shoot at
	 * all, defending is worthless and it never picks it. Shots go at whoever is
	 * holding the most charges — the fighter most likely to fire back.
	 */
	private planRivals(): void {
		const threatened = this.players().some((fighter) => !fighter.down && fighter.charges > 0);
		for (const rival of this.rivals()) {
			if (rival.down) continue;
			const target = this.threatOpposite(rival);
			if (!target) {
				rival.action = 'charge';
				continue;
			}
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
			if (rival.action === 'shoot') {
				rival.targetId = target.id;
				rival.bonus = false;
				rival.bonusTargetId = null;
			} else {
				rival.targetId = null;
				// Red's extra: free damage on a turn it was spending on something else.
				rival.bonus = this.canBonus(rival);
				rival.bonusTargetId = rival.bonus ? target.id : null;
			}
		}
	}

	/** The enemy a fighter should be shooting at: whoever opposite holds the most
	 * charges (ties broken at random), or null when nobody is left. */
	private threatOpposite(fighter: Fighter): Fighter | null {
		const enemies = this.enemiesOf(fighter);
		if (enemies.length === 0) return null;
		const most = Math.max(...enemies.map((enemy) => enemy.charges));
		return pickOne(enemies.filter((enemy) => enemy.charges === most)) ?? enemies[0];
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
			targetId: secret ? null : fighter.targetId,
			bonus: secret ? false : fighter.bonus,
			bonusTargetId: secret ? null : fighter.bonusTargetId,
			canShoot: !fighter.down && fighter.charges > 0,
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

	/** Everybody on the other side who is still standing. */
	private enemiesOf(fighter: Fighter): Fighter[] {
		return this.fighters.filter((other) => other.side !== fighter.side && !other.down);
	}

	/** The player fighter this id names, if it may still be given orders. */
	private playerReady(id: string): Fighter | null {
		if (this.phase !== 'planning') return null;
		const fighter = this.find(id);
		if (!fighter || fighter.side !== 'info' || fighter.down) return null;
		return fighter;
	}

	private isLiveEnemy(fighter: Fighter, id: string): boolean {
		return this.enemiesOf(fighter).some((enemy) => enemy.id === id);
	}

	/** Keep `preferred` if it is still a live enemy, else fall to the first one. */
	private liveTarget(fighter: Fighter, preferred: string | null): string | null {
		const enemies = this.enemiesOf(fighter);
		if (preferred && enemies.some((enemy) => enemy.id === preferred)) return preferred;
		return enemies[0]?.id ?? null;
	}

	/** Whether this fighter could add red's extra shot to its order right now: its
	 * colour allows it, it has a charge for it, and its order is a non-attacking one. */
	private canBonus(fighter: Fighter): boolean {
		if (fighter.down || !fighter.traits.doubleAction) return false;
		if (fighter.action === 'shoot' || fighter.charges < 1) return false;
		return this.enemiesOf(fighter).length > 0;
	}

	/** Whether a fighter's order is complete: given, with a live target per shot. */
	private isOrdered(fighter: Fighter): boolean {
		if (fighter.down) return true;
		if (!fighter.action) return false;
		if (fighter.action === 'shoot' && !this.isLiveEnemy(fighter, fighter.targetId ?? ''))
			return false;
		if (fighter.bonus && !this.isLiveEnemy(fighter, fighter.bonusTargetId ?? '')) return false;
		return true;
	}

	/** Whether the player's whole side is ready to commit. */
	private isReady(): boolean {
		if (this.phase !== 'planning') return false;
		return this.players().every((fighter) => this.isOrdered(fighter));
	}

	// --- Board ----------------------------------------------------------------

	/** Push every fighter's charges to its meter, and light (or put out) the aura
	 * that says at a glance who is holding one. */
	private syncCharges(): void {
		for (const fighter of this.fighters) {
			if (fighter.down) continue;
			this.board?.setMeter(fighter.id, fighter.charges, MAX_CHARGES);
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

	/** The animation a fighter fires with: its own ranged move, its final if that is
	 * all it binds, or the empty fallback (which still flies a plain shot). */
	private shotMove(fighter: Fighter): CharacterMove {
		return findMove(fighter, 'ranged') ?? findMove(fighter, 'final') ?? FALLBACK_SHOT;
	}
}
