// Every icon in @3xl/assets, inlined into the bundle as raw markup.
//
// The artwork has to be part of *this* document rather than pointed at with an
// <img>: an <img> is an opaque document, so its artwork cannot inherit anything
// from the page and always paints in its own baked colour. These glyphs have to
// take the colour of whatever they sit in — the show name beside them in both
// panel tables, the pin frame on the map, the label colour of the button they fill
// — which is what `fill="currentColor"` in the SVG resolves against once it is
// inline.
//
// (One icon is still fetched by URL rather than inlined — the map's star badge —
// because it is drawn into a Leaflet marker, which is not a place a stylesheet
// reaches. It carries a baked fill of its own and does not come through here.)
//
// Pulled in with a glob rather than a hand-written import list so that adding an
// icon is only ever dropping the SVG into the right folder. Eager, so there is no
// fetch and no frame where a row renders without its glyph; these are a few
// hundred bytes each.
const modules = import.meta.glob('../../../../assets/public/icons/**/*.svg', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

/** `…/icons/lorc/broadsword.svg` → `lorc/broadsword`: the folder is the artist (or
 * `shows` for the show set), which is exactly how callers name an icon. */
function iconName(path: string): string {
	const parts = path.split('/');
	return `${parts[parts.length - 2]}/${parts[parts.length - 1].replace(/\.svg$/, '')}`;
}

const markupByName = new Map(
	Object.entries(modules).map(([path, markup]) => [iconName(path), markup])
);

/**
 * The raw SVG markup for an icon named `<folder>/<slug>` (e.g. `lorc/broadsword`,
 * `shows/bow-and-arrow`), or null when there is no such icon — including for a null
 * name, so a caller can pass a lookup's result straight through.
 */
export function iconMarkup(name: string | null | undefined): string | null {
	if (!name) return null;
	return markupByName.get(name) ?? null;
}
