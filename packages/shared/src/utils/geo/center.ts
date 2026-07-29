/**
 * Where a region's pin stands: a point in the region's own shape, rather than the
 * centre of the box drawn around it. A bounding box knows nothing about the shape
 * inside it, so its centre lands off the region whenever the region is not a
 * rectangle — out at sea for a town on a bay, in the next comarca along for a
 * crescent-shaped one, and in the open water between the islands for the Balears.
 *
 * So the centre is taken from the geometry: the area-weighted centroid of the
 * shape (the union of every municipality under a grouping), which is the centre
 * of mass of the land itself. A centroid can still fall outside a concave or
 * multi-part shape, and a pin outside its own region is exactly what this is
 * fixing, so the result is verified against the polygons and replaced when it
 * misses — see `interiorPoint`.
 *
 * All coordinates follow the GeoJSON convention (`[longitude, latitude]`) going
 * in and Leaflet's (`[lat, lng]`) coming out. Areas are computed on raw degrees:
 * a degree of longitude is shorter than one of latitude at these latitudes, but
 * the scaling is all but constant across a region this size and cancels out of a
 * weighted mean, so the extra term would move a pin by metres.
 */

import type { LatLngBounds } from './bounds';
import { pointInGeometry } from './pointInPolygon';

/** A point as Leaflet takes it: `[lat, lng]`. */
export type LatLng = [number, number];

/** A shape a region is made of, with the bounding box already computed for it. */
export interface RegionShape {
	geometry: GeoJSON.Geometry;
	box: LatLngBounds;
}

/** A shape's centre of mass and how much of it there is, for weighting. */
export interface Centroid {
	center: LatLng;
	area: number;
}

type Ring = GeoJSON.Position[];

/** Every polygon of a geometry as its ring list (outer ring first, then holes). */
function polygonsOf(geometry: GeoJSON.Geometry | null | undefined): Ring[][] {
	if (!geometry) return [];
	if (geometry.type === 'Polygon') return [geometry.coordinates];
	if (geometry.type === 'MultiPolygon') return geometry.coordinates;
	return [];
}

/**
 * One linear ring's centroid and (unsigned) area, by the shoelace formula. A
 * degenerate ring — fewer than three distinct points, or one that doubles back on
 * itself — encloses nothing and reports zero area, which drops it from the
 * weighting below rather than poisoning it with a division by zero.
 */
function ringCentroid(ring: Ring): { area: number; lng: number; lat: number } {
	let twiceArea = 0;
	let lng = 0;
	let lat = 0;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xj, yj] = ring[j];
		const [xi, yi] = ring[i];
		const cross = xj * yi - xi * yj;
		twiceArea += cross;
		lng += (xj + xi) * cross;
		lat += (yj + yi) * cross;
	}
	if (twiceArea === 0) return { area: 0, lng: 0, lat: 0 };
	// The signed area cancels with the signed cross terms, so the centroid comes
	// out right whichever way the ring is wound; only the weight is taken absolute.
	return { area: Math.abs(twiceArea) / 2, lng: lng / (3 * twiceArea), lat: lat / (3 * twiceArea) };
}

/**
 * A whole geometry's centroid and area: every polygon's outer ring adds its own,
 * every hole takes one away. Null when the geometry encloses no area at all (not
 * a polygon, or a sliver with none), which leaves the caller on its fallback.
 */
export function geometryCentroid(geometry: GeoJSON.Geometry | null | undefined): Centroid | null {
	let area = 0;
	let lat = 0;
	let lng = 0;
	for (const polygon of polygonsOf(geometry)) {
		for (let index = 0; index < polygon.length; index++) {
			const ring = ringCentroid(polygon[index]);
			if (!ring.area) continue;
			const weight = index === 0 ? ring.area : -ring.area;
			area += weight;
			lat += ring.lat * weight;
			lng += ring.lng * weight;
		}
	}
	if (area <= 0) return null;
	return { center: [lat / area, lng / area], area };
}

/**
 * Each feature's centroid and area, keyed by `properties.id`, in a single pass
 * over the collection — the counterpart of `boundsByFeatureId`, so a caller that
 * aggregates regions out of municipalities walks the polygons once for both.
 */
export function centroidsByFeatureId(
	collection: GeoJSON.FeatureCollection | null | undefined
): Map<string, Centroid> {
	const centroids = new Map<string, Centroid>();
	if (!collection) return centroids;

	for (const feature of collection.features) {
		const id = String(feature.properties?.id ?? '');
		if (!id) continue;
		const centroid = geometryCentroid(feature.geometry);
		if (centroid) centroids.set(id, centroid);
	}

	return centroids;
}

/** The area-weighted mean of several shapes' centroids — the union's own centroid. */
export function combineCentroids(centroids: Iterable<Centroid>): Centroid | null {
	let area = 0;
	let lat = 0;
	let lng = 0;
	for (const centroid of centroids) {
		area += centroid.area;
		lat += centroid.center[0] * centroid.area;
		lng += centroid.center[1] * centroid.area;
	}
	if (area <= 0) return null;
	return { center: [lat / area, lng / area], area };
}

/** Whether a point falls in any of the shapes — box first, since most miss on that. */
function contains(shapes: readonly RegionShape[], [lat, lng]: LatLng): boolean {
	for (const { box, geometry } of shapes) {
		const [[south, west], [north, east]] = box;
		if (lat < south || lat > north || lng < west || lng > east) continue;
		if (pointInGeometry(lng, lat, geometry)) return true;
	}
	return false;
}

/**
 * The point halfway along the widest stretch of land the parallel at `lat` crosses
 * — how a shape whose centroid misses it is given a centre anyway. Every ring of
 * every shape is crossed at once and the crossings taken in even-odd pairs, so
 * holes and separate islands both come out as gaps rather than land, and the
 * widest remaining span is the most solid part of the region at that latitude:
 * Mallorca rather than the water either side of it.
 */
function widestSpanAt(
	shapes: readonly RegionShape[],
	lat: number
): { point: LatLng; width: number } | null {
	const crossings: number[] = [];
	for (const { geometry } of shapes) {
		for (const polygon of polygonsOf(geometry)) {
			for (const ring of polygon) {
				for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
					const [xi, yi] = ring[i];
					const [xj, yj] = ring[j];
					// Half-open on purpose: an edge is counted at its lower end only, so a
					// vertex sitting exactly on the parallel is crossed once, not twice.
					if (yi > lat === yj > lat) continue;
					crossings.push(((xj - xi) * (lat - yi)) / (yj - yi) + xi);
				}
			}
		}
	}
	if (crossings.length < 2) return null;
	crossings.sort((a, b) => a - b);

	let widest = 0;
	let lng: number | null = null;
	for (let i = 0; i + 1 < crossings.length; i += 2) {
		const span = crossings[i + 1] - crossings[i];
		if (span > widest) {
			widest = span;
			lng = (crossings[i] + crossings[i + 1]) / 2;
		}
	}
	return lng == null ? null : { point: [lat, lng], width: widest };
}

// How many parallels a region is cut along when the one through its centroid
// crosses no land at all. Nine is enough to catch the thinnest strip of any town
// on the map while staying a handful of passes over rings that already failed once.
const LADDER_STEPS = 10;

/**
 * The widest land anywhere in the region, found by cutting along a ladder of
 * parallels spread over its box. This is for the shape whose centroid lies not
 * merely outside the region but on a parallel that misses it entirely — a town in
 * two pieces with a gap between them at that latitude, which is where the centroid
 * of such a town tends to land.
 */
function widestSpan(shapes: readonly RegionShape[], south: number, north: number): LatLng | null {
	let best: LatLng | null = null;
	let widest = 0;
	for (let step = 1; step < LADDER_STEPS; step++) {
		const found = widestSpanAt(shapes, south + ((north - south) * step) / LADDER_STEPS);
		if (found && found.width > widest) {
			widest = found.width;
			best = found.point;
		}
	}
	return best;
}

/**
 * A point inside the region: its centroid where that lands on the region itself,
 * and otherwise the middle of the widest land the centroid's parallel crosses.
 * Null only when the shapes enclose nothing at all — a region with no polygons
 * loaded — which leaves the caller to fall back to its box.
 */
export function interiorPoint(
	shapes: readonly RegionShape[],
	centroid: Centroid | null
): LatLng | null {
	if (centroid && contains(shapes, centroid.center)) return centroid.center;
	if (!shapes.length) return centroid?.center ?? null;

	let south = Infinity;
	let north = -Infinity;
	for (const { box } of shapes) {
		south = Math.min(south, box[0][0]);
		north = Math.max(north, box[1][0]);
	}
	if (south === Infinity) return centroid?.center ?? null;

	// The centroid's own parallel first — it stays as close to the true centre as
	// the shape allows. Only when that parallel crosses no land at all is the whole
	// region searched for its widest.
	const lat = centroid?.center[0] ?? (south + north) / 2;
	const across = widestSpanAt(shapes, lat);
	return across?.point ?? widestSpan(shapes, south, north) ?? centroid?.center ?? null;
}
