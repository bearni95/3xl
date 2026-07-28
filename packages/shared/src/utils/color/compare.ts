/**
 * Color combat table. Pure functions — no side effects.
 *
 * An attacker throwing color A at a defender of color B gets a fixed multiplier,
 * read straight from the table below (rows = attacking color, columns = defending
 * color). The multiplier scales the **dice the attacker throws**, not the damage
 * they do: the combat controller rolls `ATK × multiplier` d10 (see
 * {@link strikeDice}) and each die that beats the defender's DEF costs it one HP.
 * So a dominant colour doubles the attacker's handful of dice and a weak one halves
 * it — a bad match can still roll well, and a good one can still whiff.
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
 * (inner key, the column). The value scales the dice the attacker throws.
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
 * Dice multiplier an attacker's throw applies against a defender: the value from
 * {@link STRIKE_MULTIPLIERS} (0.5, 1 or 2). It decides how many dice are thrown,
 * not what each one is worth — every die that lands is still a flat 1 HP.
 */
export function strikeMultiplier(attacker: CombatColor, defender: CombatColor): number {
	return STRIKE_MULTIPLIERS[attacker][defender];
}

/**
 * How many d10 a fighter of `atk` throws when it attacks with `attacker` colour
 * against a `defender` of its own: its ATK scaled by the colour multiplier, rounded
 * to whole dice (half rounds up, so a ×0.5 throw of 3 dice is 2, not 1). Never below
 * one die — a bad colour thins the handful but never leaves the attacker with nothing
 * to roll.
 */
export function strikeDice(atk: number, attacker: CombatColor, defender: CombatColor): number {
	return Math.max(1, Math.round(atk * strikeMultiplier(attacker, defender)));
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
