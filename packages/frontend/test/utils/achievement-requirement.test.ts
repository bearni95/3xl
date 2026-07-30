import { describe, it, expect } from 'vitest';
import {
	conditionError,
	evaluateCondition,
	parseCondition,
	type FormulaCard,
	type FormulaContext
} from '$utils/achievement/formula';
import { achievementMet, variableNumbers } from '$utils/achievement/requirement';
import { validateVariables } from '$utils/achievement/variables';
import { achievementExpAward } from '$utils/progression/level';
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

/** Level 5, six cards: three red, two white-box, one fielded. */
const context: FormulaContext = {
	level: 5,
	cards: [
		card({ color: SpawnColor.Red, teamSlot: 0 }),
		card({ color: SpawnColor.Red }),
		card({ color: SpawnColor.Red }),
		card({ color: SpawnColor.Blue }),
		card({ color: SpawnColor.Purple, box: SpawnBox.White }),
		card({ color: SpawnColor.Orange, box: SpawnBox.White })
	]
};

describe('requirement conditions', () => {
	it('compares two amounts every way round', () => {
		expect(evaluateCondition('cards(color = red) >= 3', context)).toBe(true);
		expect(evaluateCondition('cards(color = red) > 3', context)).toBe(false);
		expect(evaluateCondition('cards(color = red) = 3', context)).toBe(true);
		expect(evaluateCondition('cards(color = red) != 3', context)).toBe(false);
		expect(evaluateCondition('level <= 5', context)).toBe(true);
		expect(evaluateCondition('level < 5', context)).toBe(false);
		// `==` is `=`, as it is inside a card filter.
		expect(evaluateCondition('cards == 6', context)).toBe(true);
	});

	it('compares amounts on both sides, not just a bare count', () => {
		expect(evaluateCondition('cards(color = red) >= level - 2', context)).toBe(true);
		expect(evaluateCondition('cards * 2 >= level * 3', context)).toBe(false);
	});

	it('combines conditions with and, or, not and parentheses', () => {
		expect(evaluateCondition('cards >= 6 and level >= 5', context)).toBe(true);
		expect(evaluateCondition('cards >= 6 and level >= 6', context)).toBe(false);
		expect(evaluateCondition('cards >= 99 or level >= 5', context)).toBe(true);
		expect(evaluateCondition('not cards(box = white) = 0', context)).toBe(true);
		expect(
			evaluateCondition('(cards >= 99 or level >= 5) and cards(team = true) >= 1', context)
		).toBe(true);
	});

	it('tells a parenthesised amount from a parenthesised condition', () => {
		// The same opening bracket, two different things after it.
		expect(evaluateCondition('(level + 1) >= 6', context)).toBe(true);
		expect(evaluateCondition('(level >= 5) and (cards >= 6)', context)).toBe(true);
		// Six cards and (5 * 2 - 4) = 6, so this one turns on the operator alone.
		expect(evaluateCondition('(level * 2 - 4) < cards', context)).toBe(false);
		expect(evaluateCondition('(level * 2 - 4) <= cards', context)).toBe(true);
	});

	it('reads the badge’s own variables by name', () => {
		const values = { target: 3, floor: 99 };
		expect(evaluateCondition('cards(color = red) >= target', { ...context, variables: values })).toBe(
			true
		);
		expect(evaluateCondition('cards >= floor', { ...context, variables: values })).toBe(false);
		// Source naming a variable that is not in scope does not parse, and an
		// unreadable rule is not met — the safe way round.
		expect(evaluateCondition('cards >= missing', { ...context, variables: values })).toBe(false);
		// A *tree* carrying a name nothing has a value for — which is what arrives from
		// the database when a variable was dropped — reads that name as 0 instead.
		const stale = parseCondition('cards >= missing', ['missing']);
		expect(evaluateCondition(stale, { ...context, variables: {} })).toBe(true);
	});

	it('refuses a requirement that is not a comparison, or names nothing', () => {
		expect(conditionError('cards >= 3')).toBeNull();
		expect(conditionError('   ')).toMatch(/cannot be empty/);
		expect(conditionError('cards')).toMatch(/Expected a comparison/);
		expect(conditionError('cards >= target')).toMatch(/Unknown value "target"/);
		expect(conditionError('cards >= target', ['target'])).toBeNull();
		expect(conditionError('cards(color = pink) >= 1')).toMatch(/"pink" is not a color/);
		expect(conditionError('cards >= 1 and')).toMatch(/ends early|Expected/);
	});

	it('says what a requirement can read when a name is not one of them', () => {
		expect(conditionError('wins >= 1', ['target'])).toMatch(/level, cards, target/);
	});

	it('parses to a tree whose shape is the wire format the database walks', () => {
		expect(parseCondition('cards(color = red) >= target', ['target'])).toEqual({
			kind: 'compare',
			op: '>=',
			left: {
				kind: 'cards',
				filter: { kind: 'match', field: 'color', negated: false, values: ['red'] }
			},
			right: { kind: 'variable', name: 'target' }
		});
	});

	it('reads an unparseable requirement as not met', () => {
		// The safe way round: a rule nobody can read has not been complied with.
		expect(evaluateCondition('cards >=', context)).toBe(false);
	});
});

describe('whether a badge has been earned', () => {
	const badge = {
		variables: [{ name: 'target', formula: 'level - 2' }],
		requirement: 'cards(color = red) >= target'
	};

	it('works the variables out for this player and holds the condition against them', () => {
		expect(variableNumbers(badge, context)).toEqual({ target: 3 });
		expect(achievementMet(badge, context)).toBe(true);
		// Level 8 wants six reds; this player has three.
		expect(achievementMet(badge, { ...context, level: 8 })).toBe(false);
	});

	it('reads a badge with no requirement as not earned', () => {
		expect(achievementMet({}, context)).toBe(false);
		expect(achievementMet({ requirement: '  ' }, context)).toBe(false);
	});

	it('compares on the raw value, not the rounded one the wording prints', () => {
		// target is 1.6667 — printed as "1.67", and a card count of 1 is below both.
		// What matters is that 2 >= 1.6667 and not 2 >= 1.67 decided it, which only a
		// third decimal place could tell apart: use a value where they differ.
		const thirds = { variables: [{ name: 'target', formula: '5 / 3' }], requirement: 'cards >= target' };
		expect(variableNumbers(thirds, context).target).toBeCloseTo(1.6666666, 6);
		expect(achievementMet(thirds, { ...context, cards: context.cards.slice(0, 2) })).toBe(true);
		expect(achievementMet(thirds, { ...context, cards: context.cards.slice(0, 1) })).toBe(false);
	});
});

describe('validating a requirement', () => {
	const badge = {
		name: 'Conqueridor',
		description: 'Conquereix {target}.',
		variables: [{ name: 'target', formula: 'level * 3' }]
	};

	it('passes a requirement that parses against the declared variables', () => {
		expect(validateVariables({ ...badge, requirement: 'cards >= target' })).toEqual([]);
		expect(validateVariables({ ...badge, requirement: '' })).toEqual([]);
		expect(validateVariables(badge)).toEqual([]);
	});

	it('reports one that will not parse, pointing at the requirement', () => {
		const [problem] = validateVariables({ ...badge, requirement: 'cards >= objectiu' });
		expect(problem).toMatchObject({ index: null, field: 'requirement' });
		expect(problem.message).toMatch(/Unknown value "objectiu"/);
	});

	it('caps its length', () => {
		const [problem] = validateVariables({
			...badge,
			requirement: `cards >= ${'1'.repeat(400)}`
		});
		expect(problem.message).toMatch(/cannot be longer than 400/);
	});
});

describe('the experience one achievement pays', () => {
	it('is a third of the level the player completes it on, rounded down', () => {
		// Level 1 spans 300 (0 → 300), level 2 spans 600 (300 → 900).
		expect(achievementExpAward(1)).toBe(100);
		expect(achievementExpAward(2)).toBe(200);
		expect(achievementExpAward(3)).toBe(600);
		expect(achievementExpAward(4)).toBe(1266);
	});

	it('is nothing at the cap, which has no next threshold', () => {
		expect(achievementExpAward(20)).toBe(0);
		expect(achievementExpAward(99)).toBe(0);
	});

	it('never goes below the first level’s award', () => {
		expect(achievementExpAward(0)).toBe(100);
		expect(achievementExpAward(-3)).toBe(100);
	});
});
