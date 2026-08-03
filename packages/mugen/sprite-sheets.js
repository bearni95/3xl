/**
 * Characters that arrive as a ripped sprite sheet instead of a MUGEN archive.
 *
 * A MUGEN character ships its frames in an .sff and its animations in an .air, and
 * ./generate-sprites.js decodes the pair. Some characters exist only as a **sheet**:
 * one PNG off a site like The Spriters Resource, with every animation the game holds
 * laid out in labelled rows of framed cells. This module reads one of those and
 * produces the very same output — frame PNGs and a manifest.json in @3xl/assets,
 * under the same names, in the same shape — so that past the decode nothing
 * downstream can tell the two kinds of character apart. The registry, the
 * definition, the admin's editor, the board and the frames/faces pages all read a
 * manifest, and a manifest is a manifest.
 *
 * What the sheets look like, and what is therefore read off them:
 *
 *   · The **page background** is the colour of the sheet's corner. It is what lies
 *     between the cells and around everything.
 *   · A **cell** is a solid rectangle of the sheet's cell colour with one frame
 *     drawn on it. The rectangle is the ripper's own crop and carries no alignment:
 *     it hugs the frame, quantised to the game's 8-pixel tiles, so where a frame
 *     sits inside its cell says nothing about where the character stands.
 *   · A **strip** is the run of cells of one animation, cut where the sheet's own
 *     captions say — every animation is captioned, either above its first cell or
 *     beside its last, and which of the two a sheet does is settled by counting. An
 *     animation too long for the width wraps onto the next line uncaptioned, and
 *     belongs to the strip above it.
 *   · What is left over — the **promo art** these sheets close on, pasted into a
 *     corner, sometimes on a background of its own — is captioned by nobody, and is
 *     read as the character's portraits rather than as an animation of it.
 *   · The **captions themselves are pixels**, and are not read here. What each strip
 *     is called is authored, in the sidecar beside the sheet — see {@link readSheetSource}.
 *
 * The one thing a sheet cannot give is an **axis**: MUGEN records, per sprite, the
 * point the character stands on, and a sheet records nothing at all. So it is
 * recovered — every frame is laid over the frame its own strip opens on and slid
 * sideways until the two overlap best ({@link alignHorizontally}), which is what
 * holds a walk cycle still instead of letting the body swing with the arms; and each
 * strip's opening frame is laid the same way over the character's idle, so the
 * animations agree with each other. Vertically nothing is inferred: a frame is cropped to its own pixels
 * and stands on its bottom edge, which is exactly what the board does with a MUGEN
 * character too.
 *
 * Durations are not on a sheet either. One length applies to every frame, from the
 * sidecar's `frameMs`.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { PNG } from 'pngjs';

/** A sheet's cells are its own colour; a frame drawn on one never is. */
const MIN_EXTRA_BACKGROUND = 0.003;
/** Below this a rectangle of a second background colour is a coincidence, not art. */
const MIN_EXTRA_AREA = 1000;
/** A label is a line of writing, and writing on these sheets is seven pixels tall. */
const LABEL_MIN_HEIGHT = 5;
const LABEL_MAX_HEIGHT = 16;
const LABEL_MIN_INK = 8;
/** How far from a strip a caption may be written and still be that strip's. */
const LABEL_REACH = 40;
/** The space a sheet leaves between the words of one caption. */
const WORD_SPACE = 8;
/** How far below a strip its wrapped remainder may start. */
const WRAP_REACH = 12;
/** Default frame length when a sheet's sidecar does not name one. */
const DEFAULT_FRAME_MS = 100;
/** The range `CharacterDefinition.renderScale` is validated against; kept in step
 * with `@3xl/shared/types/character-definition.type`, which this package (plain
 * Node, no TypeScript) cannot import. */
const RENDER_SCALE_MIN = 0.25;
const RENDER_SCALE_MAX = 4;

// ---------------------------------------------------------------------------
// Reading the sheet
// ---------------------------------------------------------------------------

/**
 * The sheet and the sidecar of one character, from `characters-src/<dir>/`.
 *
 * The sidecar is the authored half of a sheet import and the only half: the sheet's
 * captions are drawn as pixels, so what each strip is called is written down instead
 * of read. `strips` is one name per **captioned** strip, in the order this module
 * finds them — reading order, top to bottom and left to right within a line. Names
 * may be left null; those strips still land in the manifest, under `strip-<n>`.
 */
export function readSheetSource(srcDir) {
	const png = PNG.sync.read(readFileSync(join(srcDir, 'sheet.png')));
	const sidecar = JSON.parse(readFileSync(join(srcDir, 'sheet.json'), 'utf-8'));
	return { png, sidecar };
}

/** True when this characters-src folder holds a sprite sheet rather than a .sff. */
export function isSheetSource(srcDir) {
	return existsSync(join(srcDir, 'sheet.png')) && existsSync(join(srcDir, 'sheet.json'));
}

/** A reader for one PNG's pixels as packed rgb, plus its alpha. */
function reader(png) {
	const { width, data } = png;
	return {
		rgb: (x, y) => {
			const o = (y * width + x) * 4;
			return (data[o] << 16) | (data[o + 1] << 8) | data[o + 2];
		}
	};
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

/**
 * Every cell of one background colour, as rectangles.
 *
 * Read row by row: a run opens on the background colour and closes on the last
 * background pixel before the page shows through, so a frame drawn over the middle
 * of its cell does not cut the run in two. Runs are stitched down the rows wherever
 * they overlap, and a run may bridge two rectangles already open.
 */
function cellRects(png, page, background) {
	const { width, height } = png;
	const { rgb } = reader(png);
	const rects = [];
	let open = [];
	for (let y = 0; y < height; y++) {
		const runs = [];
		let x = 0;
		while (x < width) {
			if (rgb(x, y) !== background) {
				x++;
				continue;
			}
			const start = x;
			let last = x;
			while (x < width && rgb(x, y) !== page) {
				if (rgb(x, y) === background) last = x;
				x++;
			}
			runs.push([start, last]);
		}
		const next = [];
		for (const [a, b] of runs) {
			const hits = open.filter((r) => a <= r.maxX && b >= r.minX);
			if (hits.length === 0) {
				const rect = { minX: a, maxX: b, minY: y, maxY: y, background };
				rects.push(rect);
				next.push(rect);
				continue;
			}
			const head = hits[0];
			for (const other of hits.slice(1)) {
				head.minX = Math.min(head.minX, other.minX);
				head.maxX = Math.max(head.maxX, other.maxX);
				head.minY = Math.min(head.minY, other.minY);
				head.maxY = Math.max(head.maxY, other.maxY);
				rects.splice(rects.indexOf(other), 1);
				const k = next.indexOf(other);
				if (k >= 0) next.splice(k, 1);
			}
			head.minX = Math.min(head.minX, a);
			head.maxX = Math.max(head.maxX, b);
			head.maxY = y;
			if (!next.includes(head)) next.push(head);
		}
		open = next;
	}

	// A frame drawn across the whole width of its cell leaves no background on that
	// row, which closes the run above it and opens a new one below. Two cells of
	// different strips are told apart from the halves of one cell by what lies
	// between them — the page, which a frame never is.
	rects.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
	for (let i = 0; i < rects.length; i++) {
		const a = rects[i];
		if (!a) continue;
		for (let j = i + 1; j < rects.length; j++) {
			const b = rects[j];
			if (!b) continue;
			if (b.minY > a.maxY + 8) break;
			if (b.minY <= a.maxY || b.minX > a.maxX || b.maxX < a.minX) continue;
			let clear = true;
			for (let y = a.maxY + 1; y < b.minY && clear; y++)
				for (let x = Math.max(a.minX, b.minX); x <= Math.min(a.maxX, b.maxX); x++)
					if (rgb(x, y) === page) {
						clear = false;
						break;
					}
			if (!clear) continue;
			a.minX = Math.min(a.minX, b.minX);
			a.maxX = Math.max(a.maxX, b.maxX);
			a.maxY = Math.max(a.maxY, b.maxY);
			rects[j] = null;
		}
	}
	return rects.filter(Boolean);
}

/**
 * The sheet's cells, and the colours they are drawn on.
 *
 * The commonest colour that is not the page is the sheet's cell colour, and its
 * rectangles are the animations. Sheets also tend to close on **promo art** — a
 * character portrait pasted in over a background of its own — which is picked up as a
 * further colour, and kept apart from the animations (`extra`): it is not a frame of
 * anything, it is a portrait, and being several times the height of a cell it would
 * otherwise swallow the lines it stands beside.
 *
 * What a second background has to prove is that it *is* one: a rectangle solidly
 * filled, standing on the page on every side, and standing nowhere inside a cell
 * already found. A flash of white is none of those — it stands on the cell it is
 * drawn on — and these are the tests that keep it from being read as a background
 * and taken out of the frame it belongs to. Which matters twice over, because a
 * background colour is matched everywhere it appears within the cells it backs, so
 * one accepted in error does not leave a mark, it leaves a hole.
 *
 * Each cell records the colour it was found on, and is cut against that one alone:
 * the greens the animations are laid on and the green a portrait is pasted over are
 * different greens, and neither is background to the other's art.
 */
export function findCells(png) {
	const { width, height } = png;
	const { rgb } = reader(png);
	const page = rgb(0, 0);
	const counts = new Map();
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const c = rgb(x, y);
			if (c !== page) counts.set(c, (counts.get(c) ?? 0) + 1);
		}
	const ranked = [...counts].sort((a, b) => b[1] - a[1]);
	const backgrounds = [ranked[0][0]];
	const rects = cellRects(png, page, ranked[0][0]);
	const extra = [];

	/** Solidly filled, and standing on the page rather than on something else. */
	const standsAlone = (r) => {
		let filled = 0;
		for (let y = r.minY; y <= r.maxY; y++)
			for (let x = r.minX; x <= r.maxX; x++) if (rgb(x, y) !== page) filled++;
		const area = (r.maxX - r.minX + 1) * (r.maxY - r.minY + 1);
		if (filled < area * 0.95) return false;
		let border = 0;
		let onPage = 0;
		const look = (x, y) => {
			if (x < 0 || y < 0 || x >= width || y >= height) return;
			border++;
			if (rgb(x, y) === page) onPage++;
		};
		for (let x = r.minX; x <= r.maxX; x++) {
			look(x, r.minY - 1);
			look(x, r.maxY + 1);
		}
		for (let y = r.minY; y <= r.maxY; y++) {
			look(r.minX - 1, y);
			look(r.maxX + 1, y);
		}
		return border > 0 && onPage >= border * 0.9;
	};

	const inside = (r) =>
		rects.some((o) => r.minX >= o.minX && r.maxX <= o.maxX && r.minY >= o.minY && r.maxY <= o.maxY);
	for (const [colour, n] of ranked.slice(1)) {
		if (n < width * height * MIN_EXTRA_BACKGROUND) break;
		const found = cellRects(png, page, colour).filter(
			(r) =>
				(r.maxX - r.minX + 1) * (r.maxY - r.minY + 1) >= MIN_EXTRA_AREA &&
				!inside(r) &&
				standsAlone(r)
		);
		if (found.length === 0) continue;
		backgrounds.push(colour);
		extra.push(...found);
	}
	rects.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
	extra.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
	return { page, backgrounds, rects, extra };
}

// ---------------------------------------------------------------------------
// Captions and strips
// ---------------------------------------------------------------------------

/**
 * Every caption written on the sheet: blocks of ink outside any cell, with the
 * letters of one caption joined back into a word. They are merged to a fixpoint
 * rather than in one pass, because the letters of one caption arrive interleaved
 * with another's — a capital starts higher up its line than the letter beside it.
 *
 * Only a line of writing counts. Sprites do occasionally reach past the cell they
 * are drawn on — a beam, a trail — and what escapes is a bar a few pixels tall,
 * which would otherwise cut an animation in two where nothing is written.
 */
export function findCaptions(png, page, rects) {
	const { width, height } = png;
	const { rgb } = reader(png);
	const inCell = new Uint8Array(width * height);
	for (const c of rects)
		for (let y = c.minY; y <= c.maxY; y++)
			for (let x = c.minX; x <= c.maxX; x++) inCell[y * width + x] = 1;

	const seen = new Uint8Array(width * height);
	const blocks = [];
	const stack = [];
	for (let y0 = 0; y0 < height; y0++)
		for (let x0 = 0; x0 < width; x0++) {
			const i0 = y0 * width + x0;
			if (seen[i0] || inCell[i0] || rgb(x0, y0) === page) continue;
			const block = { minX: x0, maxX: x0, minY: y0, maxY: y0, ink: 0 };
			blocks.push(block);
			seen[i0] = 1;
			stack.push(i0);
			while (stack.length > 0) {
				const i = stack.pop();
				const x = i % width;
				const y = (i - x) / width;
				block.ink++;
				if (x < block.minX) block.minX = x;
				if (x > block.maxX) block.maxX = x;
				if (y < block.minY) block.minY = y;
				if (y > block.maxY) block.maxY = y;
				for (const [dx, dy] of [
					[-1, 0],
					[1, 0],
					[0, -1],
					[0, 1]
				]) {
					const nx = x + dx;
					const ny = y + dy;
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
					const j = ny * width + nx;
					if (seen[j] || inCell[j] || rgb(nx, ny) === page) continue;
					seen[j] = 1;
					stack.push(j);
				}
			}
		}

	for (let merged = true; merged;) {
		merged = false;
		for (let i = 0; i < blocks.length && !merged; i++)
			for (let j = i + 1; j < blocks.length && !merged; j++) {
				const a = blocks[i];
				const b = blocks[j];
				if (Math.max(a.minX - b.maxX, b.minX - a.maxX) > WORD_SPACE) continue;
				if (a.minY > b.maxY + 2 || b.minY > a.maxY + 2) continue;
				a.minX = Math.min(a.minX, b.minX);
				a.maxX = Math.max(a.maxX, b.maxX);
				a.minY = Math.min(a.minY, b.minY);
				a.maxY = Math.max(a.maxY, b.maxY);
				a.ink += b.ink;
				blocks.splice(j, 1);
				merged = true;
			}
	}
	return blocks.filter((b) => {
		const h = b.maxY - b.minY + 1;
		return h >= LABEL_MIN_HEIGHT && h <= LABEL_MAX_HEIGHT && b.ink >= LABEL_MIN_INK;
	});
}

/**
 * The sheet's strips, in reading order.
 *
 * Cells standing level with each other make one line of the sheet, which may still
 * carry two captioned strips side by side. A line is cut where its captions say:
 * above the first cell of a strip, or beside its last — whichever this sheet does,
 * settled by counting how often each holds. What is left over is a wrap: a strip too
 * long for the sheet runs on at the left margin of the next line, uncaptioned, and
 * belongs to the strip above it.
 *
 * Level is judged against the cell that opened the line, never against how far the
 * line has grown: the cells of one line are the ripper's own crops and neither their
 * tops nor their bottoms agree, and a single tall one — a frame whose effect towers
 * over the character — would otherwise reach far enough down to gather the whole line
 * beneath it into itself.
 */
export function findStrips(rects, captions) {
	const lines = [];
	for (const r of rects) {
		const line = lines[lines.length - 1];
		const lead = line?.cells[0];
		const overlap = lead ? Math.min(lead.maxY, r.maxY) - Math.max(lead.minY, r.minY) + 1 : 0;
		if (line && overlap >= Math.min(lead.maxY - lead.minY + 1, r.maxY - r.minY + 1) / 2) {
			line.cells.push(r);
			line.maxY = Math.max(line.maxY, r.maxY);
			line.minY = Math.min(line.minY, r.minY);
		} else lines.push({ minY: r.minY, maxY: r.maxY, cells: [r] });
	}
	for (const line of lines) line.cells.sort((a, b) => a.minX - b.minX);

	let above = 0;
	let beside = 0;
	for (const caption of captions)
		for (const line of lines) {
			if (line.minY - caption.maxY > 0 && line.minY - caption.maxY <= 6)
				above += line.cells.some((c) => Math.abs(c.minX - caption.minX) <= 6) ? 1 : 0;
			if (caption.minY >= line.minY - 4 && caption.maxY <= line.maxY + 4)
				beside += line.cells.some(
					(c) => caption.minX - c.maxX > 0 && caption.minX - c.maxX <= LABEL_REACH
				)
					? 1
					: 0;
		}
	const captionsAbove = above >= beside;

	const strips = [];
	for (const line of lines) {
		const opens = new Set([line.cells[0]]);
		const captioned = [];
		for (const caption of captions) {
			let cell = null;
			if (captionsAbove) {
				if (line.minY - caption.maxY <= 0 || line.minY - caption.maxY > 6) continue;
				cell = line.cells.find((c) => Math.abs(c.minX - caption.minX) <= 6);
				if (cell) opens.add(cell);
			} else {
				if (caption.minY < line.minY - 4 || caption.maxY > line.maxY + 4) continue;
				cell = [...line.cells]
					.reverse()
					.find((c) => caption.minX - c.maxX > 0 && caption.minX - c.maxX <= LABEL_REACH);
				if (cell) {
					const i = line.cells.indexOf(cell);
					if (i + 1 < line.cells.length) opens.add(line.cells[i + 1]);
				}
			}
			if (cell) captioned.push(cell);
		}
		let current = null;
		for (const cell of line.cells) {
			if (!current || opens.has(cell)) {
				current = { cells: [cell], captioned: false };
				strips.push(current);
			} else current.cells.push(cell);
		}
		for (const cell of captioned) {
			const strip = strips.find((s) => s.cells.includes(cell));
			if (strip) strip.captioned = true;
		}
	}

	const margin = Math.min(...rects.map((r) => r.minX));
	const joined = [];
	for (const strip of strips) {
		const bounds = (s) => {
			s.minX = Math.min(...s.cells.map((c) => c.minX));
			s.maxX = Math.max(...s.cells.map((c) => c.maxX));
			s.minY = Math.min(...s.cells.map((c) => c.minY));
			s.maxY = Math.max(...s.cells.map((c) => c.maxY));
			return s;
		};
		bounds(strip);
		const previous = joined[joined.length - 1];
		if (
			!strip.captioned &&
			previous &&
			strip.minX <= margin + 2 &&
			strip.minY > previous.maxY &&
			strip.minY - previous.maxY <= WRAP_REACH
		) {
			previous.cells.push(...strip.cells);
			bounds(previous);
			continue;
		}
		joined.push(strip);
	}
	return joined;
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

/**
 * One cell as a frame: its own pixels, cropped to them.
 *
 * Every pixel of this cell's own background colour goes, wherever in the cell it is
 * standing. It was flooded in from the border at first, on the theory that a patch of
 * the background colour the artwork encloses is a patch the artwork meant — but what
 * the artwork encloses is the gap under an arm, the loop of a tail, the space between
 * two legs, and each of those came out carrying a lump of the sheet's green through
 * onto the board. A chroma key is a colour the art does not use, which is the whole
 * reason a ripper picks one, so matching it takes the background and only the
 * background. *This cell's* key, though, and not every key on the sheet: a sheet that
 * pastes its promo art over a second green does not thereby make that green
 * transparent in the frames laid on the first. Returns null for a cell holding
 * nothing.
 */
function cutFrame(png, rect, page) {
	const { rgb } = reader(png);
	const w = rect.maxX - rect.minX + 1;
	const h = rect.maxY - rect.minY + 1;
	const cleared = new Uint8Array(w * h);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const c = rgb(rect.minX + x, rect.minY + y);
			if (c === page || c === rect.background) cleared[y * w + x] = 1;
		}

	let minX = w;
	let maxX = -1;
	let minY = h;
	let maxY = -1;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			if (cleared[y * w + x]) continue;
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	if (maxX < 0) return null;

	const fw = maxX - minX + 1;
	const fh = maxY - minY + 1;
	const rgba = Buffer.alloc(fw * fh * 4);
	const mask = new Uint8Array(fw * fh);
	for (let y = 0; y < fh; y++)
		for (let x = 0; x < fw; x++) {
			const sx = minX + x;
			const sy = minY + y;
			if (cleared[sy * w + sx]) continue;
			const so = ((rect.minY + sy) * png.width + rect.minX + sx) * 4;
			const dof = (y * fw + x) * 4;
			rgba[dof] = png.data[so];
			rgba[dof + 1] = png.data[so + 1];
			rgba[dof + 2] = png.data[so + 2];
			rgba[dof + 3] = 255;
			mask[y * fw + x] = 1;
		}
	return { width: fw, height: fh, rgba, mask };
}

/**
 * How far sideways `frame` has to slide to sit best over `over`, both standing on
 * their bottom edge. The best overlap is the one where the most of each frame covers
 * the other (intersection over union) — the only thing a sheet leaves to recover an
 * axis from, and enough of one: two frames of a walk cycle are the same character a
 * few pixels along, so the shift that stacks them is the shift that holds the body
 * still while the legs move.
 */
function alignHorizontally(frame, over) {
	let best = 0;
	let bestScore = -1;
	for (let dx = -frame.width; dx <= over.width; dx++) {
		let both = 0;
		for (let y = 0; y < frame.height; y++) {
			const oy = y + over.height - frame.height;
			if (oy < 0 || oy >= over.height) continue;
			for (let x = 0; x < frame.width; x++) {
				if (!frame.mask[y * frame.width + x]) continue;
				const ox = x + dx;
				if (ox < 0 || ox >= over.width) continue;
				if (over.mask[oy * over.width + ox]) both++;
			}
		}
		const score = both / (frame.ink + over.ink - both);
		if (score > bestScore) {
			bestScore = score;
			best = dx;
		}
	}
	return best;
}

/** Opaque pixels of a frame — the denominator of the overlap above. */
function inkOf(frame) {
	let ink = 0;
	for (const bit of frame.mask) ink += bit;
	return ink;
}

// ---------------------------------------------------------------------------
// Building a character
// ---------------------------------------------------------------------------

/** Assign a unique animation name, the way the .air decoder does. */
function uniqueName(base, used) {
	let name = base;
	let suffix = 2;
	while (used.has(name)) name = `${base}-${suffix++}`;
	used.add(name);
	return name;
}

/**
 * Decode one sheet character into `outDir`: a PNG per distinct frame plus the
 * manifest the game reads. `srcDir` holds the sheet and its sidecar. Returns the
 * manifest, so the caller can bind a definition from the animations it produced.
 *
 * Frames are written under `spr_<strip>_<cell>.png` and portraits under
 * `spr_9000_<n>.png`, the names a MUGEN decode produces, because everything past
 * this point — the definition, the admin's frames and faces pages, the record of
 * frames deleted by hand — is written against those.
 */
export function decodeSheet(srcDir, outDir) {
	const { png, sidecar } = readSheetSource(srcDir);
	const { page, rects, extra } = findCells(png);
	const captions = findCaptions(png, page, [...rects, ...extra]);
	const strips = findStrips(rects, captions);
	// Every animation on a sheet is captioned. What is left uncaptioned and is not a
	// wrap of the strip above it is the promo art these sheets close on — a portrait,
	// and not a frame of anything.
	const animations = strips.filter((strip) => strip.captioned);
	const portraits = [
		...extra,
		...strips.filter((strip) => !strip.captioned).flatMap((strip) => strip.cells)
	];
	const names = sidecar.strips ?? [];
	const warnings = [];
	if (names.length !== animations.length)
		warnings.push(
			`sheet.json names ${names.length} animation(s), the sheet captions ${animations.length} — ` +
				`the unnamed ones are called strip-<n>`
		);

	const frameMs = sidecar.frameMs ?? DEFAULT_FRAME_MS;
	const slice = (cells) =>
		cells
			.map((cell) => cutFrame(png, cell, page))
			.filter(Boolean)
			.map((frame) => ({ ...frame, ink: inkOf(frame) }));
	const cut = animations.map((strip) => slice(strip.cells));
	const promo = slice(portraits);

	// The character standing is what every other animation is aligned against, and
	// what its own frames are aligned against is its first.
	const reference = cut.find((frames) => frames.length > 0)?.[0] ?? null;
	const axis = reference ? Math.round(reference.width / 2) : 0;

	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });

	// One file per distinct frame: a sheet repeats frames between animations (and
	// within one), and a MUGEN decode writes each sprite once too.
	const written = new Map();
	const writeFrame = (frame, name) => {
		const digest = createHash('sha1')
			.update(`${frame.width}x${frame.height}:`)
			.update(frame.rgba)
			.digest('hex');
		const seen = written.get(digest);
		if (seen) return seen;
		const out = new PNG({ width: frame.width, height: frame.height });
		frame.rgba.copy(out.data);
		writeFileSync(join(outDir, name), PNG.sync.write(out));
		written.set(digest, name);
		return name;
	};

	const manifest = {
		name: sidecar.name || sidecar.id,
		author: sidecar.author || 'Unknown',
		face: null,
		faces: [],
		animations: {}
	};
	const addFace = (frame) => {
		const image = manifest.faces.length;
		const file = writeFrame(frame, `spr_9000_${image}.png`);
		// A sheet repeats its promo art, and a repeat is the same file — listing it
		// twice would offer the Faces tab the same portrait under two names.
		if (manifest.faces.some((face) => face.file === file)) return;
		manifest.faces.push({ file, image, width: frame.width, height: frame.height });
	};
	for (const frame of promo) addFace(frame);

	const used = new Set();
	for (const [index, frames] of cut.entries()) {
		const given = names[index] ?? null;
		if (frames.length === 0) continue;

		const lead = frames[0];
		const stripShift = reference && lead !== reference ? alignHorizontally(lead, reference) : 0;
		const out = [];
		for (const [i, frame] of frames.entries()) {
			const shift = stripShift + (i === 0 ? 0 : alignHorizontally(frame, lead));
			const file = writeFrame(frame, `spr_${index}_${i}.png`);
			out.push({
				file,
				width: frame.width,
				height: frame.height,
				anchorX: Math.min(Math.max(axis - shift, 0), frame.width),
				anchorY: frame.height,
				duration: frameMs
			});
		}
		manifest.animations[uniqueName(given || `strip-${index}`, used)] = { loop: true, frames: out };
	}

	// Not every sheet closes on promo art, and a character with no portrait at all is
	// drawn as nobody wherever the game names it. So the one it always has stands in:
	// itself, on the first frame it is drawn standing on. It is a frame like any
	// other and already written — what makes it a portrait is being listed as one.
	if (manifest.faces.length === 0 && reference)
		manifest.faces.push({
			file: writeFrame(reference, 'spr_9000_0.png'),
			image: 0,
			width: reference.width,
			height: reference.height
		});

	// The portrait consumers that want one portrait read: the biggest of them, which
	// on these sheets is the promo art the ripper closed the page with.
	manifest.face =
		[...manifest.faces].sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
	if (manifest.face)
		manifest.face = {
			file: manifest.face.file,
			width: manifest.face.width,
			height: manifest.face.height
		};

	return { manifest, warnings, strips: animations.length, cells: rects.length + extra.length };
}

/**
 * Bind a CharacterDefinition from a sheet's animations.
 *
 * The MUGEN binder reads action numbers, which a sheet has none of; what it has are
 * the names its sidecar gave the strips, and those follow the games' own vocabulary
 * — every one of these sheets calls the character standing "Idle", walking forward
 * and back "Walk Front"/"Walk Back", and its attacks "Attack"/"Skill". So the slots
 * are filled by name, and a slot with nothing to fill it is left empty for the admin
 * editor, exactly as the .air binder leaves one.
 *
 * `renderScale` comes from the sidecar, because a sheet needs one and cannot be read
 * for it: every surface that stands characters side by side sizes them off their own
 * sprite height against one reference, which assumes the whole roster is drawn at the
 * same pixels-per-person — and a handheld game's sprites are not drawn at a MUGEN
 * fighter's. So the sheet says what its own art is worth, per character, and the
 * admin's poster wall is where that is judged.
 */
export function bindSheetDefinition(id, manifest, basePath, sidecar = {}) {
	const keys = new Set(Object.keys(manifest.animations ?? {}));
	const pick = (...candidates) => candidates.find((name) => keys.has(name)) ?? '';
	const first = (prefix) => [...keys].find((name) => name.startsWith(prefix)) ?? '';
	const scale = Number(sidecar.renderScale);

	return {
		id,
		label: manifest.name || id,
		basePath,
		...(Number.isFinite(scale) && scale > 0
			? { renderScale: Math.min(Math.max(scale, RENDER_SCALE_MIN), RENDER_SCALE_MAX) }
			: {}),
		animations: {
			idle: { source: pick('idle'), loop: true },
			hurt: { source: pick('hurt', 'damage', 'blow'), loop: false }
		},
		directions: {
			'move-left': { source: pick('walk-back', 'run-back', 'walk'), loop: true },
			'move-right': { source: pick('walk', 'run'), loop: true }
		},
		moves: [
			{ name: 'Melee', type: 'melee', source: pick('attack', 'attack-1') || first('attack') },
			{
				name: 'Ranged',
				type: 'ranged',
				source: pick('magic', 'skill-1') || first('skill'),
				projectile: { source: '', loop: true }
			},
			{ name: 'Defend', type: 'defend', source: pick('guard-stand', 'guard') }
		].filter((move) => move.source !== ''),
		stats: { atk: 5, def: 5, hp: 5 }
	};
}

/** Every sheet dropped in `dir`, as { png, sidecar } paths paired by basename. */
export function listSheets(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.toLowerCase().endsWith('.png'))
		.sort()
		.map((f) => ({
			name: f,
			png: join(dir, f),
			sidecar: join(dir, `${f.slice(0, -4)}.json`)
		}))
		.filter((sheet) => existsSync(sheet.sidecar));
}
