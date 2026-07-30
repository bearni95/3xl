import { describe, it, expect } from 'vitest';
import { type FormulaCard, type FormulaContext } from '$utils/achievement/formula';
import { achievementProgress, progressPercent } from '$utils/achievement/progress';
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

/** Level 5, six cards (three of them red), three towns held. */
const context: FormulaContext = {
	level: 5,
	towns: 3,
	cards: [
		card({ color: SpawnColor.Red }),
		card({ color: SpawnColor.Red }),
		card({ color: SpawnColor.Red }),
		card({ color: SpawnColor.Blue }),
		card({ color: SpawnColor.Blue }),
		card({ color: SpawnColor.Orange })
	]
};

describe('how far along a badge is', () => {
	it('is the ratio of what the player has to what the rule asks for', () => {
		expect(achievementProgress({ requirement: 'cards >= 12' }, context)).toBe(0.5);
		expect(achievementProgress({ requirement: 'towns >= 12' }, context)).toBe(0.25);
		// A rule written on the badge's own variable is read at that variable's value:
		// level 5 wants 10, and three red cards is under a third of it.
		const badge = { variables: [{ name: 'target', formula: 'level * 2' }] };
		expect(
			achievementProgress({ ...badge, requirement: 'cards(color = red) >= target' }, context)
		).toBe(0.3);
	});

	it('is 1 for a rule that holds, whatever the ratio would have said', () => {
		// Six cards against a bar of three is a ratio of two; a badge is not 200% done.
		expect(achievementProgress({ requirement: 'cards >= 3' }, context)).toBe(1);
		expect(achievementProgress({ requirement: 'cards(color = red) = 3' }, context)).toBe(1);
		expect(achievementProgress({ requirement: 'cards != 99' }, context)).toBe(1);
	});

	it('is nothing at all for a bar no amount of playing reaches', () => {
		// An unmet comparison against a bar of zero: `cards > 0` cannot be unmet here, so
		// the case is a player with nothing.
		expect(achievementProgress({ requirement: 'cards > 0' }, { ...context, cards: [] })).toBe(0);
		// Unequal is unequal or it is not — there is no being partway to it.
		expect(achievementProgress({ requirement: 'cards != 6' }, context)).toBe(0);
	});

	it('reads a rule the wrong way round from the other side', () => {
		// Six cards have to come down to three, and the bar over the amount is how much of
		// that is done.
		expect(achievementProgress({ requirement: 'cards <= 3' }, context)).toBe(0.5);
		expect(achievementProgress({ requirement: 'cards <= 6' }, context)).toBe(1);
	});

	it('reads an equality as how close the two amounts are', () => {
		// Six against ten: four apart out of ten.
		expect(achievementProgress({ requirement: 'cards = 10' }, context)).toBeCloseTo(0.6, 10);
	});

	it('averages an and, and takes the best branch of an or', () => {
		// Six of twelve cards is half, three of three towns is done: the mean of the two
		// halves rather than the worse of them, so holding one of two things shows.
		expect(achievementProgress({ requirement: 'cards >= 12 and towns >= 3' }, context)).toBe(0.75);
		// The nearer branch is the one the player will finish.
		expect(achievementProgress({ requirement: 'cards >= 24 or cards >= 12' }, context)).toBe(0.5);
	});

	it('is what is left of the operand for a not', () => {
		expect(achievementProgress({ requirement: 'not cards >= 12' }, context)).toBe(1);
		expect(achievementProgress({ requirement: 'not cards >= 3' }, context)).toBe(0);
	});

	it('is nothing for a badge with no rule, or one nobody can read', () => {
		// Nothing says what earns it, so no amount of playing is progress towards it —
		// the same reading `achievementMet` takes of the same badge.
		expect(achievementProgress({}, context)).toBe(0);
		expect(achievementProgress({ requirement: '   ' }, context)).toBe(0);
		expect(achievementProgress({ requirement: 'cards >=' }, context)).toBe(0);
		expect(achievementProgress({ requirement: 'cards >= objectiu' }, context)).toBe(0);
	});
});

describe('the percentage a tile prints', () => {
	it('rounds down, so an unearned badge never reads 100', () => {
		expect(progressPercent(0.6)).toBe(60);
		expect(progressPercent(0.999)).toBe(99);
		// 1 is the verdict, not a rounding: only a met rule prints 100.
		expect(progressPercent(1)).toBe(100);
	});

	it('reads nothing, and nonsense, as no progress', () => {
		expect(progressPercent(0)).toBe(0);
		expect(progressPercent(-1)).toBe(0);
		expect(progressPercent(Number.NaN)).toBe(0);
	});
});
