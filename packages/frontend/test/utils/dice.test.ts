import { describe, it, expect, afterEach, vi } from 'vitest';
import { rollN, resolveAttack, dieHitChance, attackHitChance } from '$utils/dice/roll';

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

	it('counts a hit only for dice strictly above the defender DEF', () => {
		// atk = 5 dice → [3, 7, 5, 9, 2]; def = 5 → hits on 7 and 9 only. The 5 lands
		// on the defence value itself and is turned aside.
		stubDice([3, 7, 5, 9, 2]);
		const { rolls, hits } = resolveAttack(5, 5);
		expect(rolls).toEqual([3, 7, 5, 9, 2]);
		expect(hits).toBe(2);
	});

	it('a die landing exactly on DEF never hits', () => {
		stubDice([6, 6, 6]);
		expect(resolveAttack(3, 6).hits).toBe(0);
		// One above it does.
		stubDice([7, 7, 7]);
		expect(resolveAttack(3, 6).hits).toBe(3);
	});

	it('DEF below 1 makes every die a hit; DEF at 10 or above makes none', () => {
		stubDice([1, 2, 3]);
		expect(resolveAttack(3, 0).hits).toBe(3);
		// DEF 1 turns a rolled 1 aside — only 2..10 beat it.
		stubDice([1, 2, 3]);
		expect(resolveAttack(3, 1).hits).toBe(2);
		stubDice([9, 10, 8]);
		expect(resolveAttack(3, 10).hits).toBe(0);
	});

	it('dieHitChance counts only the faces above DEF', () => {
		// DEF 6 → faces 7..10 hit, four of ten.
		expect(dieHitChance(6)).toBeCloseTo(0.4);
		// DEF 9 (the highest a card can roll) → only a 10 gets through.
		expect(dieHitChance(9)).toBeCloseTo(0.1);
		// DEF 1 → everything but a rolled 1.
		expect(dieHitChance(1)).toBeCloseTo(0.9);
	});

	it('dieHitChance clamps a DEF outside the die range', () => {
		expect(dieHitChance(0)).toBe(1);
		expect(dieHitChance(-4)).toBe(1);
		expect(dieHitChance(10)).toBe(0);
		expect(dieHitChance(25)).toBe(0);
	});

	it('attackHitChance is the complement of every die failing to beat DEF', () => {
		// 3d10 vs DEF 5: each die beats it half the time, so 1 − 0.5³ = 87.5%.
		expect(attackHitChance(3, 5)).toBeCloseTo(0.875);
		// One die is just the single-die chance.
		expect(attackHitChance(1, 8)).toBeCloseTo(0.2);
		// More dice never hurt.
		expect(attackHitChance(5, 8)).toBeGreaterThan(attackHitChance(4, 8));
	});

	it('attackHitChance bottoms out at 0 with no dice or an unbeatable DEF', () => {
		expect(attackHitChance(0, 5)).toBe(0);
		expect(attackHitChance(-2, 5)).toBe(0);
		expect(attackHitChance(9, 10)).toBe(0);
		expect(attackHitChance(9, 0)).toBe(1);
	});

	it('attackHitChance agrees with rolled attacks over many samples', () => {
		vi.restoreAllMocks();
		const atk = 2;
		const def = 7;
		const samples = 20000;
		let landed = 0;
		for (let i = 0; i < samples; i++) {
			if (resolveAttack(atk, def).hits > 0) landed += 1;
		}
		expect(landed / samples).toBeCloseTo(attackHitChance(atk, def), 1);
	});
});
