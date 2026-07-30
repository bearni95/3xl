// Whether an achievement's variables and wording agree with each other.
//
// One list of rules, read by both sides on purpose: the admin editor calls it on
// every keystroke to say why Save is disabled, and the backend calls it again
// before writing the git tree, so the message the author is shown is the message
// the API would have refused with. Nothing here is about a *single* formula — that
// is `parseFormula`'s job, and it is called from here for each one — it is about
// the set: names that collide, names that shadow a source, placeholders naming a
// variable that was never declared.

import {
	ACHIEVEMENT_FORMULA_MAX_LENGTH,
	ACHIEVEMENT_VARIABLES_MAX,
	ACHIEVEMENT_VARIABLE_NAME_PATTERN,
	type Achievement,
	type AchievementVariable
} from '../../types/achievement.type';
import { FORMULA_SOURCES, formulaError } from './formula';
import { templateNames } from './template';

/** One thing wrong with a draft's variables, in the words both sides report. */
export interface VariableProblem {
	/**
	 * Which variable it is about, as its index in the list — or null when it is
	 * about the badge's wording (a placeholder naming nothing) or the list itself.
	 */
	index: number | null;
	/** Which input to point at, for an editor that has one per field. */
	field: 'name' | 'formula' | 'text';
	/** The trouble in one sentence. */
	message: string;
}

/** The draft an achievement's variables are checked against. */
type VariablesDraft = Pick<Achievement, 'name' | 'description' | 'variables'>;

/**
 * Everything wrong with a draft's variables, in reading order — empty when there
 * is nothing wrong. A variable is checked for a usable name, a formula that
 * parses, and no collision with another; the wording is checked for placeholders
 * that name a variable nobody declared.
 */
export function validateVariables(draft: VariablesDraft): VariableProblem[] {
	const problems: VariableProblem[] = [];
	const variables = draft.variables ?? [];

	if (variables.length > ACHIEVEMENT_VARIABLES_MAX) {
		problems.push({
			index: null,
			field: 'text',
			message: `An achievement can declare at most ${ACHIEVEMENT_VARIABLES_MAX} variables`
		});
	}

	const seen = new Set<string>();
	variables.forEach((variable, index) => {
		const name = variable.name.trim();
		if (!name) {
			problems.push({ index, field: 'name', message: 'A variable needs a name' });
		} else if (!ACHIEVEMENT_VARIABLE_NAME_PATTERN.test(name)) {
			problems.push({
				index,
				field: 'name',
				message: `"${name}" is not a usable variable name — a letter first, then letters, digits or underscores`
			});
		} else if (FORMULA_SOURCES.includes(name as (typeof FORMULA_SOURCES)[number])) {
			// A variable called `cards` would read as the source inside every other
			// formula of the same badge, so the name is not available.
			problems.push({
				index,
				field: 'name',
				message: `"${name}" is what a formula calls the game's own value — pick another name`
			});
		} else if (seen.has(name)) {
			problems.push({ index, field: 'name', message: `"${name}" is declared twice` });
		}
		seen.add(name);

		const formula = variable.formula.trim();
		if (!formula) {
			problems.push({ index, field: 'formula', message: 'A variable needs a formula' });
		} else if (formula.length > ACHIEVEMENT_FORMULA_MAX_LENGTH) {
			problems.push({
				index,
				field: 'formula',
				message: `A formula cannot be longer than ${ACHIEVEMENT_FORMULA_MAX_LENGTH} characters`
			});
		} else {
			const error = formulaError(formula);
			if (error) problems.push({ index, field: 'formula', message: error });
		}
	});

	// A placeholder is only markup if it names a variable; one that names nothing
	// would go out to players verbatim, braces and all.
	const declared = new Set(variables.map((variable) => variable.name.trim()));
	for (const [label, text] of [
		['name', draft.name],
		['description', draft.description]
	] as const) {
		for (const placeholder of templateNames(text)) {
			if (declared.has(placeholder)) continue;
			problems.push({
				index: null,
				field: 'text',
				message: placeholder
					? `The ${label} templates {${placeholder}}, which no variable of this achievement declares`
					: `The ${label} has an empty {} placeholder`
			});
		}
	}

	return problems;
}

/**
 * The variables of an unknown body as a clean list, dropping anything that is not
 * a `{ name, formula }` pair. Narrowing only — {@link validateVariables} is what
 * decides whether the result is allowed; this is what makes sure a crafted body
 * cannot smuggle other fields into the git tree.
 */
export function normalizeVariables(value: unknown): AchievementVariable[] {
	if (!Array.isArray(value)) return [];
	const variables: AchievementVariable[] = [];
	for (const entry of value) {
		if (!entry || typeof entry !== 'object') continue;
		const draft = entry as Partial<AchievementVariable>;
		variables.push({
			name: typeof draft.name === 'string' ? draft.name.trim() : '',
			formula: typeof draft.formula === 'string' ? draft.formula.trim() : ''
		});
	}
	return variables;
}
