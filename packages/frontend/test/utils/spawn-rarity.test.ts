import { describe, it, expect } from 'vitest';
import { rarityWeight, weightedRarityIndex, RARITY_STEP_FACTOR } from '$utils/spawn/rarity';

describe('spawn rarity weighting', () => {
	it('halves the weight for each rarity tier above Common', () => {
		expect(RARITY_STEP_FACTOR).toBe(2);
		expect(rarityWeight(0)).toBe(1);
		expect(rarityWeight(1)).toBe(0.5);
		expect(rarityWeight(2)).toBe(0.25);
		expect(rarityWeight(3)).toBe(0.125);
	});

	it('treats unknown, non-integer, or below-min tiers as Common (weight 1)', () => {
		expect(rarityWeight(undefined)).toBe(1);
		expect(rarityWeight(null)).toBe(1);
		expect(rarityWeight(-2)).toBe(1);
		expect(rarityWeight(1.5)).toBe(1);
		expect(rarityWeight(NaN)).toBe(1);
	});

	it('returns -1 for an empty pool', () => {
		expect(weightedRarityIndex([])).toBe(-1);
	});

	it('maps roll ranges to the expected index across the cumulative weight bands', () => {
		// Pool of [Common, Uncommon, Rare] → weights [1, 0.5, 0.25], total 1.75.
		const rarities = [0, 1, 2];
		const total = 1 + 0.5 + 0.25;
		// Just inside each cumulative band.
		expect(weightedRarityIndex(rarities, () => 0)).toBe(0);
		expect(weightedRarityIndex(rarities, () => 0.99 / total)).toBe(0);
		expect(weightedRarityIndex(rarities, () => 1.01 / total)).toBe(1);
		expect(weightedRarityIndex(rarities, () => 1.49 / total)).toBe(1);
		expect(weightedRarityIndex(rarities, () => 1.51 / total)).toBe(2);
	});

	it('picks each higher tier 2x less often over many rolls', () => {
		// Two characters, tiers 0 and 1 → the Common should land ~2x as often.
		const rarities = [0, 1];
		let seed = 0;
		const random = () => {
			seed = (seed + 1) % 3000;
			return seed / 3000;
		};

		const counts = [0, 0];
		for (let i = 0; i < 3000; i++) counts[weightedRarityIndex(rarities, random)]++;

		// Weights 1 and 0.5 over 3000 rolls → 2000 Common, 1000 Uncommon.
		expect(counts[0]).toBe(2000);
		expect(counts[1]).toBe(1000);
		expect(counts[0] / counts[1]).toBe(2);
	});
});
