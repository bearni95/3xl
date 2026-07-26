/**
 * Pack-opener texture cache
 *
 * Lazily loads the two kinds of image the pack-opening canvas needs into Pixi
 * textures, keyed by URL and kept alive for the session:
 *  - show posters (the pack cover art — from shows.json, served by the dev TMDB
 *    proxy, so cross-origin and CORS-gated: on failure the pack simply renders
 *    without cover art)
 *  - character face portraits (the revealed card art — same-origin `/assets/*`)
 *
 * Both loads resolve to `null` on error rather than throwing, so the sprites can
 * fall back to their placeholders without special-casing every call site.
 */

import { Assets, type Texture } from 'pixi.js';

const cache = new Map<string, Texture>();
const pending = new Map<string, Promise<Texture | null>>();

function load(url: string): Promise<Texture | null> {
	const existing = cache.get(url);
	if (existing) return Promise.resolve(existing);
	const inFlight = pending.get(url);
	if (inFlight) return inFlight;

	const promise = (async () => {
		try {
			const tex = (await Assets.load<Texture>(url)) as Texture;
			cache.set(url, tex);
			return tex;
		} catch {
			// Cover posters are cross-origin (dev TMDB proxy) and may be CORS-blocked;
			// the caller renders a placeholder when the texture is missing.
			return null;
		} finally {
			pending.delete(url);
		}
	})();
	pending.set(url, promise);
	return promise;
}

export const textureCache = {
	/** Texture for a show poster (pack cover), or null if unavailable. */
	poster(url: string | null): Promise<Texture | null> {
		if (!url) return Promise.resolve(null);
		return load(url);
	},

	/** Texture for a character face portrait (reveal card art), or null. */
	face(url: string | null): Promise<Texture | null> {
		if (!url) return Promise.resolve(null);
		return load(url);
	},

	/** Synchronously returns an already-loaded texture for a URL, else null. */
	cached(url: string | null): Texture | null {
		if (!url) return null;
		return cache.get(url) ?? null;
	}
};
