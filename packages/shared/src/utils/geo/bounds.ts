/**
 * Computes the geographic bounding box of a subset of GeoJSON features, as a
 * Leaflet-ready `[[south, west], [north, east]]` pair — the shape the map's
 * `fitBounds` takes to frame a region. Pure: it only reads coordinates, so it
 * carries no Leaflet dependency and can be unit-tested on plain GeoJSON.
 */

/** Southwest + northeast corners as [lat, lng] — a Leaflet LatLngBoundsExpression. */
export type LatLngBounds = [[number, number], [number, number]];

// GeoJSON positions nest to arbitrary depth (Polygon rings, MultiPolygon
// polygons, …); descend until a bare [lng, lat, …] position is reached.
function walkPositions(coords: unknown, visit: (lng: number, lat: number) => void): void {
	if (!Array.isArray(coords)) return;
	if (typeof coords[0] === 'number') {
		visit(coords[0] as number, coords[1] as number);
		return;
	}
	for (const child of coords) walkPositions(child, visit);
}

/**
 * Each feature's own bounding box, keyed by `properties.id`, in a single pass
 * over the collection. Callers that need many regions' boxes aggregate these up
 * their own hierarchy, avoiding a full re-scan of the polygons per region (which
 * would be O(regions × features)).
 */
export function boundsByFeatureId(
	collection: GeoJSON.FeatureCollection | null | undefined
): Map<string, LatLngBounds> {
	const boxes = new Map<string, LatLngBounds>();
	if (!collection) return boxes;

	for (const feature of collection.features) {
		const id = String(feature.properties?.id ?? '');
		if (!id || !feature.geometry || !('coordinates' in feature.geometry)) continue;

		let minLat = Infinity;
		let minLng = Infinity;
		let maxLat = -Infinity;
		let maxLng = -Infinity;
		walkPositions(feature.geometry.coordinates, (lng, lat) => {
			if (lat < minLat) minLat = lat;
			if (lat > maxLat) maxLat = lat;
			if (lng < minLng) minLng = lng;
			if (lng > maxLng) maxLng = lng;
		});
		if (minLat !== Infinity) boxes.set(id, [[minLat, minLng], [maxLat, maxLng]]);
	}

	return boxes;
}

/**
 * The union bounding box of every feature in `collection` whose
 * `properties.id` is in `ids`, or null when none match (or the set is empty).
 */
export function boundsForFeatures(
	collection: GeoJSON.FeatureCollection | null | undefined,
	ids: Set<string>
): LatLngBounds | null {
	if (!collection || ids.size === 0) return null;

	let minLat = Infinity;
	let minLng = Infinity;
	let maxLat = -Infinity;
	let maxLng = -Infinity;
	let found = false;

	const visit = (lng: number, lat: number) => {
		found = true;
		if (lat < minLat) minLat = lat;
		if (lat > maxLat) maxLat = lat;
		if (lng < minLng) minLng = lng;
		if (lng > maxLng) maxLng = lng;
	};

	for (const feature of collection.features) {
		if (!ids.has(String(feature.properties?.id ?? ''))) continue;
		if (feature.geometry && 'coordinates' in feature.geometry) {
			walkPositions(feature.geometry.coordinates, visit);
		}
	}

	return found ? [[minLat, minLng], [maxLat, maxLng]] : null;
}
