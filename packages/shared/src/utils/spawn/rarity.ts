import { DEFAULT_RARITY, RARITY_MIN } from '../../types/character-template.type';

/**
 * How much rarer each rarity tier is than the tier directly below it. A factor
 * of 2 means every step up (Common → Uncommon → Rare → …) is twice as unlikely
 * to be rolled as the previous step.
 */
export const RARITY_STEP_FACTOR = 2;

/**
 * Relative selection weight for a character of the given rarity tier, used when
 * rolling a spawn from a pool. Tier {@link RARITY_MIN} (Common) weighs 1, and
 * each higher tier is {@link RARITY_STEP_FACTOR}× rarer than the one below it
 * (tier 1 → 1/2, tier 2 → 1/4, …). Unknown, non-integer, or below-min tiers
 * fall back to {@link DEFAULT_RARITY}.
 */
export function rarityWeight(rarity: unknown): number {
	const tier =
		typeof rarity === 'number' && Number.isInteger(rarity) && rarity > RARITY_MIN
			? rarity
			: DEFAULT_RARITY;
	return 1 / Math.pow(RARITY_STEP_FACTOR, tier - RARITY_MIN);
}

/**
 * Pick an index into `rarities` weighted by {@link rarityWeight}, so that within
 * a pool each higher rarity tier is {@link RARITY_STEP_FACTOR}× rarer than the
 * tier below it. Returns `-1` for an empty pool. `random` is injectable for
 * deterministic tests and defaults to `Math.random`.
 */
export function weightedRarityIndex(
	rarities: readonly number[],
	random: () => number = Math.random
): number {
	if (rarities.length === 0) return -1;
	const weights = rarities.map(rarityWeight);
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let roll = random() * total;
	for (let i = 0; i < weights.length; i++) {
		roll -= weights[i];
		if (roll < 0) return i;
	}
	// Unreachable: the weights always sum to `total`.
	return weights.length - 1;
}
