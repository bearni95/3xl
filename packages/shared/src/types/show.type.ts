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
	 * The author-enabled images per section (poster/backdrop/logo), each stored
	 * as an array of image `filePath`s and toggled in the admin `/shows` screen.
	 * A section is absent until at least one image is enabled; every stored
	 * `filePath` references an image present in the matching `images` array.
	 * Consumers that need a single headline image (e.g. the map poster) take the
	 * first enabled entry for the kind.
	 */
	enabledImages?: Partial<Record<TMDBImageKind, string[]>>;
	/**
	 * The glyph that stands for the show wherever it is named in a line of text —
	 * the panel's tables, the map's pins, a booster box's lid, the statue's floor —
	 * as `<folder>/<slug>` under `@3xl/assets`' `public/icons/` (e.g.
	 * `delapouite/pirate-hat`, `shows/straw-hat`). Chosen in the admin `/shows`
	 * screen out of the whole vendored set, and absent for a show
	 * nobody has picked one for: an unbadged show renders by name alone, since a
	 * stand-in glyph would read as a fact about the show while its absence reads
	 * as nothing at all.
	 */
	icon?: string;
}

/**
 * What a show's `icon` may look like: `<folder>/<slug>`, both lowercase — it is a
 * path into `public/icons/`, and the pattern is what keeps it from being one out
 * of it.
 */
export const SHOW_ICON_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+$/;

/** Shape of `public/shows.json` — the whole saved-show collection. */
export interface ShowsCollection {
	shows: ShowEntry[];
}

/** What became of one saved show in a Catalan re-query (see below). */
export interface ShowRefreshEntry {
	id: number;
	/** The name it now carries — Catalan where TMDB holds one. */
	name: string;
	/** What it was called before, when the re-query renamed it. */
	previousName?: string;
	/** Whether the description changed too. */
	overviewChanged: boolean;
	/** True when TMDB has no Catalan overview and the fallback language filled it. */
	overviewFallback: boolean;
}

/**
 * Result of `POST /api/shows/refresh`: the collection as written, plus what each
 * show's title and description did. Shows TMDB could not answer for are listed
 * separately and left exactly as they were.
 */
export interface ShowRefreshResult {
	shows: ShowEntry[];
	refreshed: ShowRefreshEntry[];
	failed: { id: number; name: string; message: string }[];
}

