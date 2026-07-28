import { describe, it, expect, afterEach, vi } from 'vitest';
import { pickOne, pickWeighted, rollDie, rollN } from '$utils/dice/roll';

describe('dice', () => {
	afterEach(() => vi.restoreAllMocks());

	it('rollDie stays inside [1, sides]', () => {
		for (let i = 0; i < 200; i++) {
			const roll = rollDie(6);
			expect(roll).toBeGreaterThanOrEqual(1);
			expect(roll).toBeLessThanOrEqual(6);
		}
	});

	it('rollDie reaches both ends of its range', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		expect(rollDie(10)).toBe(1);
		vi.spyOn(Math, 'random').mockReturnValue(0.999999);
		expect(rollDie(10)).toBe(10);
	});

	it('rollN returns one result per die within [1, sides]', () => {
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
});

describe('picking', () => {
	afterEach(() => vi.restoreAllMocks());

	it('pickOne returns a member of the set, and nothing from an empty one', () => {
		const options = ['a', 'b', 'c'];
		for (let i = 0; i < 100; i++) expect(options).toContain(pickOne(options));
		expect(pickOne([])).toBeUndefined();
	});

	it('pickOne can land on the first and the last entry', () => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
		expect(pickOne(['a', 'b', 'c'])).toBe('a');
		vi.spyOn(Math, 'random').mockReturnValue(0.999999);
		expect(pickOne(['a', 'b', 'c'])).toBe('c');
	});

	it('pickWeighted splits the range in proportion to the weights', () => {
		const options = ['a', 'b', 'c'];
		const weights = [1, 3, 6]; // total 10: a takes [0,1), b [1,4), c [4,10)
		const at = (fraction: number) => {
			vi.spyOn(Math, 'random').mockReturnValue(fraction);
			return pickWeighted(options, weights);
		};
		expect(at(0)).toBe('a');
		expect(at(0.05)).toBe('a');
		expect(at(0.15)).toBe('b');
		expect(at(0.35)).toBe('b');
		expect(at(0.45)).toBe('c');
		expect(at(0.99)).toBe('c');
	});

	it('pickWeighted ignores an option weighted zero (or negative)', () => {
		const options = ['never', 'always'];
		for (let i = 0; i < 100; i++) {
			expect(pickWeighted(options, [0, 5])).toBe('always');
			expect(pickWeighted(options, [-4, 5])).toBe('always');
		}
	});

	it('pickWeighted falls back to a uniform pick when no weight is positive', () => {
		// An all-zero set would otherwise leave the caller with nothing at all.
		const options = ['a', 'b'];
		for (let i = 0; i < 50; i++) expect(options).toContain(pickWeighted(options, [0, 0]));
		expect(pickWeighted(options, [])).toBeDefined();
		expect(pickWeighted([], [])).toBeUndefined();
	});
});
