/**
 * A show's glyph as a canvas texture.
 *
 * The show marks are inlined into the *document* as raw markup, because that is what lets
 * `fill="currentColor"` resolve against the type they sit in (see icon-markup.ts). A canvas
 * is not a place a stylesheet reaches, so the same glyph has to arrive here as pixels — and
 * it cannot arrive as one of the white-baked canvas glyphs either, since a box's lid is
 * printed in the ink its stock is not: black on white card, white on black.
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

import { Texture } from 'pixi.js';
import { iconMarkup } from '$components/core/icon-markup';

/** Side of the rasterised square, in pixels. A lid is a fraction of a grid cell, so this is
 * generous for the size it is drawn at and cheap enough to hold for the session. */
const GLYPH_SIZE = 256;

// One texture per (glyph, ink), kept for the session: a day's boxes are mostly a handful of
// shows on two stocks, so the whole grid usually asks for a few of these and every box after
// the first finds one waiting.
const cache = new Map<string, Promise<Texture | null>>();

/**
 * The texture for the glyph named `<folder>/<slug>` (as `showIconName` gives it), painted in
 * `ink` (any CSS colour). Null for a show with no glyph drawn for it yet — the lid then goes
 * bare, which is the rule every other surface that badges a show goes by — and null for
 * artwork that will not decode, so a caller never has to special-case a missing mark.
 */
export function showGlyphTexture(
	name: string | null | undefined,
	ink: string
): Promise<Texture | null> {
	const markup = iconMarkup(name);
	if (!markup) return Promise.resolve(null);

	const key = `${name}|${ink}`;
	const existing = cache.get(key);
	if (existing) return existing;

	const pending = rasterise(markup, ink).catch(() => null);
	cache.set(key, pending);
	return pending;
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
