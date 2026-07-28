import { describe, it, expect } from 'vitest';
import { buildShowStandings } from '$utils/geo/show-standings';
import type { RegionShow } from '$utils/geo/region-tree';

const ONE_PIECE: RegionShow = { id: 1, name: 'One Piece', posterUrl: '/one-piece.jpg' };
const DBZ: RegionShow = { id: 2, name: 'Dragon Ball Z', posterUrl: null };
const NARUTO: RegionShow = { id: 3, name: 'Naruto', posterUrl: null };

describe('buildShowStandings', () => {
	it('tallies the towns flying each show, biggest first', () => {
		const standings = buildShowStandings(
			new Map([
				['ES_08028', ONE_PIECE],
				['ES_08121', DBZ],
				['ES_17079', ONE_PIECE],
				['ES_25120', ONE_PIECE],
				['ES_43148', DBZ]
			])
		);

		expect(standings.map((row) => [row.name, row.count])).toEqual([
			['One Piece', 3],
			['Dragon Ball Z', 2]
		]);
		expect(standings[0].share).toBeCloseTo(0.6);
		expect(standings[1].share).toBeCloseTo(0.4);
		expect(standings[0].posterUrl).toBe('/one-piece.jpg');
	});

	it('shares add up to the whole map', () => {
		const standings = buildShowStandings(
			new Map([
				['a', ONE_PIECE],
				['b', DBZ],
				['c', NARUTO]
			])
		);
		expect(standings.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1);
	});

	it('breaks a tie on name', () => {
		const standings = buildShowStandings(
			new Map([
				['a', NARUTO],
				['b', DBZ]
			])
		);
		expect(standings.map((row) => row.name)).toEqual(['Dragon Ball Z', 'Naruto']);
	});

	it('is empty for a map with no shows', () => {
		expect(buildShowStandings(new Map())).toEqual([]);
	});
});
