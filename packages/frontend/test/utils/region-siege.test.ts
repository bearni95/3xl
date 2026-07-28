import { describe, expect, it } from 'vitest';
import { buildRegionSieges } from '$utils/geo/region-siege';
import { regionRowsForSelection, type RegionNode } from '$utils/geo/region-tree';
import type { MunicipalityHolder, MunicipalitySiege } from '$types/territory.type';

// territory → comarca → two towns, plus a second comarca with one town, so a
// grouping's counter can be checked against the towns under it.
const nodes: RegionNode[] = [
	{
		key: 'catalunya',
		name: 'Catalunya',
		type: 'Territory',
		children: [
			{
				key: 'catalunya/barcelones',
				name: 'Barcelonès',
				type: 'Comarca',
				children: [
					{ key: 'ES_08019', name: 'Barcelona', type: 'Municipality', children: [] },
					{ key: 'ES_08073', name: "L'Hospitalet", type: 'Municipality', children: [] }
				]
			},
			{
				key: 'catalunya/valles',
				name: 'Vallès',
				type: 'Comarca',
				children: [{ key: 'ES_08187', name: 'Sabadell', type: 'Municipality', children: [] }]
			}
		]
	}
];

function holder(locationId: string, turnover: number): MunicipalityHolder {
	return { locationId, userId: 'u1', holderName: 'Someone', team: [], turnover, takenAt: '2026-01-01' };
}

function siege(locationId: string, wins: number, turnover: number): MunicipalitySiege {
	return { locationId, userId: 'u2', wins, turnover };
}

describe('buildRegionSieges', () => {
	it('reads an untaken town as needing a single win, with none banked', () => {
		const totals = buildRegionSieges(nodes, new Map(), new Map());
		expect(totals.get('ES_08019')).toEqual({ wins: 0, required: 1 });
	});

	it('takes the required count from the town holder record over the seeded fallback', () => {
		const totals = buildRegionSieges(nodes, new Map([['ES_08019', holder('ES_08019', 3)]]), new Map());
		// Held and flipped three times: four wins to shift it, against one for its untaken neighbour.
		expect(totals.get('ES_08019')).toEqual({ wins: 0, required: 4 });
		expect(totals.get('ES_08073')).toEqual({ wins: 0, required: 1 });
	});

	it('banks the reader wins only against the generation currently sitting on the town', () => {
		const holders = new Map([['ES_08019', holder('ES_08019', 2)]]);
		const current = buildRegionSieges(nodes, holders, new Map([['ES_08019', siege('ES_08019', 2, 2)]]));
		expect(current.get('ES_08019')).toEqual({ wins: 2, required: 3 });

		// Wins earned off a team that has since been replaced count for nothing.
		const stale = buildRegionSieges(nodes, holders, new Map([['ES_08019', siege('ES_08019', 2, 1)]]));
		expect(stale.get('ES_08019')).toEqual({ wins: 0, required: 3 });
	});

	it('sums every town beneath a grouping, all the way up', () => {
		const holders = new Map([
			['ES_08019', holder('ES_08019', 3)],
			['ES_08187', holder('ES_08187', 1)]
		]);
		const sieges = new Map([
			['ES_08019', siege('ES_08019', 2, 3)],
			['ES_08187', siege('ES_08187', 1, 1)]
		]);
		const totals = buildRegionSieges(nodes, holders, sieges);

		// 4 + 1 for the two Barcelonès towns, 2 for Sabadell.
		expect(totals.get('catalunya/barcelones')).toEqual({ wins: 2, required: 5 });
		expect(totals.get('catalunya/valles')).toEqual({ wins: 1, required: 2 });
		expect(totals.get('catalunya')).toEqual({ wins: 3, required: 7 });
	});
});

describe('regionRowsForSelection', () => {
	it('carries each row its own siege counter', () => {
		const totals = buildRegionSieges(nodes, new Map([['ES_08019', holder('ES_08019', 1)]]), new Map());

		const [territory] = regionRowsForSelection(nodes, null, totals);
		expect(territory.siege).toEqual({ wins: 0, required: 4 });

		const towns = regionRowsForSelection(nodes, 'catalunya/barcelones', totals);
		expect(towns.map((row) => row.siege)).toEqual([
			{ wins: 0, required: 2 },
			{ wins: 0, required: 1 }
		]);
	});

	it('reads as no progress against no towns when the siege map is empty', () => {
		const [territory] = regionRowsForSelection(nodes, null, new Map());
		expect(territory.siege).toEqual({ wins: 0, required: 0 });
	});
});
