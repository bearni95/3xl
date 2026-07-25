import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { searchTvShows } from '$utils/tmdb/client';
import { tmdbAdapter } from '$adapters/classes/tmdb.adapter';

/**
 * TV show search proxy for the /admin/shows screen.
 *
 * The TMDB API key lives in `.env` (server-only) and must never reach the
 * browser, so the frontend hits this endpoint instead of TMDB directly. Like
 * the character API, this runs only under `vite dev` — the production build is
 * adapter-static and has no server. `prerender = false` keeps the static build
 * from touching it.
 *
 * GET /api/tmdb/search?query=<text>&page=<n>&year=<yyyy>
 */
export const prerender = false;

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('query')?.trim() ?? '';
	if (!query) throw error(400, 'Missing "query" parameter');

	const page = Number(url.searchParams.get('page') ?? '1') || 1;
	const yearParam = url.searchParams.get('year');
	const year = yearParam ? Number(yearParam) || undefined : undefined;

	const apiKey = env.TMDB_API_KEY;
	if (!apiKey) throw error(500, 'TMDB_API_KEY is not configured on the server');

	const response = await searchTvShows(apiKey, query, page, year);
	if (!response) throw error(502, 'TMDB search request failed');

	return json(tmdbAdapter.searchResponseToDisplay(response));
};
