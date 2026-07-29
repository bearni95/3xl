import { describe, it, expect } from 'vitest';
import {
	isPrimaryColor,
	isTeammateColor,
	relatedColors,
	teammateColors
} from '$utils/color/compare';
import { colorTraits, traitIcons, ORDER_ICONS } from '$utils/color/traits';
import type { CombatColor } from '$types/character-definition.type';

const ALL: CombatColor[] = ['red', 'yellow', 'blue', 'purple', 'orange', 'green'];

describe('colour relation', () => {
	it('relatedColors yields a compound first, then its two components', () => {
		expect(relatedColors('purple')).toEqual(['purple', 'red', 'blue']);
		expect(relatedColors('orange')).toEqual(['orange', 'red', 'yellow']);
		expect(relatedColors('green')).toEqual(['green', 'blue', 'yellow']);
	});

	it('relatedColors of a primary yields it plus every compound that mixes it', () => {
		expect(relatedColors('red')).toEqual(['red', 'purple', 'orange']);
		expect(relatedColors('blue')).toEqual(['blue', 'purple', 'green']);
		expect(relatedColors('yellow')).toEqual(['yellow', 'orange', 'green']);
	});

	it('is reciprocal — relation never points only one way', () => {
		for (const a of ALL) {
			for (const b of relatedColors(a)) {
				expect(relatedColors(b)).toContain(a);
			}
		}
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

describe('colour traits', () => {
	it('gives each primary exactly the one trait it stands for', () => {
		expect(colorTraits('red')).toEqual({
			doubleAction: true,
			headStart: false,
			passiveGuard: false
		});
		expect(colorTraits('yellow')).toEqual({
			doubleAction: false,
			headStart: true,
			passiveGuard: false
		});
		expect(colorTraits('blue')).toEqual({
			doubleAction: false,
			headStart: false,
			passiveGuard: true
		});
	});

	it('gives a compound the two traits of the primaries it mixes, and only those', () => {
		// purple = red + blue: the second action and the free guard, but no head start.
		expect(colorTraits('purple')).toEqual({
			doubleAction: true,
			headStart: false,
			passiveGuard: true
		});
		// orange = red + yellow.
		expect(colorTraits('orange')).toEqual({
			doubleAction: true,
			headStart: true,
			passiveGuard: false
		});
		// green = blue + yellow.
		expect(colorTraits('green')).toEqual({
			doubleAction: false,
			headStart: true,
			passiveGuard: true
		});
	});

	it('never grants all three — every colour gives something up', () => {
		for (const color of ALL) {
			const traits = colorTraits(color);
			const granted = Object.values(traits).filter(Boolean).length;
			expect(granted).toBe(isPrimaryColor(color) ? 1 : 2);
		}
	});

	it('makes a compound the exact union of its two components', () => {
		const union = (a: CombatColor, b: CombatColor) => ({
			doubleAction: colorTraits(a).doubleAction || colorTraits(b).doubleAction,
			headStart: colorTraits(a).headStart || colorTraits(b).headStart,
			passiveGuard: colorTraits(a).passiveGuard || colorTraits(b).passiveGuard
		});
		expect(colorTraits('purple')).toEqual(union('red', 'blue'));
		expect(colorTraits('orange')).toEqual(union('red', 'yellow'));
		expect(colorTraits('green')).toEqual(union('blue', 'yellow'));
	});
});

describe('trait icons', () => {
	it('gives each primary the glyph of the order its trait bends', () => {
		expect(traitIcons('red')).toEqual([ORDER_ICONS.shoot]);
		expect(traitIcons('yellow')).toEqual([ORDER_ICONS.charge]);
		expect(traitIcons('blue')).toEqual([ORDER_ICONS.defend]);
	});

	it('gives a compound both of its components, in component order', () => {
		expect(traitIcons('purple')).toEqual([ORDER_ICONS.shoot, ORDER_ICONS.defend]);
		expect(traitIcons('orange')).toEqual([ORDER_ICONS.shoot, ORDER_ICONS.charge]);
		expect(traitIcons('green')).toEqual([ORDER_ICONS.defend, ORDER_ICONS.charge]);
	});

	it('draws one glyph for a primary and two for a compound, never the same twice', () => {
		for (const color of ALL) {
			const icons = traitIcons(color);
			expect(icons).toHaveLength(isPrimaryColor(color) ? 1 : 2);
			expect(new Set(icons).size).toBe(icons.length);
		}
	});
});
