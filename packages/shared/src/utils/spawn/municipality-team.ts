// Deterministically build a small "house team" for a municipality.
//
// Given a municipality's seed (the same GPS-derived seed that assigns its show —
// see municipality-show.ts) and the pool of character ids available in that
// show, this rolls a stable team: the same municipality always yields the same
// characters, colours and stats, with no persistence and no server call. It is
// the read-only, client-side mirror of the claim flow's server roll, so the map
// can preview a town's team without ever writing a spawn to Supabase.
//
// The team obeys the same building rule the roster enforces: the first member is
// the lead (any colour), and every other member must carry a colour the lead's
// colour allows (see teammateColors).

import {
	SpawnColor,
	SPAWN_STAT_MIN,
	SPAWN_STAT_MAX,
	type CharacterSpawn
} from '../../types/character-spawn.type';
import type { CombatColor } from '../../types/character-definition.type';
import { SPAWN_COLOR_WEIGHTS } from './color';
import { teammateColors } from '../color/compare';

/** One rolled team member: the character plus its deterministic colour and stat. */
export interface TeamMemberRoll {
	/** Character id — resolves back into the @3xl/data registry for label + sprite. */
	characterId: string;
	/** The member's rolled colour (weighted like {@link randomSpawnColor}). */
	color: SpawnColor;
	/** The member's rolled gameplay stat, an integer in [SPAWN_STAT_MIN, SPAWN_STAT_MAX]. */
	stat: number;
}

/**
 * A tiny seeded PRNG (mulberry32): a pure `() => number in [0,1)` sequence fully
 * determined by `seed`. Used so the whole team roll below is reproducible from the
 * municipality seed alone.
 */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Pick a colour with the weighted spawn-colour distribution, optionally
 * restricted to an allowed set (used to keep teammates within the lead's colour
 * family). Falls back to the full weighted pool if the allowed set is empty.
 */
function pickColor(roll: number, allowed: Set<string> | null): SpawnColor {
	const pool = allowed
		? SPAWN_COLOR_WEIGHTS.filter(([color]) => allowed.has(color))
		: SPAWN_COLOR_WEIGHTS;
	const weights = pool.length ? pool : SPAWN_COLOR_WEIGHTS;
	const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
	let value = roll * total;
	for (const [color, weight] of weights) {
		value -= weight;
		if (value < 0) return color;
	}
	return weights[0][0];
}

/**
 * Build a deterministic team of up to `size` distinct characters drawn from
 * `pool`, seeded by `seed`. The pool is shuffled reproducibly (Fisher–Yates on
 * the seeded PRNG) and the first `size` taken, so a town with a bigger pool still
 * lands on a stable subset. The first member is the lead and gets a free weighted
 * colour; every later member's colour is drawn from the colours the lead's colour
 * allows (see {@link teammateColors}), so the whole team is a legal one. Each
 * member also gets a stable weighted colour and a uniform stat. Empty when the
 * pool is empty.
 */
export function buildMunicipalityTeam(
	seed: number,
	pool: readonly string[],
	size: number
): TeamMemberRoll[] {
	if (pool.length === 0 || size <= 0) return [];

	const rand = mulberry32(seed);

	// Deterministic Fisher–Yates shuffle, then take the first `size` distinct ids.
	const ids = [...pool];
	for (let i = ids.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[ids[i], ids[j]] = [ids[j], ids[i]];
	}
	const chosen = ids.slice(0, Math.min(size, ids.length));

	const statSpan = SPAWN_STAT_MAX - SPAWN_STAT_MIN + 1;
	const members: TeamMemberRoll[] = [];
	let allowed: Set<string> | null = null;

	chosen.forEach((characterId, index) => {
		const color = pickColor(rand(), index === 0 ? null : allowed);
		const stat = SPAWN_STAT_MIN + Math.floor(rand() * statSpan);
		members.push({ characterId, color, stat });
		// The lead's colour fixes which colours its teammates may carry.
		if (index === 0) {
			allowed = new Set<string>(teammateColors(color as unknown as CombatColor));
		}
	});

	return members;
}

/**
 * Turn a rolled OG team into synthetic {@link CharacterSpawn}s the board can field
 * like any claimed team — carrying each member's character, colour and stat, but
 * never persisted. Ids are `og:0…`; the location id ties the cards to the town so
 * they show its name, and the empty `createdAt` omits the spawn year (the OG team
 * is timeless).
 */
export function ogTeamSpawns(team: readonly TeamMemberRoll[], locationId: string): CharacterSpawn[] {
	return team.map((member, index) => ({
		id: `og:${index}`,
		userId: 'og',
		characterId: member.characterId,
		showId: null,
		locationId,
		color: member.color,
		stat: member.stat,
		createdAt: ''
	}));
}
