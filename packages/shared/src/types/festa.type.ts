// Local-festival ("festes locals" / "fiestas locales") calendar types.
//
// @3xl/data's `generate:festes` bakes several official government datasets into
// `public/festes-locals.json` (served at `/data/festes-locals.json`), one entry
// per municipality with its legally-recognised local-holiday dates for the year:
// the Generalitat de Catalunya, the Govern de les Illes Balears, and the
// Generalitat Valenciana's DOGV. Each town's festa major is conventionally one
// of its two local holidays; the sources do not single out which, so both are
// kept. See the script header for sourcing and coverage (Catalunya Nord,
// Andorra and l'Alguer have no equivalent source and carry no dates).

/** One municipality's local-festival days for the baked year. */
export interface MunicipalityFesta {
	/** Municipality feature id, matching `properties.id` in the geo layers. */
	id: string;
	name: string;
	comarca: string | null;
	prov: string | null;
	territory: string | null;
	/** The declared local-holiday dates, as sorted `YYYY-MM-DD` strings. */
	dates: string[];
}

/** Provenance of one underlying official dataset. */
export interface FestaSource {
	name: string;
	publisher: string;
	url: string;
}

/** One territory's covered-vs-total municipality tally. */
export interface FestaCoverage {
	territory: string;
	/** Municipalities with at least one festival day. */
	covered: number;
	/** Every map municipality in the territory. */
	total: number;
}

/** Shape of `public/festes-locals.json` — the whole baked calendar. */
export interface FestesCollection {
	generatedAt: string;
	/** The calendar year the dates belong to. */
	year: number;
	/** Provenance of every official dataset merged into the calendar. */
	sources: FestaSource[];
	/** Every municipality on the map — the denominator for the covered share. */
	municipalitiesTotal: number;
	/** Municipalities with at least one festival day — the numerator. */
	municipalitiesCovered: number;
	/** Covered vs geo total per territory, for the header breakdown. */
	coverage: FestaCoverage[];
	festes: MunicipalityFesta[];
}
