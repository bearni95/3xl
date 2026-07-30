import { describe, it, expect } from 'vitest';
import {
	FormulaError,
	evaluateFormula,
	formatFormulaValue,
	formulaError,
	parseFormula,
	type FormulaCard,
	type FormulaContext
} from '$utils/achievement/formula';
import {
	achievementValues,
	renderAchievement,
	renderTemplate,
	templateNames
} from '$utils/achievement/template';
import { normalizeVariables, validateVariables } from '$utils/achievement/variables';
import { SpawnBox, SpawnColor } from '$types/character-spawn.type';

function card(partial: Partial<FormulaCard> = {}): FormulaCard {
	return {
		characterId: 'son-goku',
		showId: 1399,
		locationId: 'ES_08019',
		color: SpawnColor.Red,
		box: SpawnBox.Black,
		teamSlot: null,
		...partial
	};
}

/** A player at level 5 holding six cards: three red, two white-box, one fielded. */
const context: FormulaContext = {
	level: 5,
	cards: [
		card({ color: SpawnColor.Red, teamSlot: 0 }),
		card({ color: SpawnColor.Red }),
		card({ color: SpawnColor.Red, showId: null }),
		card({ color: SpawnColor.Blue }),
		card({ color: SpawnColor.Purple, box: SpawnBox.White, characterId: 'vegeta' }),
		card({ color: SpawnColor.Orange, box: SpawnBox.White, locationId: 'ES_17079' })
	]
};

describe('formula arithmetic', () => {
	it('applies the usual precedence and parentheses', () => {
		expect(evaluateFormula('2 + 3 * 4', context)).toBe(14);
		expect(evaluateFormula('(2 + 3) * 4', context)).toBe(20);
		expect(evaluateFormula('10 % 4', context)).toBe(2);
		expect(evaluateFormula('7 / 2', context)).toBe(3.5);
	});

	it('reads unary minus and a right-associative exponent', () => {
		expect(evaluateFormula('-4 + 1', context)).toBe(-3);
		expect(evaluateFormula('-(2 + 3)', context)).toBe(-5);
		expect(evaluateFormula('2 ^ 3 ^ 2', context)).toBe(512);
		expect(evaluateFormula('2 * 3 ^ 2', context)).toBe(18);
	});

	it('reads decimals and never returns a non-finite number', () => {
		expect(evaluateFormula('1.5 * 2', context)).toBe(3);
		expect(evaluateFormula('5 / 0', context)).toBe(0);
		expect(evaluateFormula('5 % 0', context)).toBe(0);
		expect(evaluateFormula('10 ^ 400', context)).toBe(0);
	});
});

describe('formula sources', () => {
	it('reads the player level', () => {
		expect(evaluateFormula('level', context)).toBe(5);
		expect(evaluateFormula('level * 3', context)).toBe(15);
		// A hyphen next to a source is a subtraction, not part of a name.
		expect(evaluateFormula('level-1', context)).toBe(4);
	});

	it('counts every owned card, with or without empty parentheses', () => {
		expect(evaluateFormula('cards', context)).toBe(6);
		expect(evaluateFormula('cards()', context)).toBe(6);
		expect(evaluateFormula('cards / 2', context)).toBe(3);
	});

	it('mixes sources and arithmetic', () => {
		expect(evaluateFormula('(level + cards) * 2', context)).toBe(22);
	});

	it('reads a level the context has not loaded as zero', () => {
		expect(evaluateFormula('level', { level: Number.NaN, cards: [] })).toBe(0);
	});
});

describe('card filters', () => {
	it('counts by a single field', () => {
		expect(evaluateFormula('cards(color = red)', context)).toBe(3);
		expect(evaluateFormula('cards(box = white)', context)).toBe(2);
		expect(evaluateFormula('cards(team = true)', context)).toBe(1);
		expect(evaluateFormula('cards(team = false)', context)).toBe(5);
	});

	it('negates with !=', () => {
		expect(evaluateFormula('cards(color != red)', context)).toBe(3);
		// The card rolled across all shows has no show, so it is `!=` every id.
		expect(evaluateFormula('cards(show != 1399)', context)).toBe(1);
		expect(evaluateFormula('cards(show = 1399)', context)).toBe(5);
	});

	it('compounds with and, or, not, a comma and parentheses', () => {
		expect(evaluateFormula('cards(color = red and team = true)', context)).toBe(1);
		expect(evaluateFormula('cards(color = red, team = true)', context)).toBe(1);
		expect(evaluateFormula('cards(color = red or color = blue)', context)).toBe(4);
		expect(evaluateFormula('cards(box = white and not color = orange)', context)).toBe(1);
		expect(evaluateFormula('cards((color = red or color = blue) and box = black)', context)).toBe(4);
	});

	it('reads a list with in', () => {
		expect(evaluateFormula('cards(color in [red, blue])', context)).toBe(4);
		expect(evaluateFormula('cards(color in [green])', context)).toBe(0);
	});

	it('takes hyphenated and quoted values', () => {
		expect(evaluateFormula('cards(character = son-goku)', context)).toBe(5);
		expect(evaluateFormula('cards(character = vegeta)', context)).toBe(1);
		expect(evaluateFormula("cards(character = 'son-goku')", context)).toBe(5);
		expect(evaluateFormula('cards(location = ES_17079)', context)).toBe(1);
	});

	it('compares values without regard to case', () => {
		expect(evaluateFormula('cards(color = RED)', context)).toBe(3);
		expect(evaluateFormula('cards(location = es_17079)', context)).toBe(1);
	});
});

describe('formula parse errors', () => {
	it('refuses an empty formula', () => {
		expect(formulaError('   ')).toMatch(/cannot be empty/);
	});

	it('names an unknown source', () => {
		expect(formulaError('wins * 2')).toMatch(/Unknown value "wins"/);
	});

	it('names an unknown card field and an impossible value', () => {
		expect(formulaError('cards(rarity = gold)')).toMatch(/Unknown card field "rarity"/);
		expect(formulaError('cards(color = pink)')).toMatch(/"pink" is not a color/);
		expect(formulaError('cards(box = cardboard)')).toMatch(/"cardboard" is not a box/);
	});

	it('reports the offset it gave up at', () => {
		try {
			parseFormula('level + cards(color = pink)');
			expect.unreachable('should not parse');
		} catch (error) {
			expect(error).toBeInstanceOf(FormulaError);
			// The offset of `pink`, not of the formula or of the filter it sits in.
			expect((error as FormulaError).position).toBe(22);
		}
	});

	it('refuses unbalanced parentheses and dangling operators', () => {
		expect(formulaError('(level + 1')).toMatch(/Expected a closing/);
		expect(formulaError('cards(color = red')).toMatch(/Expected a closing/);
		expect(formulaError('level +')).toMatch(/ends early/);
		expect(formulaError('level 3')).toMatch(/Unexpected "3"/);
		expect(formulaError('cards(color red)')).toMatch(/Expected "=", "!=" or "in"/);
	});

	it('reads an unparseable formula as zero rather than throwing', () => {
		expect(evaluateFormula('level +', context)).toBe(0);
	});
});

describe('formatting a formula value', () => {
	it('keeps whole numbers whole and rounds the rest to two decimals', () => {
		expect(formatFormulaValue(10)).toBe('10');
		expect(formatFormulaValue(2.5)).toBe('2.5');
		expect(formatFormulaValue(1 / 3)).toBe('0.33');
		expect(formatFormulaValue(Number.POSITIVE_INFINITY)).toBe('0');
	});
});

describe('templating an achievement', () => {
	const achievement = {
		name: 'Conqueridor {target}',
		description: 'Conquereix {target} municipalitats amb {reds} cartes vermelles.',
		variables: [
			{ name: 'target', formula: 'level * 3' },
			{ name: 'reds', formula: 'cards(color = red)' }
		]
	};

	it('lists the placeholders in a piece of text', () => {
		expect(templateNames('a {one} and {two} and {one}')).toEqual(['one', 'two']);
		expect(templateNames('nothing here')).toEqual([]);
	});

	it('substitutes each variable into the name and the description', () => {
		expect(renderAchievement(achievement, context)).toEqual({
			name: 'Conqueridor 15',
			description: 'Conquereix 15 municipalitats amb 3 cartes vermelles.'
		});
	});

	it('evaluates every variable once, whatever the text quotes', () => {
		expect(achievementValues(achievement, context)).toEqual({ target: '15', reds: '3' });
	});

	it('leaves a placeholder naming nothing exactly as written', () => {
		expect(renderTemplate('holds {taget} of them', { target: '15' })).toBe('holds {taget} of them');
	});

	it('renders a badge with no variables as its authored text', () => {
		expect(renderAchievement({ name: 'First blood', description: 'Win a fight.' }, context)).toEqual(
			{ name: 'First blood', description: 'Win a fight.' }
		);
	});
});

describe('validating a badge’s variable set', () => {
	const ok = {
		name: 'Conqueridor',
		description: 'Conquereix {target} municipalitats.',
		variables: [{ name: 'target', formula: 'level * 3' }]
	};

	it('passes a set whose formulas parse and whose placeholders all resolve', () => {
		expect(validateVariables(ok)).toEqual([]);
		expect(validateVariables({ name: 'A', description: 'B' })).toEqual([]);
	});

	it('reports a placeholder no variable declares', () => {
		const problems = validateVariables({ ...ok, description: 'Conquereix {objectiu}.' });
		expect(problems).toHaveLength(1);
		expect(problems[0].field).toBe('text');
		expect(problems[0].message).toMatch(/\{objectiu\}/);
	});

	it('reports an empty placeholder', () => {
		expect(validateVariables({ ...ok, name: 'Conqueridor {}' })[0].message).toMatch(/empty \{\}/);
	});

	it('reports an unusable, duplicated or reserved name', () => {
		const [bad] = validateVariables({
			...ok,
			variables: [{ name: '2fast', formula: 'level' }],
			description: 'x'
		});
		expect(bad.field).toBe('name');
		expect(bad.message).toMatch(/not a usable variable name/);

		const duplicated = validateVariables({
			...ok,
			variables: [
				{ name: 'target', formula: 'level' },
				{ name: 'target', formula: 'cards' }
			]
		});
		expect(duplicated).toEqual([
			{ index: 1, field: 'name', message: '"target" is declared twice' }
		]);

		const reserved = validateVariables({
			...ok,
			variables: [{ name: 'cards', formula: 'level' }],
			description: 'x'
		});
		expect(reserved[0].message).toMatch(/what a formula calls the game's own value/);
	});

	it('reports a formula that is missing or will not parse, pointing at its row', () => {
		expect(validateVariables({ ...ok, variables: [{ name: 'target', formula: '  ' }] })).toEqual([
			{ index: 0, field: 'formula', message: 'A variable needs a formula' }
		]);
		const [broken] = validateVariables({
			...ok,
			variables: [{ name: 'target', formula: 'cards(color = pink)' }]
		});
		expect(broken).toMatchObject({ index: 0, field: 'formula' });
		expect(broken.message).toMatch(/"pink" is not a color/);
	});

	it('caps how many one badge may declare', () => {
		const variables = Array.from({ length: 9 }, (_, i) => ({
			name: `v${i}`,
			formula: 'level'
		}));
		expect(validateVariables({ ...ok, description: 'x', variables })[0].message).toMatch(
			/at most 8 variables/
		);
	});

	it('narrows an unknown list to name/formula pairs and drops the rest', () => {
		expect(
			normalizeVariables([
				{ name: ' target ', formula: ' level * 3 ', extra: 'dropped' },
				{ name: 'nope' },
				'garbage',
				null
			])
		).toEqual([
			{ name: 'target', formula: 'level * 3' },
			{ name: 'nope', formula: '' }
		]);
		expect(normalizeVariables(undefined)).toEqual([]);
	});
});
