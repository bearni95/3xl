import type { SpawnColor } from '../../types/character-spawn.type';

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
	 * null when there is no rarity to show. Drawn as the `[N]` badge at the left of
	 * the show row directly under the name.
	 */
	rarity: number | null;
	/**
	 * The show this card belongs to (the pack opener passes the opened show; the
	 * roster passes the character's related show). Drawn at the right of the show
	 * row under the name, opposite the rarity badge. Null to omit it.
	 */
	showName: string | null;
	/**
	 * Free-text label pinned to the right of the meta strip (the pack opener passes
	 * the claim location here), or null to omit it.
	 */
	locationName: string | null;
	/**
	 * ISO timestamp the card was spawned/claimed (the spawn's `createdAt`). Its year
	 * is shown as a two-digit suffix beside {@link locationName} in the meta strip
	 * (e.g. `'25`). Null to omit the year.
	 */
	spawnedAt: string | null;
	/** Attack: the character's ATK stat, drawn in the footer beneath the d10 icon. */
	atk: number;
	/** Defence: the character's DEF stat (the ATK complement), drawn in the footer. */
	def: number;
	/** Speed: the character's SPD stat (ATK − 1), drawn in the footer. */
	spd: number;
	/** HP attribute (DEF + 1): the number of d4 the character rolls for its HP pool
	 * at battle start, drawn in the footer. */
	hp: number;
}
