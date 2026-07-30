// How far along a badge is: one number between 0 and 1 for a requirement that has
// not been met yet.
//
// A requirement is a yes-or-no (see `requirement.ts`), and that is the only thing
// about it the game acts on. This file answers a different, softer question — "how
// close?" — so that a badge a player is two cards away from does not read the same as
// one they have not started. It is a **display**, never a rule: nothing here is
// mirrored in PL/pgSQL, `claim_achievements` neither computes nor is told a
// percentage, and a badge at 99% is simply not earned.
//
// Being a reading rather than a rule, it has to make a judgement where the language
// does not:
//
//   - A comparison of two amounts is the ratio of the one that grows to the one it is
//     held against — `cards(color = blue) >= 15` with nine blue cards is 0.6. A
//     comparison the wrong way round (`cards <= 3` with six cards) is read from the
//     other side, so shedding cards reads as progress; `=` is read as how close the
//     two amounts are, and `!=` has no middle ground at all and is 0 or 1.
//   - `and` is the **mean** of its parts, so a badge wanting two things and holding
//     one of them reads as half done rather than as whatever its worst half is.
//   - `or` is the **best** of its parts: the branch nearest completion is the one the
//     player is going to finish.
//   - `not` is what is left of its operand.
//
// A met requirement is 1 whatever the arithmetic says, because the verdict is the
// authority and a tile must never disagree with itself. An unmet one is never
// reported as 100% either — see `progressPercent`.

import type { Achievement } from '../../types/achievement.type';
import {
	evaluateCondition,
	evaluateFormula,
	parseCondition,
	type ConditionContext,
	type ConditionNode,
	type FormulaContext
} from './formula';
import { variableNumbers } from './requirement';

/** The parts of an achievement that decide how far along it is. */
type Earnable = Pick<Achievement, 'variables' | 'requirement'>;

/** Hold a ratio to the 0…1 a fraction of the way through has to be. */
function clamp(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	return value > 1 ? 1 : value;
}

/**
 * How far one comparison is from holding. `p_met` is whether it already does, which
 * is what makes a comparison nobody can make progress on (`!=`, or a bar of zero)
 * answer 0 or 1 rather than dividing by nothing.
 */
function comparisonProgress(op: string, left: number, right: number, met: boolean): number {
	if (met) return 1;
	switch (op) {
		case '>=':
		case '>':
			// The bar is what the player is climbing to. A bar at or below zero cannot be
			// climbed to — an unmet comparison against one is as far from met as it gets.
			return right <= 0 ? 0 : clamp(left / right);
		case '<=':
		case '<':
			// Read from the other side: the amount has to come down to the bar, so the bar
			// over the amount is how much of that descent is done.
			return left <= 0 ? 0 : clamp(right / left);
		case '=': {
			// Neither side is the target — closeness is all there is to report.
			const far = Math.max(Math.abs(left), Math.abs(right));
			return far === 0 ? 0 : clamp(1 - Math.abs(left - right) / far);
		}
		default:
			// `!=` has no middle: either the two differ or they do not.
			return 0;
	}
}

/** How far along a parsed requirement is, for one player. See the file header. */
function conditionProgress(node: ConditionNode, context: ConditionContext): number {
	switch (node.kind) {
		case 'and': {
			const left = conditionProgress(node.left, context);
			const right = conditionProgress(node.right, context);
			return (left + right) / 2;
		}
		case 'or':
			return Math.max(
				conditionProgress(node.left, context),
				conditionProgress(node.right, context)
			);
		case 'not':
			return 1 - conditionProgress(node.operand, context);
		case 'compare':
			// Both sides through the language's own evaluator, and the comparison itself
			// through the language's own verdict — the ratio below is the only arithmetic
			// this file adds, and it is added to numbers it did not work out.
			return comparisonProgress(
				node.op,
				evaluateFormula(node.left, context),
				evaluateFormula(node.right, context),
				evaluateCondition(node, context)
			);
	}
}

/**
 * How far this player is through a badge, from 0 (nothing done) to 1 (earned).
 *
 * A badge with no requirement is 0: nothing says what earns it, so no amount of
 * playing is progress towards it. An unparseable one is 0 for the same reason
 * `achievementMet` reads it as not met — a rule nobody can read has not been
 * progressed.
 */
export function achievementProgress(achievement: Earnable, context: FormulaContext): number {
	const requirement = achievement.requirement?.trim();
	if (!requirement) return 0;
	const variables = variableNumbers(achievement, context);
	let node: ConditionNode;
	try {
		node = parseCondition(requirement, Object.keys(variables));
	} catch {
		return 0;
	}
	const full: ConditionContext = { ...context, variables };
	// The verdict first: a met badge is all the way along whatever the ratios say.
	if (evaluateCondition(node, full)) return 1;
	return clamp(conditionProgress(node, full));
}

/**
 * The same thing as the whole number a tile prints. Rounded **down**, so a badge that
 * is not earned can never read 100% — the one number a player would rightly read as a
 * promise. 1 is the only thing that prints 100.
 */
export function progressPercent(progress: number): number {
	if (!Number.isFinite(progress) || progress <= 0) return 0;
	if (progress >= 1) return 100;
	return Math.min(99, Math.floor(progress * 100));
}
