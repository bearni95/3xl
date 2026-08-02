import { describe, expect, it } from 'vitest';
import slugify from '$utils/string/slugify';

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

	it('produces lowercase hyphenated ids from any name', () => {
		for (const name of ['First Blood', "L'Últim cop", 'Won — at last!', '3 in a row']) {
			expect(/^[a-z0-9-]+$/.test(slugify(name))).toBe(true);
		}
	});
});
