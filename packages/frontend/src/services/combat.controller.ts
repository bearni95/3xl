/**
 * Combat: the schoolyard stand-off, three a side.
 *
 * The game is the playground one — **charge, defend, shoot** — played by two teams
 * of three at once. Every turn each fighter still standing is given one of those
 * three orders; both sides' orders are locked in blind and carried out together, so
 * a turn is a guess about what the other side is about to do, not a reaction to it.
 *
 *   · **Charge** banks one charge (up to {@link MAX_CHARGES}, which is one — a
 *     fighter is loaded or it is empty). It is the only way to get one, and it leaves
 *     the fighter wide open for the turn it takes.
 *   · **Defend** turns aside every shot aimed at the fighter that turn, but banks
 *     nothing — spend the whole fight defending and you never fire.
 *   · **Shoot** spends a charge and attacks **straight across the lane**: the fighter
 *     walks out of its cell, up to the one opposite, and hits it with its own melee
 *     move. Nobody attacks sideways: the fight is three private duels, each between the
 *     two fighters drawn level with each other, so a turn asks whether to strike, never
 *     at whom — and a lane whose other half has fallen simply has nobody left to go at.
 *     A blow that isn't turned aside takes its target down: **one hit is all it takes**,
 *     whoever it lands on. Two fighters who go at each other in the same turn, though,
 *     set off at the same *moment*: they meet in the middle of the lane and their blows
 *     cancel, so neither gets through and neither fighter falls (see
 *     {@link CombatController.playExchange}). A blow stops a blow — a free attack
 *     included, since a gift is an attack like any other — which is why a lane is never
 *     emptied on both sides at once.
 *
 * What separates one card from another is nothing but its **colour** (see
 * `colorPassives` in @3xl/shared), and what a colour hands over is one of those very
 * three orders, taken for free: red a shot, yellow a charge, blue a defend. It is
 * worth **one use in the whole battle**, it only comes on a turn the fighter was
 * given something *else* to do — a passive happens beside your order, so it can never
 * be your order, and ordering the very thing your colour owes you keeps it for a later
 * turn — and it is only used up on a turn it actually did something. A compound colour
 * carries both of the primaries it mixes and spends both at once on any turn both are
 * allowed, so it is one very good turn rather than a better card.
 *
 * A fighter's two things therefore happen on the same turn, and they happen **in
 * sequence**: the **charge** — ordered or free — is resolved before everything else,
 * because it is the only order another order needs, and the shots of the turn are fired
 * out of what it banked (see {@link CombatController.bankCharges}). So a red fighter told
 * to load banks the charge and then fires the shot its colour owes it out of that very
 * charge, and an orange one told to cover does it off its own two gifts. Both sides play
 * by this: the rivals' orders are decided blind ({@link CombatController.planRivals}) but
 * they are carried out by the same resolution, gifts and ordering included.
 *
 * The rivals open **on the central white column**, as far forward as the board allows,
 * one cell facing each of the player's fighters — so the ground itself is what is being
 * fought over, lane by lane. A lane is settled on the board the turn it is decided: the
 * winner either takes that white cell (the player's fighter walks up onto it) or
 * withdraws off it into its own half (the rival). So the board itself shows how the
 * fight is going, with nothing drawn under anybody's
 * feet: there is no health to track, and a fighter holding a charge simply *burns* —
 * an aura in its own colour, lit the turn it loads and out the turn it fires, so who
 * is dangerous can be read off the board at a glance and at any moment.
 *
 * The fight is never to sudden death. It is three encounters, and each one is won by
 * the fighter left standing when the other falls (both falling together is nobody's),
 * so the score — {@link CombatState.wins} — is what decides it. It is called the moment
 * every encounter is settled, at {@link MAX_TURNS} at the latest, and whenever the
 * player gives it up ({@link CombatController.concede}). Fighting is the game's only
 * source of experience: {@link CombatController.report} then summarises the player's
 * side for the `award_combat_exp` RPC, which pays out a share of the player's current
 * level — all of it for a flawless win, a hundredth of it for a loss, nothing for a
 * draw. The amount is the server's, always; nothing here names one.
 */
import { writable } from 'svelte/store';
import { cellSide, isBoardCell, type Hex } from '$utils/mugen/hex';
import type { MugenBoard } from '$utils/mugen/mugen-board';
import { findMove, type CharacterMove, type CombatColor } from '$types/character-definition.type';
import type { CombatOutcome, CombatReport } from '$types/combat.type';
import type { BattleBoardSnapshot, BattleFighterSnapshot } from '$types/battle.type';
import { colorPassives, ORDER_ICONS, type PassiveOrder } from '$utils/color/traits';
import { pickWeighted } from '$utils/dice/roll';

/** Blue fighters (`info`) are the player's; red (`error`) are the rivals (CPU). */
export type FighterSide = 'error' | 'info';

/** The three orders of the stand-off. The same three a colour hands over for free
 * ({@link PassiveOrder}) — a passive is not a fourth kind of thing. */
export type CombatAction = PassiveOrder;

/** Orders in the fixed display order the pickers list them in. */
export const COMBAT_ACTIONS: CombatAction[] = ['charge', 'defend', 'shoot'];

/**
 * The most charges a fighter can hold at once. At one, a fighter is simply loaded or
 * empty: there is no hoarding a turn's advantage for later, so every turn spent
 * loading is a turn spent open, and the shot it buys has to be worth that. Charging
 * while already loaded is a wasted turn.
 */
export const MAX_CHARGES = 1;

/**
 * Turns before the stand-off is called. Two sides that only ever charge and defend
 * would circle forever, so the fight is decided on fighters left standing once the
 * clock runs out (an even count is a draw).
 */
export const MAX_TURNS = 20;

/**
 * The ground the player's line opens on, listed top→bottom on screen — the far column
 * of its own half, facing the rivals a row apart. A fighter holds its own cell until
 * the lane in front of it is won, and the only ground it ever takes is that lane's
 * white cell (see {@link CombatController.settleGround}).
 */
export const PLAYER_CELLS: Hex[] = [
	{ q: 2, r: -2 },
	{ q: 2, r: -3 },
	{ q: 2, r: -4 }
];

/**
 * The ground the rival line opens on, listed top→bottom on screen: the shared white
 * column itself — as far forward as the board allows, one cell facing each of the
 * player's. Holding it is what the fight is about, and a rival only ever leaves it
 * one way (see {@link CombatController.settleGround}): the turn it wins its lane, it
 * withdraws a column into its own half, and the turn it loses one the player's
 * fighter walks up and takes the cell off it.
 */
export const RIVAL_CELLS: Hex[] = [
	{ q: 0, r: -1 },
	{ q: 0, r: -2 },
	{ q: 0, r: -3 }
];

/** Animation played when a fighter attacks and its definition binds no melee move. */
const FALLBACK_STRIKE: CharacterMove = { name: 'Strike', type: 'melee', source: '' };

/**
 * A fighter as a line-up identifies it: the line it stands in and the spawn it is
 * fielded from. Everything a saved board is matched against, and no more — what a
 * fighter *is* has nothing to do with whether a board is describing it.
 */
export interface LineupFighter {
	side: FighterSide;
	spawnId: string;
}

/**
 * Whether a saved board describes `lineup` — the fighters in **seed order**, which is
 * the order each side's lanes are numbered in.
 *
 * A board is only ever taken whole: the same number of fighters, each standing in the
 * lane it was saved in, each fielded from the spawn it was saved with. Anything else —
 * a team changed since, a board belonging to another battle, a row half-written — is
 * refused rather than patched in, and the fight is started instead. A half-restored
 * fight would be a different game wearing this one's turn number.
 *
 * It is exported because the fight is not the only thing a board is put back onto: the
 * arena stands the line-up up on the cells that board records, and a board good enough
 * to draw but not good enough to play would show a fight nobody is having. One rule,
 * asked by both.
 */
export function boardFitsLineup(
	snapshot: BattleBoardSnapshot | null,
	lineup: readonly LineupFighter[]
): boolean {
	if (!snapshot || snapshot.turn < 1) return false;
	if (snapshot.fighters.length !== lineup.length) return false;
	const lines: Record<FighterSide, LineupFighter[]> = {
		info: lineup.filter((fighter) => fighter.side === 'info'),
		error: lineup.filter((fighter) => fighter.side === 'error')
	};
	return snapshot.fighters.every(
		(entry) => lines[entry.side]?.[entry.slot]?.spawnId === entry.spawnId
	);
}

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
	 * {@link colorPassives}. */
	color: CombatColor;
	/** The moves this character's JSON definition declares (used for animation). */
	moves: CharacterMove[];
}

export interface Fighter extends FighterSeed {
	/** The orders this fighter's colour hands it for free, one per primary it mixes. */
	passives: PassiveOrder[];
	/** Those of them it has already had. Each is worth one use in the whole battle, so
	 * a gift in here is gone for good. */
	spent: PassiveOrder[];
	/** The board cell it is standing on. Its line-up slot's opening ground until the
	 * lane it fights in is decided, and then whatever ground that left it holding
	 * (see {@link CombatController.settleGround}). */
	cell: Hex;
	/** Charges banked, 0..{@link MAX_CHARGES}. Shooting spends one — the free shot
	 * included: it is the *turn* a colour hands over, never the ammunition. */
	charges: number;
	/** True once a shot has landed on it: it is out of the fight for good. */
	down: boolean;
	/** The order it will carry out this turn, or null before one is given. */
	action: CombatAction | null;
}

/** A fighter as the page renders it. A rival's orders are withheld until they are
 * carried out — the whole game is guessing them. */
export interface FighterView {
	id: string;
	spawnId: string;
	name: string;
	side: FighterSide;
	color: CombatColor;
	/** The free orders its colour granted it, and those of them already had — what the
	 * board wears at the fighter's corner, and which of them still stand for something. */
	passives: PassiveOrder[];
	spent: PassiveOrder[];
	charges: number;
	maxCharges: number;
	down: boolean;
	/** The order this fighter is carrying out, or null — for a rival, null also
	 * means "not yet revealed". */
	action: CombatAction | null;
	/** The fighter directly opposite — the only one it can shoot, and the only one
	 * that can shoot it. Null when its lane has been emptied. */
	opponentId: string | null;
	opponentName: string | null;
	/** Whether Shoot is a legal order for it right now: a charge to spend, and
	 * somebody opposite to spend it on. */
	canShoot: boolean;
	/**
	 * Whether this fighter has taken the white cell its lane was played for and is out of
	 * the turn order for good ({@link CombatController.holdsGround}). Nothing is asked of
	 * it any more: the page draws it no buttons, and it is not one of the fighters the
	 * turn is waiting on.
	 */
	holdsGround: boolean;
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
	/**
	 * Encounters won, per side. The fight is not to sudden death: it is three duels,
	 * and each one is won by whichever fighter is left standing when the other falls —
	 * so this is the score, and the side ahead on it is the side that wins the fight.
	 */
	wins: Record<FighterSide, number>;
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

/**
 * One thing the shooting of a turn shows: a lone shot, or the two shots of a lane whose
 * fighters both fired — which are one event, because they happened at one moment.
 */
type ShotGroup = [Shot] | [Shot, Shot];

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
		wins: { info: 0, error: 0 },
		outcome: null
	});
	/** Svelte store contract, so the page can use `$controller`. */
	readonly subscribe = this.store.subscribe;

	/**
	 * @param seed every fighter of both sides, in **line-up order** within each side —
	 * the top→bottom order that side's characters stand in, which is the order each
	 * side's opening ground ({@link PLAYER_CELLS}, {@link RIVAL_CELLS}) is handed out
	 * in, and so the order the lanes are numbered in.
	 * @param resume a board saved by {@link snapshot} — the fight is picked up on the
	 * turn it was left on instead of started. A snapshot that does not describe this
	 * line-up is ignored and the fight simply starts (see {@link restore}).
	 */
	constructor(seed: FighterSeed[], resume: BattleBoardSnapshot | null = null) {
		const slots = { error: 0, info: 0 };
		this.fighters = seed.map((entry) => {
			const slot = slots[entry.side]++;
			return {
				...entry,
				passives: colorPassives(entry.color),
				spent: [],
				// Where it stands. A line longer than the board's own ground has no cell
				// for its extra fighters — they still fight their lane, they are just not
				// standing anywhere the board can move them to or from.
				cell: (entry.side === 'info' ? PLAYER_CELLS : RIVAL_CELLS)[slot],
				// Everybody opens empty. Yellow's free charge is a charge like any other:
				// it has to be given on a turn spent doing something else, so the fighter
				// that wants it early buys it by covering on turn one.
				charges: 0,
				down: false,
				action: null
			};
		});
		if (!this.restore(resume)) {
			this.planRivals();
			this.status = 'Give each of your fighters an order, then commit.';
		}
		this.emit();
	}

	/**
	 * The fight as it stands between turns, small enough to be written back to the
	 * player's open battle every time a turn closes (see `battle.type`).
	 *
	 * Only what the fight cannot be rebuilt without is in here. Who is fighting comes
	 * back from the line-up the arena fields, and everything derived — the score, whose
	 * lane is settled, who may still shoot, the auras — falls out of these flags again
	 * on the way in. The rivals' orders are included because they are decided *before*
	 * the player gives theirs: a resumed fight that re-rolled them would be a fresh
	 * blind guess, which is not the same turn.
	 */
	snapshot(): BattleBoardSnapshot {
		const lines: Record<FighterSide, Fighter[]> = { info: this.players(), error: this.rivals() };
		return {
			turn: this.turn,
			fighters: this.fighters.map((fighter) => ({
				side: fighter.side,
				slot: lines[fighter.side].indexOf(fighter),
				spawnId: fighter.spawnId,
				charges: fighter.charges,
				down: fighter.down,
				spent: [...fighter.spent],
				action: fighter.action,
				// A line longer than the board's ground leaves its extras standing nowhere.
				cell: fighter.cell ? { q: fighter.cell.q, r: fighter.cell.r } : null
			}))
		};
	}

	/**
	 * Put a saved board back onto this line-up, or refuse it whole — see
	 * {@link boardFitsLineup} for what "this line-up" means, which is the one rule both
	 * this and the arena's own placement read.
	 */
	private restore(snapshot: BattleBoardSnapshot | null): boolean {
		if (!boardFitsLineup(snapshot, this.fighters)) return false;
		const board = snapshot as BattleBoardSnapshot;

		const lines: Record<FighterSide, Fighter[]> = { info: this.players(), error: this.rivals() };
		const pairs: [Fighter, BattleFighterSnapshot][] = board.fighters.map((entry) => [
			lines[entry.side][entry.slot],
			entry
		]);

		for (const [fighter, entry] of pairs) {
			fighter.charges = Math.max(0, Math.min(entry.charges, MAX_CHARGES));
			fighter.down = entry.down;
			// Only gifts this colour actually has can have been spent: a board naming
			// one it never carried says nothing about it either way.
			const spent = entry.spent ?? [];
			fighter.spent = fighter.passives.filter((order) => spent.includes(order));
			fighter.action = entry.action;
			// Ground won earlier in the fight, as long as it is ground: a cell the board
			// would refuse leaves the fighter on the one its slot opened on.
			if (entry.cell && isBoardCell(entry.cell.q, entry.cell.r)) fighter.cell = entry.cell;
		}

		this.turn = board.turn;
		this.phase = 'planning';
		this.status = `Turn ${this.turn} — give your orders.`;
		return true;
	}

	/**
	 * The finished game as an experience claim: the outcome plus every fighter the
	 * player fielded, each simply standing or down. There is no health in this game —
	 * one hit takes anybody down — so the share of the level the RPC pays out is the
	 * share of the team still on its feet, counted from these flags. Only the player's
	 * side is reported — the rivals earn nothing — and only once the game is actually
	 * over, so a fight abandoned mid-turn yields `null` and pays out nothing. The
	 * server re-derives the award from this; nothing here decides an amount.
	 */
	report(): CombatReport | null {
		if (this.phase !== 'done' || !this.outcome) return null;
		return {
			outcome: this.outcome,
			fighters: this.players().map((fighter) => ({
				spawnId: fighter.spawnId,
				down: fighter.down
			}))
		};
	}

	/** Give the controller the running board engine so it can drive it. */
	attachBoard(board: MugenBoard): void {
		this.board = board;
		for (const fighter of this.fighters) {
			// The fallen are not on the board a resumed fight comes back to — they were
			// taken off it when they fell — so nothing is drawn for them here either.
			if (fighter.down) continue;
			// What its colour gives it for nothing, and how much of that it still has.
			// Every fighter wears it, rivals included: what a rival will *do* is the
			// guess, but what it is was never a secret.
			this.showTraits(fighter);
			// Light the aura of anyone holding a charge, so a fight picked up where it
			// was left shows who is dangerous before a single order is given.
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
		this.emit();
	}

	/**
	 * Give the fight up: it is over, and it is a loss.
	 *
	 * A fight cannot be walked out of — the battle is the server's and it is only ended
	 * by a result being reported (see `battle.service`) — so conceding is how a player
	 * gets out of one they do not want to play: it ends here exactly as being wiped out
	 * would, and is reported as the loss it is, which banks no ground and earns the
	 * hundredth of a level's span every loss earns. Nobody is knocked down for it: the
	 * fighters are left standing as they stood, since that is what actually happened, and
	 * a loss pays the same either way — the consolation does not read the team.
	 *
	 * Only between turns. Mid-volley the turn is still being carried out and would
	 * settle the fight itself the moment it finished, over the top of this.
	 */
	concede(): void {
		if (this.phase !== 'planning') return;
		this.end('lose', 'You gave the fight up.');
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
	 * The turn *happens* all at once — every charge is spent and every attack is aimed
	 * off the state the orders were given in, before a single blow is measured — but
	 * it is *shown* one attack at a time. A volley resolved simultaneously on screen is
	 * six things to read in one instant and reads as a stutter; taken in turn, each
	 * fighter walks out, strikes, is answered, and is seen to be answered before the
	 * next one sets off.
	 *
	 * Serialising the playback changes nothing about the outcome: the shot list is
	 * fixed before any of it plays, so a fighter felled early in the volley still
	 * throws the attack it had already taken, and only falls when the volley ends.
	 *
	 * The one thing that is *ordered* within a turn is the charge, and it comes first:
	 * see {@link bankCharges}.
	 */
	private async resolve(): Promise<void> {
		const acting = this.fighters.filter((fighter) => !fighter.down && fighter.action);
		this.log = [];

		// Charges are banked before a single shot is aimed — see bankCharges for why a
		// charge outranks the rest of the turn. Everything below is paid for out of what
		// it leaves banked.
		this.bankCharges(acting);
		// So the loaders are already burning by the time the orders are read out, whether
		// the charge came from the order or from the colour.
		this.syncCharges();

		// Every shot of the turn, aimed straight across the lane and worked out before
		// any of it plays, so who is opposite whom is settled by where everybody stood
		// when the orders were given — not by who has fallen part-way through the volley.
		const shots: Shot[] = [];
		for (const fighter of acting) {
			// A charge is only ever spent on a shot that is actually fired: at the fighter
			// opposite, and only while there is a charge left to pay for it.
			const fire = (extra: boolean): boolean => {
				const target = this.opposite(fighter);
				if (!target || fighter.charges < 1) return false;
				fighter.charges -= 1;
				shots.push({ shooter: fighter, target, extra });
				return true;
			};
			if (fighter.action === 'shoot') {
				fire(false);
			} else if (this.passiveReady(fighter, 'shoot')) {
				// Red's free shot, fired beside whatever the turn was actually spent on.
				// It is only the *turn* that comes free — the charge is paid as ever — so a
				// fighter with nothing banked and nothing loading keeps the gift for a turn
				// it can fire. A turn spent loading is not such a turn: the charge above is
				// already banked, and this is what it pays for.
				if (fire(true)) this.spend(fighter, 'shoot');
			}
		}
		// The blows land in the order the fighters stand in — top→bottom down each
		// side's line, red before blue. Nothing about a fighter makes its attack land
		// sooner: the running order is the board's, not a rating's. The one exception is a
		// lane that attacked both ways, whose two blows are one event (see groupShots).

		this.setStatus('Orders are revealed.');
		this.showOrders(acting);
		await pause(REVEAL_MS);

		const felled: Casualty[] = [];
		for (const group of this.groupShots(shots)) {
			if (group.length === 2) await this.playExchange(group[0], group[1]);
			else await this.playShot(group[0], felled);
		}

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

		// The shots have been paid for out of what was banked at the top of the turn, so
		// the auras that are out are the ones that fired.
		this.syncCharges();

		// Ground won and given up: every lane the volley decided is walked out on the
		// board before the next turn is asked for.
		await this.settleGround(felled);

		this.finishTurn();
	}

	/**
	 * Bank every charge the turn produces, before anything else in it happens: the
	 * fighters ordered to load, and the fighters whose colour hands them one for free.
	 *
	 * A charge outranks the rest of a turn because it is the only one of the three orders
	 * another order *needs*: a shot is paid for out of a charge, a guard and a charge are
	 * paid for out of nothing. Resolving it first is what makes a fighter's two things —
	 * the order it was given and the gift its colour throws in — resolve in sequence
	 * rather than in a heap: a red fighter told to load banks the charge and then fires
	 * the free shot out of it, on the one turn, in that order. An orange one told to cover
	 * does the same off its own two gifts.
	 *
	 * A fighter with nowhere to put a charge does not get one. Ordering a charge while
	 * full is a turn thrown away (the turn is still gone), and a *free* charge that lands
	 * on a full fighter is simply not taken — it waits for a turn with room for it, which
	 * is the rule about a gift only being spent on doing something. A fighter about to
	 * fire is full at this moment and empties itself later in the turn, so a colour's
	 * charge keeps for a turn that can hold it rather than quietly re-arming a shooter.
	 */
	private bankCharges(acting: Fighter[]): void {
		for (const fighter of acting) {
			const full = (): boolean => fighter.charges >= MAX_CHARGES;
			if (fighter.action === 'charge') {
				if (full()) this.log.push(`${fighter.name} is already full up on charges.`);
				else fighter.charges += 1;
			}
			// Never both of these: a gift is never the order it was given (passiveReady),
			// so a fighter ordered to load is not also handed one.
			if (this.passiveReady(fighter, 'charge') && !full()) {
				fighter.charges += 1;
				this.spend(fighter, 'charge');
				this.log.push(`${fighter.name} banks a free charge.`);
			}
		}
	}

	/**
	 * Sort the turn's shots into what is actually played out: mostly one shot at a time,
	 * but a lane whose *both* fighters fired is a single event, because they fired at one
	 * moment. Two shots pair up when each is aimed at the other's shooter, which — since
	 * every shot goes straight across a lane — is the same thing as a lane having fired
	 * both ways. Where the shot came from does not come into it: an ordered shot and a
	 * free one are both attacks, so they pair like any other two.
	 *
	 * A fighter fires at most one shot a turn (a gift is never the order it was given, so
	 * nobody both orders a shot and is handed one), which is why a pair is a pair and not
	 * a tally to be worked through.
	 */
	private groupShots(shots: Shot[]): ShotGroup[] {
		const groups: ShotGroup[] = [];
		const paired = new Set<Shot>();
		for (const shot of shots) {
			if (paired.has(shot)) continue;
			paired.add(shot);
			const back = shots.find(
				(other) =>
					!paired.has(other) && other.shooter === shot.target && other.target === shot.shooter
			);
			if (back) {
				paired.add(back);
				groups.push([shot, back]);
			} else {
				groups.push([shot]);
			}
		}
		return groups;
	}

	/**
	 * A lane that attacked both ways, played as the one thing it is: the two set off at
	 * the same moment, meet in the middle of the lane, and their blows cancel. Neither
	 * gets through, so neither fighter falls.
	 *
	 * Nothing else about the turn is touched by this. The charges are spent — they paid
	 * for the attacks, and the attacks were thrown — and a free attack spent on one of
	 * them stays spent, because meeting the one that was coming for you is the gift doing
	 * something. What is *not* called on is either fighter's guard: a blow stopped by
	 * another blow was never turned aside by anything else, so a free guard is still in
	 * hand afterwards.
	 *
	 * Both are shown at once rather than one after the other — they walk out to meet each
	 * other and strike together. Taken in turn they would read as one fighter attacking
	 * and the other answering, which is the one thing a turn given blind never is.
	 */
	private async playExchange(one: Shot, two: Shot): Promise<void> {
		const named = (shot: Shot) =>
			shot.extra ? `${shot.shooter.name}'s free shot` : `${shot.shooter.name}'s shot`;
		this.setStatus(`${one.shooter.name} and ${two.shooter.name} go at each other at once.`);
		this.log.push(`${named(one)} and ${named(two)} meet in the lane — both come to nothing.`);
		for (const shot of [one, two]) {
			this.board?.showCallout(shot.shooter.id, 'CLASH', shot.shooter.color);
		}
		// Out to the middle together — neither is walked onto the other, because neither
		// of them got there first — and then both strike at the one moment.
		await this.board?.meleeApproach(one.shooter.id, two.shooter.id);
		await Promise.all([
			this.board?.playMove(one.shooter.id, this.strikeMove(one.shooter)),
			this.board?.playMove(two.shooter.id, this.strikeMove(two.shooter))
		]);
		await Promise.all([
			this.board?.returnHome(one.shooter.id),
			this.board?.returnHome(two.shooter.id)
		]);
		this.emit();
		await pause(SHOT_BEAT_MS);
	}

	/**
	 * One attack, played out on its own: the attacker walks out of its cell, up to the
	 * fighter opposite, and strikes it where it stands. What the target chose to do about
	 * it is settled and shown before the attacker walks back and the next attack is
	 * thrown. A target already struck earlier in the volley takes this one too — it just
	 * changes nothing, because it was already going down.
	 */
	private async playShot(shot: Shot, felled: Casualty[]): Promise<void> {
		const { shooter, target, extra } = shot;
		const from = extra ? `${shooter.name}'s free shot` : `${shooter.name} shoots`;
		this.setStatus(`${shooter.name} goes at ${target.name}.`);
		// Close in, then strike: the blow is awaited to its last frame, so what it did is
		// only said once it has actually been thrown.
		await this.board?.closeIn(shooter.id, target.id);
		await this.board?.playMove(shooter.id, this.strikeMove(shooter));

		if (target.down) {
			this.log.push(`${from} — ${target.name} was already falling.`);
		} else if (target.action === 'defend') {
			this.log.push(`${from} at ${target.name}, who blocked it.`);
			this.board?.showCallout(target.id, 'BLOCK', target.color);
			// Brace again on the blow, so the block is seen and not just labelled.
			const guard = findMove(target, 'defend');
			if (guard) void this.board?.playMove(target.id, guard);
		} else if (this.passiveReady(target, 'defend')) {
			// Blue's free guard. It is only had on a turn the fighter wasn't covering
			// anyway (the branch above), and only spent on a shot it actually turns
			// aside — a quiet turn costs it nothing.
			this.spend(target, 'defend');
			this.log.push(`${from} at ${target.name} — turned aside by its free guard.`);
			this.board?.showCallout(target.id, 'GUARD', target.color);
		} else {
			target.down = true;
			felled.push({ fighter: target, by: shooter });
			this.log.push(`${from} — ${target.name} is down.`);
			// The slash is drawn in the colour of whoever's blow got through.
			this.board?.showSlash(target.id, shooter.color);
			this.board?.showCallout(target.id, 'HIT!', shooter.color);
			await this.board?.playHurt(target.id);
		}
		// Back to its own cell, struck or blocked: the ground a fighter holds is not
		// changed by having gone out to hit somebody, and the next lane's attack is
		// played from the line as it stood.
		await this.board?.returnHome(shooter.id);
		this.emit();
		await pause(SHOT_BEAT_MS);
	}

	/**
	 * Put every acting fighter's order on the board at once: the loaders flare, the
	 * guards brace, and the attackers are left standing where they are — an attack is
	 * not a pose thrown from a cell, it is the walk out and the blow at the end of it,
	 * which is what unfolds after the reveal. The aura and the guard are both started
	 * and left to run: the turn is not held up while an aura's textures are fetched,
	 * nor while a pose plays out, since the reveal is one thing to read.
	 *
	 * Nothing is cleared here: the callouts of the turn just played are taken down when
	 * the next turn is handed over (see {@link finishTurn}), so they stand for as long
	 * as the turn they belong to is still being resolved.
	 */
	private showOrders(acting: Fighter[]): void {
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
	 * Walk out what the volley settled. A lane is a duel over the white cell between
	 * the two who stand in it, and the one left standing when the other falls has just
	 * won that ground — so it is moved, once, and holds where it lands for the rest of
	 * the fight:
	 *
	 *   · **The player's fighter won** — it walks up onto the white cell the rival was
	 *     holding and takes it. Ground gained is ground shown.
	 *   · **The rival won** — there is nothing left in front of it, so it withdraws off
	 *     the white column into its own half, a column back the way it came.
	 *
	 * Both sides falling together settles nothing: neither is standing to take the
	 * ground, and the cell is simply left empty. The walks are taken one at a time —
	 * one lane's route can run through another's cell — and a fighter with no cell to
	 * move to (an over-long line, or a board that refuses the ground) just stays put.
	 */
	private async settleGround(felled: Casualty[]): Promise<void> {
		for (const { fighter } of felled) {
			const winner = this.counterpart(fighter);
			if (!winner || winner.down) continue;
			const ground =
				fighter.side === 'error'
					? // The white cell the fallen rival was holding, now the player's.
						fighter.cell
					: // A column back the way it came: its own half is out from the centre.
						winner.cell && { q: winner.cell.q - 1, r: winner.cell.r };
			if (!ground || !isBoardCell(ground.q, ground.r)) continue;
			winner.cell = ground;
			this.setStatus(
				fighter.side === 'error'
					? `${winner.name} takes the ground.`
					: `${winner.name} falls back.`
			);
			await this.board?.regroup(winner.id, ground);
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
		// Every encounter settled: whoever is left standing has nobody in front of them
		// any more, so there is nothing left to play and the score is the result. It is
		// the same answer the count of fighters would give — a lane is only ever won by
		// felling the fighter across from it — reached without sitting out the clock.
		if (this.settled()) {
			const won = this.lanesWon('info');
			const lost = this.lanesWon('error');
			if (won > lost) {
				this.end('win', `Every encounter is settled — you take it ${won}–${lost}.`);
			} else if (lost > won) {
				this.end('lose', `Every encounter is settled — the rivals take it ${lost}–${won}.`);
			} else {
				this.end('draw', `Every encounter is settled — honours even at ${won}–${lost}.`);
			}
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
		// What the last turn said — CHARGE, GUARD, BLOCK, HIT! — belonged to that turn.
		// The orders are being asked for again, so it comes off the board with them: the
		// words never outlive the turn whose pickers are locked.
		this.board?.clearCallouts();
		for (const fighter of this.fighters) fighter.action = null;
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
	 *
	 * Nothing here decides what its colour hands it: a free order is not chosen by
	 * anybody, so a rival's gifts arrive off the back of the order it picked, exactly
	 * as the player's do. What it *does* read is the gifts still in hand, its own and
	 * its lane's, because those change what a turn is worth: a fighter opposite with
	 * nothing banked is still dangerous while its colour owes it a shot (it loads, and
	 * the charge pays for the gift the same turn), and a rival whose own colour owes it
	 * a charge is loaded by covering, so it has no reason to stand open to load by hand.
	 * Reading them is not choosing them — they still arrive off the order, for both sides.
	 */
	private planRivals(): void {
		for (const rival of this.rivals()) {
			if (rival.down) continue;
			const target = this.opposite(rival);
			if (!target) {
				// Nobody in this lane: there is nothing to shoot and nothing to fear, so it
				// loads if it has room and otherwise just covers, rather than spending every
				// turn spilling charges it cannot hold.
				rival.action = rival.charges >= MAX_CHARGES ? 'defend' : 'charge';
				continue;
			}
			const threatened = this.threatens(target);
			if (rival.charges < 1) {
				// Covering is the timid choice — except for a fighter its colour still owes a
				// charge, which is loaded by the turn it covers on. Under threat that beats
				// standing open to load by hand: it ends the turn armed either way.
				rival.action = threatened
					? this.owes(rival, 'charge')
						? 'defend'
						: (pickWeighted(['charge', 'defend'], [3, 1]) ?? 'charge')
					: 'charge';
			} else if (!threatened) {
				rival.action = 'shoot';
			} else if (rival.charges >= MAX_CHARGES) {
				// Loading again would spill over the cap, so a full fighter only fires or covers.
				rival.action = pickWeighted<CombatAction>(['shoot', 'defend'], [9, 7]) ?? 'shoot';
			} else {
				rival.action =
					pickWeighted<CombatAction>(['shoot', 'defend', 'charge'], [9, 7, 4]) ?? 'shoot';
			}
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
			wins: { info: this.lanesWon('info'), error: this.lanesWon('error') },
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
			// What a colour grants, and what of it is gone, are never secret: they are
			// worn at the fighter's corner all fight long, rivals included.
			passives: [...fighter.passives],
			spent: [...fighter.spent],
			charges: fighter.charges,
			maxCharges: MAX_CHARGES,
			down: fighter.down,
			action: secret ? null : fighter.action,
			opponentId: opponent?.id ?? null,
			opponentName: opponent?.name ?? null,
			canShoot: this.canShoot(fighter),
			holdsGround: this.holdsGround(fighter),
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

	/**
	 * The fighter sharing this one's lane — its opposite number in the other line,
	 * whether or not either of them is still standing. The lane is the slot each holds
	 * in its own line-up, and it is fixed for the whole fight: the two of them were
	 * placed level with each other on the board and neither can leave that pairing, so
	 * a lane is the same two fighters from the first turn to the one that settles it.
	 * Null for a fighter the other line is too short to face.
	 */
	private counterpart(fighter: Fighter): Fighter | null {
		const line = fighter.side === 'error' ? this.rivals() : this.players();
		const facing = fighter.side === 'error' ? this.players() : this.rivals();
		return facing[line.indexOf(fighter)] ?? null;
	}

	/**
	 * The fighter directly opposite: the one this fighter is drawn level with on the
	 * board, if both are still standing. Nobody shoots across the board — a fighter's
	 * lane is the whole of who it can hit and who can hit it, so the choice a turn
	 * offers is only ever *whether* to fire, never at whom.
	 *
	 * A fighter whose lane has been settled has nobody left to shoot for the rest of
	 * the fight: nothing re-pairs the lines, so no fighter further up or down may reach
	 * across for it, and none is handed a new target by a death somewhere else. That is
	 * what keeps a side that is a fighter down from simply being outgunned three to one.
	 */
	private opposite(fighter: Fighter): Fighter | null {
		if (fighter.down) return null;
		const facing = this.counterpart(fighter);
		return facing && !facing.down ? facing : null;
	}

	/**
	 * How many encounters a side has won: one for each fighter of the other line that
	 * has fallen with the fighter it was facing still standing. This is the score the
	 * fight is decided on — it is not a race to wipe the other side out, but three
	 * duels, each of which is somebody's.
	 *
	 * Two who shoot each other down in the same volley win nothing between them: that
	 * encounter is nobody's, and it stays that way, since neither is coming back.
	 */
	private lanesWon(side: FighterSide): number {
		return this.fighters.filter((fighter) => {
			if (fighter.side === side || !fighter.down) return false;
			const winner = this.counterpart(fighter);
			return !!winner && !winner.down;
		}).length;
	}

	/** Whether every encounter has been settled — nobody standing has anybody left in
	 * front of them, so no shot can ever be fired again and the score is final. */
	private settled(): boolean {
		return this.fighters.every((fighter) => fighter.down || !this.opposite(fighter));
	}

	/** The player fighter this id names, if it may still be given orders. */
	private playerReady(id: string): Fighter | null {
		if (this.phase !== 'planning') return null;
		const fighter = this.find(id);
		if (!fighter || fighter.side !== 'info' || fighter.down) return null;
		// One that has taken the ground its lane was played for is out of the fight: it
		// takes no more orders, so a tap on it is nothing.
		if (this.holdsGround(fighter)) return null;
		return fighter;
	}

	/**
	 * Whether this fighter has taken the ground its lane was fought over and stands down
	 * for the rest of the fight: one of the player's, standing on the shared white column.
	 *
	 * That column is what every lane is played for, and the only way onto it for the
	 * player's side is winning the lane in front of it ({@link settleGround}) — so a
	 * fighter that holds one has settled its encounter: nobody in front of it to shoot,
	 * nobody left who could shoot it, and no charge worth banking, because the lines never
	 * re-pair and it will never face anybody again ({@link opposite}). It is therefore
	 * asked for nothing more: no buttons of its own on the board, and the turn does not
	 * wait on it to be commitable. It simply holds what it took.
	 */
	private holdsGround(fighter: Fighter): boolean {
		if (fighter.side !== 'info' || fighter.down) return false;
		return !!fighter.cell && cellSide(fighter.cell.q) === 'purple';
	}

	/** Whether this fighter could fire at all right now: a charge to spend, and
	 * somebody standing in the lane to spend it on. */
	private canShoot(fighter: Fighter): boolean {
		return !fighter.down && fighter.charges > 0 && this.opposite(fighter) !== null;
	}

	/**
	 * Whether `order` is one this fighter is owed for free on the turn being played:
	 * its colour grants it, it has not been had yet, and — the whole of what makes it
	 * *passive* — the fighter is not spending its own turn on that very order. A gift
	 * arrives beside what you chose, so it can never be what you chose.
	 *
	 * This says nothing about whether it will amount to anything; that is each gift's
	 * own business, and only a gift that amounts to something is {@link spend}ed.
	 */
	private passiveReady(fighter: Fighter, order: PassiveOrder): boolean {
		if (fighter.down) return false;
		if (!this.owes(fighter, order)) return false;
		return fighter.action !== order;
	}

	/**
	 * Whether this fighter's colour still owes it `order` — it grants it and it has not
	 * been had yet. Says nothing about the turn: this is the gift being *in hand*, which
	 * is what both sides can read off any fighter's corner all fight long, as against
	 * {@link passiveReady}, which is the gift being owed *now*.
	 */
	private owes(fighter: Fighter, order: PassiveOrder): boolean {
		return fighter.passives.includes(order) && !fighter.spent.includes(order);
	}

	/**
	 * Whether this fighter could put a bullet across its lane on the turn about to be
	 * played. A charge in hand is one way; the other is a colour that still owes it a
	 * shot, because a charge is banked before the volley — so a fighter standing empty
	 * can order a load and have the free shot pay for itself the same turn. Anybody
	 * weighing whether to cover has to count that as a threat, or it would read half the
	 * rules.
	 */
	private threatens(fighter: Fighter): boolean {
		return !fighter.down && (fighter.charges > 0 || this.owes(fighter, 'shoot'));
	}

	/**
	 * Mark a gift as had — it is worth one use in the whole battle — and let the board
	 * fade the glyph that stood for it, so a corner never offers what the fighter no
	 * longer holds.
	 */
	private spend(fighter: Fighter, order: PassiveOrder): void {
		if (fighter.spent.includes(order)) return;
		fighter.spent.push(order);
		this.showTraits(fighter);
	}

	/** Whether a fighter's order is complete: given, and only firing where it can. A
	 * fighter nothing is asked of — down, or holding the ground it won — is complete by
	 * standing there, so the turn is never held up waiting on one. */
	private isOrdered(fighter: Fighter): boolean {
		if (fighter.down || this.holdsGround(fighter)) return true;
		if (!fighter.action) return false;
		if (fighter.action === 'shoot' && !this.canShoot(fighter)) return false;
		return true;
	}

	/** Whether the player's whole side is ready to commit. */
	private isReady(): boolean {
		if (this.phase !== 'planning') return false;
		return this.players().every((fighter) => this.isOrdered(fighter));
	}

	// --- Board ----------------------------------------------------------------

	/** Put a fighter's gifts at its corner: the glyph of each order its colour hands
	 * over, faded once it has been had. */
	private showTraits(fighter: Fighter): void {
		this.board?.setTraits(
			fighter.id,
			fighter.passives.map((order) => ({
				icon: ORDER_ICONS[order],
				spent: fighter.spent.includes(order)
			})),
			fighter.color
		);
	}

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

	/** The animation a fighter strikes with: its own melee move, or the empty fallback
	 * — a fighter whose definition binds nothing still walks out and lands the blow,
	 * it simply throws no pose over it. */
	private strikeMove(fighter: Fighter): CharacterMove {
		return findMove(fighter, 'melee') ?? FALLBACK_STRIKE;
	}
}
