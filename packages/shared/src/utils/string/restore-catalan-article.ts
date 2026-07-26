// Some place names arrive with their leading definite article shunted to the end
// after a comma — "Hospitalet de Llobregat, L'", "Campello, el", "Mercadal, Es" —
// the sort-friendly form used by many gazetteers. This moves the article back to
// the front where it belongs for display: "L'Hospitalet de Llobregat", "El
// Campello", "Es Mercadal".
//
// Handles every Catalan definite article, including the Balearic salat forms
// (es/sa/ses): the apostrophe form (l') joins the name directly, the rest join
// with a space, and the article is capitalised since it now opens the label.
// Anything whose trailing comma-part isn't one of these articles is returned
// untouched (e.g. bilingual "A / B" names).
const ARTICLES = new Set(['l', 'el', 'la', 'els', 'les', 'es', 'sa', 'ses']);

export default function restoreCatalanArticle(name: string): string {
	// Split on the LAST ", " so multi-comma names only shed their trailing part.
	const at = name.lastIndexOf(', ');
	if (at === -1) return name;

	const base = name.slice(0, at);
	const article = name.slice(at + 2);

	// The apostrophe form ("L'" / "l'") normalises to the key "l".
	const key = article.replace(/['’]/g, '').toLowerCase();
	if (!ARTICLES.has(key)) return name;

	const head = key.charAt(0).toUpperCase() + key.slice(1);
	return key === 'l' ? `${head}'${base}` : `${head} ${base}`;
}
