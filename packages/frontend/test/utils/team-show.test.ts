import { describe, it, expect } from 'vitest';
import { teamShowName } from '$utils/spawn/team-show';

const SHOWS = new Map<string, string[]>([
	['luffy', ['One Piece']],
	['zoro', ['One Piece']],
	['goku', ['Dragon Ball', 'Dragon Ball Z']],
	['vegeta', ['Dragon Ball Z']]
]);

describe('teamShowName', () => {
	it('names the show most of the team belongs to', () => {
		expect(teamShowName(['goku', 'vegeta', 'luffy'], SHOWS)).toBe('Dragon Ball Z');
	});

	it('counts every show a character belongs to', () => {
		expect(teamShowName(['goku'], SHOWS)).toBe('Dragon Ball');
	});

	it('breaks a tie in favour of the earliest member', () => {
		expect(teamShowName(['luffy', 'vegeta'], SHOWS)).toBe('One Piece');
		expect(teamShowName(['vegeta', 'luffy'], SHOWS)).toBe('Dragon Ball Z');
	});

	it('returns null for an empty team or one with no assigned show', () => {
		expect(teamShowName([], SHOWS)).toBeNull();
		expect(teamShowName(['unknown'], SHOWS)).toBeNull();
	});
});
