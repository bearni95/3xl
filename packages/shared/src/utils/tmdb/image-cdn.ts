/**
 * The image URLs the admin's TMDB browser displays point at the **dev backend's**
 * caching proxy (`http://localhost:2002/api/tmdb/image/<size>/<file>`), because that
 * is the one thing on the authoring screen that must not reach the CDN twice for the
 * same bytes. A saved show, though, is not a screenshot of that screen: `shows.json`
 * ships with `@3xl/data` into the player app's static bundle, and the backend is
 * dev-only — a URL naming `localhost:2002` is a broken image on every machine that is
 * not the author's.
 *
 * So a proxied URL is un-proxied on the way into the collection: the game's data holds
 * canonical `image.tmdb.org` URLs, which resolve wherever the game is opened. The CDN
 * answers with `access-control-allow-origin: *`, so this works for the pack-opener's
 * Pixi loader (fetch-based, and therefore CORS-gated) as well as for a plain `<img>`.
 * The proxy keeps its job in front of the author's browsing; it just no longer gets
 * baked into shipped data.
 */

import type { ShowEntry } from '../../types/show.type';
import type { DisplayTMDBImage } from '../../types/tmdb.type';

const IMAGE_CDN_BASE = 'https://image.tmdb.org/t/p';

/** Any origin's `/api/tmdb/image/<size>/<file>` — the dev proxy's image route. */
const PROXY_IMAGE_URL = /^https?:\/\/[^/]+\/api\/tmdb\/image\/([\w-]+)\/([\w.-]+)$/;

/**
 * The CDN URL behind a proxied TMDB image URL. Anything else — a URL already on the
 * CDN, some other host, null — is returned untouched, so this is safe to apply to
 * whatever a caller happens to hold and idempotent when applied twice.
 */
export function tmdbCdnImageUrl<T extends string | null | undefined>(url: T): T {
	if (!url) return url;
	const match = PROXY_IMAGE_URL.exec(url);
	if (!match) return url;
	const [, size, file] = match;
	return `${IMAGE_CDN_BASE}/${size}/${file}` as T;
}

function imageOnCdn(image: DisplayTMDBImage): DisplayTMDBImage {
	return {
		...image,
		thumbnailUrl: tmdbCdnImageUrl(image.thumbnailUrl),
		fullUrl: tmdbCdnImageUrl(image.fullUrl)
	};
}

/**
 * A saved show with every URL it carries pointing at the CDN — the show's own poster
 * and backdrop, and both sizes of each of its images. Nothing else about the entry is
 * touched: the enabled selection, the glyph, the votes and the text are as authored.
 */
export function showEntryOnCdn(entry: ShowEntry): ShowEntry {
	return {
		...entry,
		show: {
			...entry.show,
			posterUrl: tmdbCdnImageUrl(entry.show.posterUrl),
			backdropUrl: tmdbCdnImageUrl(entry.show.backdropUrl)
		},
		images: {
			...entry.images,
			posters: entry.images.posters.map(imageOnCdn),
			backdrops: entry.images.backdrops.map(imageOnCdn),
			logos: entry.images.logos.map(imageOnCdn),
			all: entry.images.all.map(imageOnCdn)
		}
	};
}
