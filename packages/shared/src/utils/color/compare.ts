/**
 * Color combat table. Pure functions — no side effects.
 *
 * Every throw lands. An attacker throwing color A at a defender of color B
 * deals a fixed multiplier of strikes, read straight from the table below
 * (rows = attacking color, columns = defending color). That multiplier IS the
 * number of strikes the defender takes; across a duel's two exchanges whoever
 * took fewer strikes is the stronger fighter.
 *
 * The table encodes three tiers — x2 (dominant), x1 (even), x0.5 (weak):
 *   · same primary → x2; same compound → x0.5
 *   · two different primaries, or two different compounds → x1 both ways
 *   · primary vs compound → reciprocal: the primary a compound does NOT contain
 *     deals x2 to it (and takes x0.5 back); a component primary deals x0.5 (and
 *     takes x2 back)
 */
import {
	COMPOUND_COLORS,
	COMPOUND_COMPONENTS,
	type CombatColor,
	type CompoundColor,
	type PrimaryColor
} from '../../types/character-definition.type';

const PRIMARIES: PrimaryColor[] = ['red', 'blue', 'yellow'];

/**
 * Strike multiplier for an attacker (outer key, the row) throwing at a defender
 * (inner key, the column). The value is the strikes the defender takes.
 */
export const STRIKE_MULTIPLIERS: Record<CombatColor, Record<CombatColor, number>> = {
	red: { red: 2, yellow: 1, blue: 1, purple: 0.5, orange: 0.5, green: 2 },
	yellow: { red: 1, yellow: 2, blue: 1, purple: 2, orange: 0.5, green: 0.5 },
	blue: { red: 1, yellow: 1, blue: 2, purple: 0.5, orange: 2, green: 0.5 },
	purple: { red: 2, yellow: 0.5, blue: 2, purple: 0.5, orange: 1, green: 1 },
	orange: { red: 2, yellow: 2, blue: 0.5, purple: 1, orange: 0.5, green: 1 },
	green: { red: 0.5, yellow: 2, blue: 2, purple: 1, orange: 1, green: 0.5 }
};

export function isPrimaryColor(color: CombatColor): color is PrimaryColor {
	return PRIMARIES.includes(color as PrimaryColor);
}

/**
 * Strikes an attacker's throw inflicts on a defender: the multiplier from
 * {@link STRIKE_MULTIPLIERS} (0.5, 1 or 2). Every throw lands — the value is
 * only how hard.
 */
export function strikeMultiplier(attacker: CombatColor, defender: CombatColor): number {
	return STRIKE_MULTIPLIERS[attacker][defender];
}

/** The colors a character of `color` can throw. A compound character throws the
 * compound plus its two component primaries (in display order); a primary
 * character throws its own primary plus every compound that mixes it (in
 * display order) — the reciprocal of the compound case. */
export function throwableColors(color: CombatColor): CombatColor[] {
	if (!isPrimaryColor(color)) return [color, ...COMPOUND_COMPONENTS[color]];
	const compounds = COMPOUND_COLORS.filter((compound) =>
		COMPOUND_COMPONENTS[compound].includes(color)
	);
	return [color, ...compounds];
}

/**
 * The colors a teammate may carry given the team leader's `lead` color: the
 * lead's own color, plus — for a primary lead — every compound that contains it,
 * or — for a compound lead — the two primaries that make it. This is the same
 * color relation as {@link throwableColors}: a teammate must share a color with
 * the lead. */
export function teammateColors(lead: CombatColor): CombatColor[] {
	return throwableColors(lead);
}

/** Whether `color` is allowed on a team led by `lead` (see {@link teammateColors}). */
export function isTeammateColor(lead: CombatColor, color: CombatColor): boolean {
	return teammateColors(lead).includes(color);
}
