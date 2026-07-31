import { describe, it, expect } from 'vitest';
import { ownedAvatarKeys, ownedSpawnKeys, spawnKey } from '$utils/spawn/owned';
import { avatarKey } from '$utils/spawn/avatar';
import { SpawnBox, SpawnColor, type CharacterSpawn } from '$types/character-spawn.type';
import type { PlayerAvatar } from '$types/player-avatar.type';

function spawn(
	characterId: string,
	color: SpawnColor,
	locationId = 'ES_08028'
): CharacterSpawn {
	return {
		id: crypto.randomUUID(),
		userId: 'player-1',
		characterId,
		showId: 1399,
		locationId,
		color,
		box: SpawnBox.Black,
		teamSlot: null,
		createdAt: '2026-07-28T00:00:00.000Z'
	};
}

function avatar(characterId: string, color: SpawnColor, locationId = 'ES_08028'): PlayerAvatar {
	return {
		id: crypto.randomUUID(),
		userId: 'player-1',
		characterId,
		color,
		showId: 1399,
		locationId,
		grantedAt: '2026-07-28T00:00:00.000Z'
	};
}

describe('spawnKey', () => {
	it('is the character, the colour and the town together', () => {
		expect(spawnKey('ryu', SpawnColor.Red, 'ES_08028')).toBe('ryu|red|ES_08028');
	});

	it('tells two cards apart on any one of the three', () => {
		const base = spawnKey('ryu', SpawnColor.Red, 'ES_08028');
		expect(spawnKey('ken', SpawnColor.Red, 'ES_08028')).not.toBe(base);
		expect(spawnKey('ryu', SpawnColor.Blue, 'ES_08028')).not.toBe(base);
		expect(spawnKey('ryu', SpawnColor.Red, 'ES_43148')).not.toBe(base);
	});
});

describe('ownedSpawnKeys', () => {
	it('is what a freshly pulled card is checked against', () => {
		const held = ownedSpawnKeys([
			spawn('ryu', SpawnColor.Red),
			spawn('ryu', SpawnColor.Red), // a duplicate is one holding
			spawn('ken', SpawnColor.Green, 'ES_43148')
		]);
		expect(held.size).toBe(2);

		// Held: same character, colour and town.
		expect(held.has(spawnKey('ryu', SpawnColor.Red, 'ES_08028'))).toBe(true);
		// New: the same fighter in the same colour, claimed somewhere else.
		expect(held.has(spawnKey('ryu', SpawnColor.Red, 'ES_43148'))).toBe(false);
		// New: the same fighter in the same town, in another colour.
		expect(held.has(spawnKey('ryu', SpawnColor.Blue, 'ES_08028'))).toBe(false);
		// New: never held at all.
		expect(held.has(spawnKey('akuma', SpawnColor.Red, 'ES_08028'))).toBe(false);
	});

	it('holds nothing for a player with no cards', () => {
		expect(ownedSpawnKeys([]).size).toBe(0);
	});
});

describe('ownedAvatarKeys', () => {
	it('is the character and the colour, and never the town', () => {
		const held = ownedAvatarKeys([
			avatar('ryu', SpawnColor.Red, 'ES_08028'),
			avatar('ken', SpawnColor.Green, 'ES_43148')
		]);

		expect(held.has(avatarKey('ryu', SpawnColor.Red))).toBe(true);
		// A portrait is not a claim on anywhere: the same pair dealt by another town's
		// box is one the player already has.
		expect(held.size).toBe(2);
		expect(held.has(avatarKey('ryu', SpawnColor.Blue))).toBe(false);
		expect(held.has(avatarKey('akuma', SpawnColor.Red))).toBe(false);
	});

	it('holds nothing for a player with no avatars', () => {
		expect(ownedAvatarKeys([]).size).toBe(0);
	});
});
