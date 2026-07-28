import { describe, it, expect } from 'vitest';
import { iconMarkup } from '$components/core/icon-markup';

/**
 * The glob behind every inlined icon. It is keyed off a *path*, so a moved folder
 * or a renamed file breaks every call site silently — `Icon.svelte` renders nothing
 * at all for a name it cannot resolve, which reads on screen as a button with
 * nothing in it rather than as an error.
 */
describe('icon markup', () => {
	it('resolves the glyphs the combat orders are drawn with', () => {
		for (const name of ['lorc/rolling-energy', 'lorc/broadsword', 'lorc/bordered-shield']) {
			const markup = iconMarkup(name);
			expect(markup, name).toBeTruthy();
			expect(markup, name).toContain('<svg');
		}
	});

	it('paints them in the colour of whatever they sit in', () => {
		// The whole reason these are inlined rather than pointed at with an <img>.
		for (const name of ['lorc/rolling-energy', 'lorc/broadsword', 'lorc/bordered-shield']) {
			expect(iconMarkup(name), name).toContain('currentColor');
			// game-icons.net ships each glyph on an opaque black square; it must be gone.
			expect(iconMarkup(name), name).not.toContain('M0 0h512v512H0z');
		}
	});

	it('still resolves the show glyphs it took over from show-icon-markup', () => {
		expect(iconMarkup('shows/straw-hat')).toContain('<svg');
	});

	it('yields nothing for an unknown or absent name', () => {
		expect(iconMarkup('lorc/not-an-icon')).toBeNull();
		expect(iconMarkup(null)).toBeNull();
		expect(iconMarkup(undefined)).toBeNull();
	});
});
