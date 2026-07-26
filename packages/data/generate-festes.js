/**
 * generate-festes.js — bake each Països Catalans municipality's local festival
 * days ("festes locals", which include its festa major) into JSON for the
 * @3xl/frontend /seasons calendar.
 *
 * Source: the Generalitat de Catalunya open dataset "Calendari de festes locals
 * a Catalunya" (Socrata id b4eh-r8up on analisi.transparenciacatalunya.cat).
 * Every Catalan municipality declares two official local holidays a year; the
 * town's festa major is conventionally one of them. The dataset labels the two
 * days per municipality but does not single out which is the festa major, so we
 * keep both dates and let the calendar show them as the town's festival days.
 *
 * Coverage note: this is a Catalunya-only registry. The map's geo layers also
 * carry País Valencià, Illes Balears, Catalunya Nord, Andorra and l'Alguer,
 * which this dataset does not cover — those municipalities simply have no
 * festival days here. We join on the INE municipality code (the geo `id` is
 * `ES_<INE>`), so only municipalities present in both the dataset and the
 * polygons are written.
 *
 * Input : public/geo/municipis.json  (the municipality polygons — the id/name/
 *                                      comarca/prov/territory join target)
 *         the Socrata dataset, fetched live at generate time.
 * Output: public/festes-locals.json — one entry per matched municipality with
 *         its sorted festival dates.
 *
 * Run with `pnpm generate:festes` (from the repo root or this package).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MUNICIPIS = resolve(here, 'public/geo/municipis.json');
const OUTPUT = resolve(here, 'public/festes-locals.json');

// The dataset endpoint and the calendar year we bake. 2026 is the current year
// and the latest with clean, non-test data; bump this each year as the
// Generalitat publishes the new calendar.
const DATASET_ID = 'b4eh-r8up';
const YEAR = '2026';
const ENDPOINT = `https://analisi.transparenciacatalunya.cat/resource/${DATASET_ID}.json`;

// The geo id is `ES_<5-digit INE>`; the dataset's codi_municipi_ine is that
// same 5-digit code. This turns one into the other so we can join.
const geoIdForIne = (ine) => `ES_${String(ine).padStart(5, '0')}`;

/**
 * Pull every main-municipality ("pedania" 000 — the town hall seat, one row per
 * declared local holiday) festival row for YEAR. We ask only for the columns we
 * need and page through the Socrata API until it stops returning rows.
 */
async function fetchFestiveRows() {
	const pageSize = 5000;
	const rows = [];
	for (let offset = 0; ; offset += pageSize) {
		const params = new URLSearchParams({
			$select: 'codi_municipi_ine,ajuntament_o_nucli_municipal,data',
			$where: `any_calendari='${YEAR}' AND pedania='000'`,
			$order: 'codi_municipi_ine,data',
			$limit: String(pageSize),
			$offset: String(offset)
		});
		const response = await fetch(`${ENDPOINT}?${params}`);
		if (!response.ok) {
			throw new Error(`Socrata request failed: ${response.status} ${response.statusText}`);
		}
		const page = await response.json();
		rows.push(...page);
		if (page.length < pageSize) return rows;
	}
}

const municipis = JSON.parse(readFileSync(MUNICIPIS, 'utf8'));

// Geo id → its polygon properties, the source of truth for name/comarca/etc.
// Only municipalities present here are written, so the calendar always aligns
// with the map's regions.
const propsByGeoId = new Map(
	municipis.features
		.filter((feature) => feature.properties?.id != null)
		.map((feature) => [String(feature.properties.id), feature.properties])
);

const rows = await fetchFestiveRows();

// Group the flat rows into one entry per municipality, collecting its dates.
// Dates are stored as plain YYYY-MM-DD (the dataset gives midnight ISO stamps);
// we de-duplicate and sort them.
const byGeoId = new Map();
let unmatched = 0;

for (const row of rows) {
	const geoId = geoIdForIne(row.codi_municipi_ine);
	const props = propsByGeoId.get(geoId);
	if (!props) {
		unmatched++;
		continue;
	}
	const date = String(row.data).slice(0, 10);
	let entry = byGeoId.get(geoId);
	if (!entry) {
		entry = {
			id: geoId,
			name: props.name ?? row.ajuntament_o_nucli_municipal ?? 'Unknown',
			comarca: props.comarca ?? null,
			prov: props.prov ?? null,
			territory: props.territory ?? null,
			dates: new Set()
		};
		byGeoId.set(geoId, entry);
	}
	entry.dates.add(date);
}

const festes = [...byGeoId.values()]
	.map((entry) => ({ ...entry, dates: [...entry.dates].sort() }))
	.sort((a, b) => a.name.localeCompare(b.name, 'ca'));

const output = {
	generatedAt: new Date().toISOString(),
	year: Number(YEAR),
	source: {
		name: 'Calendari de festes locals a Catalunya',
		publisher: 'Generalitat de Catalunya — Dades Obertes',
		url: `https://analisi.transparenciacatalunya.cat/Treball/Calendari-de-festes-locals-a-Catalunya/${DATASET_ID}`
	},
	festes
};

writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

const totalDates = festes.reduce((sum, entry) => sum + entry.dates.length, 0);
console.log(
	`Wrote ${festes.length} municipalities (${totalDates} festival days) for ${YEAR} to ${OUTPUT}` +
		(unmatched ? ` — skipped ${unmatched} dataset rows with no matching polygon.` : '.')
);
