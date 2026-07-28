import { describe, it, expect } from 'vitest';
import { teamShowId, showIdsByCharacter } from '$utils/spawn/team-show';

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
