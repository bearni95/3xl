import type { SpawnColor } from '$types/character-spawn.type';

/**
 * The display data a single character trading card renders — everything
 * {@link CardSprite} needs to draw a card, and nothing else. Purely presentation
 * state: no persistence, no game entities. Any feature that wants to render a card
 * (the pack opener, a collection grid, a profile, …) assembles one of these.
 *
 * The claim flow layers its persisted spawn on top via `ClaimPull` (which extends
 * this), but the renderer itself only ever reads these fields.
 */
export interface CardModel {
	/** Human-readable character label, drawn in the header strip. */
	label: string;
	/**
	 * The character's frames folder (e.g. `/assets/<id>/frames`), used to loop the
	 * idle animation as the card's art. Null when the character has none.
	 */
	basePath: string | null;
	/**
	 * The character's face portrait URL — the static fallback shown when the idle
	 * animation can't be loaded. Null for a placeholder.
	 */
	faceUrl: string | null;
	/** The character's colour — the card's portrait backdrop. */
	color: SpawnColor;
	/**
	 * The character's rarity tier (a WoW quality index — see `wowRarityLabel`), or
	 * null when there is no rarity to show.
	 */
	rarity: number | null;
	/**
	 * Free-text label pinned to the right of the meta strip (the pack opener passes
	 * the claim location here), or null to omit it.
	 */
	locationName: string | null;
	/** Attack: the character's ATK stat, drawn in the footer beside the d10 icon. */
	atk: number;
	/** Defence: the character's DEF stat, drawn with a trailing "+" in the footer. */
	def: number;
}
