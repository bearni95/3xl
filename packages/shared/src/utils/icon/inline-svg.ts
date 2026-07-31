// Making a vendored glyph fit to be inlined into the document.
//
// The two icon sets in @3xl/assets are stored for the two places they are drawn
// (see the CLAUDE.md note on icons). The Noun Project show glyphs ship ready for a
// page — `fill="currentColor"` at `1em` — because they were always headed into the
// document. The game-icons.net set ships in the site's `ffffff / transparent`
// variant: white artwork at 512px, which is what a Pixi texture wants, because a
// tint only ever darkens and white is the one ink every colour is reachable from.
//
// Now that a show's glyph is *authored* rather than hardcoded, either set can be
// picked for one — so a glyph headed for a line of text has to be turned into a
// page's glyph on the way in. That is the whole of this file: the baked white is the
// ink, so it becomes `currentColor`, and the artwork's own size is dropped for `1em`
// so type sizes it like the show glyphs it stands beside. Inlining a white-baked
// glyph untouched is the failure this exists to prevent — white on white, drawn but
// invisible.
//
// The transform is idempotent: a show glyph that already says `currentColor` at
// `1em` comes back exactly as it went in, so one path serves both sets.

/** White in every spelling the two vendors use, as a `fill` attribute's value. */
const WHITE_FILL = /fill\s*=\s*"(?:#fff|#ffffff|#FFF|#FFFFFF|white)"/g;

/**
 * A vendored SVG, rewritten to be inlined into the document: painting in the colour
 * of whatever it sits in, and sized by that text rather than by its own artwork.
 * Given something that is not an SVG at all it returns null, so a caller can treat a
 * 404 page served in place of a missing file as "no glyph" rather than injecting it.
 */
export function inlineIconMarkup(markup: string): string | null {
	if (!/<svg\b/i.test(markup)) return null;

	// The ink first, everywhere it is asserted — the root's own fill on a game-icons
	// glyph, and any shape that repeats it. `fill="none"` and the like are left alone:
	// a hole in the artwork is not a colour.
	const inked = markup.replace(WHITE_FILL, 'fill="currentColor"');

	// Then the size, on the root tag alone. An SVG whose intrinsic size is the
	// artwork's 512px is one a browser may lay out at 512px; `1em` is what makes the
	// glyph a piece of type. A root with no fill of its own gets `currentColor` too,
	// so a glyph that inherited black from the vendor's default does not stay black.
	return inked.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
		const stripped = attrs.replace(/\s(?:width|height)\s*=\s*"[^"]*"/g, '');
		const fill = /\bfill\s*=/.test(stripped) ? '' : ' fill="currentColor"';
		return `<svg${stripped}${fill} width="1em" height="1em">`;
	});
}
