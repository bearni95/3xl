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
 * award. The browser reports which town it fought and which generation it fought;
 * it never states a win count, a required count or an occupant.
 *
 * A siege is therefore paced rather than ground out: a player may challenge each
 * town **once per Catalan day**, midnight Europe/Madrid to midnight, exactly as
 * the booster allowance resets. The spent day is a {@link MunicipalityChallenge}
 * row, written by the `start_challenge` RPC when the fight opens and settled by
 * `award_combat_exp` when it is reported — so taking a town that has changed
 * hands twice takes at least three days.
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
}

/** A municipality currently occupied by a player, as everyone sees it. */
export interface MunicipalityHolder {
	/** The town, as its geojson feature id (e.g. `ES_08028`). */
	locationId: string;
	/** The occupying player's auth user id. */
	userId: string;
	/** The occupier's display name, resolved server-side from their account. */
	holderName: string;
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
 * One town's challenge slot for one Catalan day, spent by the player it belongs
 * to. Its mere existence is the limit: a town with a row for today has been
 * challenged today and cannot be challenged again until midnight Europe/Madrid,
 * whether that fight was won, lost, or walked away from.
 *
 * The exception is a slot the server has *voided*, which is a day handed back:
 * the town changed hands while the fight was still open, so the fight was against
 * a team that no longer sits there and cost its challenger nothing. Those rows do
 * not limit anything and are left on the server — the set loaded here is only the
 * slots that still close their town off.
 *
 * Written server-side only — `start_challenge` opens (or revives) it,
 * `award_combat_exp` settles it and voids everyone else's when a fight takes the
 * town. RLS scopes it to its owner, so the set a client loads is always the
 * signed-in player's own.
 */
export interface MunicipalityChallenge {
	/** The town, as its geojson feature id. */
	locationId: string;
	/** The Catalan day the challenge was spent on, `YYYY-MM-DD`. */
	date: string;
	/** ISO timestamp the challenge was opened. */
	startedAt: string;
	/**
	 * ISO timestamp the fight was reported, or null while it is still open — a
	 * challenge started and never finished. Either way the day is spent; this only
	 * tells the server whether a report against it is the first one.
	 */
	settledAt: string | null;
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
 * One line of the map's "latest towns won" table: a town that has changed hands,
 * named alongside the show its sitting team belongs to. Assembled on the client
 * from the holder rows, the municipality polygons (for the name) and the
 * character → show assignment (for the show).
 */
export interface TerritoryWinRow {
	/** The town, as its geojson feature id — also the row key. */
	locationId: string;
	/** The town's display name, ready to render. */
	name: string;
	/** The occupier's display name. */
	holderName: string;
	/** The show the sitting team belongs to, or null when it belongs to none. */
	showName: string | null;
	/**
	 * That show's TMDB id, carried alongside the name purely so the table can look
	 * up the show's icon. Null exactly when `showName` is.
	 */
	showId: number | null;
	/**
	 * Wins the reader has banked against this town's sitting team, from their own
	 * `municipality_sieges` row (RLS-scoped, so 0 when signed out).
	 */
	wins: number;
	/** Wins it takes to dethrone that team — {@link requiredWins} of its turnover. */
	required: number;
	/** ISO timestamp the town was taken, newest first in the table. */
	takenAt: string;
}

/** Raw `municipality_holders` row as the Supabase client returns it. */
export interface MunicipalityHolderRow {
	location_id: string;
	user_id: string;
	holder_name: string | null;
	team: unknown;
	turnover: number | string | null;
	taken_at: string;
}

/** Raw `municipality_sieges` row as the Supabase client returns it. */
export interface MunicipalitySiegeRow {
	location_id: string;
	user_id: string;
	wins: number | string | null;
	turnover: number | string | null;
}

/** Raw `municipality_challenges` row as the Supabase client returns it. */
export interface MunicipalityChallengeRow {
	location_id: string;
	challenge_date: string;
	started_at: string;
	settled_at: string | null;
}
