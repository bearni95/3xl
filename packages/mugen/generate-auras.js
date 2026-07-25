/**
 * Slices the aura sprite sheet at the repo root into per-color animation
 * frames under static/auras/<color>/<n>.png — run `pnpm generate:auras`.
 *
 * The sheet (aura_effects_by_blaqshoes_d54t87y.png) is a 9-row × 4-column grid:
 * each row is one aura color, each column one animation frame. Only the rows
 * matching the game's six combat colors are exported. The sheet's black
 * background is removed by deriving each pixel's alpha from its brightest
 * channel and un-premultiplying the color, which reproduces the original
 * additive glow over any background.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SHEET = join(__dirname, 'aura_effects_by_blaqshoes_d54t87y.png');
// Decoded aura frames go into @3xl/assets, served at /assets/auras.
const OUT_DIR = join(__dirname, '..', 'assets', 'public', 'auras');

/** Measured horizontal band [start, end) of each animation frame column —
 * like the rows, the columns aren't spaced uniformly, so cut at the gaps. */
const COL_BANDS = [
	[0, 221],
	[221, 436],
	[436, 632],
	[632, 821]
];

/**
 * Measured vertical band [start, end) of each combat color's sheet row. The
 * sheet's rows are not uniformly spaced (blue and purple touch, orange starts
 * above the uniform boundary), so the bands were read off the actual content
 * gaps rather than divided evenly. The skipped rows (cyan, black, white) have
 * no combat color to serve.
 */
const COLOR_BANDS = {
	yellow: [0, 200],
	green: [200, 403],
	red: [403, 603],
	blue: [802, 1000],
	purple: [1000, 1202],
	orange: [1204, 1401]
};

const sheet = PNG.sync.read(readFileSync(SHEET));

for (const [color, [bandStart, bandEnd]] of Object.entries(COLOR_BANDS)) {
	const frameHeight = bandEnd - bandStart;
	const dir = join(OUT_DIR, color);
	mkdirSync(dir, { recursive: true });
	for (let col = 0; col < COL_BANDS.length; col++) {
		const [colStart, colEnd] = COL_BANDS[col];
		const frameWidth = colEnd - colStart;
		const frame = new PNG({ width: frameWidth, height: frameHeight });
		for (let y = 0; y < frameHeight; y++) {
			for (let x = 0; x < frameWidth; x++) {
				const src = ((bandStart + y) * sheet.width + (colStart + x)) * 4;
				const dst = (y * frameWidth + x) * 4;
				const r = sheet.data[src];
				const g = sheet.data[src + 1];
				const b = sheet.data[src + 2];
				// Glow over black: alpha is the brightest channel; un-premultiplying
				// the color keeps `color × alpha` equal to the original pixel.
				const alpha = Math.max(r, g, b);
				const scale = alpha > 0 ? 255 / alpha : 0;
				frame.data[dst] = Math.min(255, Math.round(r * scale));
				frame.data[dst + 1] = Math.min(255, Math.round(g * scale));
				frame.data[dst + 2] = Math.min(255, Math.round(b * scale));
				frame.data[dst + 3] = alpha;
			}
		}
		writeFileSync(join(dir, `${col + 1}.png`), PNG.sync.write(frame));
	}
	console.log(`${color}: ${COL_BANDS.length} frames (band ${bandStart}–${bandEnd})`);
}
