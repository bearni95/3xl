import { describe, it, expect } from 'vitest';
import { coordinateSeed, seededShowId, seededShowPool } from '$utils/geo/municipality-show';

// The pool a town's show is seeded out of, and the pick itself. Both halves are
// pure: the pool is the assignment Supabase holds, the pick is the town's own
// geometry, and nothing about either is authored anywhere.

describe('seededShowPool', () => {
	it('takes every show with a cast and no show without one', () => {
		const pool = seededShowPool(
			new Map([
				[37854, ['luffy', 'zoro']],
				[3570, []],
				[12971, ['goku']]
			])
		);

		expect(pool).toEqual([12971, 37854]);
	});

	it('orders by id, so a re-translated show name cannot re-shuffle the map', () => {
		// The same two shows, listed the other way round and under other names: the
		// pool is the same, and so is every town's pick.
		const first = seededShowPool(
			new Map([
				[35610, ['kagura']],
				[12971, ['goku']]
			])
		);
		const second = seededShowPool(
			new Map([
				[12971, ['goku']],
				[35610, ['kagura']]
			])
		);

		expect(first).toEqual([12971, 35610]);
		expect(second).toEqual(first);
	});

	it('is empty when nothing has been assigned yet', () => {
		expect(seededShowPool(new Map())).toEqual([]);
		expect(seededShowPool(new Map([[3570, []]]))).toEqual([]);
	});
});

describe('seededShowId', () => {
	it('picks the pool entry the seed lands on', () => {
		const pool = [12971, 35610, 37854];

		expect(seededShowId(0, pool)).toBe(12971);
		expect(seededShowId(1, pool)).toBe(35610);
		expect(seededShowId(2, pool)).toBe(37854);
		expect(seededShowId(3, pool)).toBe(12971);
	});

	it('gives a town no show at all rather than putting them all on one', () => {
		expect(seededShowId(1234, [])).toBeNull();
	});

	it('is stable for a shape: the same polygon always flies the same show', () => {
		const feature: GeoJSON.Feature = {
			type: 'Feature',
			properties: { id: 'ES_08019' },
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[2.1, 41.3],
						[2.2, 41.3],
						[2.2, 41.4],
						[2.1, 41.3]
					]
				]
			}
		};
		const pool = [12971, 35610, 37854];
		const seed = coordinateSeed(feature.geometry);

		expect(seededShowId(seed, pool)).toBe(seededShowId(coordinateSeed(feature.geometry), pool));
	});

	it('spreads a big enough map over the whole pool', () => {
		const pool = [890, 9103, 12971, 35236, 35610, 37854];
		const flown = new Set<number | null>();
		for (let lng = 0; lng < 60; lng++) {
			const seed = coordinateSeed({
				type: 'Point',
				coordinates: [lng / 10, 41.5]
			});
			flown.add(seededShowId(seed, pool));
		}

		expect(flown.size).toBe(pool.length);
	});
});
