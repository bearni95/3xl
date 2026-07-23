import { AdapterClass } from '$adapters/classes/adapter.class';
import type {
	TMDBTvShow,
	TMDBTvSearchResponse,
	TMDBImage,
	TMDBTvImagesResponse,
	TMDBImageKind,
	DisplayTMDBTvShow,
	DisplayTMDBTvSearchResponse,
	DisplayTMDBImage,
	DisplayTMDBTvImages
} from '$types/tmdb.type';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Transforms raw TMDB API payloads into the UI-facing `DisplayTMDB*` shapes.
 *
 * Ported from the new-mhaol tmdb addon's `transform.ts`, refactored into the
 * boilerplate's singleton adapter pattern. Keeps all TMDB → display mapping in
 * one place so components and services never touch snake_case API fields.
 */
export class TmdbAdapter extends AdapterClass {
	constructor() {
		super('tmdb');
	}

	getPosterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' = 'w342'): string | null {
		if (!path) return null;
		return `${IMAGE_BASE_URL}/${size}${path}`;
	}

	getBackdropUrl(
		path: string | null,
		size: 'w780' | 'w1280' | 'original' = 'w780'
	): string | null {
		if (!path) return null;
		return `${IMAGE_BASE_URL}/${size}${path}`;
	}

	/** `2014-09-13` -> `2014`; empty/undefined -> `Unknown`. */
	private extractYear(dateString: string | undefined): string {
		if (!dateString) return 'Unknown';
		return dateString.split('-')[0] || 'Unknown';
	}

	tvShowToDisplay(tvShow: TMDBTvShow): DisplayTMDBTvShow {
		return {
			id: tvShow.id,
			name: tvShow.name,
			originalName: tvShow.original_name,
			firstAirYear: this.extractYear(tvShow.first_air_date),
			lastAirYear: tvShow.last_air_date ? this.extractYear(tvShow.last_air_date) : null,
			overview: tvShow.overview || '',
			posterUrl: this.getPosterUrl(tvShow.poster_path),
			backdropUrl: this.getBackdropUrl(tvShow.backdrop_path),
			voteAverage: tvShow.vote_average,
			voteCount: tvShow.vote_count,
			genres: tvShow.genres?.map((g) => g.name) || [],
			numberOfSeasons: tvShow.number_of_seasons || null,
			numberOfEpisodes: tvShow.number_of_episodes || null
		};
	}

	imageToDisplay(image: TMDBImage, kind: TMDBImageKind): DisplayTMDBImage {
		return {
			thumbnailUrl: `${IMAGE_BASE_URL}/w342${image.file_path}`,
			fullUrl: `${IMAGE_BASE_URL}/original${image.file_path}`,
			width: image.width,
			height: image.height,
			aspectRatio: image.aspect_ratio,
			filePath: image.file_path,
			kind,
			language: image.iso_639_1 ?? null
		};
	}

	imagesToDisplay(response: TMDBTvImagesResponse): DisplayTMDBTvImages {
		const posters = response.posters.map((image) => this.imageToDisplay(image, 'poster'));
		const backdrops = response.backdrops.map((image) => this.imageToDisplay(image, 'backdrop'));
		const logos = response.logos.map((image) => this.imageToDisplay(image, 'logo'));
		return {
			id: response.id,
			posters,
			backdrops,
			logos,
			all: [...posters, ...backdrops, ...logos]
		};
	}

	searchResponseToDisplay(response: TMDBTvSearchResponse): DisplayTMDBTvSearchResponse {
		return {
			page: response.page,
			results: response.results.map((show) => this.tvShowToDisplay(show)),
			totalPages: response.total_pages,
			totalResults: response.total_results
		};
	}
}

export const tmdbAdapter = new TmdbAdapter();
