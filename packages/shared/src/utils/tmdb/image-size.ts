/**
 * TMDB serves every image at a fixed set of widths, and each poster URL carries the
 * one it was built for as a path segment: `…/t/p/w342/<file>.jpg` straight from the
 * CDN, or `…/api/tmdb/image/w342/<file>.jpg` through the dev proxy (which accepts any
 * size token and mirrors the bytes to disk). Rewriting that single segment asks for
 * the same image at another width.
 *
 * The saved-show collection bakes `thumbnailUrl` at w342 — plenty for the admin's
 * gallery and the map's pins, but a fraction of the size a booster pack draws its
 * cover at, which is why an unrewritten cover reads as a blurry upscale. Consumers
 * that render an image large ask for a width that suits them instead.
 */

/** The size token in a TMDB (or proxied TMDB) image URL, immediately before the file. */
const SIZE_SEGMENT = /\/(?:w\d+|h\d+|original)\/(?=[\w-]+\.\w+(?:$|[?#]))/;

/**
 * The same TMDB image at another size — `w780`, `original`, … A URL that doesn't carry
 * a recognisable size segment (a non-TMDB host, say) is returned untouched, so this is
 * always safe to apply to whatever cover a caller happens to hold.
 */
export function tmdbImageAtSize(url: string | null, size: string): string | null {
	if (!url) return null;
	return url.replace(SIZE_SEGMENT, `/${size}/`);
}
