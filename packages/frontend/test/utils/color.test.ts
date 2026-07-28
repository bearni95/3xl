import { describe, it, expect } from 'vitest';
import {
	STRIKE_MULTIPLIERS,
	isPrimaryColor,
	isTeammateColor,
	strikeDice,
	strikeMultiplier,
	teammateColors,
	throwableColors
} from '$utils/color/compare';
import type { CombatColor } from '$types/character-definition.type';

const ALL: CombatColor[] = ['red', 'yellow', 'blue', 'purple', 'orange', 'green'];

describe('color strike table', () => {
	it('matches the authored attacker→defender matrix', () => {
		// Rows = attacker, columns = defender, in the order red/yellow/blue/purple/orange/green.
		const expected: Record<CombatColor, number[]> = {
			red: [2, 1, 1, 0.5, 0.5, 2],
			yellow: [1, 2, 1, 2, 0.5, 0.5],
			blue: [1, 1, 2, 0.5, 2, 0.5],
			purple: [2, 0.5, 2, 0.5, 1, 1],
			orange: [2, 2, 0.5, 1, 0.5, 1],
			green: [0.5, 2, 2, 1, 1, 0.5]
		};
		for (const attacker of ALL) {
			ALL.forEach((defender, col) => {
				expect(strikeMultiplier(attacker, defender)).toBe(expected[attacker][col]);
			});
		}
	});

	it('every pairing lands: no multiplier is zero, all are 0.5/1/2', () => {
		for (const attacker of ALL) {
			for (const defender of ALL) {
				expect([0.5, 1, 2]).toContain(strikeMultiplier(attacker, defender));
			}
		}
	});

	it('same primary strikes double, same compound strikes half', () => {
		expect(strikeMultiplier('red', 'red')).toBe(2);
		expect(strikeMultiplier('yellow', 'yellow')).toBe(2);
		expect(strikeMultiplier('blue', 'blue')).toBe(2);
		expect(strikeMultiplier('purple', 'purple')).toBe(0.5);
		expect(strikeMultiplier('orange', 'orange')).toBe(0.5);
		expect(strikeMultiplier('green', 'green')).toBe(0.5);
	});

	it('different same-family colours are even (x1) both directions', () => {
		const primaries: CombatColor[] = ['red', 'yellow', 'blue'];
		const compounds: CombatColor[] = ['purple', 'orange', 'green'];
		for (const family of [primaries, compounds]) {
			for (const a of family) {
				for (const b of family) {
					if (a === b) continue;
					expect(strikeMultiplier(a, b)).toBe(1);
				}
			}
		}
	});

	it('primary vs compound is reciprocal (2 one way, 0.5 the other)', () => {
		const primaries: CombatColor[] = ['red', 'yellow', 'blue'];
		const compounds: CombatColor[] = ['purple', 'orange', 'green'];
		for (const p of primaries) {
			for (const c of compounds) {
				const forward = strikeMultiplier(p, c);
				const back = strikeMultiplier(c, p);
				expect(forward * back).toBe(1); // 2 × 0.5
				expect(forward).not.toBe(back);
			}
		}
	});

	it('the exported table is the single source of truth', () => {
		for (const attacker of ALL) {
			for (const defender of ALL) {
				expect(strikeMultiplier(attacker, defender)).toBe(
					STRIKE_MULTIPLIERS[attacker][defender]
				);
			}
		}
	});

	it('strikeDice scales ATK by the colour multiplier', () => {
		// Dominant doubles the handful, even leaves it alone, weak halves it.
		expect(strikeDice(4, 'red', 'red')).toBe(8);
		expect(strikeDice(4, 'red', 'yellow')).toBe(4);
		expect(strikeDice(4, 'red', 'purple')).toBe(2);
	});

	it('strikeDice rounds to whole dice and never leaves nothing to roll', () => {
		// An odd ATK halved lands on a half-die: round up rather than down.
		expect(strikeDice(3, 'red', 'purple')).toBe(2);
		expect(strikeDice(5, 'red', 'purple')).toBe(3);
		// The smallest ATK there is, on its worst colour, still throws one die.
		expect(strikeDice(1, 'red', 'purple')).toBe(1);
		expect(strikeDice(0, 'red', 'purple')).toBe(1);
	});

	it('throwableColors yields the compound first, then its two components', () => {
		expect(throwableColors('purple')).toEqual(['purple', 'red', 'blue']);
		expect(throwableColors('orange')).toEqual(['orange', 'red', 'yellow']);
		expect(throwableColors('green')).toEqual(['green', 'blue', 'yellow']);
	});

	it('throwableColors of a primary yields it plus every compound that mixes it', () => {
		expect(throwableColors('red')).toEqual(['red', 'purple', 'orange']);
		expect(throwableColors('blue')).toEqual(['blue', 'purple', 'green']);
		expect(throwableColors('yellow')).toEqual(['yellow', 'orange', 'green']);
	});

	it('isPrimaryColor splits the six colors into their families', () => {
		expect(isPrimaryColor('red')).toBe(true);
		expect(isPrimaryColor('blue')).toBe(true);
		expect(isPrimaryColor('yellow')).toBe(true);
		expect(isPrimaryColor('purple')).toBe(false);
		expect(isPrimaryColor('orange')).toBe(false);
		expect(isPrimaryColor('green')).toBe(false);
	});

	it('teammateColors: a primary lead allows itself plus every compound containing it', () => {
		expect(teammateColors('red')).toEqual(['red', 'purple', 'orange']);
		expect(teammateColors('blue')).toEqual(['blue', 'purple', 'green']);
		expect(teammateColors('yellow')).toEqual(['yellow', 'orange', 'green']);
	});

	it('teammateColors: a compound lead allows itself plus its two component primaries', () => {
		expect(teammateColors('purple')).toEqual(['purple', 'red', 'blue']);
		expect(teammateColors('orange')).toEqual(['orange', 'red', 'yellow']);
		expect(teammateColors('green')).toEqual(['green', 'blue', 'yellow']);
	});

	it('isTeammateColor allows the shared-colour cases and rejects the rest', () => {
		// A blue lead: blue itself, plus purple and green (the compounds with blue).
		expect(isTeammateColor('blue', 'blue')).toBe(true);
		expect(isTeammateColor('blue', 'purple')).toBe(true);
		expect(isTeammateColor('blue', 'green')).toBe(true);
		expect(isTeammateColor('blue', 'red')).toBe(false);
		expect(isTeammateColor('blue', 'orange')).toBe(false);

		// An orange lead: orange itself, plus its makers red and yellow.
		expect(isTeammateColor('orange', 'orange')).toBe(true);
		expect(isTeammateColor('orange', 'red')).toBe(true);
		expect(isTeammateColor('orange', 'yellow')).toBe(true);
		expect(isTeammateColor('orange', 'blue')).toBe(false);
		expect(isTeammateColor('orange', 'green')).toBe(false);
	});
});
