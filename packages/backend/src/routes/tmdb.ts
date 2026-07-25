import { Router, type Request } from 'express';
import { searchTvShows, fetchTvImages } from '@3xl/shared/utils/tmdb/client';
import { tmdbAdapter } from '@3xl/shared/adapters/classes/tmdb.adapter';
import type {
	DisplayTMDBTvSearchResponse,
	DisplayTMDBTvImages
} from '@3xl/shared/types/tmdb.type';
import { asyncHandler, httpError } from '../http-error';
import { cacheSlug, getOrCreateJson, getOrFetchImage } from '../cache/tmdb-cache';

/**
 * TMDB proxy for the admin `/shows` screen. The TMDB API key lives in the
 * repo-root `.env` (server-only) and must never reach the browser, so the admin
 * app hits these endpoints instead of TMDB directly.
 *
 * Every outbound call is also cached to disk (see ../cache/tmdb-cache): search
 * and image-list responses as JSON, and the image binaries themselves via the
 * `/image/:size/:file` proxy below. The intent is that we never query TMDB (or
 * its CDN) twice for the same thing — cached hits skip the client and its rate
 * limiter entirely.
 *
 * Was `src/routes/api/tmdb/{search,images}/+server.ts` in the frontend.
 */
export const tmdbRouter = Router();

const IMAGE_CDN_BASE = 'https://image.tmdb.org/t/p';
const IMAGE_CDN_URL = /^https:\/\/image\.tmdb\.org\/t\/p\/([\w-]+)\/([\w.-]+)$/;

/** Absolute base URL of this server, e.g. `http://localhost:2002`. */
function selfBase(req: Request): string {
	return `${req.protocol}://${req.get('host')}`;
}

/**
 * Rewrite a TMDB image CDN URL to point at this server's caching proxy, so the
 * browser fetches image bytes through us. Non-CDN or null URLs pass through
 * unchanged.
 */
function proxify(base: string, url: string | null): string | null {
	if (!url) return url;
	const match = IMAGE_CDN_URL.exec(url);
	if (!match) return url;
	const [, size, file] = match;
	return `${base}/api/tmdb/image/${size}/${file}`;
}

function proxifySearch(
	base: string,
	response: DisplayTMDBTvSearchResponse
): DisplayTMDBTvSearchResponse {
	return {
		...response,
		results: response.results.map((show) => ({
			...show,
			posterUrl: proxify(base, show.posterUrl),
			backdropUrl: proxify(base, show.backdropUrl)
		}))
	};
}

function proxifyImages(base: string, response: DisplayTMDBTvImages): DisplayTMDBTvImages {
	const rewrite = (images: DisplayTMDBTvImages['all']) =>
		images.map((image) => ({
			...image,
			thumbnailUrl: proxify(base, image.thumbnailUrl) ?? image.thumbnailUrl,
			fullUrl: proxify(base, image.fullUrl) ?? image.fullUrl
		}));
	return {
		...response,
		posters: rewrite(response.posters),
		backdrops: rewrite(response.backdrops),
		logos: rewrite(response.logos),
		all: rewrite(response.all)
	};
}

// GET /api/tmdb/search?query=<text>&page=<n>&year=<yyyy>
tmdbRouter.get(
	'/search',
	asyncHandler(async (req, res) => {
		const query = String(req.query.query ?? '').trim();
		if (!query) httpError(400, 'Missing "query" parameter');

		const page = Number(req.query.page ?? '1') || 1;
		const yearParam = req.query.year;
		const year = yearParam ? Number(yearParam) || undefined : undefined;

		const apiKey = process.env.TMDB_API_KEY;
		if (!apiKey) httpError(500, 'TMDB_API_KEY is not configured on the server');

		// Cache the raw TMDB payload keyed by the exact query params; adapting and
		// URL-rewriting happen fresh each request so the proxy base can change.
		const response = await getOrCreateJson(`search/${cacheSlug(query, page, year)}.json`, () =>
			searchTvShows(apiKey, query, page, year)
		);
		if (!response) httpError(502, 'TMDB search request failed');

		res.json(proxifySearch(selfBase(req), tmdbAdapter.searchResponseToDisplay(response)));
	})
);

// GET /api/tmdb/images?id=<tvId>
tmdbRouter.get(
	'/images',
	asyncHandler(async (req, res) => {
		const idParam = req.query.id;
		const id = Number(idParam);
		if (!idParam || !Number.isInteger(id) || id <= 0) {
			httpError(400, 'Missing or invalid "id" parameter');
		}

		const apiKey = process.env.TMDB_API_KEY;
		if (!apiKey) httpError(500, 'TMDB_API_KEY is not configured on the server');

		const response = await getOrCreateJson(`images-meta/${id}.json`, () =>
			fetchTvImages(apiKey, id)
		);
		if (!response) httpError(502, 'TMDB images request failed');

		res.json(proxifyImages(selfBase(req), tmdbAdapter.imagesToDisplay(response)));
	})
);

// GET /api/tmdb/image/:size/:file — caching proxy for the TMDB image CDN.
// `:size` is a TMDB size token (w342, original, …), `:file` a single image
// filename (`<hash>.jpg`). Bytes are mirrored to disk on first request.
tmdbRouter.get(
	'/image/:size/:file',
	asyncHandler(async (req, res) => {
		const size = String(req.params.size);
		const file = String(req.params.file);
		if (!/^(w\d+|h\d+|original)$/.test(size) || !/^[\w-]+\.(jpg|jpeg|png|webp|svg|gif)$/i.test(file)) {
			httpError(400, 'Invalid image size or filename');
		}

		const image = await getOrFetchImage(`${size}/${file}`, `${IMAGE_CDN_BASE}/${size}/${file}`);
		if (!image) httpError(502, 'TMDB image request failed');

		res.setHeader('Content-Type', image.contentType);
		// Immutable: a given TMDB file path always maps to the same bytes.
		res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
		res.setHeader('X-Cache', image.fromCache ? 'HIT' : 'MISS');
		res.send(image.data);
	})
);
