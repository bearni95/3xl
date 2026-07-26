import type { CharacterSpawn, SpawnColor } from '$types/character-spawn.type';

/**
 * One card revealed by the pack opener: a claimed {@link CharacterSpawn} joined
 * with the display values the reveal card renders (label + face portrait come
 * from the local @3xl/data registry; colour + stat are rolled at claim time and
 * live on the spawn). Purely presentation state — assembled by the claim panel
 * after `spawnService.claimRandom` resolves, then handed to the canvas.
 */
export interface ClaimPull {
	/** The persisted spawn this card represents. */
	spawn: CharacterSpawn;
	/** Human-readable character label from the registry. */
	label: string;
	/**
	 * The character's frames folder (e.g. `/assets/<id>/frames`), used to loop the
	 * idle animation as the revealed card's art. Null when the character has none.
	 */
	basePath: string | null;
	/**
	 * The character's active face portrait URL — the static fallback shown when the
	 * idle animation can't be loaded. Null for a placeholder.
	 */
	faceUrl: string | null;
	/** The weighted colour rolled for the spawn — the card's backdrop. */
	color: SpawnColor;
	/** Attack: the spawn's rolled gameplay stat (same as the board's ATK). */
	atk: number;
	/** Defence: the complement of ATK (SPAWN_STAT_MAX − stat), as the board computes it. */
	def: number;
}
