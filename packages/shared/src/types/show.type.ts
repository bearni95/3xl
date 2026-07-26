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

/**
 * One municipality's baked show assignment, as written by @3xl/data's
 * `generate:shows` into `public/municipality-shows.json`. The pick is a pure
 * function of the municipality's GPS geometry (see the script), precomputed at
 * build time so the frontend map reads the finished assignment from the server.
 */
export interface MunicipalityShow {
	/** Municipality feature id, matching `properties.id` in the geo layers. */
	id: string;
	name: string;
	comarca: string | null;
	prov: string | null;
	territory: string | null;
	/** Barcelona and its immediate neighbours — the subset the map renders. */
	neighbourOfCenter: boolean;
	/** The assigned show, trimmed to what the map and sidebar need. */
	show: {
		id: number;
		name: string;
		posterUrl: string | null;
	};
}

/** Shape of `public/municipality-shows.json` — the whole baked assignment. */
export interface MunicipalityShowsCollection {
	generatedAt: string;
	/** The municipality whose neighbourhood is flagged for rendering. */
	center: string;
	assignments: MunicipalityShow[];
}
