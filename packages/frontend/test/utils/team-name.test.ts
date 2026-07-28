import { describe, it, expect } from 'vitest';
import { teamDisplayName, UNNAMED_TEAM_LABEL } from '$utils/spawn/team-name';

describe('teamDisplayName', () => {
	it('keeps the team its own name when it has one', () => {
		expect(teamDisplayName('Els Segadors', { showName: 'One Piece', color: 'red' })).toBe(
			'Els Segadors'
		);
	});

	it('names an unnamed team after its lead: show then colour', () => {
		expect(teamDisplayName('', { showName: 'One Piece', color: 'red' })).toBe('One Piece Red');
		expect(teamDisplayName(null, { showName: 'Dragon Ball Z', color: 'purple' })).toBe(
			'Dragon Ball Z Purple'
		);
	});

	it('falls back to whichever fact the lead has', () => {
		expect(teamDisplayName('', { showName: null, color: 'green' })).toBe('Green');
		expect(teamDisplayName('', { showName: 'One Piece', color: null })).toBe('One Piece');
	});

	it('reads as the empty label with no lead at all', () => {
		expect(teamDisplayName('', null)).toBe(UNNAMED_TEAM_LABEL);
		expect(teamDisplayName('   ', { showName: '  ', color: null })).toBe(UNNAMED_TEAM_LABEL);
	});
});
