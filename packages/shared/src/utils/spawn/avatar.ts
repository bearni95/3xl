import { SpawnColor } from '../../types/character-spawn.type';
import type { PlayerAvatar } from '../../types/player-avatar.type';
import { SPAWN_COLOR_WEIGHTS } from './color';

/**
 * Every spawn colour, in pool order (the three primaries, then the three
 * secondaries). Derived from {@link SPAWN_COLOR_WEIGHTS} so the two can't drift.
 */
export const SPAWN_COLORS: readonly SpawnColor[] = SPAWN_COLOR_WEIGHTS.map(([color]) => color);

/**
 * The same six colours in rainbow (pride flag) order — red through purple, the
 * order the picker lays one character's avatars out in so a half-collected
 * character reads as a flag with gaps rather than as an arbitrary row of
 * portraits.
 */
export const PRIDE_SPAWN_COLORS: readonly SpawnColor[] = [
	SpawnColor.Red,
	SpawnColor.Orange,
	SpawnColor.Yellow,
	SpawnColor.Green,
	SpawnColor.Blue,
	SpawnColor.Purple
];

/** Where a colour sits in {@link PRIDE_SPAWN_COLORS} (unknown colours sort last). */
function prideIndex(color: SpawnColor): number {
	const index = PRIDE_SPAWN_COLORS.indexOf(color);
	return index === -1 ? PRIDE_SPAWN_COLORS.length : index;
}

/**
 * The one thing an avatar *is*: its character and its colour, as a single string.
 *
 * A player's profile stores the pair rather than a row id, so "the avatar I am
 * wearing" and "the avatar in this tile" are compared by what they are, not by
 * which row happened to be dealt — and a screen can key a list by it.
 */
export function avatarKey(characterId: string, color: SpawnColor | string): string {
	return `${characterId}:${color}`;
}

/**
 * Whether `avatar` is the pair a profile is wearing. Null on either half means
 * the player is on the initial-letter avatar, which no owned avatar matches.
 */
export function isWornAvatar(
	avatar: PlayerAvatar,
	characterId: string | null,
	color: SpawnColor | null
): boolean {
	if (!characterId || !color) return false;
	return avatar.characterId === characterId && avatar.color === color;
}

/**
 * The player's avatars grouped by the character they show, each character's own
 * in rainbow order. The map keeps insertion order, so a caller that wants the
 * characters themselves in a particular order (the registry's, say) walks that
 * order and looks each one up rather than reading this back.
 */
export function avatarsByCharacter(
	avatars: readonly PlayerAvatar[]
): Map<string, PlayerAvatar[]> {
	const byCharacter = new Map<string, PlayerAvatar[]>();
	for (const avatar of avatars) {
		const held = byCharacter.get(avatar.characterId) ?? [];
		held.push(avatar);
		byCharacter.set(avatar.characterId, held);
	}
	for (const held of byCharacter.values()) {
		held.sort((a, b) => prideIndex(a.color) - prideIndex(b.color));
	}
	return byCharacter;
}

/** One show's worth of a player's avatars — `show` null for the shows-unknown group. */
export interface AvatarShowGroup {
	show: { id: number; name: string } | null;
	avatars: PlayerAvatar[];
}

/**
 * The player's avatars grouped by the **show** their character belongs to: one grid
 * per show, shows in name order, and the group for characters no show claims last.
 *
 * A character's show is its first in `showsByCharacter` — the same rule a statue's
 * floor glyph and the roster's show filter read, so a character sits under the same
 * show wherever the game says which show it is from. That also keeps the colours of
 * one character together in one group, which a per-avatar `showId` (the box that
 * dealt it) would split as soon as two shows shared a character.
 *
 * `characterOrder` is the registry's ids: it both orders the characters inside a
 * group and decides which are shown at all, since an avatar of a character the
 * local registry cannot draw would be an empty square that still saves. Each
 * character's own colours stay in rainbow order.
 */
export function avatarsByShow(
	avatars: readonly PlayerAvatar[],
	characterOrder: readonly string[],
	showsByCharacter: ReadonlyMap<string, readonly { id: number; name: string }[]>
): AvatarShowGroup[] {
	const held = avatarsByCharacter(avatars);
	const groups = new Map<number | null, AvatarShowGroup>();

	for (const characterId of characterOrder) {
		const own = held.get(characterId);
		if (!own?.length) continue;
		const show = showsByCharacter.get(characterId)?.[0] ?? null;
		const group = groups.get(show?.id ?? null) ?? { show, avatars: [] };
		group.avatars.push(...own);
		groups.set(show?.id ?? null, group);
	}

	return [...groups.values()].sort((a, b) => {
		if (!a.show) return 1;
		if (!b.show) return -1;
		return a.show.name.localeCompare(b.show.name);
	});
}
