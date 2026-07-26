// Local-festival ("festes locals") calendar types.
//
// @3xl/data's `generate:festes` bakes the Generalitat de Catalunya open dataset
// "Calendari de festes locals a Catalunya" into `public/festes-locals.json`
// (served at `/data/festes-locals.json`), one entry per Catalan municipality
// with its official local-holiday dates for the year. Each town's festa major
// is conventionally one of these two days; the dataset does not single out
// which, so both are kept. See the script header for sourcing and coverage.

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

/** Shape of `public/festes-locals.json` — the whole baked calendar. */
export interface FestesCollection {
	generatedAt: string;
	/** The calendar year the dates belong to. */
	year: number;
	/** Provenance of the underlying open dataset. */
	source: {
		name: string;
		publisher: string;
		url: string;
	};
	festes: MunicipalityFesta[];
}
