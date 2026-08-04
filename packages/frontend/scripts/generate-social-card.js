#!/usr/bin/env node
/**
 * @3xl/assets public/video/splash.png -> static/social-card.png
 *
 * The picture Discord, WhatsApp and the rest draw beside the link, which is the
 * splash's own first frame: the whole roster idling over the Països Catalans with
 * the game's badge at its middle, captured off the admin's `/posters` wall. The
 * card and the front door therefore show the same thing, which is the point — the
 * picture somebody is shown before they click is the picture they land on.
 *
 * It is not that frame whole. The splash is square, because `object-fit: cover`
 * frames the film by the window rather than by a ratio, so there is no landscape
 * original to take; a card *is* drawn in a wide box, so one is cut here — 1200x630,
 * the box a large card is laid out in everywhere rather than some ratio of the
 * splash's own, which is what keeps the picture from being resampled by whoever
 * draws it. The splash is larger in both directions, so the cut takes both: it keeps
 * the badge and the body of the roster and loses the outermost characters. The crop
 * is centred, and centred is the whole rule: nothing here is nudged by eye, so a
 * re-captured splash is re-cut the same way without anybody re-judging it.
 *
 * Alpha is flattened onto black — the splash's own field — rather than carried:
 * scrapers composite a transparent PNG against whatever they please, and a card
 * that comes up on white somewhere is not a card anybody chose.
 *
 * A copy is a thing that can go stale, hence a script rather than a crop somebody
 * once made by hand: re-run it whenever the splash is re-captured.
 *
 *   pnpm --filter @3xl/frontend generate:social-card
 *
 * It is a copy at all, rather than app.html pointing at the asset, because the URL
 * in a card is absolute and the file it names has to sit at a path that will not
 * move. static/ is that place — adapter-static copies it into dist/ as it is, so
 * the card lands at the site root beside the favicon. (@3xl/assets is copied into
 * dist/assets too, but behind a prefix that exists for the game's own loading and
 * could be re-mounted without anyone thinking about scrapers.)
 *
 * WIDTH/HEIGHT below are also what app.html declares as og:image:width/height —
 * change them here and there together, or the scraper reserves the wrong box.
 *
 * The drawn card this replaced (a yellow 3:2 plate with the wordmark and subtitle,
 * `social-card.svg` rasterised through librsvg) is gone from static/. It survives
 * inside this picture: it is the badge hanging at the wall's middle, and the admin
 * `/posters` screen still hangs *this file* there — so re-capturing the splash after
 * running this nests the card inside itself. Point CENTER_IMAGE at a drawing of its
 * own again before doing that.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'assets', 'public', 'video', 'splash.png');
const out = join(here, '..', 'static', 'social-card.png');

// The card's box: 1.91:1 at the size a large card is drawn at.
const WIDTH = 1200;
const HEIGHT = 630;

if (!existsSync(src)) {
	throw new Error(`splash frame not found at ${src} — the card is cut from it`);
}

try {
	execFileSync(
		'magick',
		[
			src,
			'-background',
			'black',
			'-alpha',
			'remove',
			'-alpha',
			'off',
			'-gravity',
			'center',
			'-crop',
			`${WIDTH}x${HEIGHT}+0+0`,
			'+repage',
			out
		],
		{ stdio: 'inherit' }
	);
} catch (err) {
	if (err.code === 'ENOENT') {
		throw new Error('magick not found — install it with: brew install imagemagick');
	}
	throw err;
}

console.log(`wrote ${out} (${WIDTH}x${HEIGHT}, ${(statSync(out).size / 1024).toFixed(0)}KB)`);
