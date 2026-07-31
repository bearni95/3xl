import type { CardModel } from '$utils/card/card-model.type';
import type { CharacterSpawn } from '$types/character-spawn.type';

/**
 * One card revealed by the pack opener: the display {@link CardModel} the reveal
 * card renders, joined with the persisted {@link CharacterSpawn} it represents so
 * the claim flow can act on the tapped card. The label + face portrait come from
 * the local @3xl/data registry; the colour + stat are rolled at claim time and
 * live on the spawn. Purely presentation state — assembled by the claim panel
 * after `spawnService.claimBooster` resolves, then handed to the canvas.
 */
export interface ClaimPull extends CardModel {
	/** The persisted spawn this card represents. */
	spawn: CharacterSpawn;
	/**
	 * Whether this card is one the player did not already hold — the character, in
	 * that colour, from that town (see `ownedSpawnKeys` in @3xl/shared), read against
	 * their collection as it stood *before* the pack was opened. The reveal marks
	 * these, so what a pack actually added is visible at a glance rather than having
	 * to be worked out against the roster.
	 */
	isNew: boolean;
}
