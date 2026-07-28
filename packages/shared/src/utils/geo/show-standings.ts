// The map's show leaderboard: how much of the country each TV show flies.
//
// Every municipality flies exactly one show — the one the build baked onto it,
// or, once a player has taken the town, the one its ruling team belongs to (the
// map resolves that override before calling in here). Tallying that single map is
// therefore the whole leaderboard: a show's standing is the number of towns
// currently flying it, and its share of every town that flies anything.

import type { RegionShow } from './region-tree';

/** One show's standing across the map. */
export interface ShowStanding {
	/** The show, as its saved-collection id — also the row key. */
	id: number;
	name: string;
	posterUrl: string | null;
	/** Municipalities currently flying this show. */
	count: number;
	/** That count as a share of every municipality with a show, in 0..1. */
	share: number;
}

/**
 * Tally `showsByMunicipality` (municipality id → the show it flies) into one row
 * per show, biggest first and ties broken by name. Shares are over the total
 * number of municipalities passed in, so they always add up to 1.
 */
export function buildShowStandings(
	showsByMunicipality: ReadonlyMap<string, RegionShow>
): ShowStanding[] {
	const byShow = new Map<number, { show: RegionShow; count: number }>();
	for (const show of showsByMunicipality.values()) {
		const entry = byShow.get(show.id);
		if (entry) entry.count += 1;
		else byShow.set(show.id, { show, count: 1 });
	}

	const total = showsByMunicipality.size;
	return [...byShow.values()]
		.map(({ show, count }) => ({
			id: show.id,
			name: show.name,
			posterUrl: show.posterUrl,
			count,
			share: total > 0 ? count / total : 0
		}))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
