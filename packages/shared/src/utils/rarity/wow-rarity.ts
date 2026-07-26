import rarities from './wow-rarities.json';

/**
 * One World of Warcraft item-quality tier. Kept as reusable JSON
 * (`wow-rarities.json`) so any package can name a numeric rarity the same way.
 */
export interface WowRarity {
	/** Display name of this quality tier, e.g. `Epic`. */
	label: string;
}

/**
 * The WoW quality tiers in ascending rarity, indexed by our numeric `rarity`
 * field: index 0 is the most common tier (Common) — matching the rarity default
 * — and each step up is rarer (Uncommon, Rare, Epic, Legendary, …).
 */
export const WOW_RARITIES: readonly WowRarity[] = rarities;

/**
 * Label for a numeric rarity, or `null` when it falls outside the defined WoW
 * tiers (negative, non-integer, or above the highest tier) — callers render no
 * label in that case rather than inventing one.
 */
export function wowRarityLabel(rarity: number): string | null {
	if (!Number.isInteger(rarity) || rarity < 0 || rarity >= WOW_RARITIES.length) return null;
	return WOW_RARITIES[rarity].label;
}
