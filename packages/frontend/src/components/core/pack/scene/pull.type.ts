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
	/** The character's active face portrait URL, or null for a placeholder. */
	faceUrl: string | null;
	/** The weighted colour rolled for the spawn — the card's backdrop. */
	color: SpawnColor;
	/** The gameplay stat rolled for the spawn (1..10). */
	stat: number;
}
