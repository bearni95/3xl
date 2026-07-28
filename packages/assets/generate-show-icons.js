// Turn hand-dropped Noun Project SVGs into show icons for the map panel.
//
// Icons are downloaded from thenounproject.com and dropped at the repo root as
// `noun-<name>-<id>.svg`. Two things are wrong with them as shipped:
//
//   1. Every download carries its attribution baked in as two <text> lines sitting
//      *below* the artwork ("Created by X" / "from Noun Project"). Rendered at 16px
//      in a table cell they are illegible noise, and they stretch the canvas.
//   2. The canvas is a fixed, generously padded box (the sample is
//      viewBox="-5 -10 110 135" around art that only occupies ~90x80), so the glyph
//      floats small and off-centre inside whatever box the page gives it.
//
// So this script strips the <text> nodes and re-crops the viewBox to the tight
// bounding box of the geometry that is left, then writes the result into this
// package's public/icons/shows/ (served at /assets/icons/shows/<name>.svg — see
// Icon.svelte). The attribution the crop throws away is not lost: it is harvested
// out of those same <text> nodes into public/icons/shows/license.txt, which is what
// the Noun Project licence actually asks for. The root original is then removed —
// this is a move, not a copy.
//
// Re-runnable: drop more `*.svg` at the repo root and run it again. Files already
// moved are simply gone, so a re-run only picks up what is new.
//
// Bounding boxes are computed here rather than pulled from a library: the whole
// monorepo's generate scripts are dependency-light, and the geometry needed is
// small and exact. Curve extrema are solved analytically (not sampled), so the crop
// is tight against the true outline of a bezier rather than its control hull.

import { readdirSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const outDir = join(here, 'public', 'icons', 'shows');
const licenseFile = join(outDir, 'license.txt');

// Breathing room left around the artwork, as a share of the cropped box's larger
// side. A hair of padding stops strokes and antialiasing from being clipped flush
// against the viewBox edge when the icon is scaled down into a table row.
const PADDING_RATIO = 0.02;

// --- Geometry ----------------------------------------------------------------

/** A 2D affine transform as SVG orders it: [a, b, c, d, e, f]. */
const IDENTITY = [1, 0, 0, 1, 0, 0];

function multiply(m, n) {
	return [
		m[0] * n[0] + m[2] * n[1],
		m[1] * n[0] + m[3] * n[1],
		m[0] * n[2] + m[2] * n[3],
		m[1] * n[2] + m[3] * n[3],
		m[0] * n[4] + m[2] * n[5] + m[4],
		m[1] * n[4] + m[3] * n[5] + m[5]
	];
}

function apply(m, x, y) {
	return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/**
 * Parse an SVG `transform` attribute into a single matrix. Supports the whole
 * grammar bar `ref()`: translate, scale, rotate (with optional origin), skewX,
 * skewY and matrix, applied left to right as SVG composes them.
 */
function parseTransform(value) {
	let matrix = IDENTITY;
	if (!value) return matrix;
	const pattern = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
	let match;
	while ((match = pattern.exec(value))) {
		const [, name, rawArgs] = match;
		const args = rawArgs.split(/[\s,]+/).filter(Boolean).map(Number);
		let step = IDENTITY;
		if (name === 'matrix' && args.length === 6) step = args;
		else if (name === 'translate') step = [1, 0, 0, 1, args[0] || 0, args[1] || 0];
		else if (name === 'scale') step = [args[0] ?? 1, 0, 0, args[1] ?? args[0] ?? 1, 0, 0];
		else if (name === 'rotate') {
			const angle = ((args[0] || 0) * Math.PI) / 180;
			const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
			const rotation = [cos, sin, -sin, cos, 0, 0];
			// rotate(a cx cy) is a rotation about (cx, cy), i.e. translated either side.
			step =
				args.length >= 3
					? multiply(multiply([1, 0, 0, 1, args[1], args[2]], rotation), [1, 0, 0, 1, -args[1], -args[2]])
					: rotation;
		} else if (name === 'skewX') step = [1, 0, Math.tan(((args[0] || 0) * Math.PI) / 180), 1, 0, 0];
		else if (name === 'skewY') step = [1, Math.tan(((args[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
		matrix = multiply(matrix, step);
	}
	return matrix;
}

/** An accumulating min/max box in user space, fed transformed points. */
function createBox() {
	return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

function addPoint(box, matrix, x, y) {
	const [tx, ty] = apply(matrix, x, y);
	if (tx < box.minX) box.minX = tx;
	if (ty < box.minY) box.minY = ty;
	if (tx > box.maxX) box.maxX = tx;
	if (ty > box.maxY) box.maxY = ty;
}

/**
 * The parameter values where a cubic bezier turns back on itself, per axis — the
 * roots in (0,1) of its derivative. Those, plus the endpoints, are the only places
 * a cubic can reach an extreme, so they are exactly what the box needs. Control
 * points are deliberately NOT added: a curve does not generally reach them, and
 * feeding them in is what makes naive croppers leave slack around curved art.
 */
function cubicExtrema(p0, p1, p2, p3) {
	const ts = [];
	// d/dt of the cubic is the quadratic at² + bt + c.
	const a = 3 * (-p0 + 3 * p1 - 3 * p2 + p3);
	const b = 6 * (p0 - 2 * p1 + p2);
	const c = 3 * (p1 - p0);
	if (Math.abs(a) < 1e-12) {
		if (Math.abs(b) > 1e-12) ts.push(-c / b);
	} else {
		const disc = b * b - 4 * a * c;
		if (disc >= 0) {
			const root = Math.sqrt(disc);
			ts.push((-b + root) / (2 * a), (-b - root) / (2 * a));
		}
	}
	return ts.filter((t) => t > 0 && t < 1);
}

function cubicAt(t, p0, p1, p2, p3) {
	const u = 1 - t;
	return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function addCubic(box, matrix, x0, y0, x1, y1, x2, y2, x3, y3) {
	addPoint(box, matrix, x0, y0);
	addPoint(box, matrix, x3, y3);
	// The transform can rotate/skew, so an extreme in the *transformed* frame is not
	// an extreme in the source frame. Solving on the transformed control points keeps
	// the crop tight under rotation instead of merely correct-ish.
	const [a0, b0] = apply(matrix, x0, y0);
	const [a1, b1] = apply(matrix, x1, y1);
	const [a2, b2] = apply(matrix, x2, y2);
	const [a3, b3] = apply(matrix, x3, y3);
	for (const t of cubicExtrema(a0, a1, a2, a3)) {
		const x = cubicAt(t, a0, a1, a2, a3);
		const y = cubicAt(t, b0, b1, b2, b3);
		if (x < box.minX) box.minX = x;
		if (x > box.maxX) box.maxX = x;
		if (y < box.minY) box.minY = y;
		if (y > box.maxY) box.maxY = y;
	}
	for (const t of cubicExtrema(b0, b1, b2, b3)) {
		const x = cubicAt(t, a0, a1, a2, a3);
		const y = cubicAt(t, b0, b1, b2, b3);
		if (x < box.minX) box.minX = x;
		if (x > box.maxX) box.maxX = x;
		if (y < box.minY) box.minY = y;
		if (y > box.maxY) box.maxY = y;
	}
}

/** A quadratic is a cubic whose controls sit two-thirds of the way out. */
function addQuadratic(box, matrix, x0, y0, cx, cy, x1, y1) {
	addCubic(
		box,
		matrix,
		x0,
		y0,
		x0 + (2 / 3) * (cx - x0),
		y0 + (2 / 3) * (cy - y0),
		x1 + (2 / 3) * (cx - x1),
		y1 + (2 / 3) * (cy - y1),
		x1,
		y1
	);
}

/**
 * Elliptical arcs are converted to centre form and sampled. Arcs are vanishingly
 * rare in Noun Project exports (the tracer emits cubics), so this trades a closed
 * form for a short, obviously-correct routine; 64 samples on a ~100-unit canvas is
 * far below the rounding applied to the final viewBox.
 */
function addArc(box, matrix, x0, y0, rx, ry, rotation, largeArc, sweep, x1, y1) {
	addPoint(box, matrix, x0, y0);
	addPoint(box, matrix, x1, y1);
	if (rx === 0 || ry === 0) return;
	rx = Math.abs(rx);
	ry = Math.abs(ry);

	const phi = (rotation * Math.PI) / 180;
	const [cosPhi, sinPhi] = [Math.cos(phi), Math.sin(phi)];
	const dx = (x0 - x1) / 2;
	const dy = (y0 - y1) / 2;
	const x1p = cosPhi * dx + sinPhi * dy;
	const y1p = -sinPhi * dx + cosPhi * dy;

	// Scale the radii up if they are too small to span the endpoints (SVG F.6.6).
	const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
	if (lambda > 1) {
		const scale = Math.sqrt(lambda);
		rx *= scale;
		ry *= scale;
	}

	const numerator = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
	const denominator = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
	const factor =
		(largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, numerator) / (denominator || 1));
	const cxp = (factor * rx * y1p) / ry;
	const cyp = (-factor * ry * x1p) / rx;
	const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2;
	const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2;

	const angleOf = (ux, uy) => Math.atan2(uy, ux);
	const theta1 = angleOf((x1p - cxp) / rx, (y1p - cyp) / ry);
	let delta = angleOf((-x1p - cxp) / rx, (-y1p - cyp) / ry) - theta1;
	if (!sweep && delta > 0) delta -= 2 * Math.PI;
	else if (sweep && delta < 0) delta += 2 * Math.PI;

	const steps = 64;
	for (let i = 1; i < steps; i++) {
		const theta = theta1 + (delta * i) / steps;
		const [cosT, sinT] = [Math.cos(theta), Math.sin(theta)];
		addPoint(
			box,
			matrix,
			cosPhi * rx * cosT - sinPhi * ry * sinT + cx,
			sinPhi * rx * cosT + cosPhi * ry * sinT + cy
		);
	}
}

/** Split a path `d` into [command, ...numbers] steps, expanding implicit repeats. */
function parsePath(d) {
	const steps = [];
	const tokens = d.match(/[astvzqmhlc]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/gi) ?? [];
	// Argument count per command; a command followed by more numbers than it takes
	// repeats (an implicit `l` after `m`, per the spec).
	const arity = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
	let i = 0;
	let command = null;
	while (i < tokens.length) {
		if (/[a-z]/i.test(tokens[i])) {
			command = tokens[i];
			i++;
		} else if (command === 'm') command = 'l';
		else if (command === 'M') command = 'L';
		if (!command) break;
		const count = arity[command.toLowerCase()];
		const args = tokens.slice(i, i + count).map(Number);
		i += count;
		steps.push([command, args]);
		if (count === 0 && !/[a-z]/i.test(tokens[i] ?? '')) break;
	}
	return steps;
}

function addPath(box, matrix, d) {
	let [x, y] = [0, 0];
	let [startX, startY] = [0, 0];
	// The reflected control point S/T need, tracked across steps.
	let [lastCubicX, lastCubicY] = [0, 0];
	let [lastQuadX, lastQuadY] = [0, 0];
	let previous = '';

	for (const [command, args] of parsePath(d)) {
		const relative = command === command.toLowerCase();
		const upper = command.toUpperCase();
		const [ox, oy] = relative ? [x, y] : [0, 0];

		if (upper === 'M') {
			[x, y] = [ox + args[0], oy + args[1]];
			[startX, startY] = [x, y];
			addPoint(box, matrix, x, y);
		} else if (upper === 'L') {
			[x, y] = [ox + args[0], oy + args[1]];
			addPoint(box, matrix, x, y);
		} else if (upper === 'H') {
			x = ox + args[0];
			addPoint(box, matrix, x, y);
		} else if (upper === 'V') {
			y = oy + args[0];
			addPoint(box, matrix, x, y);
		} else if (upper === 'C') {
			const [x1, y1, x2, y2, x3, y3] = [
				ox + args[0], oy + args[1], ox + args[2], oy + args[3], ox + args[4], oy + args[5]
			];
			addCubic(box, matrix, x, y, x1, y1, x2, y2, x3, y3);
			[lastCubicX, lastCubicY] = [x2, y2];
			[x, y] = [x3, y3];
		} else if (upper === 'S') {
			// The first control mirrors the previous curve's second, or sits on the
			// current point when the last step was not a cubic.
			const [x1, y1] = 'CS'.includes(previous.toUpperCase())
				? [2 * x - lastCubicX, 2 * y - lastCubicY]
				: [x, y];
			const [x2, y2, x3, y3] = [ox + args[0], oy + args[1], ox + args[2], oy + args[3]];
			addCubic(box, matrix, x, y, x1, y1, x2, y2, x3, y3);
			[lastCubicX, lastCubicY] = [x2, y2];
			[x, y] = [x3, y3];
		} else if (upper === 'Q') {
			const [cx, cy, x1, y1] = [ox + args[0], oy + args[1], ox + args[2], oy + args[3]];
			addQuadratic(box, matrix, x, y, cx, cy, x1, y1);
			[lastQuadX, lastQuadY] = [cx, cy];
			[x, y] = [x1, y1];
		} else if (upper === 'T') {
			const [cx, cy] = 'QT'.includes(previous.toUpperCase())
				? [2 * x - lastQuadX, 2 * y - lastQuadY]
				: [x, y];
			const [x1, y1] = [ox + args[0], oy + args[1]];
			addQuadratic(box, matrix, x, y, cx, cy, x1, y1);
			[lastQuadX, lastQuadY] = [cx, cy];
			[x, y] = [x1, y1];
		} else if (upper === 'A') {
			const [x1, y1] = [ox + args[5], oy + args[6]];
			addArc(box, matrix, x, y, args[0], args[1], args[2], !!args[3], !!args[4], x1, y1);
			[x, y] = [x1, y1];
		} else if (upper === 'Z') {
			[x, y] = [startX, startY];
		}
		previous = command;
	}
}

// --- SVG walking -------------------------------------------------------------

/** Pull one attribute off a raw tag string. */
function attr(tag, name) {
	const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i')) ??
		tag.match(new RegExp(`\\s${name}\\s*=\\s*'([^']*)'`, 'i'));
	return match ? match[1] : null;
}

const numAttr = (tag, name, fallback = 0) => {
	const value = attr(tag, name);
	const parsed = value == null ? NaN : parseFloat(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

/** Elements whose contents are definitions, never painted, so never part of the box. */
const NON_RENDERING = new Set(['defs', 'clippath', 'mask', 'symbol', 'marker', 'pattern']);

/**
 * Walk the markup, maintaining the transform stack, and feed every painted shape
 * into the box. Deliberately a tag scanner rather than a full XML parse: these are
 * machine-generated exports with no CDATA or exotic markup, and it keeps the script
 * dependency-free.
 */
function measure(svg) {
	const box = createBox();
	// Stack of matrices, innermost last. `skipDepth` is non-null while inside a
	// non-rendering subtree, holding the depth its opening tag sat at.
	const stack = [IDENTITY];
	let depth = 0;
	let skipDepth = null;

	const tagPattern = /<\/?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/g;
	let match;
	while ((match = tagPattern.exec(svg))) {
		const [raw, name, , selfClosing] = match;
		const lower = name.toLowerCase();
		const closing = raw.startsWith('</');
		const empty = selfClosing === '/';

		if (closing) {
			depth--;
			if (skipDepth !== null && depth < skipDepth) skipDepth = null;
			if (skipDepth === null && stack.length > 1) stack.pop();
			continue;
		}

		if (skipDepth !== null) {
			if (!empty) depth++;
			continue;
		}
		if (NON_RENDERING.has(lower)) {
			if (!empty) {
				skipDepth = depth;
				depth++;
			}
			continue;
		}

		// The element's own transform composes onto whatever it inherits. The root
		// <svg> is the identity frame: its viewBox is what we are replacing, so it must
		// not be folded in here.
		const parent = stack[stack.length - 1];
		const matrix = lower === 'svg' ? parent : multiply(parent, parseTransform(attr(raw, 'transform')));

		if (lower === 'path') {
			const d = attr(raw, 'd');
			if (d) addPath(box, matrix, d);
		} else if (lower === 'rect') {
			const [rx, ry] = [numAttr(raw, 'x'), numAttr(raw, 'y')];
			const [w, h] = [numAttr(raw, 'width'), numAttr(raw, 'height')];
			addPoint(box, matrix, rx, ry);
			addPoint(box, matrix, rx + w, ry);
			addPoint(box, matrix, rx, ry + h);
			addPoint(box, matrix, rx + w, ry + h);
		} else if (lower === 'circle') {
			const [cx, cy, r] = [numAttr(raw, 'cx'), numAttr(raw, 'cy'), numAttr(raw, 'r')];
			addPoint(box, matrix, cx - r, cy - r);
			addPoint(box, matrix, cx + r, cy - r);
			addPoint(box, matrix, cx - r, cy + r);
			addPoint(box, matrix, cx + r, cy + r);
		} else if (lower === 'ellipse') {
			const [cx, cy] = [numAttr(raw, 'cx'), numAttr(raw, 'cy')];
			const [rx, ry] = [numAttr(raw, 'rx'), numAttr(raw, 'ry')];
			addPoint(box, matrix, cx - rx, cy - ry);
			addPoint(box, matrix, cx + rx, cy - ry);
			addPoint(box, matrix, cx - rx, cy + ry);
			addPoint(box, matrix, cx + rx, cy + ry);
		} else if (lower === 'line') {
			addPoint(box, matrix, numAttr(raw, 'x1'), numAttr(raw, 'y1'));
			addPoint(box, matrix, numAttr(raw, 'x2'), numAttr(raw, 'y2'));
		} else if (lower === 'polygon' || lower === 'polyline') {
			const points = (attr(raw, 'points') ?? '').split(/[\s,]+/).filter(Boolean).map(Number);
			for (let i = 0; i + 1 < points.length; i += 2) addPoint(box, matrix, points[i], points[i + 1]);
		}

		if (!empty) {
			stack.push(matrix);
			depth++;
		}
	}
	return box;
}

// --- Rewriting ---------------------------------------------------------------

/** `noun-bow-and-arrow-8305042.svg` → `bow-and-arrow`. */
function slugFor(filename) {
	return basename(filename, '.svg')
		.replace(/^noun[-_]/i, '')
		.replace(/[-_]\d+$/, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

const round = (value) => Number(value.toFixed(3));

function moveIcon(sourcePath) {
	const original = readFileSync(sourcePath, 'utf8');

	// Harvest the attribution before dropping it, so the credit survives the crop.
	const credits = [...original.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)]
		.map(([, inner]) => inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
		.filter(Boolean);

	// Strip the attribution lines (and any stray standalone <text/>) from the artwork.
	const stripped = original
		.replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi, '')
		.replace(/<text\b[^>]*\/>/gi, '');

	const box = measure(stripped);
	if (!Number.isFinite(box.minX) || box.maxX <= box.minX || box.maxY <= box.minY) {
		throw new Error(`no measurable geometry left in ${basename(sourcePath)}`);
	}

	const width = box.maxX - box.minX;
	const height = box.maxY - box.minY;
	const pad = Math.max(width, height) * PADDING_RATIO;
	const viewBox = [
		round(box.minX - pad),
		round(box.minY - pad),
		round(width + 2 * pad),
		round(height + 2 * pad)
	].join(' ');

	// These icons are inlined next to a line of text (see ShowIcon.svelte), so they
	// are emitted to follow that text rather than to be a fixed picture:
	//
	//   - the root tag's viewBox becomes the crop computed above;
	//   - width/height become 1em, so the glyph is exactly as tall as the type it
	//     sits beside and rescales with it;
	//   - fill becomes currentColor, so the glyph is the same colour as that text in
	//     any theme — the whole reason these are inlined rather than <img>-ed.
	//
	// currentColor only reaches the artwork if the artwork does not overrule it, and
	// Noun Project exports often hard-code black on the shapes themselves. Those
	// explicit blacks are dropped so the paths inherit; any *other* colour is left
	// alone, because in a flat icon a non-black fill (usually white) is carving a
	// hole out of the shape rather than colouring it, and forcing that to currentColor
	// would fill the hole in.
	const rewritten = stripped
		.replace(/\sfill\s*=\s*("(?:#000000|#000|black)"|'(?:#000000|#000|black)')/gi, '')
		.replace(/<svg\b[^>]*>/i, (tag) => {
			let next = tag
				.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, '')
				.replace(/\sfill\s*=\s*("[^"]*"|'[^']*')/gi, '');
			next = /\sviewBox\s*=/i.test(next)
				? next.replace(/\sviewBox\s*=\s*("[^"]*"|'[^']*')/i, ` viewBox="${viewBox}"`)
				: next.replace(/<svg\b/i, `<svg viewBox="${viewBox}"`);
			return next.replace(/<svg\b/i, '<svg width="1em" height="1em" fill="currentColor"');
		})
		// The stripped <text> leaves a blank line behind; tidy it so the file reads clean.
		.replace(/\n\s*\n/g, '\n')
		.trimEnd();

	const slug = slugFor(sourcePath);
	writeFileSync(join(outDir, `${slug}.svg`), `${rewritten}\n`, 'utf8');
	unlinkSync(sourcePath);

	return { slug, credits, viewBox, from: basename(sourcePath) };
}

// --- Entry point -------------------------------------------------------------

mkdirSync(outDir, { recursive: true });

const sources = readdirSync(repoRoot)
	.filter((name) => name.toLowerCase().endsWith('.svg'))
	.sort();

if (sources.length === 0) {
	console.log('No SVGs at the repo root — nothing to move.');
}

const moved = [];
for (const name of sources) {
	try {
		moved.push(moveIcon(join(repoRoot, name)));
	} catch (error) {
		console.error(`Skipped ${name}: ${error.message}`);
	}
}

for (const entry of moved) {
	console.log(`${entry.from} → icons/shows/${entry.slug}.svg  viewBox="${entry.viewBox}"`);
}

// Keep a per-icon credit line, matching how the game-icons.net set records its
// attribution one directory up. Rewritten wholesale from the existing file plus
// this run's entries, so re-running never duplicates a line.
if (moved.length > 0) {
	const existing = existsSync(licenseFile) ? readFileSync(licenseFile, 'utf8') : '';
	const lines = new Map();
	for (const line of existing.split('\n')) {
		const match = line.match(/^- ([a-z0-9-]+)\.svg — (.*)$/);
		if (match) lines.set(match[1], match[2]);
	}
	for (const entry of moved) {
		lines.set(entry.slug, entry.credits.join(' ') || 'Noun Project');
	}
	const header = [
		'Icons in this directory come from The Noun Project (thenounproject.com) and are',
		'used under the licence attached to each download. The credit below is the',
		'attribution that shipped inside each SVG, harvested by generate-show-icons.js',
		'before the artwork was cropped (the icons themselves no longer carry it).',
		''
	];
	const body = [...lines.entries()].sort().map(([slug, credit]) => `- ${slug}.svg — ${credit}`);
	writeFileSync(licenseFile, `${[...header, ...body].join('\n')}\n`, 'utf8');
}
