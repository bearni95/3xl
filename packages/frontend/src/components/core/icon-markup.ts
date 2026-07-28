// Every icon in @3xl/assets that is drawn into the *document*, inlined as raw markup.
//
// The artwork has to be part of *this* document rather than pointed at with an
// <img>: an <img> is an opaque document, so its artwork cannot inherit anything
// from the page and always paints in its own baked colour. These glyphs have to
// take the colour of whatever they sit in — the show name beside them in both
// panel tables, the pin frame on the map, the label colour of the button they fill
// — which is what `fill="currentColor"` in the SVG resolves against once it is
// inline.
//
// Icons drawn into a *canvas* do not come through here at all, and must not: the
// map's star badge goes into a Leaflet marker and the combat orders' glyphs into a
// Pixi texture, and neither is a place a stylesheet reaches. Those carry a baked
// white fill instead, so the canvas can tint them — which is also why the glob below
// takes only the show set. An inlined `fill="#fff"` glyph would come out white on
// white wherever it landed in the document.
//
// Pulled in with a glob rather than a hand-written import list so that adding an
// icon is only ever dropping the SVG into the right folder. Eager, so there is no
// fetch and no frame where a row renders without its glyph; these are a few
// hundred bytes each.
const modules = import.meta.glob('../../../../assets/public/icons/shows/*.svg', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

/** `…/icons/shows/straw-hat.svg` → `shows/straw-hat`: the folder rides along, which
 * is exactly how callers name an icon. */
function iconName(path: string): string {
	const parts = path.split('/');
	return `${parts[parts.length - 2]}/${parts[parts.length - 1].replace(/\.svg$/, '')}`;
}

const markupByName = new Map(
	Object.entries(modules).map(([path, markup]) => [iconName(path), markup])
);

/**
 * The raw SVG markup for an icon named `<folder>/<slug>` (e.g. `shows/bow-and-arrow`),
 * or null when there is no such icon — including for a null name, so a caller can pass
 * a lookup's result straight through.
 */
export function iconMarkup(name: string | null | undefined): string | null {
	if (!name) return null;
	return markupByName.get(name) ?? null;
}
