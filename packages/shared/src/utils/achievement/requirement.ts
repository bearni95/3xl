// Whether a player has earned a badge.
//
// A badge's requirement is a condition in the formula language (see `formula.ts`),
// and it may quote the badge's own variables — so answering it is two steps: work
// out the variables for this player, then hold the condition against them. That is
// all this file is, and it exists so that the browser (which greys out a badge that
// is not ready to be claimed) and the admin (which previews a requirement against
// an invented player) ask the question exactly one way.
//
// It is *not* the authority. A badge is awarded by `claim_achievements` in
// Postgres, which walks the compiled tree itself against rows only it can trust —
// this is the same rule computed where it can be shown, in the same spirit as
// `combatExpAward` mirroring `award_combat_exp`.

import type { Achievement } from '../../types/achievement.type';
import { evaluateCondition, evaluateFormula, type FormulaContext } from './formula';

/** The parts of an achievement that decide whether it has been earned. */
type Earnable = Pick<Achievement, 'variables' | 'requirement'>;

/**
 * Whether this player has met the badge's requirement.
 *
 * A badge with no requirement is **not** met: it says nothing about what earns it,
 * so there is nothing to have done. That is the same reading the database takes —
 * a template with a null requirement is not even offered as one of the day's three
 * (see `daily.ts`).
 */
export function achievementMet(achievement: Earnable, context: FormulaContext): boolean {
	const requirement = achievement.requirement?.trim();
	if (!requirement) return false;
	return evaluateCondition(requirement, {
		...context,
		variables: variableNumbers(achievement, context)
	});
}

/**
 * The badge's variables as the numbers a comparison is made on — not the strings
 * its wording is written with. The two come from the same formulas, but
 * `achievementValues` rounds for the page it prints on, and a rounded value held
 * against an exact one is a rule that disagrees with the database over the fourth
 * decimal place. So a condition reads the raw value, exactly as Postgres does.
 */
export function variableNumbers(
	achievement: Earnable,
	context: FormulaContext
): Record<string, number> {
	const values: Record<string, number> = {};
	for (const variable of achievement.variables ?? []) {
		values[variable.name] = evaluateFormula(variable.formula, context);
	}
	return values;
}
