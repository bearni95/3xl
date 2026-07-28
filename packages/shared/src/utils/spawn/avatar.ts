import { SpawnColor, type CharacterSpawn } from '../../types/character-spawn.type';
import { SPAWN_COLOR_WEIGHTS } from './color';

/**
 * Every spawn colour, in pool order (the three primaries, then the three
 * secondaries). Derived from {@link SPAWN_COLOR_WEIGHTS} so the two can't drift.
 */
export const SPAWN_COLORS: readonly SpawnColor[] = SPAWN_COLOR_WEIGHTS.map(([color]) => color);

/**
 * The same six colours in rainbow (pride flag) order — red through purple, the
 * order the picker lays the set out in so a half-collected character reads as a
 * flag with gaps rather than as an arbitrary row of swatches.
 */
export const PRIDE_SPAWN_COLORS: readonly SpawnColor[] = [
	SpawnColor.Red,
	SpawnColor.Orange,
	SpawnColor.Yellow,
	SpawnColor.Green,
	SpawnColor.Blue,
	SpawnColor.Purple
];

/**
 * How many distinct colours of one character a player must own before they may
 * wear its portrait: the full set, all six.
 */
export const AVATAR_COLOR_SET_SIZE = SPAWN_COLORS.length;

/**
 * Which colours of each character a player holds, from their claimed spawns.
 * Characters they own no card of are simply absent from the map.
 */
export function ownedColorsByCharacter(
	spawns: readonly CharacterSpawn[]
): Map<string, Set<SpawnColor>> {
	const byCharacter = new Map<string, Set<SpawnColor>>();
	for (const spawn of spawns) {
		if (!spawn.color) continue;
		const colors = byCharacter.get(spawn.characterId) ?? new Set<SpawnColor>();
		colors.add(spawn.color);
		byCharacter.set(spawn.characterId, colors);
	}
	return byCharacter;
}

/**
 * The characters a player has completed the colour set of — the only ones they
 * may wear as a profile picture. The same rule is enforced server-side by the
 * `set_player_avatar` RPC, which is what actually decides; this mirrors it so the
 * picker can lock what would be rejected.
 */
export function avatarCharacterIds(spawns: readonly CharacterSpawn[]): Set<string> {
	const unlocked = new Set<string>();
	for (const [characterId, colors] of ownedColorsByCharacter(spawns)) {
		if (colors.size >= AVATAR_COLOR_SET_SIZE) unlocked.add(characterId);
	}
	return unlocked;
}
