// Saved-show collection types.
//
// The admin `/shows` screen searches TMDB and lets the author persist a result
// — the show plus every image TMDB holds for it — into `@3xl/data`'s
// `public/shows.json` (served at `/data/shows.json`). Each entry stores the
// exact `DisplayTMDB*` shapes the page rendered, so what lands in the JSON is
// precisely what was shown.

import type { DisplayTMDBTvShow, DisplayTMDBTvImages, TMDBImageKind } from './tmdb.type';

/** One saved show: the display record plus all of its images, as shown. */
export interface ShowEntry {
	/** The show as displayed in the search result card. */
	show: DisplayTMDBTvShow;
	/** Every image (posters, backdrops, logos) TMDB holds for the show. */
	images: DisplayTMDBTvImages;
	/**
	 * The author-chosen "main" image for each section (poster/backdrop/logo),
	 * stored as that image's `filePath` and picked in the admin `/shows` screen.
	 * A section is absent until a main is chosen; each stored `filePath` always
	 * references an image present in the matching `images` array.
	 */
	mainImages?: Partial<Record<TMDBImageKind, string>>;
}

/** Shape of `public/shows.json` — the whole saved-show collection. */
export interface ShowsCollection {
	shows: ShowEntry[];
}
