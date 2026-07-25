/**
 * generate-geo.js — build the Països Catalans map data for @3xl/frontend.
 *
 * Input : the Eurostat GISCO "LAU 2024" pan-European municipalities layer
 *         (EPSG:4326 / WGS84), downloaded to the repo root as
 *         `ref-lau-2024-01m.geojson/LAU_RG_01M_2024_4326.geojson`.
 *         Override with `LAU_GEOJSON=/path/to/file.geojson` or argv[2].
 * Output: four GeoJSON layers under `public/geo/`, mirroring the tiered view the
 *         frontend map draws (fill + three boundary rings):
 *           - municipis.json  every municipality (polygon fills + labels)
 *           - comarques.json  municipalities dissolved by comarca / equivalent
 *           - provincies.json municipalities dissolved by province / equivalent
 *           - territoris.json municipalities dissolved by territory
 *
 *         The comarca tier sits between municipality and province. Comarques are
 *         only an administrative division in part of the domain, so each
 *         municipality's comarca is fetched at build time from Wikidata (like
 *         Andorra from geoBoundaries): Catalan comarques for Catalunya (P772 →
 *         direct P131), the traditional Valencian comarques for the País Valencià
 *         (P772 → transitive P131+), and the historical comarques of Northern
 *         Catalonia for Catalunya Nord (P374/INSEE → transitive P131+). The Illes
 *         Balears use the comarques de les illes Balears (only Mallorca is
 *         subdivided; Menorca and Eivissa are each one comarca). Andorra and
 *         l'Alguer have no sub-province tier and are left out of the layer. Rings
 *         dissolved from the same LAU geometry as the province/territory rings, so
 *         comarca borders fall exactly on municipality borders.
 *
 * Scope — the Catalan Countries (Països Catalans), as the three Spanish
 * autonomous communities *in full* plus Andorra and the cross-border bits:
 *   · Catalunya         ES provinces 08 Barcelona, 17 Girona, 25 Lleida, 43 Tarragona
 *   · País Valencià     ES provinces 03 Alacant, 12 Castelló, 46 València
 *   · Illes Balears     ES province  07 Illes Balears
 *   · Catalunya Nord    FR département 66 Pyrénées-Orientales (whole dept; the
 *                       Fenolleda/Fenouillèdes NW corner is Occitan-speaking but
 *                       is not separable along commune lines, so it is kept)
 *   · l'Alguer          IT comune 090003 Alghero (Sardinia)
 *   · Andorra           the 7 parròquies — NOT present in the Eurostat LAU set,
 *                       so fetched at build time from geoBoundaries (gbOpen ADM1)
 *
 * The Franja de Ponent (Aragó) and El Carxe (Múrcia) are deliberately excluded:
 * they fall outside the three autonomous communities that define the scope.
 *
 * Dissolving uses topojson (build a shared-arc topology, then drop interior
 * arcs) so the province/territory rings have no leftover municipality borders.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { topology } from 'topojson-server';
import { merge } from 'topojson-client';

// --- scope tables ---------------------------------------------------------

/** Spanish province code (INE, first 2 digits of the LAU id) → name + territory. */
const ES_PROVINCES = {
	'08': { prov: 'Barcelona', territory: 'Catalunya' },
	'17': { prov: 'Girona', territory: 'Catalunya' },
	'25': { prov: 'Lleida', territory: 'Catalunya' },
	'43': { prov: 'Tarragona', territory: 'Catalunya' },
	'03': { prov: 'Alacant', territory: 'País Valencià' },
	'12': { prov: 'Castelló', territory: 'País Valencià' },
	'46': { prov: 'València', territory: 'País Valencià' },
	'07': { prov: 'Illes Balears', territory: 'Illes Balears' }
};

/** Territory display name → url-safe id used as the dissolve key. */
const TERRITORY_ID = {
	Catalunya: 'catalunya',
	'País Valencià': 'pais-valencia',
	'Illes Balears': 'illes-balears',
	'Catalunya Nord': 'catalunya-nord',
	"l'Alguer": 'alguer',
	Andorra: 'andorra'
};

/** Andorran parish (geoBoundaries shapeISO) → accented Catalan name. */
const AD_PARISHES = {
	'AD-02': 'Canillo',
	'AD-03': 'Encamp',
	'AD-04': 'La Massana',
	'AD-05': 'Ordino',
	'AD-06': 'Sant Julià de Lòria',
	'AD-07': 'Andorra la Vella',
	'AD-08': 'Escaldes-Engordany'
};

/**
 * Classify a LAU feature's GISCO_ID. Returns the normalized admin metadata, or
 * null if the municipality is outside the Països Catalans scope.
 * @param {string} gisco e.g. "ES_08019", "FR_66136", "IT_090003"
 */
function classifyLau(gisco) {
	if (gisco.startsWith('ES_')) {
		const code = gisco.slice(3, 5);
		const info = ES_PROVINCES[code];
		if (info) return { provKey: `ES_${code}`, ...info };
		return null;
	}
	if (gisco.startsWith('FR_66')) {
		return { provKey: 'FR_66', prov: 'Catalunya Nord', territory: 'Catalunya Nord' };
	}
	if (gisco === 'IT_090003') {
		return { provKey: 'IT_alguer', prov: "l'Alguer", territory: "l'Alguer" };
	}
	return null;
}

// --- inputs ---------------------------------------------------------------

const lauPath =
	process.argv[2] ??
	process.env.LAU_GEOJSON ??
	fileURLToPath(new URL('../../ref-lau-2024-01m.geojson/LAU_RG_01M_2024_4326.geojson', import.meta.url));

const outDir = fileURLToPath(new URL('./public/geo/', import.meta.url));

const GEOBOUNDARIES_ANDORRA_ADM1 = 'https://www.geoboundaries.org/api/current/gbOpen/AND/ADM1/';

/** Fetch Andorra's 7 parishes and normalize them into municipality features. */
async function fetchAndorraParishes() {
	const meta = await fetch(GEOBOUNDARIES_ANDORRA_ADM1).then((r) => {
		if (!r.ok) throw new Error(`geoBoundaries API ${r.status}`);
		return r.json();
	});
	const fc = await fetch(meta.gjDownloadURL).then((r) => {
		if (!r.ok) throw new Error(`geoBoundaries download ${r.status}`);
		return r.json();
	});
	return fc.features.map((f) => ({
		type: 'Feature',
		properties: {
			id: f.properties.shapeID,
			name: AD_PARISHES[f.properties.shapeISO] ?? f.properties.shapeName,
			prov: 'Andorra',
			provKey: 'AD',
			territory: 'Andorra'
		},
		geometry: f.geometry
	}));
}

// --- dissolve helpers -----------------------------------------------------

/**
 * Dissolve municipality features into one feature per group. A single shared-arc
 * topology is built once; topojson `merge` then drops interior arcs per group so
 * no municipality borders remain inside the resulting outlines.
 * @param {Array} features normalized municipality features (with properties)
 * @param {(props:object)=>string} keyOf group key selector
 * @param {(props:object)=>object} propsOf output properties for a group
 */
function dissolve(features, keyOf, propsOf) {
	// 1e5 quantization snaps near-identical vertices from adjacent municipalities
	// so their shared boundaries collapse to a single arc and dissolve cleanly.
	const topo = topology({ m: { type: 'FeatureCollection', features } }, 1e5);
	const geometries = topo.objects.m.geometries;

	const groups = new Map();
	for (const geom of geometries) {
		const key = keyOf(geom.properties);
		if (!groups.has(key)) groups.set(key, { props: propsOf(geom.properties), geoms: [] });
		groups.get(key).geoms.push(geom);
	}

	const out = [];
	for (const { props, geoms } of groups.values()) {
		out.push({ type: 'Feature', properties: props, geometry: merge(topo, geoms) });
	}
	return { type: 'FeatureCollection', features: out };
}

// --- comarca assignment ---------------------------------------------------

/** Slugify a comarca/island name into a url-safe dissolve id (strip accents). */
function slug(name) {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

const WDQS = 'https://query.wikidata.org/sparql';

/** Run a SPARQL query against the Wikidata Query Service and return its bindings. */
async function wdquery(sparql) {
	const url = `${WDQS}?format=json&query=${encodeURIComponent(sparql)}`;
	const res = await fetch(url, {
		headers: {
			Accept: 'application/sparql-results+json',
			// WDQS rejects requests without a descriptive User-Agent.
			'User-Agent': '3xl-game-geo-build/1.0 (https://github.com/bearni95; bernatcanal@gmail.com)'
		}
	});
	if (!res.ok) throw new Error(`WDQS ${res.status}: ${(await res.text()).slice(0, 200)}`);
	return (await res.json()).results.bindings;
}

/**
 * Fetch each municipality's comarca from Wikidata, keyed by GISCO_ID
 * (`ES_<INE5>` / `FR_<INSEE5>`). Comarca classes are matched by an English class
 * label containing "comarca", which uniformly covers the Catalan, Valencian and
 * Northern-Catalan comarca classes. First binding per key wins.
 * @returns {Promise<Map<string, {name:string,id:string}>>}
 */
async function fetchComarques() {
	/** @type {Map<string,{name:string,id:string}>} */
	const map = new Map();
	const add = (gisco, name) => {
		if (!map.has(gisco)) map.set(gisco, { name, id: slug(name) });
	};

	// Catalunya — municipality's direct P131 is its (Catalan) comarca (Q937876).
	const cat = await wdquery(`SELECT ?ine ?cLabel WHERE {
		?m wdt:P772 ?ine .
		FILTER(STRLEN(?ine)=5 && (STRSTARTS(?ine,"08")||STRSTARTS(?ine,"17")||STRSTARTS(?ine,"25")||STRSTARTS(?ine,"43")))
		?m wdt:P131 ?c . ?c wdt:P31 wd:Q937876 .
		SERVICE wikibase:label { bd:serviceParam wikibase:language "ca". }
	}`);
	for (const b of cat) add(`ES_${b.ine.value}`, b.cLabel.value);
	console.log(`  Catalunya: ${cat.length} municipalities → comarca`);

	// País Valencià — its comarques are traditional (not administrative) and so
	// are largely unlinked in Wikidata; take them from a GADM-derived municipality
	// layer instead (GADM level 3 = comarca), keyed by the INE code (`codine`).
	const val = await fetchValencianComarques();
	for (const [gisco, name] of val) add(gisco, name);
	console.log(`  País Valencià: ${val.size} municipalities → comarca`);

	// Catalunya Nord — communes carry the historical N. Catalan comarca (P131+).
	const nord = await wdquery(`SELECT ?insee ?cLabel WHERE {
		?m wdt:P374 ?insee . FILTER(STRSTARTS(?insee,"66"))
		?m wdt:P131+ ?c . ?c wdt:P31 ?cls .
		?cls rdfs:label ?cl . FILTER(LANG(?cl)="en" && CONTAINS(LCASE(?cl),"comarca"))
		SERVICE wikibase:label { bd:serviceParam wikibase:language "ca". }
	}`);
	for (const b of nord) add(`FR_${b.insee.value}`, b.cLabel.value);
	console.log(`  Catalunya Nord: ${nord.length} bindings → comarca`);

	// Illes Balears — the comarques de les illes Balears (Q20105287). Only Mallorca
	// is subdivided (Serra de Tramuntana, Raiguer, Pla, Llevant, Migjorn); Menorca
	// and Eivissa are each a single comarca. The English class label omits
	// "comarca", so it is matched by Q-id rather than the label heuristic above.
	const bal = await wdquery(`SELECT ?ine ?cLabel WHERE {
		?m wdt:P772 ?ine . FILTER(STRLEN(?ine)=5 && STRSTARTS(?ine,"07"))
		?m wdt:P131 ?c . ?c wdt:P31 wd:Q20105287 .
		SERVICE wikibase:label { bd:serviceParam wikibase:language "ca". }
	}`);
	for (const b of bal) add(`ES_${b.ine.value}`, b.cLabel.value);
	console.log(`  Illes Balears: ${bal.length} municipalities → comarca`);

	return map;
}

const VALENCIA_GEOJSON =
	'https://gist.githubusercontent.com/josemamira/ba6811e98859fdf6a734f670207ef1cc/raw';

/**
 * Fix the handful of comarca names GADM leaves broken in that layer, mapping each
 * to the exact string of the comarca it belongs to (so they merge, not split):
 * two unnamed clusters are Els Ports (around Morella) and La Safor (around
 * Gandia); "Vinalopo" is the Baix Vinalopó trio; and one Horta municipality has a
 * concatenated name.
 */
const VALENCIA_COMARCA_FIX = {
	'n.a. (211)': 'Els Ports',
	'n.a. (221)': 'Safor',
	Vinalopo: 'Baix Vinalopó',
	'Horta Sud Ciutat de Valencia': 'Horta Sud'
};

/**
 * Fetch a GADM-derived Valencian municipality layer and map each INE code
 * (`codine`) to its comarca (GADM level 3 name, `name_3`), keyed as `ES_<INE5>`.
 * @returns {Promise<Map<string,string>>}
 */
async function fetchValencianComarques() {
	const res = await fetch(VALENCIA_GEOJSON, {
		headers: { 'User-Agent': '3xl-game-geo-build/1.0 (bernatcanal@gmail.com)' }
	});
	if (!res.ok) throw new Error(`Valencian layer ${res.status}`);
	const fc = await res.json();
	const out = new Map();
	for (const f of fc.features) {
		const ine = String(f.properties.codine ?? f.properties.CodMunicipio ?? '').padStart(5, '0');
		const raw = f.properties.name_3;
		const comarca = VALENCIA_COMARCA_FIX[raw] ?? raw;
		if (ine.length === 5 && comarca) out.set(`ES_${ine}`, comarca);
	}
	return out;
}

/** Area-weighted-free centroid: the mean of every vertex in a (multi)polygon. */
function centroidOf(geom) {
	const rings =
		geom.type === 'Polygon'
			? geom.coordinates
			: geom.type === 'MultiPolygon'
				? geom.coordinates.flat()
				: [];
	let x = 0;
	let y = 0;
	let n = 0;
	for (const ring of rings) {
		for (const [lon, lat] of ring) {
			x += lon;
			y += lat;
			n += 1;
		}
	}
	return n ? [x / n, y / n] : [0, 0];
}

// --- main -----------------------------------------------------------------

async function main() {
	console.log(`Reading LAU source: ${lauPath}`);
	const lau = JSON.parse(await readFile(lauPath, 'utf8'));

	const municipis = [];
	for (const f of lau.features) {
		const info = classifyLau(f.properties.GISCO_ID);
		if (!info) continue;
		municipis.push({
			type: 'Feature',
			properties: {
				id: f.properties.GISCO_ID,
				name: f.properties.LAU_NAME,
				prov: info.prov,
				provKey: info.provKey,
				territory: info.territory
			},
			geometry: f.geometry
		});
	}
	console.log(`  matched ${municipis.length} municipalities in Spain/France/Italy`);

	console.log('Fetching comarca assignment from Wikidata…');
	const comarcaByGisco = await fetchComarques();
	// Tag each municipality with its comarca (Catalunya / País Valencià / Catalunya
	// Nord / Illes Balears). l'Alguer has no sub-province tier, so it stays null.
	let comarcaCount = 0;
	for (const f of municipis) {
		const comarca = comarcaByGisco.get(f.properties.id) ?? null;
		f.properties.comarca = comarca?.name ?? null;
		f.properties.comarcaId = comarca?.id ?? null;
		if (comarca) comarcaCount += 1;
	}
	console.log(`  ${comarcaCount} of ${municipis.length} municipalities directly assigned`);

	// Patch stragglers so comarca regions have no holes: a municipality left
	// unassigned inside a province that *does* have comarques (a few in Catalunya,
	// the communes of Catalunya Nord that Wikidata omits) inherits the comarca of
	// the geographically nearest assigned municipality in its own province.
	// l'Alguer's province has no assigned members, so it stays (correctly) out.
	const assignedByProv = new Map();
	for (const f of municipis) {
		if (!f.properties.comarcaId) continue;
		const pool = assignedByProv.get(f.properties.provKey) ?? [];
		pool.push({ c: centroidOf(f.geometry), name: f.properties.comarca, id: f.properties.comarcaId });
		assignedByProv.set(f.properties.provKey, pool);
	}
	let filled = 0;
	for (const f of municipis) {
		if (f.properties.comarcaId) continue;
		const pool = assignedByProv.get(f.properties.provKey);
		if (!pool) continue;
		const [lon, lat] = centroidOf(f.geometry);
		let best = null;
		let bestDist = Infinity;
		for (const a of pool) {
			const d = (a.c[0] - lon) ** 2 + (a.c[1] - lat) ** 2;
			if (d < bestDist) {
				bestDist = d;
				best = a;
			}
		}
		if (best) {
			f.properties.comarca = best.name;
			f.properties.comarcaId = best.id;
			filled += 1;
		}
	}
	console.log(`  ${filled} stragglers filled from nearest neighbour; ${comarcaCount + filled} total`);

	console.log('Fetching Andorra parishes from geoBoundaries…');
	const andorra = await fetchAndorraParishes();
	console.log(`  added ${andorra.length} Andorran parishes`);
	// Andorra has no comarca tier — its parishes are the finest division.
	for (const f of andorra) {
		f.properties.comarca = null;
		f.properties.comarcaId = null;
	}
	municipis.push(...andorra);

	// Municipality fills keep their full source geometry; only the dissolved
	// rings go through topojson. Strip the internal provKey from the public file.
	const municipisFC = {
		type: 'FeatureCollection',
		features: municipis.map((f) => ({
			type: 'Feature',
			properties: {
				id: f.properties.id,
				name: f.properties.name,
				comarca: f.properties.comarca,
				prov: f.properties.prov,
				territory: f.properties.territory
			},
			geometry: f.geometry
		}))
	};

	console.log('Dissolving comarca rings…');
	// Only municipalities with a comarca contribute; l'Alguer and Andorra (no
	// sub-province tier) are absent. A comarca that spans two provinces (e.g.
	// Cerdanya) dissolves into a single ring crossing the province line.
	const comarques = dissolve(
		municipis.filter((f) => f.properties.comarcaId),
		(p) => p.comarcaId,
		(p) => ({ id: p.comarcaId, name: p.comarca })
	);
	console.log(`  ${comarques.features.length} comarques`);

	console.log('Dissolving province rings…');
	const provincies = dissolve(
		municipis,
		(p) => p.provKey,
		(p) => ({ id: p.provKey, name: p.prov, territory: p.territory })
	);
	console.log(`  ${provincies.features.length} provinces`);

	console.log('Dissolving territory rings…');
	const territoris = dissolve(
		municipis,
		(p) => p.territory,
		(p) => ({ id: TERRITORY_ID[p.territory] ?? p.territory, name: p.territory })
	);
	console.log(`  ${territoris.features.length} territories`);

	await mkdir(outDir, { recursive: true });
	await writeFile(`${outDir}municipis.json`, JSON.stringify(municipisFC));
	await writeFile(`${outDir}comarques.json`, JSON.stringify(comarques));
	await writeFile(`${outDir}provincies.json`, JSON.stringify(provincies));
	await writeFile(`${outDir}territoris.json`, JSON.stringify(territoris));
	console.log(`Wrote municipis / comarques / provincies / territoris to ${outDir}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
