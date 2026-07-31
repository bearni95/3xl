import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inlineIconMarkup } from '$utils/icon/inline-svg';

const ASSETS_ICONS = join(__dirname, '../../../assets/public/icons');

/**
 * The one transform standing between the two vendored icon sets and the document.
 * A show's glyph is authored now, so either set can be picked for one — and the
 * game-icons.net half ships white on nothing, which inlined untouched is drawn and
 * invisible. That is the failure every case here is about.
 */
describe('inlineIconMarkup', () => {
	it('turns a baked white fill into the colour of whatever it sits in', () => {
		const markup = inlineIconMarkup(
			'<svg xmlns="http://www.w3.org/2000/svg" fill="#fff" viewBox="0 0 512 512"><path d="M0 0"/></svg>'
		);
		expect(markup).toContain('fill="currentColor"');
		expect(markup).not.toContain('#fff');
	});

	it('drops the artwork’s own size for one line of type', () => {
		// A 512px intrinsic size is one a browser may lay the glyph out at; `1em` is
		// what makes it a piece of type, sized by the text beside it.
		const markup = inlineIconMarkup(
			'<svg width="512" height="512" fill="#fff" viewBox="0 0 512 512"><path d="M0 0"/></svg>'
		);
		expect(markup).toContain('width="1em"');
		expect(markup).toContain('height="1em"');
		expect(markup).not.toMatch(/(?:width|height)="512"/);
		// The viewBox is the artwork's proportions and stays: it is what the 1em box
		// then holds the drawing inside.
		expect(markup).toContain('viewBox="0 0 512 512"');
	});

	it('leaves a hole in the artwork alone', () => {
		// `fill="none"` is not a colour — it is a shape that is not painted — so the
		// ink rewrite must not touch it.
		const markup = inlineIconMarkup(
			'<svg fill="#fff" viewBox="0 0 100 100"><path fill="none" d="M0 0"/><path fill="#FFFFFF" d="M1 1"/></svg>'
		);
		expect(markup).toContain('fill="none"');
		expect(markup?.match(/fill="currentColor"/g)).toHaveLength(2);
	});

	it('gives a root with no fill of its own the inherited colour', () => {
		const markup = inlineIconMarkup('<svg viewBox="0 0 100 100"><path d="M0 0"/></svg>');
		expect(markup).toContain('fill="currentColor"');
	});

	it('yields nothing for something that is not an SVG', () => {
		// A dev server answers a missing file with an HTML page, and injecting that
		// into the document is worse than drawing no glyph at all.
		expect(inlineIconMarkup('<!doctype html><html><body>Not found</body></html>')).toBeNull();
		expect(inlineIconMarkup('')).toBeNull();
	});

	it('leaves a glyph that was already a page’s glyph exactly as it was', () => {
		// The show marks ship ready for a document, so the transform has to be
		// idempotent — one path serves both sets, and running it twice is the same as
		// running it once.
		const raw = readFileSync(join(ASSETS_ICONS, 'shows/straw-hat.svg'), 'utf8');
		const once = inlineIconMarkup(raw);
		expect(once).toBe(inlineIconMarkup(once as string));
		expect(once).toContain('fill="currentColor"');
		expect(once).toContain('width="1em"');
	});

	it('makes a canvas glyph safe to inline', () => {
		// The case the whole file exists for: a game-icons.net glyph, vendored white
		// for a Pixi texture, picked as a show's mark and drawn into a table row.
		const raw = readFileSync(join(ASSETS_ICONS, 'lorc/bordered-shield.svg'), 'utf8');
		const markup = inlineIconMarkup(raw);
		expect(markup).toContain('fill="currentColor"');
		expect(markup).not.toMatch(/fill\s*=\s*"#f{3,6}"/i);
		expect(markup).toContain('width="1em"');
	});
});
