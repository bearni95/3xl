// Deterministically assign a saved TV show to a municipality from its shape.
//
// The map paints each municipality with the poster of an assigned show. The
// assignment is a pure function of the municipality's *full GPS coordinates*:
// the same polygon always yields the same show (stable across reloads and
// machines, no storage needed), while neighbouring municipalities land on
// independent shows. Because WorldMap groups features by the image URL their
// `imageFill` returns, every municipality assigned the same show shares one
// poster spanning their combined shape, with each polygon's border drawn over
// it — adjacent same-show cells merge into a single picture automatically.

import type { ShowEntry } from '../../types/show.type';

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
 * A saved show's display poster URL: the author-chosen main poster if one was
 * picked in the admin `/shows` screen, otherwise the show's default TMDB
 * poster, otherwise null. Mirrors the resolution used by the claim screens.
 */
export function showPosterUrl(entry: ShowEntry): string | null {
	const filePath = entry.mainImages?.poster;
	if (filePath) {
		const image = entry.images.posters.find((candidate) => candidate.filePath === filePath);
		if (image) return image.thumbnailUrl;
	}
	return entry.show.posterUrl ?? null;
}
