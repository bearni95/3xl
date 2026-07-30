import { describe, expect, it } from 'vitest';
import slugify from '$utils/string/slugify';
import { ACHIEVEMENT_ID_PATTERN } from '$types/achievement.type';

describe('slugify', () => {
	it('lowercases and joins words with hyphens', () => {
		expect(slugify('First Blood')).toBe('first-blood');
	});

	it('folds accents to their base letter instead of dropping them', () => {
		expect(slugify("L'Últim cop")).toBe('l-ultim-cop');
		expect(slugify('Caçador')).toBe('cacador');
	});

	it('collapses runs of punctuation and trims the ends', () => {
		expect(slugify('  ...Won — at last!!  ')).toBe('won-at-last');
	});

	it('returns an empty string for input with nothing to slug', () => {
		expect(slugify('!!!')).toBe('');
		expect(slugify('')).toBe('');
		expect(slugify(null)).toBe('');
		expect(slugify(undefined)).toBe('');
	});

	it('produces ids the achievement id pattern accepts', () => {
		for (const name of ['First Blood', "L'Últim cop", 'Won — at last!', '3 in a row']) {
			expect(ACHIEVEMENT_ID_PATTERN.test(slugify(name))).toBe(true);
		}
	});
});
