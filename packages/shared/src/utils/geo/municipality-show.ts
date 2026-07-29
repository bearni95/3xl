// Deterministically assign a saved TV show to a municipality from its shape.
//
// Each municipality is assigned a show, and the map pins each region's plurality
// show at its centre. The assignment is a pure function of the municipality's
// *full GPS coordinates*: the same polygon always yields the same show (stable
// across reloads and machines, no storage needed), while neighbouring
// municipalities land on independent shows — so each region's most common show
// is a stable, deterministic pick.

import type { ShowEntry } from '../../types/show.type';
import { fnv1a } from '../string/hash';

/**
 * Fold every coordinate number of a GeoJSON geometry into a 32-bit FNV-1a hash
 * — the municipality's "GPS seed". Walks the coordinate arrays in document
 * order (works for Point, LineString, Polygon, MultiPolygon, …) and mixes each
 * value at six-decimal precision, so latitude/longitude detail down to ~0.1 m
 * still shifts the result. Pure and deterministic: same shape → same seed.
 */
export function coordinateSeed(geometry: GeoJSON.Geometry | null | undefined): number {
	let hash = 0x811c9dc5;

	const mix = (value: number) => {
		const text = value.toFixed(6);
		for (let i = 0; i < text.length; i++) {
			hash ^= text.charCodeAt(i);
			hash = Math.imul(hash, 0x01000193);
		}
	};

	// GeoJSON coordinates are arbitrarily nested arrays bottoming out in the
	// [lng, lat, …] number tuples; walk the whole tree and mix every number.
	const walk = (node: unknown) => {
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
 * Every boundary vertex of a feature's geometry as a rounded "lng,lat" key.
 * Rounded to five decimals (~1 m) so polygons dissolved from the same source
 * edge match despite floating-point noise.
 */
function boundaryVertices(feature: GeoJSON.Feature): Set<string> {
	const keys = new Set<string>();
	const walk = (node: unknown, depth: number) => {
		if (!Array.isArray(node)) return;
		// A position is a [number, number, …] leaf; anything shallower is a ring
		// or list of rings, so recurse until we reach the coordinate pairs.
		if (typeof node[0] === 'number') {
			keys.add(`${(node[0] as number).toFixed(5)},${(node[1] as number).toFixed(5)}`);
			return;
		}
		for (const child of node) walk(child, depth + 1);
	};
	if (feature.geometry && 'coordinates' in feature.geometry) {
		walk(feature.geometry.coordinates, 0);
	}
	return keys;
}

/**
 * The ids of the municipality named `centerName` plus every municipality that
 * shares at least one boundary vertex with it — i.e. the named town and its
 * immediate neighbours. Empty when the named municipality isn't in the set.
 */
export function immediateNeighbourhood(
	collection: GeoJSON.FeatureCollection,
	centerName: string
): Set<string> {
	const ids = new Set<string>();
	const center = collection.features.find((f) => f.properties?.name === centerName);
	if (!center) return ids;

	const centerVertices = boundaryVertices(center);
	if (center.properties?.id != null) ids.add(String(center.properties.id));

	for (const feature of collection.features) {
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
 * Pick one show for a municipality feature from the saved-show collection,
 * seeded by the feature's geometry. Returns null when the feature has no
 * geometry or the collection is empty.
 */
export function showForMunicipality(
	feature: GeoJSON.Feature,
	shows: readonly ShowEntry[]
): ShowEntry | null {
	if (shows.length === 0) return null;
	const seed = coordinateSeed(feature.geometry);
	return shows[seed % shows.length];
}

/**
 * A saved show's display poster URL: the first author-enabled poster if any
 * were toggled on in the admin `/shows` screen, otherwise the show's default
 * TMDB poster, otherwise null. Mirrors the resolution used by the claim screens.
 */
export function showPosterUrl(entry: ShowEntry): string | null {
	const filePath = entry.enabledImages?.poster?.[0];
	if (filePath) {
		const image = entry.images.posters.find((candidate) => candidate.filePath === filePath);
		if (image) return image.thumbnailUrl;
	}
	return entry.show.posterUrl ?? null;
}

/**
 * A saved show's logo URL: the first logo the author enabled in the admin `/shows`
 * screen, or null when they enabled none. Unlike the poster there is no fallback to
 * TMDB's default — a show has a logo because someone chose one for it, and the
 * surfaces that draw a logo would rather draw none than one nobody picked.
 */
export function showLogoUrl(entry: ShowEntry): string | null {
	const filePath = entry.enabledImages?.logo?.[0];
	if (!filePath) return null;
	const image = entry.images.logos.find((candidate) => candidate.filePath === filePath);
	return image?.thumbnailUrl ?? null;
}

/**
 * A saved show's poster URL for a given `seed` key. When the author enabled more
 * than one poster in the admin `/shows` screen, one is chosen from the enabled set
 * by hashing the seed — so the same show renders a *different* but stable poster
 * per seed (the claim pack seeds it with the location + year, giving every
 * location/year combination its own cover). Falls back through the same chain as
 * {@link showPosterUrl}: the enabled set (index 0 when only one is enabled), then
 * the default TMDB poster, then null.
 */
export function showPosterUrlForSeed(entry: ShowEntry, seed: string): string | null {
	const enabled = entry.enabledImages?.poster ?? [];
	if (enabled.length > 0) {
		const filePath = enabled[fnv1a(seed) % enabled.length];
		const image = entry.images.posters.find((candidate) => candidate.filePath === filePath);
		if (image) return image.thumbnailUrl;
	}
	return entry.show.posterUrl ?? null;
}
