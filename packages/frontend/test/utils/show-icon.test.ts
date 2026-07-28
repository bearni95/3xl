import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { showIconName } from '$utils/show/show-icon';

// The same tree the app serves at /assets, and that ShowIcon.svelte globs over.
const ASSETS_ICONS = join(__dirname, '../../../assets/public/icons');

// Every show the lookup currently has a glyph for.
const MAPPED_SHOW_IDS = [35610];

describe('showIconName', () => {
	it('maps a show with an icon to its /assets/icons path', () => {
		// InuYasha (TMDB 35610) is the first show to get a glyph.
		expect(showIconName(35610)).toBe('shows/bow-and-arrow');
	});

	it('returns null for a show no icon has been drawn for', () => {
		// One Piece (37854) is in the saved collection but has no glyph yet, so the
		// tables fall back to naming it — never to a stand-in icon.
		expect(showIconName(37854)).toBeNull();
	});

	it('returns null for a missing show rather than throwing', () => {
		// A town whose sitting team belongs to no show passes null straight through.
		expect(showIconName(null)).toBeNull();
		expect(showIconName(undefined)).toBeNull();
	});

	it('points every mapped icon at a file that actually ships', () => {
		// The lookup is hand-maintained while the SVGs are generated, so the two can
		// drift. Resolve each mapped name against @3xl/assets' public dir so a typo or
		// an un-generated icon fails here instead of rendering as nothing on the map.
		for (const id of MAPPED_SHOW_IDS) {
			const name = showIconName(id);
			expect(name).not.toBeNull();
			expect(existsSync(join(ASSETS_ICONS, `${name}.svg`))).toBe(true);
		}
	});

	it('ships icons that take the colour and size of the text beside them', () => {
		// The whole reason these are inlined rather than <img>-ed: the glyph has to
		// paint in the show name's colour, not its own. generate-show-icons.js emits
		// that, so this guards the generator's output as much as the mapping — an icon
		// that slipped through with a baked-in fill would render black in every theme.
		for (const id of MAPPED_SHOW_IDS) {
			const markup = readFileSync(join(ASSETS_ICONS, `${showIconName(id)}.svg`), 'utf8');
			expect(markup).toContain('fill="currentColor"');
			expect(markup).toContain('width="1em"');
			expect(markup).toContain('height="1em"');
			// No shape may re-assert black over the inherited colour.
			expect(markup).not.toMatch(/fill\s*=\s*"(#000000|#000|black)"/i);
			// The attribution the download baked in is gone (it lives in license.txt).
			expect(markup).not.toContain('<text');
		}
	});
});
