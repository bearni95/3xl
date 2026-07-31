// Deterministically assign a saved TV show to a municipality from its shape.
//
// Each municipality is assigned a show, and the map pins each region's plurality
// show at its centre. The assignment is a pure function of two things: the
// municipality's *full GPS coordinates* — the same polygon always yields the same
// index (stable across reloads and machines, no storage needed), while
// neighbouring municipalities land on independent ones — and the pool that index
// is taken out of, which is every show with a cast to draw.

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
 * The pool a town's show is drawn from: every show that has at least one
 * renderable character cast in it, which is the same set the album is built out
 * of and the same one a booster can actually be rolled from. Handed the show →
 * character-ids assignment the app reads from Supabase (`show_characters`,
 * already narrowed to characters the local registry can draw); a show with an
 * empty cast is left out, since a town flying it would deal a pack with nothing
 * in it and field a house team of nobody.
 *
 * Sorted by **id**, never by name: a saved show's name is TMDB's Catalan title
 * and the admin's re-query can change it, which would silently re-shuffle every
 * town on the map. An id is the one thing about a show no translation touches, so
 * the pool's order — and with it every town's pick — moves only when a show gains
 * or loses its first character.
 */
export function seededShowPool(pools: ReadonlyMap<number, readonly string[]>): number[] {
	const ids: number[] = [];
	for (const [id, cast] of pools) {
		if (cast.length > 0) ids.push(id);
	}
	return ids.sort((a, b) => a - b);
}

/**
 * The show a town flies before anybody takes it: the pool entry its GPS seed
 * lands on. Null for an empty pool — a map read before Supabase answers, which
 * leaves every town simply unshown rather than all on one show.
 */
export function seededShowId(seed: number, pool: readonly number[]): number | null {
	if (pool.length === 0) return null;
	return pool[seed % pool.length];
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
