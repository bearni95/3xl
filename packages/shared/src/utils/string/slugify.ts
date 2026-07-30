/**
 * A name reduced to a url/key-safe slug: lowercase, accents folded to their base
 * letter, every run of anything else collapsed to a single hyphen, and no hyphen
 * left at either end. `L'Últim cop!` → `l-ultim-cop`.
 *
 * The result matches `^[a-z0-9-]+$` for any input that holds at least one letter
 * or digit, and is empty for one that holds none — a caller that needs an id has
 * to answer for that case itself rather than being handed a bare hyphen.
 */
export default function slugify(input?: string | null): string {
	if (!input) return '';
	return input
		.normalize('NFD')
		// Strip the combining marks NFD just split off, so accented letters keep
		// their base form instead of being dropped whole.
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
