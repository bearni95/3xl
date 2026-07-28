// Every generated show glyph, inlined into the bundle as raw markup.
//
// These are NOT rendered through Icon.svelte, which points an <img> at
// /assets/icons/…: an <img> is an opaque document, so its artwork cannot inherit
// anything from the page and always paints in its own baked colour. These glyphs
// have to take the colour of whatever they sit in — the show name beside them in
// both panel tables, the pin frame on the map — which means the SVG has to be part
// of this document, so its `fill="currentColor"` resolves against the surrounding
// text's `color`.
//
// Pulled in with a glob rather than a hand-written import list so that
// `pnpm generate:show-icons` is the only step needed to add one: drop the SVG at
// the repo root, run it, and the icon is in the bundle. Eager, so there is no
// fetch and no frame where a row renders without its glyph; these are a few
// hundred bytes each.
const modules = import.meta.glob('../../../../assets/public/icons/shows/*.svg', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

// Re-keyed by the "shows/<slug>" name showIconName returns, so a lookup takes the
// value straight from the shared mapping with no path juggling at the call site.
const markupByName = new Map(
	Object.entries(modules).map(([path, markup]) => [
		`shows/${path.split('/').pop()!.replace(/\.svg$/, '')}`,
		markup
	])
);

/**
 * The raw SVG markup for a glyph named as {@link showIconName} gives it (e.g.
 * "shows/bow-and-arrow"), or null when no icon has been drawn for it — including
 * for a null name, so a caller can pass a lookup's result straight through.
 */
export function showIconMarkup(name: string | null | undefined): string | null {
	if (!name) return null;
	return markupByName.get(name) ?? null;
}
