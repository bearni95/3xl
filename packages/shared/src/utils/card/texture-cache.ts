/**
 * Pack-opener texture cache
 *
 * Lazily loads the images the pack-opening canvas needs into Pixi textures, keyed
 * by URL and kept alive for the session:
 *  - show posters (the pack cover art — from shows.json, i.e. straight off the TMDB
 *    image CDN, so cross-origin and CORS-gated: it answers `access-control-allow-origin: *`,
 *    and on failure the pack simply renders without cover art)
 *  - character face portraits (the static reveal-card fallback — same-origin
 *    `/assets/*`)
 *  - character idle animations (the revealed card art — the looping `idle` clip
 *    decoded from the character's manifest, keyed by frames folder)
 *  - interface glyphs (a card's colour-trait icons — same-origin `/assets/icons/*`)
 *
 * Loads resolve to `null` on error rather than throwing, so the sprites can fall
 * back to their placeholders without special-casing every call site.
 */

import { Assets, type Texture } from 'pixi.js';

/** One decoded idle frame: its texture, native size, body/foot anchor (as 0..1
 * fractions) and how long it shows for. */
export interface IdleFrame {
	texture: Texture;
	width: number;
	height: number;
	anchorX: number;
	anchorY: number;
	duration: number;
}

interface ManifestFrame {
	file: string;
	width: number;
	height: number;
	anchorX: number;
	anchorY: number;
	duration: number;
}

interface IdleManifest {
	animations?: Record<string, { frames: ManifestFrame[] } | undefined>;
}

const cache = new Map<string, Texture>();
const pending = new Map<string, Promise<Texture | null>>();
const idleCache = new Map<string, IdleFrame[]>();
const idlePending = new Map<string, Promise<IdleFrame[] | null>>();

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

	/** Texture for an interface glyph (a card's colour-trait icons), or null. */
	icon(url: string | null): Promise<Texture | null> {
		if (!url) return Promise.resolve(null);
		return load(url);
	},

	/** Synchronously returns an already-loaded texture for a URL, else null. */
	cached(url: string | null): Texture | null {
		if (!url) return null;
		return cache.get(url) ?? null;
	},

	/**
	 * Decoded frames of a character's looping `idle` animation, loaded from its
	 * manifest under `basePath` and cached by folder. Returns null when the folder,
	 * manifest, or `idle` clip is unavailable so the card can fall back to a face.
	 */
	idleFrames(basePath: string | null): Promise<IdleFrame[] | null> {
		if (!basePath) return Promise.resolve(null);
		const existing = idleCache.get(basePath);
		if (existing) return Promise.resolve(existing);
		const inFlight = idlePending.get(basePath);
		if (inFlight) return inFlight;

		const promise = (async () => {
			try {
				const res = await fetch(`${basePath}/manifest.json`);
				if (!res.ok) return null;
				const manifest = (await res.json()) as IdleManifest;
				const idle = manifest.animations?.idle;
				if (!idle || idle.frames.length === 0) return null;

				const frames: IdleFrame[] = [];
				for (const frame of idle.frames) {
					const tex = (await Assets.load<Texture>(`${basePath}/${frame.file}`)) as Texture;
					// Keep the pixel art crisp when scaled up on the card.
					tex.source.scaleMode = 'nearest';
					frames.push({
						texture: tex,
						width: frame.width,
						height: frame.height,
						anchorX: frame.anchorX / frame.width,
						anchorY: frame.anchorY / frame.height,
						duration: frame.duration
					});
				}
				idleCache.set(basePath, frames);
				return frames;
			} catch {
				return null;
			} finally {
				idlePending.delete(basePath);
			}
		})();
		idlePending.set(basePath, promise);
		return promise;
	}
};
