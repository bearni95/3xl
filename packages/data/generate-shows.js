/**
 * generate-shows.js — assign a saved TV show to every Països Catalans
 * municipality and bake the result into JSON for @3xl/frontend.
 *
 * Input : public/geo/municipis.json  (the municipality polygons)
 *         public/shows.json          (the saved-show collection authored in
 *                                      the admin /shows screen)
 * Output: public/municipality-shows.json — one assignment per municipality,
 *         each carrying the picked show's id/name/poster plus a flag marking
 *         the render subset (Barcelona and its immediate neighbours).
 *
 * The assignment is a pure function of each municipality's *full GPS
 * coordinates*: the same polygon always yields the same show. This used to be
 * computed in the browser on every load (packages/shared/src/utils/geo/
 * municipality-show.ts); it now happens once here at build time so the frontend
 * reads the finished assignment from the server. The FNV-1a seed, the
 * `seed % shows.length` pick, and the poster resolution below intentionally
 * mirror that shared util so the result is identical — keep them in sync.
 *
 * Run with `pnpm generate:shows` (from the repo root or this package).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MUNICIPIS = resolve(here, 'public/geo/municipis.json');
const SHOWS = resolve(here, 'public/shows.json');
const OUTPUT = resolve(here, 'public/municipality-shows.json');

// The municipality whose neighbourhood the map renders. Everything else is
// still assigned and written, but only this town and the municipalities sharing
// a boundary vertex with it are flagged for painting.
const CENTER_NAME = 'Barcelona';

// The shows eligible for assignment, by exact name. Only these are drawn from
// the saved shows.json pool, so every municipality gets one of them; set to null
// (or empty) to use the whole pool. Kept here so a re-run reproduces the subset.
const SHOW_ALLOWLIST = ['Dragon Ball Z', 'InuYasha', 'One Piece'];

/**
 * Fold every coordinate number of a GeoJSON geometry into a 32-bit FNV-1a hash
 * — the municipality's "GPS seed". Mirrors coordinateSeed() in the shared util.
 */
function coordinateSeed(geometry) {
	let hash = 0x811c9dc5;

	const mix = (value) => {
		const text = value.toFixed(6);
		for (let i = 0; i < text.length; i++) {
			hash ^= text.charCodeAt(i);
			hash = Math.imul(hash, 0x01000193);
		}
	};

	const walk = (node) => {
		if (typeof node === 'number') {
			mix(node);
		} else if (Array.isArray(node)) {
			for (const child of node) walk(child);
		}
	};

	if (geometry && 'coordinates' in geometry) walk(geometry.coordinates);
	return hash >>> 0;
}

/**
 * Every boundary vertex of a feature's geometry as a rounded "lng,lat" key
 * (~1 m). Mirrors boundaryVertices() in the shared util.
 */
function boundaryVertices(feature) {
	const keys = new Set();
	const walk = (node) => {
		if (!Array.isArray(node)) return;
		if (typeof node[0] === 'number') {
			keys.add(`${node[0].toFixed(5)},${node[1].toFixed(5)}`);
			return;
		}
		for (const child of node) walk(child);
	};
	if (feature.geometry && 'coordinates' in feature.geometry) {
		walk(feature.geometry.coordinates);
	}
	return keys;
}

/**
 * The ids of `centerName` plus every municipality that shares at least one
 * boundary vertex with it. Mirrors immediateNeighbourhood() in the shared util.
 */
function immediateNeighbourhood(features, centerName) {
	const ids = new Set();
	const center = features.find((f) => f.properties?.name === centerName);
	if (!center) return ids;

	const centerVertices = boundaryVertices(center);
	if (center.properties?.id != null) ids.add(String(center.properties.id));

	for (const feature of features) {
		if (feature === center || feature.properties?.id == null) continue;
		for (const vertex of boundaryVertices(feature)) {
			if (centerVertices.has(vertex)) {
				ids.add(String(feature.properties.id));
				break;
			}
		}
	}
	return ids;
}

/**
 * A saved show's display poster URL. Mirrors showPosterUrl() in the shared util:
 * the author-chosen main poster if picked, otherwise the show's default TMDB
 * poster, otherwise null.
 */
function showPosterUrl(entry) {
	const filePath = entry.mainImages?.poster;
	if (filePath) {
		const image = entry.images.posters.find((candidate) => candidate.filePath === filePath);
		if (image) return image.thumbnailUrl;
	}
	return entry.show.posterUrl ?? null;
}

/**
 * A saved show's display backdrop URL. Mirrors showBackdropUrl() in the shared
 * util: the author-chosen main backdrop at full resolution if picked, otherwise
 * the show's default TMDB backdrop, otherwise null.
 */
function showBackdropUrl(entry) {
	const filePath = entry.mainImages?.backdrop;
	if (filePath) {
		const image = entry.images.backdrops.find((candidate) => candidate.filePath === filePath);
		if (image) return image.fullUrl;
	}
	return entry.show.backdropUrl ?? null;
}

const municipis = JSON.parse(readFileSync(MUNICIPIS, 'utf8'));
const { shows: allShows } = JSON.parse(readFileSync(SHOWS, 'utf8'));

if (!Array.isArray(allShows) || allShows.length === 0) {
	throw new Error(`No shows in ${SHOWS} — author some in the admin /shows screen first.`);
}

// Restrict the assignment pool to the allow-listed shows (order preserved from
// shows.json so the seeded pick stays deterministic); an empty/null list uses all.
const shows =
	SHOW_ALLOWLIST && SHOW_ALLOWLIST.length
		? allShows.filter((entry) => SHOW_ALLOWLIST.includes(entry.show.name))
		: allShows;

const missing = (SHOW_ALLOWLIST ?? []).filter(
	(name) => !allShows.some((entry) => entry.show.name === name)
);
if (missing.length) {
	throw new Error(`Allow-listed shows not found in ${SHOWS}: ${missing.join(', ')}`);
}
if (shows.length === 0) {
	throw new Error(`SHOW_ALLOWLIST matched no shows in ${SHOWS}.`);
}

const neighbourhood = immediateNeighbourhood(municipis.features, CENTER_NAME);

const assignments = municipis.features
	.filter((feature) => feature.properties?.id != null)
	.map((feature) => {
		const props = feature.properties;
		const entry = shows[coordinateSeed(feature.geometry) % shows.length];
		return {
			id: String(props.id),
			name: props.name ?? 'Unknown',
			comarca: props.comarca ?? null,
			prov: props.prov ?? null,
			territory: props.territory ?? null,
			// Barcelona and its immediate neighbours — the map's render subset.
			neighbourOfCenter: neighbourhood.has(String(props.id)),
			show: {
				id: entry.show.id,
				name: entry.show.name,
				posterUrl: showPosterUrl(entry),
				backdropUrl: showBackdropUrl(entry)
			}
		};
	})
	.sort((a, b) => a.name.localeCompare(b.name, 'ca'));

const output = {
	generatedAt: new Date().toISOString(),
	center: CENTER_NAME,
	assignments
};

writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

const painted = assignments.filter((a) => a.neighbourOfCenter).length;
console.log(
	`Wrote ${assignments.length} municipality→show assignments to ${OUTPUT} ` +
		`(${painted} in the ${CENTER_NAME} neighbourhood, from ${shows.length} shows).`
);
