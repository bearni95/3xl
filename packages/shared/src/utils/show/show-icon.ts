// Which glyph stands for a show.
//
// The map's top-right panel names shows in both of its tables — the latest
// captures and the leaderboard — as bare text in a narrow column. A poster is the
// wrong image there: it is a tall rectangle that either squashes the row or shrinks
// to an unreadable smear, and every one of them is a separate TMDB request. So each
// show gets one flat monochrome icon instead, sized to the line of text beside it.
//
// The pairing is **authored, not written here**: a show's glyph is a field of its
// own entry in `shows.json` (`ShowEntry.icon`), picked in the admin `/shows` screen
// out of the whole vendored icon set. It used to be a hand-kept table in this file,
// which meant the shows that had a mark were the ones somebody had edited TypeScript
// for.
//
// Keyed by TMDB show id, which is the id `shows.json`, a town's seeded show,
// `RegionShow` and `ShowStanding` all already carry, so a caller needs
// nothing it does not already hold. Not every show has an icon picked: an unpicked
// show is simply absent from the map and renders as it always has, by name alone.
// There is deliberately no placeholder glyph — a wrong-but-present icon reads as a
// fact about the show, while its absence reads as nothing at all.

import type { ShowsCollection } from '../../types/show.type';

/**
 * Show id → its icon's name (`<folder>/<slug>` under `/assets/icons`, without the
 * `.svg`), for every saved show that has one picked. A show with no icon is left
 * out rather than mapped to null, so `has` and `get` say the same thing.
 */
export function showIconsByShow(collection: ShowsCollection | null | undefined) {
	const byId = new Map<number, string>();
	for (const entry of collection?.shows ?? []) {
		if (entry.icon) byId.set(entry.show.id, entry.icon);
	}
	return byId;
}

/**
 * One show's value out of a map keyed by show id, tolerating a null id — a town
 * whose sitting team belongs to no show, a track linked to nothing — so a caller
 * can pass whatever it holds straight through, exactly as the old lookup let it.
 */
export function forShow<T>(
	byShow: ReadonlyMap<number, T>,
	showId: number | null | undefined
): T | null {
	if (showId == null) return null;
	return byShow.get(showId) ?? null;
}
