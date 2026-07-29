// A show's wordmark — the lettering the series is known by, rather than a mark
// standing for it.
//
// TMDB holds a pile of logos per show (dubs, seasons, languages), so which one a
// card says the show with is an authoring decision, not a pick made at render
// time: the admin `/shows` screen toggles the ones that may be used, and this
// reads the first of them. A show with none enabled has no logo — the caller
// leaves the line out rather than falling back to an arbitrary one, exactly as an
// unmapped show goes unbadged rather than taking a stand-in glyph.

import type { ShowEntry } from '../../types/show.type';

/**
 * A saved show's display logo URL: the first author-enabled logo from the admin
 * `/shows` screen, at gallery size (the same `thumbnailUrl` a poster is drawn
 * from — a logo is read at a card's width, never at full resolution). Null when
 * the author has enabled none, or when the enabled path is no longer among the
 * show's images.
 */
export function showLogoUrl(entry: ShowEntry): string | null {
	const filePath = entry.enabledImages?.logo?.[0];
	if (!filePath) return null;
	const image = entry.images.logos.find((candidate) => candidate.filePath === filePath);
	return image ? image.thumbnailUrl : null;
}
