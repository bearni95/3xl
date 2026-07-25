/**
 * Ray-casting point-in-polygon tests over GeoJSON geometries.
 *
 * All coordinates follow the GeoJSON convention: `[longitude, latitude]`.
 */

type Ring = GeoJSON.Position[];

/** Whether `[lng, lat]` falls inside a single linear ring (even-odd rule). */
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		const intersects =
			yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
		if (intersects) inside = !inside;
	}
	return inside;
}

/**
 * Whether the point is inside a Polygon's coordinate rings: inside the outer
 * ring and outside every hole ring.
 */
function pointInPolygonRings(lng: number, lat: number, rings: Ring[]): boolean {
	if (rings.length === 0 || !pointInRing(lng, lat, rings[0])) return false;
	for (let i = 1; i < rings.length; i++) {
		if (pointInRing(lng, lat, rings[i])) return false; // inside a hole
	}
	return true;
}

/** Whether `[lng, lat]` falls inside a Polygon or MultiPolygon geometry. */
export function pointInGeometry(lng: number, lat: number, geometry: GeoJSON.Geometry): boolean {
	if (geometry.type === 'Polygon') {
		return pointInPolygonRings(lng, lat, geometry.coordinates);
	}
	if (geometry.type === 'MultiPolygon') {
		return geometry.coordinates.some((rings) => pointInPolygonRings(lng, lat, rings));
	}
	return false;
}
