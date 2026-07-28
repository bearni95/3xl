// Which glyph stands for a show.
//
// The map's top-right panel names shows in both of its tables — the latest
// captures and the leaderboard — as bare text in a narrow column. A poster is the
// wrong image there: it is a tall rectangle that either squashes the row or shrinks
// to an unreadable smear, and every one of them is a separate TMDB request. So each
// show gets one flat monochrome icon instead, sized to the line of text beside it.
//
// The icons are Noun Project SVGs, stripped of their baked-in attribution and
// cropped to their artwork by @3xl/assets' generate-show-icons.js, and served at
// /assets/icons/shows/<name>.svg — the path Icon.svelte builds from the value
// returned here.
//
// Keyed by TMDB show id, which is the id `shows.json`, the baked municipality
// assignment, `RegionShow` and `ShowStanding` all already carry, so a caller needs
// nothing it does not already hold. Not every show has an icon drawn yet: an
// unmapped show returns null and renders as it does today, by name alone. There is
// deliberately no placeholder glyph — a wrong-but-present icon reads as a fact
// about the show, while its absence reads as nothing at all.

/**
 * TMDB show id → the icon's path under /assets/icons, without the `.svg`, in the
 * `<folder>/<name>` form {@link showIconName}'s callers pass to `Icon`.
 */
const ICONS_BY_SHOW: Readonly<Record<number, string>> = {
	// InuYasha — Kagome's sacred bow.
	35610: 'shows/bow-and-arrow',
	// One Piece — Luffy's straw hat.
	37854: 'shows/straw-hat',
	// Dragon Ball Z — the four-star ball. The other three Dragon Ball entries in the
	// collection (GT, Super, DAIMA) are deliberately left unmapped: they would all
	// take this same glyph, and four identically-badged rows in the leaderboard tell
	// the reader less than one badged row does.
	12971: 'shows/four-star-dragon-ball'
};

/**
 * The icon for a show, or null when none has been drawn for it (including for a
 * null id, so callers can pass a show that may be absent straight through).
 */
export function showIconName(showId: number | null | undefined): string | null {
	if (showId == null) return null;
	return ICONS_BY_SHOW[showId] ?? null;
}
