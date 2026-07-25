// Backend-level filesystem cache for TMDB. The goal is simple: never hit the
// TMDB API (or its image CDN) twice for the same thing. Everything lands under a
// gitignored `.cache/tmdb/` at the backend package root, so authoring machines
// build up a local mirror that survives restarts but never reaches git.
//
//   .cache/tmdb/
//   ├── search/<slug>.json        raw /search/tv responses
//   ├── images-meta/<id>.json     raw /tv/:id/images responses
//   └── images/<size>/<file>      raw image.tmdb.org bytes
//
// JSON caching wraps a producer (get-or-create); image caching wraps a fetch
// (get-or-fetch). Failures are never cached, so a transient error can be retried.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// src/cache → package root. `.cache/tmdb` is gitignored (see backend .gitignore).
const CACHE_ROOT = fileURLToPath(new URL('../../.cache/tmdb', import.meta.url));

/** Resolve a relative cache path, refusing anything that escapes CACHE_ROOT. */
function safePath(relPath: string): string {
	const full = resolve(CACHE_ROOT, relPath);
	if (full !== CACHE_ROOT && !full.startsWith(CACHE_ROOT + sep)) {
		throw new Error(`Cache path escapes root: ${relPath}`);
	}
	return full;
}

async function writeFileEnsured(file: string, data: string | Buffer): Promise<void> {
	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, data);
}

/**
 * Turn arbitrary key parts (a search query, a page number, …) into a stable,
 * filesystem-safe slug. A short content hash is appended so distinct inputs that
 * slugify the same — or unicode/very long queries — never collide.
 */
export function cacheSlug(...parts: (string | number | undefined)[]): string {
	const raw = parts.filter((p) => p !== undefined && p !== '').join('|');
	const slug =
		raw
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'q';
	const hash = createHash('sha1').update(raw).digest('hex').slice(0, 10);
	return `${slug}__${hash}`;
}

/**
 * Return the cached JSON at `relPath`, or run `produce`, cache a non-null result,
 * and return it. `null` (a miss/failure upstream) is passed through uncached so
 * it can be retried later.
 */
export async function getOrCreateJson<T>(
	relPath: string,
	produce: () => Promise<T | null>
): Promise<T | null> {
	const file = safePath(relPath);
	try {
		const raw = await readFile(file, 'utf-8');
		return JSON.parse(raw) as T;
	} catch {
		// Cache miss (or unreadable/corrupt entry) — fall through and regenerate.
	}

	const fresh = await produce();
	if (fresh !== null && fresh !== undefined) {
		await writeFileEnsured(file, JSON.stringify(fresh));
	}
	return fresh;
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	gif: 'image/gif'
};

/** Content-type for a cached image file, inferred from its extension. */
export function imageContentType(relPath: string): string {
	const ext = relPath.split('.').pop()?.toLowerCase() ?? '';
	return IMAGE_CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

export interface CachedImage {
	data: Buffer;
	contentType: string;
	/** true when served from disk, false when just fetched from the CDN. */
	fromCache: boolean;
}

/**
 * Return the cached image bytes at `images/<relPath>`, or fetch them from
 * `sourceUrl`, cache, and return. Returns null if the source responds non-2xx so
 * the failure isn't persisted.
 */
export async function getOrFetchImage(
	relPath: string,
	sourceUrl: string
): Promise<CachedImage | null> {
	const file = safePath(join('images', relPath));
	const contentType = imageContentType(relPath);

	try {
		const data = await readFile(file);
		return { data, contentType, fromCache: true };
	} catch {
		// Not cached yet — fetch below.
	}

	const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000) });
	if (!response.ok) return null;

	const data = Buffer.from(await response.arrayBuffer());
	await writeFileEnsured(file, data);
	return { data, contentType, fromCache: false };
}
