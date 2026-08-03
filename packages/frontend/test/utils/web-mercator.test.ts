import { describe, expect, it } from 'vitest';
import {
	boundsOfCollection,
	fitBounds,
	type LatLngBounds,
	MAX_LATITUDE,
	projectWorld,
	tileGrid,
	tileUrl,
	tileZoomFor,
	unionBounds
} from '@3xl/shared/utils/geo/web-mercator';

describe('projectWorld', () => {
	it('puts null island in the middle of the world square', () => {
		const point = projectWorld(0, 0);
		expect(point.x).toBeCloseTo(0.5, 12);
		expect(point.y).toBeCloseTo(0.5, 12);
	});

	it('runs longitude straight across, west to east', () => {
		expect(projectWorld(0, -180).x).toBeCloseTo(0, 12);
		expect(projectWorld(0, 180).x).toBeCloseTo(1, 12);
		expect(projectWorld(0, 90).x).toBeCloseTo(0.75, 12);
	});

	it('puts north above the equator and south below it', () => {
		expect(projectWorld(45, 0).y).toBeLessThan(0.5);
		expect(projectWorld(-45, 0).y).toBeGreaterThan(0.5);
	});

	it('lands the cut-off latitudes exactly on the square edges', () => {
		expect(projectWorld(MAX_LATITUDE, 0).y).toBeCloseTo(0, 9);
		expect(projectWorld(-MAX_LATITUDE, 0).y).toBeCloseTo(1, 9);
	});

	it('clamps past the cut-off rather than running away to infinity', () => {
		expect(projectWorld(89.9, 0).y).toBeCloseTo(projectWorld(MAX_LATITUDE, 0).y, 12);
		expect(Number.isFinite(projectWorld(90, 0).y)).toBe(true);
	});
});

describe('fitBounds', () => {
	// A box a degree square about the equator, where mercator's bend is at its weakest and
	// the arithmetic can be reasoned about by hand.
	const bounds: LatLngBounds = [
		[-0.5, -0.5],
		[0.5, 0.5]
	];

	it('stands the bounds whole inside the box', () => {
		const fit = fitBounds(bounds, 400, 400);
		const sw = fit.project(-0.5, -0.5);
		const ne = fit.project(0.5, 0.5);
		for (const point of [sw, ne]) {
			expect(point.x).toBeGreaterThanOrEqual(-0.001);
			expect(point.x).toBeLessThanOrEqual(400.001);
			expect(point.y).toBeGreaterThanOrEqual(-0.001);
			expect(point.y).toBeLessThanOrEqual(400.001);
		}
	});

	it('centres what it fits', () => {
		const fit = fitBounds(bounds, 400, 400);
		const middle = fit.project(0, 0);
		expect(middle.x).toBeCloseTo(200, 6);
		expect(middle.y).toBeCloseTo(200, 6);
	});

	it('is bound by the dimension the box is worse at holding', () => {
		// A wide bbox in a square box: the width decides, and the height has room left over
		// which is shared out top and bottom.
		const wide: LatLngBounds = [
			[-0.5, -2],
			[0.5, 2]
		];
		const fit = fitBounds(wide, 400, 400);
		expect(fit.project(0, -2).x).toBeCloseTo(0, 6);
		expect(fit.project(0, 2).x).toBeCloseTo(400, 6);
		const top = fit.project(0.5, 0).y;
		const bottom = fit.project(-0.5, 0).y;
		expect(top).toBeGreaterThan(0);
		expect(bottom).toBeLessThan(400);
		// Equal room above and below, which is what centring the leftover means.
		expect(top).toBeCloseTo(400 - bottom, 6);
	});

	it('keeps the same scale both ways, so shapes are not stretched', () => {
		const fit = fitBounds(bounds, 400, 400);
		const across = fit.project(0, 0.5).x - fit.project(0, -0.5).x;
		const down = fit.project(-0.5, 0).y - fit.project(0.5, 0).y;
		// A degree of longitude and a degree of latitude are all but the same size on the world
		// square at the equator — all but, because mercator is already stretching the latitude
		// half a degree off it, by about a hundred-thousandth. One scale for both is what the
		// ratio being 1 says; the projection's own bend is the rest of the difference.
		expect(across / down).toBeCloseTo(1, 4);
	});

	it('survives bounds with no extent at all', () => {
		const point: LatLngBounds = [
			[41.4, 2.1],
			[41.4, 2.1]
		];
		const fit = fitBounds(point, 400, 400);
		expect(Number.isFinite(fit.worldSize)).toBe(true);
	});
});

describe('tileZoomFor', () => {
	it('takes the first zoom whose tiles are no smaller than they are drawn', () => {
		// Exactly four tiles across the world is zoom 2.
		expect(tileZoomFor(4 * 256, 256, 19)).toBe(2);
		// A hair past it needs the next zoom down, so nothing is scaled up.
		expect(tileZoomFor(4.1 * 256, 256, 19)).toBe(3);
	});

	it('never asks for a zoom the server does not have', () => {
		expect(tileZoomFor(1e9, 256, 19)).toBe(19);
		expect(tileZoomFor(1, 256, 19)).toBe(0);
	});
});

describe('tileGrid', () => {
	it('covers the box and no more', () => {
		// The whole world in a 512 box at zoom 1: four tiles, each 256 across.
		const fit = fitBounds(
			[
				[-MAX_LATITUDE, -180],
				[MAX_LATITUDE, 180]
			],
			512,
			512
		);
		const tiles = tileGrid(fit, 1, 256, 512, 512);
		expect(tiles).toHaveLength(4);
		expect(tiles.map((tile) => `${tile.x},${tile.y}`).sort()).toEqual([
			'0,0',
			'0,1',
			'1,0',
			'1,1'
		]);
		for (const tile of tiles) expect(tile.size).toBeCloseTo(256, 6);
	});

	it('lays the tiles edge to edge from the box corner', () => {
		const fit = fitBounds(
			[
				[-MAX_LATITUDE, -180],
				[MAX_LATITUDE, 180]
			],
			512,
			512
		);
		const tiles = tileGrid(fit, 1, 256, 512, 512);
		const topLeft = tiles.find((tile) => tile.x === 0 && tile.y === 0);
		const bottomRight = tiles.find((tile) => tile.x === 1 && tile.y === 1);
		expect(topLeft?.left).toBeCloseTo(0, 6);
		expect(topLeft?.top).toBeCloseTo(0, 6);
		expect(bottomRight?.left).toBeCloseTo(256, 6);
		expect(bottomRight?.top).toBeCloseTo(256, 6);
	});

	it('never asks for a row above the north edge or below the south', () => {
		const fit = fitBounds(
			[
				[-MAX_LATITUDE, -180],
				[MAX_LATITUDE, 180]
			],
			512,
			512
		);
		for (const tile of tileGrid(fit, 1, 256, 512, 512)) {
			expect(tile.y).toBeGreaterThanOrEqual(0);
			expect(tile.y).toBeLessThan(2);
		}
	});
});

describe('tileUrl', () => {
	it('fills the template in the ArcGIS z/y/x order', () => {
		expect(tileUrl('https://host/{z}/{y}/{x}', { x: 3, y: 5, z: 8, left: 0, top: 0, size: 1 }))
			.toBe('https://host/8/5/3');
	});
});

describe('boundsOfCollection', () => {
	const collection = {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				geometry: {
					type: 'Polygon',
					coordinates: [
						[
							[2, 41],
							[3, 41],
							[3, 42],
							[2, 41]
						]
					]
				}
			},
			{
				type: 'Feature',
				geometry: {
					type: 'MultiPolygon',
					coordinates: [
						[
							[
								[8, 40],
								[8.5, 40],
								[8.5, 40.5],
								[8, 40]
							]
						]
					]
				}
			}
		]
	};

	it('walks polygons and multi-polygons alike down to their positions', () => {
		expect(boundsOfCollection(collection)).toEqual([
			[40, 2],
			[42, 8.5]
		]);
	});

	it('answers nothing for a collection with no coordinates in it', () => {
		expect(boundsOfCollection({ type: 'FeatureCollection', features: [] })).toBeNull();
		expect(boundsOfCollection(null)).toBeNull();
		expect(boundsOfCollection({})).toBeNull();
	});
});

describe('unionBounds', () => {
	const a: LatLngBounds = [
		[40, 1],
		[42, 3]
	];
	const b: LatLngBounds = [
		[39, 2],
		[41, 8]
	];

	it('holds both', () => {
		expect(unionBounds(a, b)).toEqual([
			[39, 1],
			[42, 8]
		]);
	});

	it('is either alone when there is only one', () => {
		expect(unionBounds(a, null)).toBe(a);
		expect(unionBounds(null, b)).toBe(b);
		expect(unionBounds(null, null)).toBeNull();
	});
});
