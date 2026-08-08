import { describe, it, expect } from 'vitest';
import { territoryAdapter } from '$adapters/classes/territory.adapter';
import {
	challengeAvailableAt,
	challengeCoolingDown,
	requiredWins,
	siegeProgress,
	type MunicipalityChallenge,
	type MunicipalityHolder,
	type MunicipalityHolderRow,
	type MunicipalitySiege
} from '$types/territory.type';
import { SpawnColor } from '$types/character-spawn.type';
import { levelForExp } from '$utils/progression/level';

const row = (overrides: Partial<MunicipalityHolderRow> = {}): MunicipalityHolderRow => ({
	location_id: 'ES_08028',
	user_id: 'user-1',
	holder_name: 'Bernat',
	team: [
		{ character_id: 'luffy', color: 'purple', location_id: 'ES_08019' },
		{ character_id: 'zoro', color: 'red', location_id: 'ES_17079' }
	],
	turnover: 2,
	taken_at: '2026-07-27T10:00:00.000Z',
	avatar_character_id: 'nami',
	avatar_color: 'blue',
	exp: 0,
	...overrides
});

describe('territoryAdapter.fromHolderRow', () => {
	it('maps a holder row into the internal model', () => {
		const holder = territoryAdapter.fromHolderRow(row());
		expect(holder).toEqual({
			locationId: 'ES_08028',
			userId: 'user-1',
			holderName: 'Bernat',
			avatarCharacterId: 'nami',
			avatarColor: SpawnColor.Blue,
			team: [
				{ characterId: 'luffy', color: SpawnColor.Purple, locationId: 'ES_08019' },
				{ characterId: 'zoro', color: SpawnColor.Red, locationId: 'ES_17079' }
			],
			level: 1,
			turnover: 2,
			takenAt: '2026-07-27T10:00:00.000Z'
		});
	});

	it('works the level out of the experience rather than reading one', () => {
		// The level is never stored — here or on a profile — so what the view joins on is
		// the experience and this is where it becomes a level. `exp` is a bigint, so it
		// arrives as a string, and a row with no profile behind it at all reads as an
		// account at zero, which is level 1 and not a hole in the band naming them.
		expect(territoryAdapter.fromHolderRow(row({ exp: '3000' })).level).toBe(
			levelForExp(3000)
		);
		expect(territoryAdapter.fromHolderRow(row({ exp: 900 })).level).toBe(levelForExp(900));
		expect(territoryAdapter.fromHolderRow(row({ exp: null })).level).toBe(1);
		expect(territoryAdapter.fromHolderRow(row({ exp: -5 })).level).toBe(1);
	});

	it('reads the worn avatar as the pair it is, or not at all', () => {
		// Half an avatar is none: a character with no colour beside it, or a colour
		// that is not one of the six, leaves the holder on their letter — the same
		// reading the profile adapter gives the very same two columns.
		const bare = territoryAdapter.fromHolderRow(
			row({ avatar_character_id: null, avatar_color: null })
		);
		expect(bare.avatarCharacterId).toBeNull();
		expect(bare.avatarColor).toBeNull();

		const halved = territoryAdapter.fromHolderRow(row({ avatar_color: null }));
		expect(halved.avatarCharacterId).toBeNull();
		expect(halved.avatarColor).toBeNull();

		const nonsense = territoryAdapter.fromHolderRow(row({ avatar_color: 'chartreuse' }));
		expect(nonsense.avatarCharacterId).toBeNull();
		expect(nonsense.avatarColor).toBeNull();

		const colourless = territoryAdapter.fromHolderRow(row({ avatar_character_id: '  ' }));
		expect(colourless.avatarCharacterId).toBeNull();
		expect(colourless.avatarColor).toBeNull();
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

	it('reads a member with no claim town as having none', () => {
		// Rows frozen before the RPC copied the claim across, and cards claimed off
		// the map, arrive alike: whoever draws them falls back to the town they stand on.
		const holder = territoryAdapter.fromHolderRow(
			row({
				team: [
					{ character_id: 'luffy', color: 'red' },
					{ character_id: 'zoro', color: 'red', location_id: 42 }
				]
			})
		);
		expect(holder.team[0].locationId).toBeNull();
		expect(holder.team[1].locationId).toBeNull();
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
			{ characterId: 'luffy', color: SpawnColor.Purple, locationId: 'ES_08019' },
			{ characterId: 'zoro', color: SpawnColor.Red, locationId: 'ES_17079' }
		]);
	});

	it('carries each card away with its own claim town, not the one it took', () => {
		// The whole point: this team holds ES_08028, and neither member is from there.
		const rolls = territoryAdapter.toTeamRolls(territoryAdapter.fromHolderRow(row()).team);
		expect(rolls.map((roll) => roll.locationId)).toEqual(['ES_08019', 'ES_17079']);
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
		avatarCharacterId: null,
		avatarColor: null,
		level: 1,
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
	it('maps a settled challenge row into the internal model', () => {
		expect(
			territoryAdapter.fromChallengeRow({
				location_id: 'ES_08028',
				started_at: '2026-07-28T09:30:00.000Z',
				settled_at: '2026-07-28T09:41:00.000Z',
				available_at: '2026-07-28T10:41:00.000Z'
			})
		).toEqual({
			locationId: 'ES_08028',
			startedAt: '2026-07-28T09:30:00.000Z',
			settledAt: '2026-07-28T09:41:00.000Z',
			availableAt: '2026-07-28T10:41:00.000Z'
		});
	});

	it('reads a challenge started but never reported as unsettled, with no deadline', () => {
		const challenge = territoryAdapter.fromChallengeRow({
			location_id: 'ES_17999',
			started_at: '2026-07-28T09:30:00.000Z',
			settled_at: null,
			available_at: null
		});
		// The wait is measured from the end of the fight, and this one has not ended.
		expect(challenge.settledAt).toBeNull();
		expect(challenge.availableAt).toBeNull();
	});
});

describe('challengeAvailableAt / challengeCoolingDown', () => {
	const challenge = (availableAt: string | null): MunicipalityChallenge => ({
		locationId: 'ES_08028',
		startedAt: '2026-07-28T09:30:00.000Z',
		settledAt: availableAt ? '2026-07-28T09:41:00.000Z' : null,
		availableAt
	});

	const now = Date.parse('2026-07-28T10:00:00.000Z');

	it('reads the deadline the server set as epoch ms', () => {
		expect(challengeAvailableAt(challenge('2026-07-28T10:41:00.000Z'))).toBe(
			Date.parse('2026-07-28T10:41:00.000Z')
		);
	});

	it('has no deadline for a fight still open, or for no challenge at all', () => {
		expect(challengeAvailableAt(challenge(null))).toBeNull();
		expect(challengeAvailableAt(null)).toBeNull();
		expect(challengeAvailableAt(undefined)).toBeNull();
	});

	it('cools down only while the deadline is still ahead', () => {
		expect(challengeCoolingDown(challenge('2026-07-28T10:41:00.000Z'), now)).toBe(true);
		expect(challengeCoolingDown(challenge('2026-07-28T09:59:00.000Z'), now)).toBe(false);
		// The instant it comes due the town is open again, not a second later.
		expect(challengeCoolingDown(challenge('2026-07-28T10:00:00.000Z'), now)).toBe(false);
	});

	it('does not close a town off for a fight that is still open', () => {
		// The open battle is what holds that player; this town is not also shut.
		expect(challengeCoolingDown(challenge(null), now)).toBe(false);
	});

	it('ignores a deadline that is not a date', () => {
		expect(challengeCoolingDown(challenge('whenever'), now)).toBe(false);
	});
});
