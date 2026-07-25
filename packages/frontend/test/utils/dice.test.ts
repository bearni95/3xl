import { describe, it, expect, afterEach, vi } from 'vitest';
import { rollN, resolveAttack } from '../../src/utils/dice/roll';

/** Feed Math.random a fixed sequence so dice results are deterministic. */
function stubDice(values: number[]): void {
	let i = 0;
	// rollDie does Math.floor(random * 10) + 1, so random = (value - 1) / 10 + tiny
	// yields exactly `value`.
	vi.spyOn(Math, 'random').mockImplementation(() => {
		const value = values[i % values.length];
		i += 1;
		return (value - 1) / 10 + 0.001;
	});
}

describe('dice', () => {
	afterEach(() => vi.restoreAllMocks());

	it('rollN returns one result per die within [1, sides]', () => {
		vi.restoreAllMocks();
		const rolls = rollN(20, 10);
		expect(rolls).toHaveLength(20);
		for (const roll of rolls) {
			expect(roll).toBeGreaterThanOrEqual(1);
			expect(roll).toBeLessThanOrEqual(10);
		}
	});

	it('rollN with non-positive count yields an empty array', () => {
		expect(rollN(0, 10)).toEqual([]);
		expect(rollN(-3, 10)).toEqual([]);
	});

	it('counts a hit for every die on or above the defender DEF', () => {
		// atk = 5 dice → [3, 7, 5, 9, 2]; def = 5 → hits on 7, 5, 9 = 3.
		stubDice([3, 7, 5, 9, 2]);
		const { rolls, hits } = resolveAttack(5, 5);
		expect(rolls).toEqual([3, 7, 5, 9, 2]);
		expect(hits).toBe(3);
	});

	it('DEF 1 makes every die a hit; DEF above 10 makes none', () => {
		stubDice([1, 2, 3]);
		expect(resolveAttack(3, 1).hits).toBe(3);
		stubDice([9, 10, 8]);
		expect(resolveAttack(3, 11).hits).toBe(0);
	});
});
