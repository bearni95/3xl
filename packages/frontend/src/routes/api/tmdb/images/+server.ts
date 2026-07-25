import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { fetchTvImages } from '$utils/tmdb/client';
import { tmdbAdapter } from '$adapters/classes/tmdb.adapter';

/**
 * Returns every image (posters, backdrops, logos) TMDB holds for a TV show, so
 * the /admin/shows gallery can display them all. Keeps the API key server-side,
 * same as the search endpoint. Runs only under `vite dev`.
 *
 * GET /api/tmdb/images?id=<tvId>
 */
export const prerender = false;

export const GET: RequestHandler = async ({ url }) => {
	const idParam = url.searchParams.get('id');
	const id = Number(idParam);
	if (!idParam || !Number.isInteger(id) || id <= 0) {
		throw error(400, 'Missing or invalid "id" parameter');
	}

	const apiKey = env.TMDB_API_KEY;
	if (!apiKey) throw error(500, 'TMDB_API_KEY is not configured on the server');

	const response = await fetchTvImages(apiKey, id);
	if (!response) throw error(502, 'TMDB images request failed');

	return json(tmdbAdapter.imagesToDisplay(response));
};
