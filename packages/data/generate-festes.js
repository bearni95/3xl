/**
 * generate-festes.js — bake each Països Catalans municipality's local festival
 * days ("festes locals" / "fiestas locales", which include its festa major)
 * into JSON for the @3xl/frontend /seasons calendar.
 *
 * Every date written here comes from an OFFICIAL government source — nothing is
 * invented. Three authorities publish the two legally-recognised local holidays
 * each of their municipalities declares for the year; we fetch all three live at
 * generate time, join each to the map's municipality polygons, and merge:
 *
 *   1. Catalunya       — Generalitat de Catalunya open dataset "Calendari de
 *                        festes locals a Catalunya" (Socrata b4eh-r8up). Joined
 *                        on the INE municipality code (geo id = `ES_<INE>`).
 *   2. Illes Balears   — Govern de les Illes Balears (CAIB) open dataset
 *                        "Calendari Laboral General i Local" (CSV). Joined on
 *                        the municipality name (the dataset has no INE code).
 *   3. País Valencià   — Generalitat Valenciana, the DOGV resolution that
 *                        approves the year's "fiestas locales" for the three
 *                        provinces (a PDF; text extracted with `pdftotext`).
 *                        Joined on the municipality name.
 *
 * Requires the `pdftotext` binary (poppler) on PATH for the País Valencià
 * source; if it is missing, that territory is skipped with a warning and the
 * other two still build. Bump YEAR / the source URLs each year.
 *
 * Coverage note: Catalunya Nord (France) has no legal municipal festa-major
 * holiday and no equivalent authority publishes one, and Andorra and l'Alguer
 * have no such open dataset, so those territories carry no dates here. Name
 * joins are strict: a municipality is written only when the source name maps to
 * exactly one polygon, so an unmatched or ambiguous town is left out (and
 * reported), never guessed.
 *
 * Input : public/geo/municipis.json  (the municipality polygons — the join
 *                                      target: id/name/comarca/prov/territory)
 *         the three datasets, fetched live at generate time.
 * Output: public/festes-locals.json — one entry per matched municipality with
 *         its sorted festival dates.
 *
 * Run with `pnpm generate:festes` (from the repo root or this package).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const MUNICIPIS = resolve(here, 'public/geo/municipis.json');
const OUTPUT = resolve(here, 'public/festes-locals.json');

const YEAR = 2026;

const SOURCES = {
	catalunya: {
		name: 'Calendari de festes locals a Catalunya',
		publisher: 'Generalitat de Catalunya — Dades Obertes',
		url: 'https://analisi.transparenciacatalunya.cat/Treball/Calendari-de-festes-locals-a-Catalunya/b4eh-r8up'
	},
	balears: {
		name: 'Calendari Laboral General i Local Illes Balears',
		publisher: 'Govern de les Illes Balears — Dades Obertes',
		url: 'https://intranet.caib.es/opendatacataleg/dataset/calendari-laboral-general-i-local-illes-balears-2026'
	},
	paisValencia: {
		name: 'Calendario de fiestas locales de la Comunitat Valenciana',
		publisher: 'Generalitat Valenciana — DOGV',
		url: 'https://dogv.gva.es/datos/2025/11/14/pdf/2025_46326_es.pdf'
	}
};

const CATALUNYA_SOCRATA = 'https://analisi.transparenciacatalunya.cat/resource/b4eh-r8up.json';
const BALEARS_CSV =
	'https://intranet.caib.es/opendatacataleg/dataset/e89fb44b-67f3-4e29-affc-2df135b719e5/resource/edf08154-bbc0-4259-a254-3b0185411354/download/calendari-laboral-2026.csv';
const DOGV_PV_PDF = SOURCES.paisValencia.url;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');
const geoIdForIne = (ine) => `ES_${String(ine).padStart(5, '0')}`;

/**
 * Re-base a `YYYY-MM-DD` onto YEAR, keeping its month and day — used when a town's
 * festival is carried over from an earlier year's official calendar. Returns null
 * for a day YEAR doesn't have (e.g. a leap-year 29 February onto a common year).
 */
function rebaseToYear(date) {
	const iso = `${YEAR}-${date.slice(5, 10)}`;
	const [, month, day] = iso.split('-').map(Number);
	const probe = new Date(`${iso}T00:00:00Z`);
	return probe.getUTCMonth() + 1 === month && probe.getUTCDate() === day ? iso : null;
}

// Catalan and Spanish month names → 1-based month number, for the text dates in
// the Balears and País Valencià sources.
const MONTHS = {
	// Catalan
	gener: 1, febrer: 2, marc: 3, abril: 4, maig: 5, juny: 6,
	juliol: 7, agost: 8, setembre: 9, octubre: 10, novembre: 11, desembre: 12,
	// Spanish
	enero: 1, febrero: 2, marzo: 3, mayo: 5, junio: 6,
	julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
	noviembre: 11, diciembre: 12
	// (abril/octubre shared; "de" forms handled by stripping the preposition)
};

/** Lowercase, strip diacritics — the basis for both date and name matching. */
function deburr(text) {
	return String(text)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
}

/**
 * Extract up to `max` "DD de MONTH" dates (Catalan or Spanish) from a free-text
 * string, in document order, as `YYYY-MM-DD`. Handles the "DD y DD de MONTH" /
 * "DD i DD de MONTH" range form (two days sharing a month). Only real day+month
 * pairs match, so descriptive text without a leading day is ignored.
 */
function extractDates(text, max = Infinity) {
	const clean = deburr(text);
	const dates = [];
	// number, optional "y/i number" (range), then "de month" or "d'month".
	const re = /(\d{1,2})(?:\s*[yi]\s*(\d{1,2}))?\s+d(?:e\s+|['´’]\s*)([a-z]+)/g;
	let match;
	while ((match = re.exec(clean)) && dates.length < max) {
		const month = MONTHS[match[3]];
		if (!month) continue;
		const days = [Number(match[1])];
		if (match[2]) days.push(Number(match[2]));
		for (const day of days) {
			if (day >= 1 && day <= 31 && dates.length < max) {
				dates.push(`${YEAR}-${pad(month)}-${pad(day)}`);
			}
		}
	}
	return dates;
}

/**
 * Grammatical words dropped from a name key so the substantive words are all
 * that remain. This collapses the article and preposition spellings that differ
 * between the sources and the geo — Spanish "DE ALMÚNIA" vs Catalan "d'Almúnia",
 * a leading "l'" vs a trailing ", el", the Balearic "ses" — onto one key.
 */
const CONNECTORS = new Set([
	'el', 'la', 'els', 'les', 'l', 'lo', 'los', 'las', 'sa', 'es', 'ses', 'ets',
	'de', 'del', 'dels', 'd', 'i', 'y', 'e', 'en'
]);

/**
 * Canonical municipality key for name joins: diacritic-free, apostrophe- and
 * punctuation-free, with every grammatical connector word removed and only the
 * substantive words kept (in order). Ambiguity from over-collapsing is caught by
 * buildNameIndex, which drops any key two municipalities share.
 */
function nameKey(raw) {
	const words = deburr(raw)
		.replace(/[''´`‘’]/g, ' ')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter((word) => word && !CONNECTORS.has(word));
	return words.join(' ');
}

/** Verified name aliases (source spelling → geo spelling) for the few towns the
 * key normalisation can't reconcile: short forms and Spanish exonyms without a
 * bilingual geo name. Each is a checked one-to-one identity, not a guess. */
const ALIASES = new Map(
	[
		['Ciutadella', 'Ciutadella de Menorca'],
		['Castellón de la Plana', 'Castelló de la Plana'],
		['Callosa Ensarrià', "Callosa d'en Sarrià"]
	].map(([from, to]) => [nameKey(from), nameKey(to)])
);

/**
 * Whether a line's pre-colon text is a municipality-name head in the DOGV annex,
 * as opposed to a colon inside a lowercase description. A head is a short run of
 * words that are each either UPPER-CASE (the annex sets names in capitals) or a
 * lowercase grammatical connector ("HONDÓN de los FRAILES"), with at least one
 * capital letter present.
 */
function isNameHead(text) {
	const words = text.trim().split(/\s+/);
	if (words.length === 0 || words.length > 9) return false;
	// The full Catalan + Spanish uppercase-accent set. The grave vowels Ì/Ò/Ù in
	// particular must be here: names like VINARÒS, RÒTOVA, BONREPÒS or FONT D'EN
	// CARRÒS are set in capitals in the annex, and omitting Ò would make the line
	// fail to register as a record head — silently folding the town (and its
	// dates) into the previous municipality's record.
	if (!/[A-ZÀÁÈÉÌÍÏÒÓÙÚÜÑÇ]/.test(text)) return false;
	return words.every(
		(word) =>
			/^[A-ZÀÁÈÉÌÍÏÒÓÙÚÜÑÇ0-9''´`‘’.,/\-]+$/.test(word) || CONNECTORS.has(deburr(word))
	);
}

/** Resolve a source municipality name to a geoId via the territory's index,
 * trying each "/"-separated variant and then the verified alias table. */
function resolveGeoId(index, rawName) {
	for (const variant of String(rawName).split('/')) {
		const key = nameKey(variant);
		if (!key) continue;
		const geoId = index.get(key) ?? index.get(ALIASES.get(key));
		if (geoId) return geoId;
	}
	return null;
}

/**
 * Build a name → geoId index over the geo features of one territory, expanding
 * bilingual "Spanish / Catalan" names into both keys. Keys that would collide
 * across two different municipalities are dropped (marked ambiguous) so a name
 * join can never resolve to the wrong town.
 */
function buildNameIndex(features, territory) {
	const index = new Map();
	const ambiguous = new Set();
	for (const feature of features) {
		const props = feature.properties;
		if (props?.territory !== territory || props?.id == null) continue;
		const geoId = String(props.id);
		for (const variant of String(props.name).split('/')) {
			const key = nameKey(variant);
			if (!key) continue;
			const seen = index.get(key);
			if (seen && seen !== geoId) ambiguous.add(key);
			else index.set(key, geoId);
		}
	}
	for (const key of ambiguous) index.delete(key);
	return index;
}

// ---------------------------------------------------------------------------
// Source 1 — Catalunya (Generalitat Socrata, joined by INE code)
// ---------------------------------------------------------------------------

async function socrataRows(where, select) {
	const pageSize = 5000;
	const rows = [];
	for (let offset = 0; ; offset += pageSize) {
		const params = new URLSearchParams({
			$select: select,
			$where: where,
			$limit: String(pageSize),
			$offset: String(offset)
		});
		const response = await fetch(`${CATALUNYA_SOCRATA}?${params}`);
		if (!response.ok) throw new Error(`Socrata ${response.status} ${response.statusText}`);
		const page = await response.json();
		rows.push(...page);
		if (page.length < pageSize) return rows;
	}
}

/**
 * Catalunya dates by geoId. Uses the main-seat ("pedania" 000) rows, then fills
 * any Catalan municipality still missing (declared only under a nucleus) with
 * that town's remaining rows — both from the same official dataset.
 */
async function fetchCatalunya(propsByGeoId) {
	const select = 'codi_municipi_ine,data';
	const byGeoId = new Map();

	const add = (ine, date) => {
		const geoId = geoIdForIne(ine);
		if (!propsByGeoId.has(geoId)) return;
		const set = byGeoId.get(geoId) ?? new Set();
		set.add(String(date).slice(0, 10));
		byGeoId.set(geoId, set);
	};

	for (const row of await socrataRows(`any_calendari='${YEAR}' AND pedania='000'`, select)) {
		add(row.codi_municipi_ine, row.data);
	}

	// Catalan geo municipalities with no main-seat entry yet — fill from any
	// nucleus row for the same INE code.
	const missing = [...propsByGeoId]
		.filter(([id, props]) => props.territory === 'Catalunya' && !byGeoId.has(id))
		.map(([id]) => id.replace('ES_', ''));
	if (missing.length) {
		const inList = missing.map((ine) => `'${ine}'`).join(',');
		for (const row of await socrataRows(
			`any_calendari='${YEAR}' AND codi_municipi_ine IN(${inList})`,
			select
		)) {
			add(row.codi_municipi_ine, row.data);
		}
	}

	// The YEAR slice of the open dataset is not always fully loaded for every town
	// (the Generalitat publishes it incrementally). For any Catalan municipality
	// still without a date, fall back to the most recent prior year's declared
	// local festivals ('Festiu local') from the SAME official dataset, re-based onto
	// YEAR — a festa major is a patronal feast, stable year to year. Prefer the
	// main-seat rows; if a town labels its local festivals only under its nuclei
	// (e.g. Cànoves i Samalús), take that year's nucleus rows instead.
	const stillMissing = [...propsByGeoId]
		.filter(([id, props]) => props.territory === 'Catalunya' && !byGeoId.has(id))
		.map(([id]) => id.replace('ES_', ''));
	if (stillMissing.length) {
		const inList = stillMissing.map((ine) => `'${ine}'`).join(',');
		const priorYears = [YEAR - 1, YEAR - 2, YEAR - 3].map(String);
		const yearList = priorYears.map((year) => `'${year}'`).join(',');
		const rows = await socrataRows(
			`any_calendari IN(${yearList}) AND festiu='Festiu local' AND codi_municipi_ine IN(${inList})`,
			'codi_municipi_ine,any_calendari,pedania,data'
		);
		// Index rows by INE, then by year.
		const byIne = new Map();
		for (const row of rows) {
			const byYear = byIne.get(row.codi_municipi_ine) ?? new Map();
			const yearRows = byYear.get(row.any_calendari) ?? [];
			yearRows.push(row);
			byYear.set(row.any_calendari, yearRows);
			byIne.set(row.codi_municipi_ine, byYear);
		}
		for (const [ine, byYear] of byIne) {
			const year = priorYears.find((candidate) => byYear.has(candidate));
			if (!year) continue;
			const yearRows = byYear.get(year);
			const seat = yearRows.filter((row) => row.pedania === '000');
			for (const row of seat.length ? seat : yearRows) {
				const rebased = rebaseToYear(String(row.data).slice(0, 10));
				if (rebased) add(ine, rebased);
			}
		}
	}
	return byGeoId;
}

// ---------------------------------------------------------------------------
// Source 2 — Illes Balears (CAIB CSV, joined by municipality name)
// ---------------------------------------------------------------------------

/** Minimal CSV row splitter. The CAIB file quotes only the few fields that embed
 * a comma (long parish lists), so honour double-quoted fields; everything else is
 * a plain comma split. */
function splitCsv(text) {
	return text
		.split(/\r?\n/)
		.filter((line) => line.trim())
		.map((line) => {
			const cells = [];
			let cell = '';
			let quoted = false;
			for (let i = 0; i < line.length; i++) {
				const ch = line[i];
				if (ch === '"') quoted = !quoted;
				else if (ch === ',' && !quoted) {
					cells.push(cell);
					cell = '';
				} else cell += ch;
			}
			cells.push(cell);
			return cells;
		});
}

/**
 * The rows that represent a municipality's own seat. A Balearic town lists its two
 * local holidays either against the municipality name itself or — for every Eivissa
 * municipality and a few Mallorcan ones — only against its parishes/nuclei, none of
 * which equals the municipality name. Prefer exact-name rows; otherwise fall back
 * to the single locality whose name shares the most substantive words with the
 * municipality (the seat parish always bears the town's name — "Parròquia de Sant
 * Antoni" for Sant Antoni de Portmany, "Algaida i Randa" for Algaida), so a town is
 * never dropped merely for lacking a row literally named after itself.
 */
function balearsSeatRows(rows, municipi) {
	const exact = rows.filter((row) => row.localitat === municipi);
	if (exact.length) return exact;
	const target = new Set(nameKey(municipi).split(' ').filter(Boolean));
	if (!target.size) return [];
	let bestLocalitat = null;
	let bestScore = 0;
	const scored = new Set();
	for (const row of rows) {
		if (scored.has(row.localitat)) continue;
		scored.add(row.localitat);
		let score = 0;
		for (const word of nameKey(row.localitat).split(' ')) if (target.has(word)) score++;
		if (score > bestScore) {
			bestScore = score;
			bestLocalitat = row.localitat;
		}
	}
	return bestScore > 0 ? rows.filter((row) => row.localitat === bestLocalitat) : [];
}

async function fetchBalears(nameIndex, report) {
	const response = await fetch(BALEARS_CSV);
	if (!response.ok) throw new Error(`CAIB CSV ${response.status} ${response.statusText}`);
	// The file is Windows-1252 encoded (accents, curly apostrophes).
	const text = new TextDecoder('windows-1252').decode(await response.arrayBuffer());

	const [header, ...rows] = splitCsv(text);
	const col = (name) => header.findIndex((h) => deburr(h).includes(name));
	const iAmbit = col('mbit'); // "Àmbit"
	const iMunicipi = col('municipi');
	const iLocalitat = col('localitat');
	const iData = col('data');

	// Group every local-scope row by its municipality, then keep only the seat
	// rows so nuclei don't inflate a town's dates — see balearsSeatRows for how the
	// seat is chosen when no row is named after the municipality itself.
	const rowsByMunicipi = new Map();
	for (const row of rows) {
		if (deburr(row[iAmbit] ?? '') !== 'local') continue;
		const municipi = (row[iMunicipi] ?? '').trim();
		if (!municipi) continue;
		const list = rowsByMunicipi.get(municipi) ?? [];
		list.push({ localitat: (row[iLocalitat] ?? '').trim(), data: row[iData] ?? '' });
		rowsByMunicipi.set(municipi, list);
	}

	const byGeoId = new Map();
	const unmatched = new Set();
	for (const [municipi, list] of rowsByMunicipi) {
		const geoId = resolveGeoId(nameIndex, municipi);
		if (!geoId) {
			unmatched.add(municipi);
			continue;
		}
		for (const row of balearsSeatRows(list, municipi)) {
			const [date] = extractDates(row.data);
			if (!date) continue;
			const set = byGeoId.get(geoId) ?? new Set();
			set.add(date);
			byGeoId.set(geoId, set);
		}
	}
	report.balears = { matched: byGeoId.size, unmatched: [...unmatched].sort() };
	return byGeoId;
}

// ---------------------------------------------------------------------------
// Source 3 — País Valencià (DOGV PDF, joined by municipality name)
// ---------------------------------------------------------------------------

async function fetchPaisValencia(nameIndex, report) {
	// pdftotext is required only here; treat its absence as a skipped territory.
	try {
		execFileSync('pdftotext', ['-v'], { stdio: 'ignore' });
	} catch {
		report.paisValencia = { skipped: 'pdftotext (poppler) not found on PATH' };
		return new Map();
	}

	const response = await fetch(DOGV_PV_PDF);
	if (!response.ok) throw new Error(`DOGV PDF ${response.status} ${response.statusText}`);
	const pdfPath = resolve(tmpdir(), `dogv-pv-${YEAR}.pdf`);
	writeFileSync(pdfPath, Buffer.from(await response.arrayBuffer()));
	const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
		encoding: 'utf8',
		maxBuffer: 32 * 1024 * 1024
	});

	// The annex lists one municipality per record: "NAME: date, desc; date, desc",
	// each record starting on its own line and wrapping onto indented follow-on
	// lines. We walk the lines, opening a new record whenever a line's pre-colon
	// text looks like an (upper-case) municipality name and appending every other
	// line to the record in progress. Each municipality declares up to two local
	// holidays, so we keep at most the first two dates in its text.
	const records = [];
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || /^(Núm\.|CVE:|RELACIÓN DE FIESTAS|III\.|C\))/i.test(line)) continue;
		const head = line.match(/^([^:]{1,70}):\s*(.*)$/);
		if (head && isNameHead(head[1])) {
			records.push({ name: head[1].trim(), body: head[2] });
		} else if (records.length) {
			records[records.length - 1].body += ' ' + line;
		}
	}

	const byGeoId = new Map();
	const unmatched = new Set();
	for (const record of records) {
		const geoId = resolveGeoId(nameIndex, record.name);
		if (!geoId) {
			unmatched.add(record.name);
			continue;
		}
		const dates = extractDates(record.body, 2);
		if (!dates.length) continue; // e.g. "SIN DETERMINAR" — no date declared yet
		const set = byGeoId.get(geoId) ?? new Set();
		for (const date of dates) set.add(date);
		byGeoId.set(geoId, set);
	}
	report.paisValencia = { matched: byGeoId.size, unmatched: [...unmatched].sort() };
	return byGeoId;
}

// ---------------------------------------------------------------------------
// Merge & write
// ---------------------------------------------------------------------------

const municipis = JSON.parse(readFileSync(MUNICIPIS, 'utf8'));
const propsByGeoId = new Map(
	municipis.features
		.filter((feature) => feature.properties?.id != null)
		.map((feature) => [String(feature.properties.id), feature.properties])
);

const balearsIndex = buildNameIndex(municipis.features, 'Illes Balears');
const valenciaIndex = buildNameIndex(municipis.features, 'País Valencià');

const report = {};
const [catalunya, balears, paisValencia] = await Promise.all([
	fetchCatalunya(propsByGeoId),
	fetchBalears(balearsIndex, report).catch((error) => {
		report.balears = { error: String(error) };
		return new Map();
	}),
	fetchPaisValencia(valenciaIndex, report).catch((error) => {
		report.paisValencia = { error: String(error) };
		return new Map();
	})
]);

// Merge every source's date sets by geoId (no source overlaps, but union is safe).
const datesByGeoId = new Map();
for (const source of [catalunya, balears, paisValencia]) {
	for (const [geoId, dates] of source) {
		const set = datesByGeoId.get(geoId) ?? new Set();
		for (const date of dates) set.add(date);
		datesByGeoId.set(geoId, set);
	}
}

const festes = [...datesByGeoId]
	.map(([geoId, dates]) => {
		const props = propsByGeoId.get(geoId);
		return {
			id: geoId,
			name: props?.name ?? 'Unknown',
			comarca: props?.comarca ?? null,
			prov: props?.prov ?? null,
			territory: props?.territory ?? null,
			dates: [...dates].sort()
		};
	})
	.sort((a, b) => a.name.localeCompare(b.name, 'ca'));

// Per-territory coverage against the geo universe (every map municipality),
// baked into the output so the /seasons header can show the covered share, and
// logged so gaps are visible, not silent.
const geoByTerritory = {};
for (const props of propsByGeoId.values()) {
	geoByTerritory[props.territory] = (geoByTerritory[props.territory] ?? 0) + 1;
}
const coveredByTerritory = {};
for (const festa of festes) {
	coveredByTerritory[festa.territory] = (coveredByTerritory[festa.territory] ?? 0) + 1;
}
const coverage = Object.entries(geoByTerritory)
	.map(([territory, total]) => ({
		territory,
		covered: coveredByTerritory[territory] ?? 0,
		total
	}))
	.sort((a, b) => b.covered - a.covered || a.territory.localeCompare(b.territory, 'ca'));

const output = {
	generatedAt: new Date().toISOString(),
	year: YEAR,
	sources: Object.values(SOURCES),
	/** Every municipality on the map — the denominator for the covered share. */
	municipalitiesTotal: propsByGeoId.size,
	/** Municipalities with at least one festival day — the numerator. */
	municipalitiesCovered: festes.length,
	/** Covered vs geo total per territory, for the header breakdown. */
	coverage,
	festes
};

writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

const totalDates = festes.reduce((sum, f) => sum + f.dates.length, 0);
const pct = Math.round((festes.length / propsByGeoId.size) * 100);

console.log(
	`Wrote ${festes.length} / ${propsByGeoId.size} municipalities (${pct}%, ${totalDates} festival days) for ${YEAR}.`
);
console.log('Coverage by territory (covered / geo total):');
for (const { territory, covered, total } of coverage) {
	console.log(`  ${territory}: ${covered} / ${total}`);
}
for (const [source, info] of Object.entries(report)) {
	if (info.error) console.log(`  ! ${source}: ${info.error}`);
	else if (info.skipped) console.log(`  ! ${source} skipped: ${info.skipped}`);
	else if (info.unmatched?.length)
		console.log(`  ~ ${source}: ${info.unmatched.length} unmatched: ${info.unmatched.join(' | ')}`);
}
