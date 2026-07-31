import { describe, it, expect } from 'vitest';
import { teamShowId, showIdsByCharacter, holderShowIds } from '$utils/spawn/team-show';

// One Piece (1) and Dragon Ball Z (2), with Goku also in Dragon Ball (3).
const CHARACTERS_BY_SHOW = new Map<number, string[]>([
	[1, ['luffy', 'sanji']],
	[2, ['goku', 'vegeta']],
	[3, ['goku']]
]);

const BY_CHARACTER = showIdsByCharacter(CHARACTERS_BY_SHOW);

describe('showIdsByCharacter', () => {
	it('reverses the assignment, keeping every show a character belongs to', () => {
		expect(BY_CHARACTER.get('luffy')).toEqual([1]);
		expect(BY_CHARACTER.get('goku')).toEqual([2, 3]);
		expect(BY_CHARACTER.has('unknown')).toBe(false);
	});
});

describe('teamShowId', () => {
	it("is the lead's show, whatever the rest of the team is", () => {
		expect(teamShowId(['sanji', 'goku', 'vegeta'], BY_CHARACTER)).toBe(1);
		expect(teamShowId(['vegeta', 'sanji', 'luffy'], BY_CHARACTER)).toBe(2);
	});

	it('takes the first of a lead that belongs to several shows', () => {
		expect(teamShowId(['goku', 'luffy'], BY_CHARACTER)).toBe(2);
	});

	it('is null when the team is empty or its lead has no show', () => {
		expect(teamShowId([], BY_CHARACTER)).toBeNull();
		expect(teamShowId(['unknown', 'sanji'], BY_CHARACTER)).toBeNull();
	});
});

// A holder row as the map and the claim panel read it: the town, and the team that
// took it in fielded order.
function held(locationId: string, ...characterIds: string[]) {
	return { locationId, team: characterIds.map((characterId) => ({ characterId })) };
}

describe('holderShowIds', () => {
	it('gives each held town its occupying lead’s show', () => {
		const shows = holderShowIds(
			[held('ES_08019', 'luffy', 'goku'), held('ES_25001', 'vegeta')],
			BY_CHARACTER
		);
		expect(shows.get('ES_08019')).toBe(1);
		expect(shows.get('ES_25001')).toBe(2);
	});

	it('leaves out a town whose lead belongs to no show, and an empty team', () => {
		const shows = holderShowIds([held('ES_08019', 'unknown'), held('ES_25001')], BY_CHARACTER);
		expect(shows.size).toBe(0);
	});

	it('re-derives from the holders it is given, so a town that flips flies the new show', () => {
		const before = holderShowIds([held('ES_08019', 'luffy')], BY_CHARACTER);
		const after = holderShowIds([held('ES_08019', 'vegeta')], BY_CHARACTER);
		expect(before.get('ES_08019')).toBe(1);
		expect(after.get('ES_08019')).toBe(2);
	});
});
