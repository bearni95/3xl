/**
 * generate-geo.js — build the Països Catalans map data for @3xl/frontend.
 *
 * Input : the Eurostat GISCO "LAU 2024" pan-European municipalities layer
 *         (EPSG:4326 / WGS84), downloaded to the repo root as
 *         `ref-lau-2024-01m.geojson/LAU_RG_01M_2024_4326.geojson`.
 *         Override with `LAU_GEOJSON=/path/to/file.geojson` or argv[2].
 * Output: three GeoJSON layers under `public/geo/`, mirroring the three-tier
 *         view the frontend map draws (fill + two boundary rings):
 *           - municipis.json  every municipality (polygon fills + labels)
 *           - provincies.json municipalities dissolved by province / equivalent
 *           - territoris.json municipalities dissolved by territory
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

	console.log('Fetching Andorra parishes from geoBoundaries…');
	const andorra = await fetchAndorraParishes();
	console.log(`  added ${andorra.length} Andorran parishes`);
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
				prov: f.properties.prov,
				territory: f.properties.territory
			},
			geometry: f.geometry
		}))
	};

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
	await writeFile(`${outDir}provincies.json`, JSON.stringify(provincies));
	await writeFile(`${outDir}territoris.json`, JSON.stringify(territoris));
	console.log(`Wrote municipis / provincies / territoris to ${outDir}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
