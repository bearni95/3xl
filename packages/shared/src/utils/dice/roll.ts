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
 * lands **strictly above** the defender's `def` as a success ("hit") — rolling the
 * defence value itself is turned aside, not a hit. Damage dealt equals the number
 * of hits — one HP lost per success.
 */
export function resolveAttack(atk: number, def: number): { rolls: number[]; hits: number } {
	const rolls = rollN(atk, 10);
	const hits = rolls.filter((die) => die > def).length;
	return { rolls, hits };
}

/**
 * The odds a single d10 counts as a hit against `def` — the faces strictly above
 * `def`, out of ten, since landing on the defence value itself is turned aside.
 * Returned as a probability in [0, 1]; a `def` below 1 can never be missed, one at
 * 10 or above can never be beaten.
 */
export function dieHitChance(def: number): number {
	return Math.min(1, Math.max(0, (10 - def) / 10));
}

/**
 * The odds an attack of `atk` ten-sided dice lands **at least one** hit against
 * `def` — the complement of every die failing to beat it, `1 − (1 − p)^atk`. This is
 * what the arena previews on a fighter's colour buttons, one figure per colour: the
 * thrown colour sets how many dice `atk` is worth (see `strikeDice`), so a dominant
 * colour is genuinely likelier to connect and a weak one genuinely likelier to whiff.
 */
export function attackHitChance(atk: number, def: number): number {
	const misses = 1 - dieHitChance(def);
	return 1 - Math.pow(misses, Math.max(0, atk));
}

/**
 * A probability formatted as the percentage to *display*, e.g. `"90%"`, `"99.9%"`.
 *
 * Whole percents everywhere except the two extremes, where rounding would state
 * something false: 5d10 against DEF 1 lands 99.999% of the time, and `Math.round`
 * reports that as a flat `"100%"` — a certainty the dice never offer, since every die
 * can still come up a 1 and be turned aside. Clamping it to `"99%"` instead is no
 * better: it reads as materially worse odds than it is, and collides with a genuine
 * 99.0% (2d10 against DEF 1). So a chance that would round to 100% is *floored* to a
 * tenth, and one that would round to 0% is *raised* to a tenth — enough precision to
 * stay honest and to tell those cases apart. Only an exact 1 or 0 prints 100% or 0%.
 */
export function formatChancePercent(chance: number): string {
	if (chance >= 1) return '100%';
	if (chance <= 0) return '0%';
	const percent = chance * 100;
	// Floor/raise to a tenth so a near-certainty never rounds up into certainty (nor a
	// slim chance down into impossibility).
	if (percent >= 99.5) return `${Math.floor(percent * 10) / 10}%`;
	if (percent <= 0.5) return `${Math.ceil(percent * 10) / 10}%`;
	return `${Math.round(percent)}%`;
}

/**
 * Roll a character's fight HP: `hp` ten-sided dice summed together. A character
 * with `hp` = 5 rolls 5d10, yielding a total in the inclusive range [5, 50].
 */
export function rollHp(hp: number): number {
	return rollDice(hp, 10);
}
