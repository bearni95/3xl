import { describe, expect, it } from 'vitest';
import { greatestCommonDivisor, leastCommonMultiple } from '$utils/math/least-common-multiple';

describe('greatestCommonDivisor', () => {
	it('finds the largest number dividing both', () => {
		expect(greatestCommonDivisor(12, 18)).toBe(6);
		expect(greatestCommonDivisor(18, 12)).toBe(6);
	});

	it('is 1 for numbers sharing no factor', () => {
		expect(greatestCommonDivisor(9, 20)).toBe(1);
	});

	it('takes zero as divided by anything', () => {
		expect(greatestCommonDivisor(0, 7)).toBe(7);
		expect(greatestCommonDivisor(7, 0)).toBe(7);
	});
});

describe('leastCommonMultiple', () => {
	it('is the first count every value divides', () => {
		expect(leastCommonMultiple([4, 6])).toBe(12);
		expect(leastCommonMultiple([4, 6, 10])).toBe(60);
	});

	it('is the largest when the others divide it', () => {
		expect(leastCommonMultiple([2, 4, 8])).toBe(8);
	});

	it('multiplies out values sharing no factor', () => {
		expect(leastCommonMultiple([9, 20, 11])).toBe(1980);
	});

	it('is the value itself for a single cycle', () => {
		expect(leastCommonMultiple([7])).toBe(7);
	});

	it('drops what has no period rather than answering for it', () => {
		expect(leastCommonMultiple([0, 4, 6])).toBe(12);
		expect(leastCommonMultiple([4, -6, 2.5])).toBe(4);
	});

	it('is 0 when there is nothing to count', () => {
		expect(leastCommonMultiple([])).toBe(0);
		expect(leastCommonMultiple([0])).toBe(0);
	});

	it('answers a whole roster of idle cycles', () => {
		// The lengths actually decoded across the roster today.
		expect(leastCommonMultiple([1, 4, 6, 8, 9, 10, 11, 12, 14, 20, 21, 22, 27])).toBe(83160);
	});
});
