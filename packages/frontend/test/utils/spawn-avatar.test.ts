import { describe, it, expect } from 'vitest';
import {
	PRIDE_SPAWN_COLORS,
	SPAWN_COLORS,
	avatarKey,
	avatarsByCharacter,
	avatarsByShow,
	isWornAvatar
} from '$utils/spawn/avatar';
import { SpawnColor } from '$types/character-spawn.type';
import type { PlayerAvatar } from '$types/player-avatar.type';

function avatar(characterId: string, color: SpawnColor, id = crypto.randomUUID()): PlayerAvatar {
	return {
		id,
		userId: 'player-1',
		characterId,
		color,
		showId: 1399,
		locationId: 'ES_08028',
		grantedAt: '2026-07-28T00:00:00.000Z'
	};
}

describe('avatar colours', () => {
	it('knows all six spawn colours', () => {
		expect([...SPAWN_COLORS].sort()).toEqual([...Object.values(SpawnColor)].sort());
	});

	it('lays the same six colours out in rainbow order for the picker', () => {
		expect(PRIDE_SPAWN_COLORS).toEqual([
			SpawnColor.Red,
			SpawnColor.Orange,
			SpawnColor.Yellow,
			SpawnColor.Green,
			SpawnColor.Blue,
			SpawnColor.Purple
		]);
		expect([...PRIDE_SPAWN_COLORS].sort()).toEqual([...SPAWN_COLORS].sort());
	});
});

describe('avatarKey', () => {
	it('names an avatar by the pair it is, not by its row', () => {
		expect(avatarKey('ryu', SpawnColor.Red)).toBe('ryu:red');
		// The same pair dealt twice is the same avatar, whatever row id it arrived on.
		const [first, second] = [avatar('ryu', SpawnColor.Red), avatar('ryu', SpawnColor.Red)];
		expect(first.id).not.toBe(second.id);
		expect(avatarKey(first.characterId, first.color)).toBe(
			avatarKey(second.characterId, second.color)
		);
		// Neither half alone decides it.
		expect(avatarKey('ryu', SpawnColor.Blue)).not.toBe(avatarKey('ryu', SpawnColor.Red));
		expect(avatarKey('ken', SpawnColor.Red)).not.toBe(avatarKey('ryu', SpawnColor.Red));
	});
});

describe('isWornAvatar', () => {
	const red = avatar('ryu', SpawnColor.Red);

	it('matches only on both halves together', () => {
		expect(isWornAvatar(red, 'ryu', SpawnColor.Red)).toBe(true);
		expect(isWornAvatar(red, 'ryu', SpawnColor.Blue)).toBe(false);
		expect(isWornAvatar(red, 'ken', SpawnColor.Red)).toBe(false);
	});

	it('matches nothing when the player is on the letter avatar', () => {
		expect(isWornAvatar(red, null, null)).toBe(false);
		expect(isWornAvatar(red, 'ryu', null)).toBe(false);
		expect(isWornAvatar(red, null, SpawnColor.Red)).toBe(false);
	});
});

describe('avatarsByCharacter', () => {
	it('groups a collection by the character each portrait shows', () => {
		const held = avatarsByCharacter([
			avatar('ryu', SpawnColor.Red),
			avatar('ryu', SpawnColor.Blue),
			avatar('ken', SpawnColor.Green)
		]);
		expect(held.get('ryu')?.map((one) => one.color)).toEqual([SpawnColor.Red, SpawnColor.Blue]);
		expect(held.get('ken')?.map((one) => one.color)).toEqual([SpawnColor.Green]);
		expect(held.has('akuma')).toBe(false);
	});

	it("lays each character's own out in rainbow order, whatever order they arrived in", () => {
		const held = avatarsByCharacter([
			avatar('ryu', SpawnColor.Purple),
			avatar('ryu', SpawnColor.Yellow),
			avatar('ryu', SpawnColor.Red),
			avatar('ryu', SpawnColor.Green)
		]);
		expect(held.get('ryu')?.map((one) => one.color)).toEqual([
			SpawnColor.Red,
			SpawnColor.Yellow,
			SpawnColor.Green,
			SpawnColor.Purple
		]);
	});

	it('groups nothing for a player who holds no avatars', () => {
		expect(avatarsByCharacter([]).size).toBe(0);
	});
});

describe('avatarsByShow', () => {
	const shows = new Map([
		['ryu', [{ id: 2, name: 'Street Fighter' }]],
		['ken', [{ id: 2, name: 'Street Fighter' }]],
		['luffy', [{ id: 1, name: 'One Piece' }]]
	]);

	it('puts every avatar of a show in one grid, the shows in name order', () => {
		const groups = avatarsByShow(
			[
				avatar('ryu', SpawnColor.Blue),
				avatar('luffy', SpawnColor.Red),
				avatar('ken', SpawnColor.Green)
			],
			['ryu', 'ken', 'luffy'],
			shows
		);
		expect(groups.map((group) => group.show?.name)).toEqual(['One Piece', 'Street Fighter']);
		expect(groups[1].avatars.map((one) => one.characterId)).toEqual(['ryu', 'ken']);
	});

	it('keeps the characters in the order given and their colours in rainbow order', () => {
		const groups = avatarsByShow(
			[
				avatar('ken', SpawnColor.Purple),
				avatar('ryu', SpawnColor.Green),
				avatar('ryu', SpawnColor.Red)
			],
			['ryu', 'ken'],
			shows
		);
		expect(groups[0].avatars.map((one) => avatarKey(one.characterId, one.color))).toEqual([
			'ryu:red',
			'ryu:green',
			'ken:purple'
		]);
	});

	it('groups a character no show claims last, under no show at all', () => {
		const groups = avatarsByShow(
			[avatar('akuma', SpawnColor.Red), avatar('luffy', SpawnColor.Red)],
			['akuma', 'luffy'],
			shows
		);
		expect(groups.map((group) => group.show?.name ?? null)).toEqual(['One Piece', null]);
		expect(groups[1].avatars.map((one) => one.characterId)).toEqual(['akuma']);
	});

	it('reads a character in two shows as being in the first, so its colours stay together', () => {
		const groups = avatarsByShow(
			[avatar('goku', SpawnColor.Red), avatar('goku', SpawnColor.Blue)],
			['goku'],
			new Map([
				[
					'goku',
					[
						{ id: 3, name: 'Dragon Ball GT' },
						{ id: 4, name: 'Dragon Ball Z' }
					]
				]
			])
		);
		expect(groups).toHaveLength(1);
		expect(groups[0].show?.name).toBe('Dragon Ball GT');
		expect(groups[0].avatars).toHaveLength(2);
	});

	it('leaves out avatars of characters the registry cannot draw', () => {
		const groups = avatarsByShow([avatar('nobody', SpawnColor.Red)], ['ryu', 'luffy'], shows);
		expect(groups).toEqual([]);
	});

	it('groups nothing for a player who holds no avatars', () => {
		expect(avatarsByShow([], ['ryu'], shows)).toEqual([]);
	});
});
