import { describe, expect, it } from 'vitest';
import { formatCharacterCredit } from '@3xl/shared/utils/mugen/character-credit';

describe('formatCharacterCredit', () => {
	it('leaves a single name alone', () => {
		expect(formatCharacterCredit('Kenshiro99', 'Uncredited')).toBe('Kenshiro99');
	});

	it('reads a shared archive as a list of names', () => {
		expect(formatCharacterCredit('CHOUJIN&557&Kinhyakushiki&barbatos', 'Uncredited')).toBe(
			'CHOUJIN, 557, Kinhyakushiki, barbatos'
		);
	});

	it('trims the spacing an author wrote around the ampersands', () => {
		expect(formatCharacterCredit('ju & redblueyellow', 'Uncredited')).toBe('ju, redblueyellow');
	});

	it("says the catalogue's line for an archive that named nobody", () => {
		expect(formatCharacterCredit('Unknown', 'Uncredited')).toBe('Uncredited');
		expect(formatCharacterCredit('unknown', 'Uncredited')).toBe('Uncredited');
		expect(formatCharacterCredit('   ', 'Uncredited')).toBe('Uncredited');
	});

	it('keeps a credit that merely contains the word', () => {
		expect(formatCharacterCredit('Unknown Soldier', 'Uncredited')).toBe('Unknown Soldier');
	});
});
