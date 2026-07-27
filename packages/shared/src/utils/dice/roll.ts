/**
 * Dice utilities. Pure functions — no side effects beyond consuming randomness.
 */

/** Roll a single die with `sides` faces, returning an integer in [1, sides]. */
export function rollDie(sides: number): number {
	return Math.floor(Math.random() * sides) + 1;
}

/** Roll `count` dice with `sides` faces each and return the summed total. */
export function rollDice(count: number, sides: number): number {
	let total = 0;
	for (let i = 0; i < count; i++) {
		total += rollDie(sides);
	}
	return total;
}

/** Roll `count` dice with `sides` faces each, returning the individual results. */
export function rollN(count: number, sides: number): number[] {
	return Array.from({ length: Math.max(0, count) }, () => rollDie(sides));
}

/**
 * Resolve a melee attack: roll `atk` ten-sided dice, and count each die that
 * lands on or above the defender's `def` as a success ("hit"). Damage dealt
 * equals the number of hits — one HP lost per success.
 */
export function resolveAttack(atk: number, def: number): { rolls: number[]; hits: number } {
	const rolls = rollN(atk, 10);
	const hits = rolls.filter((die) => die >= def).length;
	return { rolls, hits };
}

/**
 * The odds a single d10 counts as a hit against `def` — the faces from `def` to 10,
 * out of ten. Returned as a probability in [0, 1]; a `def` at or below 1 can never
 * be missed, one above 10 can never be met.
 */
export function dieHitChance(def: number): number {
	return Math.min(1, Math.max(0, (11 - def) / 10));
}

/**
 * The odds an attack of `atk` ten-sided dice lands **at least one** hit against
 * `def` — the complement of every die missing, `1 − (1 − p)^atk`. This is what the
 * arena previews on a fighter's colour buttons: whether the throw connects at all
 * is decided by these dice, so the thrown colour does not enter into it (it only
 * scales the hits that land into HP of damage).
 */
export function attackHitChance(atk: number, def: number): number {
	const misses = 1 - dieHitChance(def);
	return 1 - Math.pow(misses, Math.max(0, atk));
}

/**
 * Roll a character's fight HP: `hp` ten-sided dice summed together. A character
 * with `hp` = 5 rolls 5d10, yielding a total in the inclusive range [5, 50].
 */
export function rollHp(hp: number): number {
	return rollDice(hp, 10);
}
