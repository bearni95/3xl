import { describe, it, expect } from 'vitest';
import foldText from '$utils/string/fold-text';

/**
 * What makes searching for a place possible in a language with an accent on nearly
 * every other word. Two surfaces match against it now — the map's own search over the
 * whole region tree, and the filter over the towns on a public profile — so it is a
 * shared util, and these are the cases both of them stand on.
 */
describe('foldText', () => {
	it('strips the accents Catalan place names are full of', () => {
		expect(foldText('Sant Julià')).toBe('sant julia');
		expect(foldText('Móra d’Ebre')).toBe('mora d’ebre');
		expect(foldText('Vilanova i la Geltrú')).toBe('vilanova i la geltru');
	});

	it('lower-cases, so a query need not be typed the way a name is printed', () => {
		expect(foldText('BARCELONA')).toBe('barcelona');
	});

	it('folds a query and a name to the same string, which is the whole point', () => {
		expect(foldText('lleida')).toBe(foldText('Lleida'));
		expect(foldText('alguer')).toBe(foldText('Alguer'));
		// The one that matters: typed without the accent, found with it.
		expect(foldText("l'Alguer").includes(foldText('alguer'))).toBe(true);
		expect(foldText('Sant Julià').includes(foldText('julia'))).toBe(true);
	});

	it('leaves ç alone, which is a letter and not an accented c', () => {
		// NFD does not decompose it, so it survives the strip — and it must, or `Berça`
		// and `Berca` would be the same string.
		expect(foldText('Cerdanyola')).toBe('cerdanyola');
		expect(foldText('Alforja')).toBe('alforja');
	});

	it('is idempotent: folding a folded string changes nothing', () => {
		expect(foldText(foldText('Castelló'))).toBe(foldText('Castelló'));
	});

	it('says nothing about an empty string', () => {
		expect(foldText('')).toBe('');
	});
});
