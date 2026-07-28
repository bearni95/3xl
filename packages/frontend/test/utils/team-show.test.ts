import { describe, it, expect } from 'vitest';
import { teamShowId, showIdsByCharacter } from '$utils/spawn/team-show';

// One Piece (1) and Dragon Ball Z (2), with Goku also in Dragon Ball (3).
const CHARACTERS_BY_SHOW = new Map<number, string[]>([
	[1, ['luffy', 'zoro']],
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
	it('names the show most of the team belongs to', () => {
		expect(teamShowId(['goku', 'vegeta', 'luffy'], BY_CHARACTER)).toBe(2);
	});

	it('breaks a tie in favour of the earliest member', () => {
		expect(teamShowId(['luffy', 'vegeta'], BY_CHARACTER)).toBe(1);
		expect(teamShowId(['vegeta', 'luffy'], BY_CHARACTER)).toBe(2);
	});

	it('returns null for an empty team or one with no assigned show', () => {
		expect(teamShowId([], BY_CHARACTER)).toBeNull();
		expect(teamShowId(['unknown'], BY_CHARACTER)).toBeNull();
	});
});
