/**
 * The least common multiple of a set of whole numbers — the first count that every one of
 * them divides, which is where a set of cycles of those lengths, all stepped together, comes
 * back round to where it started.
 *
 * Taken pairwise through the greatest common divisor, since `a * b / gcd(a, b)` is the pair's
 * own least multiple and the multiple of a set is the multiple of its multiples. Divided
 * before multiplying, so the running total never climbs higher than the answer.
 *
 * Zeroes and anything not a positive whole number are dropped rather than answered: a cycle
 * of no frames has no period, and it is not one the rest of a set should be judged against.
 * Nothing left after that is `0` — there is no first count when there is nothing to count.
 */
export function leastCommonMultiple(values: number[]): number {
	const counts = values.filter((value) => Number.isInteger(value) && value > 0);
	if (counts.length === 0) return 0;
	return counts.reduce(
		(multiple, count) => (multiple / greatestCommonDivisor(multiple, count)) * count
	);
}

/** Euclid's, iteratively: the larger replaced by what the smaller leaves of it until
 * nothing is left over, and the last non-zero remainder is the divisor. */
export function greatestCommonDivisor(a: number, b: number): number {
	let left = Math.abs(a);
	let right = Math.abs(b);
	while (right !== 0) {
		[left, right] = [right, left % right];
	}
	return left;
}
