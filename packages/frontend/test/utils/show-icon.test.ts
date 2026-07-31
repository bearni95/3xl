import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { showIconsByShow, forShow } from '$utils/show/show-icon';
import { inlineIconMarkup } from '$utils/icon/inline-svg';
import type { ShowEntry, ShowsCollection } from '$types/show.type';

// The same tree the app serves at /assets, and the same collection it reads from
// /data/shows.json — both off disk here, so a show pointed at a glyph nobody
// vendored fails in this suite rather than as a blank on the map.
const ASSETS_ICONS = join(__dirname, '../../../assets/public/icons');
const SHOWS_JSON = join(__dirname, '../../../data/public/shows.json');

const collection = JSON.parse(readFileSync(SHOWS_JSON, 'utf8')) as ShowsCollection;

/** A collection of just the ids and icons a case is about. */
function shows(...entries: [number, string?][]): ShowsCollection {
	return {
		shows: entries.map(([id, icon]) => ({
			show: { id },
			images: { id, all: [], posters: [], backdrops: [], logos: [] },
			...(icon ? { icon } : {})
		})) as unknown as ShowEntry[]
	};
}

describe('showIconsByShow', () => {
	it('keys each authored glyph by its show', () => {
		const icons = showIconsByShow(shows([35610, 'shows/bow-and-arrow'], [37854, 'lorc/pirate-hat']));
		expect(icons.get(35610)).toBe('shows/bow-and-arrow');
		expect(icons.get(37854)).toBe('lorc/pirate-hat');
	});

	it('leaves out a show nobody has picked one for', () => {
		// The panel's tables fall back to naming such a show — never to a stand-in
		// glyph — so absent and "mapped to nothing" have to be the same answer.
		const icons = showIconsByShow(shows([35610, 'shows/bow-and-arrow'], [30984]));
		expect(icons.has(30984)).toBe(false);
		expect(icons.size).toBe(1);
	});

	it('yields an empty map for a collection that never loaded', () => {
		expect(showIconsByShow(null).size).toBe(0);
		expect(showIconsByShow({ shows: [] }).size).toBe(0);
	});
});

describe('forShow', () => {
	it('passes a missing show straight through rather than throwing', () => {
		// A town whose sitting team belongs to no show, a track linked to nothing.
		const icons = showIconsByShow(shows([35610, 'shows/bow-and-arrow']));
		expect(forShow(icons, null)).toBeNull();
		expect(forShow(icons, undefined)).toBeNull();
		expect(forShow(icons, 12697)).toBeNull();
		expect(forShow(icons, 35610)).toBe('shows/bow-and-arrow');
	});
});

describe('the authored collection', () => {
	const authored = [...showIconsByShow(collection)];

	it('still badges the shows that have always carried a mark', () => {
		// The three the frontend used to hardcode. They are data now, so this is what
		// says the move did not quietly drop them.
		const icons = showIconsByShow(collection);
		expect(icons.get(35610)).toBe('shows/bow-and-arrow'); // InuYasha
		expect(icons.get(37854)).toBe('shows/straw-hat'); // One Piece
		expect(icons.get(12971)).toBe('shows/four-star-dragon-ball'); // Dragon Ball Z
	});

	it('points every picked icon at a file that actually ships', () => {
		// The pairing is authored while the artwork is vendored, so the two can drift:
		// a show pointed at a glyph nobody dropped in renders as nothing at all, which
		// reads on screen as a blank rather than as an error.
		for (const [showId, icon] of authored) {
			expect(existsSync(join(ASSETS_ICONS, `${icon}.svg`)), `${showId} → ${icon}`).toBe(true);
		}
	});

	it('ships icons that take the colour of the text beside them once inlined', () => {
		// The whole reason these are inlined rather than <img>-ed: the glyph has to
		// paint in the show name's colour, not its own. Either vendored set may be
		// picked now, so what has to hold is that the markup *as inlined* asks for the
		// surrounding colour — a glyph that reached the document with its baked white
		// intact would be drawn white on white and read by nobody.
		for (const [showId, icon] of authored) {
			const raw = readFileSync(join(ASSETS_ICONS, `${icon}.svg`), 'utf8');
			const markup = inlineIconMarkup(raw);
			expect(markup, `${showId} → ${icon}`).not.toBeNull();
			expect(markup).toContain('fill="currentColor"');
			expect(markup).not.toMatch(/fill\s*=\s*"(#fff|#ffffff|white)"/i);
			// No shape may re-assert black over the inherited colour either.
			expect(markup).not.toMatch(/fill\s*=\s*"(#000000|#000|black)"/i);
			// The attribution a Noun Project download bakes in is gone (it lives in
			// license.txt).
			expect(markup).not.toContain('<text');
		}
	});
});
