/**
 * Dice utilities. Pure functions — no side effects beyond consuming randomness.
 *
 * Combat itself no longer rolls anything: the stand-off (charge / defend / shoot)
 * is decided by what both sides chose, not by dice. What is left here is the plain
 * randomness the game still needs — picking one of a handful of options, chiefly
 * for the rival side's choices.
 */

/** Roll a single die with `sides` faces, returning an integer in [1, sides]. */
export function rollDie(sides: number): number {
	return Math.floor(Math.random() * sides) + 1;
}

/** Roll `count` dice with `sides` faces each, returning the individual results. */
export function rollN(count: number, sides: number): number[] {
	return Array.from({ length: Math.max(0, count) }, () => rollDie(sides));
}

/** One uniformly random entry of `options`, or undefined when it is empty. */
export function pickOne<T>(options: readonly T[]): T | undefined {
	if (options.length === 0) return undefined;
	return options[rollDie(options.length) - 1];
}

/**
 * Pick one entry of `options` by weight: entry `i` is chosen with probability
 * `weights[i]` over the total. A missing or non-positive weight reads as zero, and
 * an all-zero (or empty) set falls back to a uniform pick, so a caller can never be
 * left with nothing.
 */
export function pickWeighted<T>(options: readonly T[], weights: readonly number[]): T | undefined {
	const safe = options.map((_, i) => Math.max(0, weights[i] ?? 0));
	const total = safe.reduce((sum, weight) => sum + weight, 0);
	if (total <= 0) return pickOne(options);
	let roll = Math.random() * total;
	for (let i = 0; i < options.length; i++) {
		roll -= safe[i];
		if (roll < 0) return options[i];
	}
	return options[options.length - 1];
}
