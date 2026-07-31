/**
 * Territory: who actually occupies each municipality on the map.
 *
 * Every town starts with the deterministic "OG" house team the client rolls from
 * the town's own seed (see `utils/spawn/municipality-team`) — nothing is stored
 * for it, every player sees the same one. Once a player beats that team enough
 * times the town changes hands: a `municipality_holders` row is written naming
 * them and freezing the team they won with, and from then on *that* team is what
 * the map shows and what the next challenger fights. The seed is only ever the
 * fallback for towns nobody has taken yet.
 *
 * Taking a town gets harder every time it changes hands. A holder row carries a
 * {@link MunicipalityHolder.turnover} count — how many times the town has flipped
 * — and a challenger must win {@link requiredWins} fights against the sitting
 * team before it falls: once for the untouched OG team, twice for a town that has
 * been taken once, three times for one taken twice, and so on. Progress towards
 * that is a {@link MunicipalitySiege} row per (town, challenger), and it is scoped
 * to the holder generation it was earned against — when the town flips, every
 * siege on it starts over.
 *
 * Both tables are written **only** by the `award_combat_exp` security-definer RPC,
 * which does the territory bookkeeping in the same transaction as the experience
 * award. The browser does not even name the town: which town was fought, and which
 * generation of its team, are read off the player's open battle (see
 * `battle.type`), and the win count, the bar and the occupant are all the RPC's.
 *
 * A siege is therefore paced rather than ground out: finishing a fight over a town
 * puts that town on a **cooldown** for the player who fought it, and they may come
 * back to it the moment the cooldown runs out. The cooldown is a
 * {@link MunicipalityChallenge} row, opened by the `start_battle` RPC when the
 * fight starts and given its deadline by `award_combat_exp` when the fight is
 * reported — the wait begins at the end of the fight, not at its start, so a long
 * fight is never also a longer wait.
 */

import { SpawnColor } from './character-spawn.type';

/**
 * One fighter of an occupying team, frozen as it stood when the town was taken.
 *
 * Deliberately a flat copy of the winning spawn's gameplay attributes rather than
 * a `character_spawns` reference: those rows are RLS-scoped to their owner, so no
 * other player could read them — and the holder's team has to be visible to
 * everyone who looks at the town. It also keeps the occupying team fixed at the
 * strength that won the town, immune to the holder later recycling the cards.
 */
export interface HolderTeamMember {
	/** Character id — resolves into the @3xl/data registry for label + sprite. */
	characterId: string;
	/** The colour the winning spawn had rolled. */
	color: SpawnColor;
	/**
	 * Where the winning spawn was *claimed* — its own town, not the one it went on
	 * to take. A card belongs to the place it was pulled at, and it keeps saying so
	 * wherever it is later fielded.
	 *
	 * Null for a card claimed off the map (Ultramar) and for holder rows frozen
	 * before the RPC copied this across, which is why every reader must have
	 * somewhere to fall back to.
	 */
	locationId: string | null;
}

/** A municipality currently occupied by a player, as everyone sees it. */
export interface MunicipalityHolder {
	/** The town, as its geojson feature id (e.g. `ES_08028`). */
	locationId: string;
	/** The occupying player's auth user id. */
	userId: string;
	/**
	 * What to call the occupier: the username they have chosen, joined on live by the
	 * `municipality_holders_public` view. A holder who has not named themselves has
	 * no name to show, and the adapter words that generically — nothing about how
	 * they signed in is ever shown here in its place.
	 */
	holderName: string;
	/**
	 * The character half of the avatar the occupier is wearing, joined on live by
	 * the same view — null for a holder still on the initial-letter avatar, which is
	 * what their name is drawn as instead. Always read with {@link avatarColor}: an
	 * avatar is the pair, and half of one names nothing (see `profile.type`).
	 */
	avatarCharacterId: string | null;
	/** The colour half of that same avatar; null for the letter avatar. */
	avatarColor: SpawnColor | null;
	/** The team that won the town, in the order it was fielded. */
	team: HolderTeamMember[];
	/**
	 * How many times this town has changed hands. 1 the first time a player takes
	 * it from the OG team, 2 the next time it flips, and so on — so it is also the
	 * number of wins the *next* challenger owes (see {@link requiredWins}).
	 */
	turnover: number;
	/** ISO timestamp the town was taken. */
	takenAt: string;
}

/**
 * One challenger's progress against one town's sitting team: the wins they have
 * banked toward dethroning it. Scoped to {@link turnover} — the holder generation
 * the wins were earned against — so a town flipping voids every siege on it.
 */
export interface MunicipalitySiege {
	locationId: string;
	userId: string;
	/** Wins banked against the current holder. */
	wins: number;
	/** The holder generation these wins count against. */
	turnover: number;
}

/**
 * One player's last challenge on one town, and the cooldown it left behind. There
 * is one row per (player, town) — the fight they are in, or the last one they
 * finished — and what limits anything is {@link availableAt}: until that instant
 * passes the town cannot be challenged again by that player, whether the fight
 * was won, lost, or walked away from.
 *
 * The clock starts when the fight is **reported**, not when it opens, so a fight
 * that took an hour is not also an hour of the wait. While the fight is still open
 * there is no deadline yet ({@link settledAt} and {@link availableAt} both null) —
 * and nothing is needed, since the open battle is already the one fight the player
 * may be in (see `battle.type`).
 *
 * The exception is a slot the server has *voided*: the town changed hands while
 * the fight was still open, so what was beaten no longer sits there and the fight
 * cost its challenger nothing. Those settle with no deadline at all — the player
 * may come straight back at the new occupant — and never reach a client, the
 * server serving only the cooldowns still running.
 *
 * Written server-side only: `start_battle` opens it, `award_combat_exp` settles it
 * and voids everyone else's when a fight takes the town. RLS scopes it to its
 * owner, so the set a client loads is always the signed-in player's own.
 */
export interface MunicipalityChallenge {
	/** The town, as its geojson feature id. */
	locationId: string;
	/** ISO timestamp the challenge was opened. */
	startedAt: string;
	/**
	 * ISO timestamp the fight was reported, or null while it is still open — a
	 * challenge started and never finished.
	 */
	settledAt: string | null;
	/**
	 * ISO timestamp the town opens up again at: the end of the fight plus the
	 * cooldown, as the server measured it. Null while the fight is still open, and
	 * on a slot the server voided — neither is a wait.
	 *
	 * How long the cooldown is, is never named here. It is the server's alone (see
	 * `challenge_cooldown()`); this is the deadline it came back with.
	 */
	availableAt: string | null;
}

/**
 * The instant `challenge`'s town opens up again, epoch ms — or null when there is
 * no wait to draw (no challenge, a fight still open, a voided slot).
 */
export function challengeAvailableAt(
	challenge: MunicipalityChallenge | null | undefined
): number | null {
	if (!challenge?.availableAt) return null;
	const at = Date.parse(challenge.availableAt);
	return Number.isFinite(at) ? at : null;
}

/**
 * Whether that town is still cooling down for its player at `now` — the client's
 * copy of the rule `start_battle` enforces, used only to keep the Challenge button
 * from opening a fight onto a refusal.
 */
export function challengeCoolingDown(
	challenge: MunicipalityChallenge | null | undefined,
	now: number = Date.now()
): boolean {
	const at = challengeAvailableAt(challenge);
	return at !== null && at > now;
}

/**
 * How many wins it takes to dethrone a town whose team has changed hands
 * `turnover` times. An untouched town (turnover 0, still on its OG team) falls to
 * a single win; each flip since then adds one more fight the next challenger has
 * to win, so the sitting leader gets harder to shift the longer the town has been
 * fought over.
 */
export function requiredWins(turnover: number): number {
	return Math.max(1, Math.trunc(turnover) + 1);
}

/** How far a challenger has got against one town, and the bar they have to clear. */
export interface SiegeProgress {
	/** Wins banked against the town's *current* sitting team. */
	wins: number;
	/** Wins it takes to dethrone that team. */
	required: number;
	/** The town's turnover — the generation those figures are about. */
	turnover: number;
}

/**
 * Read a player's progress against one town out of the holder and siege sets the
 * map already has loaded.
 *
 * A siege banked against a turnover the town has since moved past counts for
 * nothing: those wins were earned off a team that no longer sits there. The
 * server wipes such rows when a town flips, but a client copy loaded before the
 * flip is discarded here too, rather than shown as progress the player no longer
 * has.
 */
export function siegeProgress(
	locationId: string,
	holders: ReadonlyMap<string, MunicipalityHolder>,
	sieges: ReadonlyMap<string, MunicipalitySiege>
): SiegeProgress {
	const turnover = holders.get(locationId)?.turnover ?? 0;
	const siege = sieges.get(locationId);
	return {
		wins: siege && siege.turnover === turnover ? siege.wins : 0,
		required: requiredWins(turnover),
		turnover
	};
}

/**
 * Raw `municipality_holders_public` row as the Supabase client returns it — the
 * holders table with the holder's current username and worn avatar joined on. Null
 * `holder_name` is a holder who has not named themselves; null avatar halves are a
 * holder still on the initial-letter avatar.
 */
export interface MunicipalityHolderRow {
	location_id: string;
	user_id: string;
	holder_name: string | null;
	team: unknown;
	turnover: number | string | null;
	taken_at: string;
	avatar_character_id: string | null;
	avatar_color: string | null;
}

/** Raw `municipality_sieges` row as the Supabase client returns it. */
export interface MunicipalitySiegeRow {
	location_id: string;
	user_id: string;
	wins: number | string | null;
	turnover: number | string | null;
}

/**
 * Raw `municipality_challenges_open` row as the Supabase client returns it — the
 * challenges whose cooldown is still running, which is the only kind a client is
 * served.
 */
export interface MunicipalityChallengeRow {
	location_id: string;
	started_at: string;
	settled_at: string | null;
	available_at: string | null;
}
