// TMDB API response + display types.
//
// Ported from the new-mhaol `packages/addons/tmdb` addon, trimmed to the TV
// surface used by the /admin/shows search screen. The raw `TMDB*` interfaces
// mirror the JSON returned by api.themoviedb.org; the `DisplayTMDB*` types are
// the UI-facing shapes produced by the TmdbAdapter.

/**
 * The language every text-bearing TMDB call asks for. The game is Catalan, so a
 * saved show's title and description are Catalan or they are a translation
 * nobody here reads. TMDB holds exactly one Catalan variant (`ca-ES`) — there is
 * no `ca-AD` and no bare `ca` — so this is the whole of the choice.
 */
export const TMDB_LANGUAGE = 'ca-ES';

/**
 * What fills a field TMDB has no Catalan text for. It answers those with an
 * empty string rather than falling back itself, and plenty of shows have a
 * Catalan title but no Catalan overview — a description in the wrong language is
 * worth more to an author than a blank card, so those blanks (and only those) are
 * filled from here.
 */
export const TMDB_FALLBACK_LANGUAGE = 'en';

export interface TMDBGenre {
	id: number;
	name: string;
}

export interface TMDBCastMember {
	id: number;
	name: string;
	character: string;
	profile_path: string | null;
	order: number;
}

export interface TMDBCrewMember {
	id: number;
	name: string;
	job: string;
	department: string;
	profile_path: string | null;
}

export interface TMDBCredits {
	cast: TMDBCastMember[];
	crew: TMDBCrewMember[];
}

export interface TMDBImage {
	file_path: string;
	width: number;
	height: number;
	aspect_ratio: number;
	vote_average: number;
	vote_count: number;
	iso_639_1: string | null;
}

export interface TMDBImages {
	backdrops: TMDBImage[];
	posters: TMDBImage[];
	logos: TMDBImage[];
}

/** Response of `/tv/{id}/images` — same as {@link TMDBImages} plus the show id. */
export interface TMDBTvImagesResponse extends TMDBImages {
	id: number;
}

export interface TMDBNetwork {
	id: number;
	name: string;
	logo_path: string | null;
	origin_country: string;
}

export interface TMDBCreator {
	id: number;
	name: string;
	profile_path: string | null;
}

export interface TMDBTvShow {
	id: number;
	name: string;
	original_name: string;
	overview: string;
	first_air_date: string;
	last_air_date?: string;
	poster_path: string | null;
	backdrop_path: string | null;
	vote_average: number;
	vote_count: number;
	adult: boolean;
	original_language: string;
	popularity: number;
	status?: string;
	tagline?: string;
	genres?: TMDBGenre[];
	number_of_seasons?: number;
	number_of_episodes?: number;
	episode_run_time?: number[];
	networks?: TMDBNetwork[];
	created_by?: TMDBCreator[];
}

export interface TMDBSeason {
	id: number;
	name: string;
	overview: string;
	air_date: string | null;
	episode_count: number;
	poster_path: string | null;
	season_number: number;
}

export interface TMDBTvShowDetails extends TMDBTvShow {
	seasons?: TMDBSeason[];
	credits?: TMDBCredits;
	images?: TMDBImages;
}

/**
 * One language's text for a show, as returned by `/tv/{id}/translations` (or by
 * `append_to_response=translations`). `data` fields are empty strings when that
 * language has no text for them.
 */
export interface TMDBTranslation {
	iso_639_1: string;
	iso_3166_1: string;
	/** The language's name in itself ("Català"). */
	name: string;
	english_name: string;
	data: {
		name?: string;
		overview?: string;
		tagline?: string;
		homepage?: string;
	};
}

export interface TMDBTranslations {
	id?: number;
	translations: TMDBTranslation[];
}

/**
 * `/tv/{id}?language=…&append_to_response=translations` — the show in the asked-for
 * language, carrying every other language's text alongside it, so a field the
 * asked-for one lacks can be filled without a second request.
 */
export interface TMDBTvShowTranslated extends TMDBTvShowDetails {
	translations?: TMDBTranslations;
}

export interface TMDBTvSearchResponse {
	page: number;
	results: TMDBTvShow[];
	total_pages: number;
	total_results: number;
}

// Display (UI-facing) types

export interface DisplayTMDBTvShow {
	id: number;
	name: string;
	originalName: string;
	firstAirYear: string;
	lastAirYear: string | null;
	overview: string;
	posterUrl: string | null;
	backdropUrl: string | null;
	voteAverage: number;
	voteCount: number;
	genres: string[];
	numberOfSeasons: number | null;
	numberOfEpisodes: number | null;
}

export type TMDBImageKind = 'backdrop' | 'poster' | 'logo';

export interface DisplayTMDBImage {
	/** Small URL for the gallery grid. */
	thumbnailUrl: string;
	/** Full-resolution (original) URL. */
	fullUrl: string;
	width: number;
	height: number;
	aspectRatio: number;
	filePath: string;
	kind: TMDBImageKind;
	/** ISO-639-1 language code the image is tagged with, or null when languageless. */
	language: string | null;
}

/** Shape returned by the `/api/tmdb/images` endpoint — every image, flattened. */
export interface DisplayTMDBTvImages {
	id: number;
	backdrops: DisplayTMDBImage[];
	posters: DisplayTMDBImage[];
	logos: DisplayTMDBImage[];
	/** All three kinds concatenated (posters, then backdrops, then logos). */
	all: DisplayTMDBImage[];
}

/** Shape returned by the `/api/tmdb/search` endpoint. */
export interface DisplayTMDBTvSearchResponse {
	page: number;
	results: DisplayTMDBTvShow[];
	totalPages: number;
	totalResults: number;
}
