import type { SpawnColor, CharacterSpawn } from '../../types/character-spawn.type';
import type { PlayerAvatar } from '../../types/player-avatar.type';
import { avatarKey } from './avatar';

/**
 * What makes one card *the same card* as another, for the purpose of asking
 * whether a player has it already: the character, the colour it was rolled in,
 * and the town it was claimed in. Not the show — a character may be on several,
 * and the same character in the same colour from the same town is the same
 * holding whichever show's box it fell out of.
 *
 * The place is part of it deliberately. A card is a claim on a town as much as a
 * character, so the same fighter in the same colour from a town the player has
 * never opened a pack in is a new thing to hold, not a duplicate.
 */
export function spawnKey(
	characterId: string,
	color: SpawnColor | string,
	locationId: string
): string {
	return `${characterId}|${color}|${locationId}`;
}

/**
 * The set of cards a player holds, as {@link spawnKey}s — everything a freshly
 * pulled card is checked against to decide whether it is new to them.
 *
 * Take it *before* a pack is opened: `claimBooster` folds its cards into the
 * collection as soon as it answers, and a snapshot taken after would find every
 * card in the pack already owned — by itself.
 */
export function ownedSpawnKeys(spawns: readonly CharacterSpawn[]): Set<string> {
	return new Set(spawns.map((spawn) => spawnKey(spawn.characterId, spawn.color, spawn.locationId)));
}

/**
 * The set of avatars a player holds, as {@link avatarKey}s. An avatar is its
 * character and its colour and nothing else — no place, since a portrait is not a
 * claim on anywhere — so the same pair from another town is one they already have.
 *
 * Snapshot before opening, for the same reason as {@link ownedSpawnKeys}.
 */
export function ownedAvatarKeys(avatars: readonly PlayerAvatar[]): Set<string> {
	return new Set(avatars.map((avatar) => avatarKey(avatar.characterId, avatar.color)));
}
