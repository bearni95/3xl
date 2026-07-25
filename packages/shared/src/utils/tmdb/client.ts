// Thin TMDB REST client. Every call is funnelled through the shared rate
// limiter and takes the API key explicitly so the module stays a pure helper —
// the key is resolved server-side (see /api/tmdb/*) and never shipped to the
// browser.
//
// Ported from the new-mhaol tmdb addon, scoped to the TV endpoints the
// /admin/shows screen needs.

import type {
	TMDBTvSearchResponse,
	TMDBTvShowDetails,
	TMDBTvImagesResponse
} from '../../types/tmdb.type';
import { tmdbRateLimiter } from './rate-limiter';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Every call is funnelled through one shared, serial rate limiter, so a single
// request that never settles would wedge the whole queue and leave every
// following request pending forever. Bound each request so a stalled/oversized
// response (e.g. a show with an enormous image set) fails fast instead.
const TMDB_REQUEST_TIMEOUT_MS = 15_000;

async function tmdbFetch<T>(
	apiKey: string,
	endpoint: string,
	params: Record<string, string> = {}
): Promise<T | null> {
	return tmdbRateLimiter.enqueue(async () => {
		const searchParams = new URLSearchParams({
			...params,
			api_key: apiKey
		});

		const url = `${TMDB_BASE_URL}${endpoint}?${searchParams.toString()}`;

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), TMDB_REQUEST_TIMEOUT_MS);
		try {
			const response = await fetch(url, {
				headers: { Accept: 'application/json' },
				signal: controller.signal
			});

			if (!response.ok) {
				if (response.status === 404) return null;
				if (response.status === 429) throw new Error('429 Rate Limited');
				return null;
			}

			return (await response.json()) as T;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				throw new Error(`TMDB request timed out after ${TMDB_REQUEST_TIMEOUT_MS}ms: ${endpoint}`);
			}
			throw error;
		} finally {
			clearTimeout(timeout);
		}
	});
}

export async function searchTvShows(
	apiKey: string,
	query: string,
	page: number = 1,
	firstAirYear?: number
): Promise<TMDBTvSearchResponse | null> {
	const params: Record<string, string> = {
		query,
		page: page.toString(),
		include_adult: 'false'
	};
	if (firstAirYear) {
		params.first_air_date_year = firstAirYear.toString();
	}
	return tmdbFetch<TMDBTvSearchResponse>(apiKey, '/search/tv', params);
}

export async function getTvPopular(
	apiKey: string,
	page: number = 1
): Promise<TMDBTvSearchResponse | null> {
	return tmdbFetch<TMDBTvSearchResponse>(apiKey, '/tv/popular', {
		page: page.toString()
	});
}

export async function fetchTvShow(
	apiKey: string,
	id: number
): Promise<TMDBTvShowDetails | null> {
	return tmdbFetch<TMDBTvShowDetails>(apiKey, `/tv/${id}`, {
		append_to_response: 'credits,images',
		include_image_language: 'en,null'
	});
}

/**
 * All images (posters, backdrops, logos) TMDB holds for a show. No language
 * filter is passed, so every language variant is returned.
 */
export async function fetchTvImages(
	apiKey: string,
	id: number
): Promise<TMDBTvImagesResponse | null> {
	return tmdbFetch<TMDBTvImagesResponse>(apiKey, `/tv/${id}/images`);
}
