import { describe, it, expect } from 'vitest';
import {
	centroidsByFeatureId,
	combineCentroids,
	geometryCentroid,
	interiorPoint,
	type RegionShape
} from '$utils/geo/center';
import { boundsByFeatureId } from '$utils/geo/bounds';

/** A GeoJSON Polygon from `[lng, lat]` corners, closed for you. */
function polygon(...ring: [number, number][]): GeoJSON.Polygon {
	return { type: 'Polygon', coordinates: [[...ring, ring[0]]] };
}

function feature(id: string, geometry: GeoJSON.Geometry): GeoJSON.Feature {
	return { type: 'Feature', id, properties: { id }, geometry };
}

function collection(...features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
	return { type: 'FeatureCollection', features };
}

/** Every feature paired with its own box, the way the map assembles a region. */
function shapes(fc: GeoJSON.FeatureCollection): RegionShape[] {
	const boxes = boundsByFeatureId(fc);
	return fc.features.map((f) => ({
		geometry: f.geometry,
		box: boxes.get(String(f.properties?.id))!
	}));
}

// A square kilometre-ish block, 1° on a side, with its bottom-left at [lng, lat].
const square = (lng: number, lat: number, size = 1): GeoJSON.Polygon =>
	polygon([lng, lat], [lng + size, lat], [lng + size, lat + size], [lng, lat + size]);

describe('geometryCentroid', () => {
	it('takes the middle of a square', () => {
		expect(geometryCentroid(square(2, 41))).toEqual({ center: [41.5, 2.5], area: 1 });
	});

	it('reads the same centroid whichever way the ring is wound', () => {
		const clockwise = polygon([2, 41], [2, 42], [3, 42], [3, 41]);
		expect(geometryCentroid(clockwise)).toEqual({ center: [41.5, 2.5], area: 1 });
	});

	it('pulls the centroid towards the bigger half of a MultiPolygon', () => {
		const islands: GeoJSON.MultiPolygon = {
			type: 'MultiPolygon',
			coordinates: [square(0, 40, 2).coordinates, square(10, 40, 1).coordinates]
		};
		const centroid = geometryCentroid(islands)!;
		expect(centroid.area).toBe(5);
		// Four parts at lng 1 against one at 10.5.
		expect(centroid.center[1]).toBeCloseTo((4 * 1 + 1 * 10.5) / 5, 10);
	});

	it('takes a hole out of the shape it is cut from', () => {
		const holed: GeoJSON.Polygon = {
			type: 'Polygon',
			coordinates: [
				square(0, 0, 4).coordinates[0],
				// A hole in the left half drags the centroid right of centre.
				square(0.5, 1.5, 1).coordinates[0]
			]
		};
		const centroid = geometryCentroid(holed)!;
		expect(centroid.area).toBe(15);
		expect(centroid.center[1]).toBeGreaterThan(2);
	});

	it('reports nothing for a geometry that encloses nothing', () => {
		expect(geometryCentroid({ type: 'Point', coordinates: [1, 1] })).toBeNull();
		expect(geometryCentroid(polygon([1, 1], [2, 2]))).toBeNull();
		expect(geometryCentroid(null)).toBeNull();
	});
});

describe('centroidsByFeatureId', () => {
	it('keys each feature centroid by its id', () => {
		const centroids = centroidsByFeatureId(
			collection(feature('ES_08019', square(2, 41)), feature('ES_46250', square(-0.5, 39)))
		);
		expect(centroids.get('ES_08019')?.center).toEqual([41.5, 2.5]);
		expect(centroids.get('ES_46250')?.center).toEqual([39.5, 0]);
	});

	it('skips features with no id and no area', () => {
		const centroids = centroidsByFeatureId(
			collection(
				{ type: 'Feature', properties: {}, geometry: square(2, 41) },
				feature('sliver', polygon([1, 1], [2, 2]))
			)
		);
		expect(centroids.size).toBe(0);
	});
});

describe('combineCentroids', () => {
	it('weighs each part by its area', () => {
		const combined = combineCentroids([
			{ center: [40, 0], area: 3 },
			{ center: [44, 0], area: 1 }
		])!;
		expect(combined).toEqual({ center: [41, 0], area: 4 });
	});

	it('reports nothing when there is nothing to combine', () => {
		expect(combineCentroids([])).toBeNull();
	});
});

describe('interiorPoint', () => {
	it('keeps the centroid when it lands on the region', () => {
		const region = collection(feature('a', square(2, 41)));
		const centroid = combineCentroids(centroidsByFeatureId(region).values())!;
		expect(interiorPoint(shapes(region), centroid)).toEqual([41.5, 2.5]);
	});

	it('moves a C-shaped town off the bay its centroid falls in', () => {
		// A ring of land open to the east: its centroid sits in the water inside.
		const bay = polygon(
			[0, 0],
			[3, 0],
			[3, 1],
			[1, 1],
			[1, 2],
			[3, 2],
			[3, 3],
			[0, 3]
		);
		const region = collection(feature('bay', bay));
		const centroid = geometryCentroid(bay)!;
		const shapeList = shapes(region);

		expect(interiorPoint(shapeList, centroid)).not.toEqual(centroid.center);
		const [lat, lng] = interiorPoint(shapeList, centroid)!;
		// On the western spine of the C, which is the widest land at that parallel.
		expect(lat).toBeCloseTo(centroid.center[0], 10);
		expect(lng).toBeGreaterThan(0);
		expect(lng).toBeLessThan(1);
	});

	it('puts an archipelago on its biggest island, not in the sea between them', () => {
		// A big island west, a small one east; the weighted centroid falls in the water.
		const region = collection(
			feature('big', square(0, 0, 3)),
			feature('small', square(8, 1, 1))
		);
		const centroid = combineCentroids(centroidsByFeatureId(region).values())!;
		const [lat, lng] = interiorPoint(shapes(region), centroid)!;

		expect(lng).toBeGreaterThan(0);
		expect(lng).toBeLessThan(3);
		expect(lat).toBeCloseTo(centroid.center[0], 10);
	});

	it('finds land for a town in two pieces whose centroid parallel crosses neither', () => {
		// North and south halves with a gap between them: the centroid sits in the gap,
		// and so does the whole parallel through it.
		const split: GeoJSON.MultiPolygon = {
			type: 'MultiPolygon',
			coordinates: [square(0, 0, 1).coordinates, square(0, 4, 1).coordinates]
		};
		const region = collection(feature('split', split));
		const centroid = geometryCentroid(split)!;
		expect(centroid.center[0]).toBeCloseTo(2.5, 10);

		const [lat, lng] = interiorPoint(shapes(region), centroid)!;
		expect(lng).toBeGreaterThan(0);
		expect(lng).toBeLessThan(1);
		// On one of the two halves, not in the water between them.
		expect(lat < 1 || lat > 4).toBe(true);
	});

	it('falls back to the box middle when every shape is degenerate', () => {
		const flat = polygon([0, 2], [4, 2]);
		const region = collection(feature('flat', flat));
		expect(interiorPoint(shapes(region), null)).toBeNull();
	});

	it('has nothing to say about a region with no shapes', () => {
		expect(interiorPoint([], null)).toBeNull();
		expect(interiorPoint([], { center: [41, 2], area: 1 })).toEqual([41, 2]);
	});
});
