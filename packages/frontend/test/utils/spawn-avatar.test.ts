import { describe, it, expect } from 'vitest';
import {
	AVATAR_COLOR_SET_SIZE,
	PRIDE_SPAWN_COLORS,
	SPAWN_COLORS,
	avatarCharacterIds,
	ownedColorsByCharacter
} from '$utils/spawn/avatar';
import { SpawnColor, type CharacterSpawn } from '$types/character-spawn.type';

function spawn(characterId: string, color: SpawnColor, id = crypto.randomUUID()): CharacterSpawn {
	return {
		id,
		userId: 'player-1',
		characterId,
		showId: null,
		locationId: 'ES_08028',
		color,
		createdAt: '2026-07-28T00:00:00.000Z'
	};
}

/** One card of `characterId` in every colour — a completed set. */
function fullSet(characterId: string): CharacterSpawn[] {
	return SPAWN_COLORS.map((color) => spawn(characterId, color));
}

describe('avatar colour-set ownership', () => {
	it('counts all six spawn colours', () => {
		expect(AVATAR_COLOR_SET_SIZE).toBe(6);
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

	it('groups the colours a player holds per character, ignoring duplicates', () => {
		const owned = ownedColorsByCharacter([
			spawn('ryu', SpawnColor.Red),
			spawn('ryu', SpawnColor.Red),
			spawn('ryu', SpawnColor.Blue),
			spawn('ken', SpawnColor.Green)
		]);
		expect(owned.get('ryu')).toEqual(new Set([SpawnColor.Red, SpawnColor.Blue]));
		expect(owned.get('ken')).toEqual(new Set([SpawnColor.Green]));
		expect(owned.has('akuma')).toBe(false);
	});

	it('unlocks only characters held in every colour', () => {
		const unlocked = avatarCharacterIds([
			...fullSet('ryu'),
			...SPAWN_COLORS.slice(0, 5).map((color) => spawn('ken', color))
		]);
		expect(unlocked.has('ryu')).toBe(true);
		expect(unlocked.has('ken')).toBe(false);
	});

	it('does not unlock a character from duplicates of the same colour', () => {
		const unlocked = avatarCharacterIds(
			Array.from({ length: 20 }, () => spawn('ryu', SpawnColor.Red))
		);
		expect(unlocked.size).toBe(0);
	});

	it('unlocks nothing for a player with no cards', () => {
		expect(avatarCharacterIds([]).size).toBe(0);
	});
});
