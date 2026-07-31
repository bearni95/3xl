/**
 * A show's glyph as a canvas texture.
 *
 * The show marks are inlined into the *document* as raw markup, because that is what lets
 * `fill="currentColor"` resolve against the type they sit in (see shows.service and
 * `inlineIconMarkup`). A canvas is not a place a stylesheet reaches, so the same glyph has to
 * arrive here as pixels — and it cannot arrive as a white-baked one either, since a box's lid
 * is printed in the ink its stock is not: black on white card, white on black.
 *
 * So the markup is taken, its `currentColor` is replaced by the ink the caller asks for, and
 * the result is rasterised at a size of the caller's choosing. Baking the ink in rather than
 * tinting a white copy is what makes black reachable: a tint only ever darkens, so a white
 * glyph can be tinted black, but the two inks would then be two textures anyway — and this
 * way the cache key says which ink it holds instead of the sprite having to remember.
 *
 * The width and height attributes are rewritten along with the fill. The glyphs ship at
 * `1em`, meant for type to size them, and an SVG with an intrinsic size that small is one a
 * browser may rasterise at that size and then blow up. Given a size in pixels there is
 * nothing to guess at, and the viewBox's own proportions are preserved inside the square by
 * the SVG's default `preserveAspectRatio` — exactly as the document's copy is, being sized
 * to 80% of the lid in both directions.
 */

import { get } from 'svelte/store';
import { Texture } from 'pixi.js';
import { forShow } from '$utils/show/show-icon';
import { loadShowGlyphs, showGlyphs } from '$services/shows.service';

/** Side of the rasterised square, in pixels. A lid is a fraction of a grid cell, so this is
 * generous for the size it is drawn at and cheap enough to hold for the session. */
const GLYPH_SIZE = 256;

// One texture per (glyph, ink), kept for the session: a day's boxes are mostly a handful of
// shows on two stocks, so the whole grid usually asks for a few of these and every box after
// the first finds one waiting.
const cache = new Map<string, Promise<Texture | null>>();

/**
 * The texture for a show's glyph, painted in `ink` (any CSS colour). Null for a show with no
 * glyph picked for it — the lid then goes bare, which is the rule every other surface that
 * badges a show goes by — and null for artwork that will not decode, so a caller never has to
 * special-case a missing mark.
 *
 * The show's mark is authored data now, so this awaits the same load the document's copies
 * subscribe to before it can know there is anything to draw. The scene asks for its three
 * pictures at once and builds nothing until all of them have answered, so the wait costs the
 * box nothing it was not already spending.
 */
export function showGlyphTexture(
	showId: number | null | undefined,
	ink: string
): Promise<Texture | null> {
	if (showId == null) return Promise.resolve(null);

	// The key is the show rather than the glyph's name: two shows given the same mark are
	// two lids, and by the time this resolves the name is a lookup away anyway. Cached
	// before the first await, so a grid of boxes of one show rasterises once rather than
	// once per box that got in before the first finished.
	const key = `${showId}|${ink}`;
	const existing = cache.get(key);
	if (existing) return existing;

	const pending = paint(showId, ink).catch(() => null);
	cache.set(key, pending);
	// Nothing is kept for a show that came back bare: a glyph that failed to load is not
	// the same as a show with no glyph, and the next box to ask should get to find out.
	void pending.then((texture) => {
		if (!texture) cache.delete(key);
	});
	return pending;
}

/** The glyph's markup, once the authored set has landed, rasterised in `ink`. */
async function paint(showId: number, ink: string): Promise<Texture | null> {
	await loadShowGlyphs();
	const markup = forShow(get(showGlyphs), showId);
	return markup ? rasterise(markup, ink) : null;
}

async function rasterise(markup: string, ink: string): Promise<Texture | null> {
	const svg = markup
		.replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
			const stripped = attrs.replace(/\s(?:width|height)="[^"]*"/g, '');
			return `<svg${stripped} width="${GLYPH_SIZE}" height="${GLYPH_SIZE}">`;
		})
		.replaceAll('currentColor', ink);

	const image = new Image();
	image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	await image.decode();

	const canvas = document.createElement('canvas');
	canvas.width = GLYPH_SIZE;
	canvas.height = GLYPH_SIZE;
	const context = canvas.getContext('2d');
	if (!context) return null;
	context.drawImage(image, 0, 0, GLYPH_SIZE, GLYPH_SIZE);

	return Texture.from(canvas);
}
