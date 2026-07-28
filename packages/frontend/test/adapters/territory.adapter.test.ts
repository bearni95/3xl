import { describe, it, expect } from 'vitest';
import { territoryAdapter } from '$adapters/classes/territory.adapter';
import {
	requiredWins,
	siegeProgress,
	type MunicipalityHolder,
	type MunicipalityHolderRow,
	type MunicipalitySiege
} from '$types/territory.type';
import { SpawnColor } from '$types/character-spawn.type';

const row = (overrides: Partial<MunicipalityHolderRow> = {}): MunicipalityHolderRow => ({
	location_id: 'ES_08028',
	user_id: 'user-1',
	holder_name: 'Bernat',
	team: [
		{ character_id: 'luffy', color: 'purple' },
		{ character_id: 'zoro', color: 'red' }
	],
	turnover: 2,
	taken_at: '2026-07-27T10:00:00.000Z',
	...overrides
});

describe('territoryAdapter.fromHolderRow', () => {
	it('maps a holder row into the internal model', () => {
		const holder = territoryAdapter.fromHolderRow(row());
		expect(holder).toEqual({
			locationId: 'ES_08028',
			userId: 'user-1',
			holderName: 'Bernat',
			team: [
				{ characterId: 'luffy', color: SpawnColor.Purple },
				{ characterId: 'zoro', color: SpawnColor.Red }
			],
			turnover: 2,
			takenAt: '2026-07-27T10:00:00.000Z'
		});
	});

	it('names an account that never set a username', () => {
		expect(territoryAdapter.fromHolderRow(row({ holder_name: null })).holderName).toBe('Un jugador');
		expect(territoryAdapter.fromHolderRow(row({ holder_name: '   ' })).holderName).toBe(
			'Un jugador'
		);
	});

	it('reads turnover back as a non-negative integer, whatever the wire shape', () => {
		expect(territoryAdapter.fromHolderRow(row({ turnover: '3' })).turnover).toBe(3);
		expect(territoryAdapter.fromHolderRow(row({ turnover: null })).turnover).toBe(0);
		expect(territoryAdapter.fromHolderRow(row({ turnover: -5 })).turnover).toBe(0);
	});

	it('drops team entries that carry no usable character id', () => {
		const holder = territoryAdapter.fromHolderRow(
			row({ team: [{ character_id: 'luffy', color: 'red' }, { color: 'red' }, null, 7] })
		);
		expect(holder.team).toHaveLength(1);
		expect(holder.team[0].characterId).toBe('luffy');
	});

	it('falls back on an unusable colour, as a spawn would', () => {
		const holder = territoryAdapter.fromHolderRow(
			row({ team: [{ character_id: 'luffy', color: 'chartreuse' }] })
		);
		expect(holder.team[0].color).toBe(SpawnColor.Red);
	});

	it('treats a non-array team as no team at all', () => {
		expect(territoryAdapter.fromHolderRow(row({ team: null })).team).toEqual([]);
		expect(territoryAdapter.fromHolderRow(row({ team: 'nope' })).team).toEqual([]);
	});
});

describe('territoryAdapter.fromSiegeRow', () => {
	it('maps a siege row, coercing the counts', () => {
		expect(
			territoryAdapter.fromSiegeRow({
				location_id: 'ES_08028',
				user_id: 'user-2',
				wins: '2',
				turnover: '1'
			})
		).toEqual({ locationId: 'ES_08028', userId: 'user-2', wins: 2, turnover: 1 });
	});

	it('reads a missing count as zero', () => {
		const siege = territoryAdapter.fromSiegeRow({
			location_id: 'ES_08028',
			user_id: 'user-2',
			wins: null,
			turnover: null
		});
		expect(siege.wins).toBe(0);
		expect(siege.turnover).toBe(0);
	});
});

describe('territoryAdapter.toTeamRolls', () => {
	it('projects a holder team into the shape the map already renders seeded teams in', () => {
		const holder = territoryAdapter.fromHolderRow(row());
		expect(territoryAdapter.toTeamRolls(holder.team)).toEqual([
			{ characterId: 'luffy', color: SpawnColor.Purple },
			{ characterId: 'zoro', color: SpawnColor.Red }
		]);
	});
});

describe('requiredWins', () => {
	it('takes one win off a town nobody has taken yet', () => {
		expect(requiredWins(0)).toBe(1);
	});

	it('adds a win for every time the town has changed hands', () => {
		expect(requiredWins(1)).toBe(2);
		expect(requiredWins(2)).toBe(3);
		expect(requiredWins(9)).toBe(10);
	});

	it('never falls below a single win', () => {
		expect(requiredWins(-3)).toBe(1);
	});
});

describe('siegeProgress', () => {
	const holder = (turnover: number): MunicipalityHolder => ({
		locationId: 'ES_08028',
		userId: 'user-1',
		holderName: 'Bernat',
		team: [],
		turnover,
		takenAt: '2026-07-27T10:00:00.000Z'
	});
	const siege = (wins: number, turnover: number): MunicipalitySiege => ({
		locationId: 'ES_08028',
		userId: 'user-2',
		wins,
		turnover
	});
	const holders = (h?: MunicipalityHolder) => new Map(h ? [[h.locationId, h]] : []);
	const sieges = (s?: MunicipalitySiege) => new Map(s ? [[s.locationId, s]] : []);

	it('asks a single win of a town still on its seeded team', () => {
		expect(siegeProgress('ES_08028', holders(), sieges())).toEqual({
			wins: 0,
			required: 1,
			turnover: 0
		});
	});

	it('raises the bar by one for every time the town has changed hands', () => {
		expect(siegeProgress('ES_08028', holders(holder(3)), sieges()).required).toBe(4);
	});

	it('counts wins banked against the sitting generation', () => {
		expect(siegeProgress('ES_08028', holders(holder(2)), sieges(siege(2, 2)))).toEqual({
			wins: 2,
			required: 3,
			turnover: 2
		});
	});

	it('discards wins banked against a team that no longer holds the town', () => {
		// Two wins earned while the town was on turnover 1; it has flipped since.
		expect(siegeProgress('ES_08028', holders(holder(2)), sieges(siege(2, 1))).wins).toBe(0);
	});

	it('discards wins banked against a seeded team that has since been beaten', () => {
		expect(siegeProgress('ES_08028', holders(holder(1)), sieges(siege(1, 0))).wins).toBe(0);
	});

	it('reads a town nobody has touched as no progress at all', () => {
		expect(siegeProgress('ES_17999', holders(holder(4)), sieges(siege(3, 4)))).toEqual({
			wins: 0,
			required: 1,
			turnover: 0
		});
	});
});

describe('territoryAdapter.fromChallengeRow', () => {
	it('maps a spent challenge row into the internal model', () => {
		expect(
			territoryAdapter.fromChallengeRow({
				location_id: 'ES_08028',
				challenge_date: '2026-07-28',
				started_at: '2026-07-28T09:30:00.000Z',
				settled_at: '2026-07-28T09:41:00.000Z'
			})
		).toEqual({
			locationId: 'ES_08028',
			date: '2026-07-28',
			startedAt: '2026-07-28T09:30:00.000Z',
			settledAt: '2026-07-28T09:41:00.000Z'
		});
	});

	it('reads a challenge started but never reported as unsettled', () => {
		const challenge = territoryAdapter.fromChallengeRow({
			location_id: 'ES_17999',
			challenge_date: '2026-07-28',
			started_at: '2026-07-28T09:30:00.000Z',
			settled_at: null
		});
		// The day is spent either way — an open slot still closes the town off.
		expect(challenge.settledAt).toBeNull();
		expect(challenge.date).toBe('2026-07-28');
	});
});
