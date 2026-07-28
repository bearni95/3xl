import { describe, it, expect } from 'vitest';
import { iconMarkup } from '$components/core/icon-markup';

/**
 * The glob behind every inlined icon. It is keyed off a *path*, so a moved folder or
 * a renamed file breaks every call site silently — a component renders nothing at all
 * for a name it cannot resolve, which reads on screen as a blank rather than as an
 * error.
 */
describe('icon markup', () => {
	it('resolves the show glyphs, ready to take the colour they sit in', () => {
		const markup = iconMarkup('shows/straw-hat');
		expect(markup).toContain('<svg');
		// The whole reason these are inlined rather than pointed at with an <img>.
		expect(markup).toContain('currentColor');
	});

	it('leaves the canvas glyphs out of the document entirely', () => {
		// The combat orders are drawn into a Pixi texture and tinted there, so they
		// carry a baked white fill. Inlining one would put white on white wherever it
		// landed in the document — so they must not resolve here at all.
		for (const name of ['lorc/rolling-energy', 'lorc/broadsword', 'lorc/bordered-shield']) {
			expect(iconMarkup(name), name).toBeNull();
		}
	});

	it('yields nothing for an unknown or absent name', () => {
		expect(iconMarkup('shows/not-an-icon')).toBeNull();
		expect(iconMarkup(null)).toBeNull();
		expect(iconMarkup(undefined)).toBeNull();
	});
});
