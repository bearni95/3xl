// Templating an achievement's own variables into its name and description.
//
// A badge's wording is authored once and read by every player, so the numbers in
// it cannot be typed in: `Conquereix {target} municipalitats` is one line whose
// {target} is that achievement's own formula, evaluated against whoever is
// looking. The braces are the only markup there is — a name between them is a
// variable of this achievement, and nothing else in the text is touched.
//
// A placeholder naming a variable the achievement does not declare is left on
// screen exactly as written. That state cannot be saved (the backend refuses it,
// see `variables.ts`), so it only ever appears in the admin while a variable is
// still being renamed — and there, showing `{taget}` is far more use than showing
// a blank.

import type { Achievement } from '../../types/achievement.type';
import {
	evaluateFormula,
	formatFormulaValue,
	type FormulaContext
} from './formula';

/**
 * Anything between braces, whether or not it names a variable. Deliberately
 * permissive: a placeholder with a typo in it has to be *found* to be reported.
 */
const PLACEHOLDER_PATTERN = /\{([^{}]*)\}/g;

/** Every placeholder in a piece of text, trimmed, in order, without repeats. */
export function templateNames(text: string): string[] {
	const names: string[] = [];
	for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
		const name = match[1].trim();
		if (!names.includes(name)) names.push(name);
	}
	return names;
}

/**
 * Substitute `{name}` for its value, leaving placeholders that name nothing as
 * they were written.
 */
export function renderTemplate(text: string, values: Readonly<Record<string, string>>): string {
	return text.replace(PLACEHOLDER_PATTERN, (whole, name: string) => {
		const value = values[name.trim()];
		return value === undefined ? whole : value;
	});
}

/**
 * Each of an achievement's variables evaluated for one player, formatted as it
 * would appear in the text. Every variable is evaluated once, so a name used in
 * both the name and the description cannot disagree with itself.
 */
export function achievementValues(
	achievement: Pick<Achievement, 'variables'>,
	context: FormulaContext
): Record<string, string> {
	const values: Record<string, string> = {};
	for (const variable of achievement.variables ?? []) {
		values[variable.name] = formatFormulaValue(evaluateFormula(variable.formula, context));
	}
	return values;
}

/** An achievement's wording as one player sees it. */
export interface RenderedAchievement {
	name: string;
	description: string;
}

/**
 * A badge's name and description with this player's numbers in them. An
 * achievement with no variables renders as its authored text, so this is safe to
 * put in front of every badge rather than only the ones with formulas.
 */
export function renderAchievement(
	achievement: Pick<Achievement, 'name' | 'description' | 'variables'>,
	context: FormulaContext
): RenderedAchievement {
	const values = achievementValues(achievement, context);
	return {
		name: renderTemplate(achievement.name, values),
		description: renderTemplate(achievement.description, values)
	};
}
