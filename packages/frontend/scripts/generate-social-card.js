#!/usr/bin/env node
/**
 * static/social-card.svg -> static/social-card.png
 *
 * The picture Discord, WhatsApp and the rest draw beside the link. It is its own
 * drawing, not the favicon: 3:2 and landscape, because a card is shown in a wide
 * box, and carrying the subtitle, which the favicon has no room for.
 *
 * Why a script rather than one line in a comment: the SVG sets the subtitle in
 * Genos, the typeface the app's body is set in, and *neither* of the two things
 * that makes that render is guessable.
 *
 *   1. Genos is fetched from Google Fonts at run time by an `@import` in
 *      css/app.css — it is the one asset this project does not vendor, so it is
 *      not on disk and not installed. An SVG cannot carry it either: librsvg
 *      ignores `@font-face`, embedded base64 included, so a self-contained SVG
 *      is not on the table. It is downloaded here instead, into a cache dir, and
 *      handed to the renderer through a fontconfig root of its own — nothing is
 *      installed into the user's font directories.
 *   2. On macOS pango resolves fonts through CoreText, which never looks at that
 *      fontconfig root. `PANGOCAIRO_BACKEND=fc` is what makes it look. Without
 *      it the subtitle silently comes out in Helvetica — it still renders, so
 *      there is nothing to notice unless you know the letterforms.
 *
 * Run it after editing social-card.svg:  pnpm --filter @3xl/frontend generate:social-card
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const staticDir = join(here, '..', 'static');
const src = join(staticDir, 'social-card.svg');
const out = join(staticDir, 'social-card.png');

// The card's own pixel size. The SVG's viewBox is the same 3:2, so this only
// decides how finely it is rasterised, never the framing.
const WIDTH = 1200;
const HEIGHT = 800;

// The upstream variable font, the same family the browser gets from Google Fonts.
const FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/genos/Genos%5Bwght%5D.ttf';
const fontRoot = join(here, '.font-cache');
const fontFile = join(fontRoot, 'fonts', 'Genos.ttf');

if (!existsSync(fontFile)) {
	console.log('Genos not cached, fetching it…');
	mkdirSync(dirname(fontFile), { recursive: true });
	const res = await fetch(FONT_URL);
	if (!res.ok) throw new Error(`could not fetch Genos: ${res.status} ${res.statusText}`);
	writeFileSync(fontFile, Buffer.from(await res.arrayBuffer()));
}

try {
	execFileSync(
		'rsvg-convert',
		['-w', String(WIDTH), '-h', String(HEIGHT), '-f', 'png', '-o', out, src],
		{
			stdio: 'inherit',
			env: {
				...process.env,
				XDG_DATA_HOME: fontRoot, // fontconfig picks up <root>/fonts
				XDG_CACHE_HOME: join(fontRoot, 'cache'),
				PANGOCAIRO_BACKEND: 'fc' // see (2) above
			}
		}
	);
} catch (err) {
	if (err.code === 'ENOENT') {
		throw new Error('rsvg-convert not found — install it with: brew install librsvg');
	}
	throw err;
}

console.log(`wrote ${out} (${WIDTH}x${HEIGHT})`);
