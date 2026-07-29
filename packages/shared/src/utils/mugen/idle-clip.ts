/**
 * Idle clips, for the document
 *
 * A character's looping `idle` animation read straight off its frames manifest as
 * plain image URLs and pure geometry — no PixiJS, no canvas, nothing that needs a
 * WebGL context. This is what lets a character be stood up in the document itself
 * (an `<img>` per frame, swapped on a timer) wherever a whole canvas would be more
 * than the surface is worth: a small team strip beside the map, say.
 *
 * A clip is placed as one thing, never frame by frame: the cycle's frames differ in
 * size and in where their body axis sits, so anything derived per frame — a size, a
 * box, a border drawn around it — would jump about as the animation ran. The sheet is
 * the rectangle the whole cycle sweeps out, it is what fills the surface, and the
 * frames animate inside it.
 */

import type { Manifest } from './mugen-player';

/** One frame of an idle clip: where its image is, its native size, its body axis
 * (0..1 across the frame) and how long it shows for. */
export interface IdleClipFrame {
	url: string;
	width: number;
	height: number;
	anchorX: number;
	duration: number;
}

/** A box inside the surface, in CSS pixels: `left` from its left edge, `bottom` up
 * from its bottom edge, and the size it occupies. */
export interface PlacedBox {
	left: number;
	bottom: number;
	width: number;
	height: number;
}

/** One frame placed inside the sheet, with its feet on the sheet's bottom edge. */
export interface PlacedIdleFrame extends PlacedBox {
	url: string;
}

/** A whole clip placed inside a surface: the sheet the cycle sweeps out, and every
 * frame placed within it. All boxes are relative to the surface, not to each other. */
export interface IdleClipPlacement {
	sheet: PlacedBox;
	frames: PlacedIdleFrame[];
}

// Only clips that actually loaded are kept: a fetch that failed is a bad moment on
// the network, not a character without an idle, and must not blank it for the session.
const clips = new Map<string, IdleClipFrame[]>();
const pending = new Map<string, Promise<IdleClipFrame[] | null>>();

/**
 * The frames of a character's looping idle clip, from the manifest in its frames
 * folder — cached by folder for the session, and shared between every surface that
 * asks. Resolves to null (never throws) when the folder, the manifest or the `idle`
 * clip is missing, so a caller can fall back to a portrait without special-casing.
 */
export function loadIdleClip(basePath: string | null): Promise<IdleClipFrame[] | null> {
	if (!basePath) return Promise.resolve(null);
	const cached = clips.get(basePath);
	if (cached) return Promise.resolve(cached);
	const inFlight = pending.get(basePath);
	if (inFlight) return inFlight;

	const promise = (async () => {
		try {
			const response = await fetch(`${basePath}/manifest.json`);
			if (!response.ok) return null;
			const manifest = (await response.json()) as Manifest;
			const idle = manifest.animations?.idle;
			if (!idle || idle.frames.length === 0) return null;
			return idle.frames.map((frame) => ({
				url: `${basePath}/${frame.file}`,
				width: frame.width,
				height: frame.height,
				// The manifest gives the body axis in source pixels; every consumer wants
				// it as a fraction of the frame, which survives scaling.
				anchorX: frame.anchorX / frame.width,
				duration: frame.duration
			}));
		} catch {
			return null;
		} finally {
			pending.delete(basePath);
		}
	})().then((frames) => {
		if (frames) clips.set(basePath, frames);
		return frames;
	});
	pending.set(basePath, promise);
	return promise;
}

/**
 * Place a clip inside a surface: the sheet first, then the frames within it.
 *
 * The sheet is the rectangle the whole cycle sweeps out, and it is drawn as large as
 * the surface will hold it — full height, unless a very wide character would then
 * spill sideways, in which case the width is what binds. Nothing is ever drawn past
 * the surface, so nothing is ever cut off, and because the sheet is the cycle's box
 * and not any one frame's, it is the same rectangle from the first frame to the last:
 * anything drawn on it (a border, say) sits still while the character moves.
 *
 * Frames are pinned inside it by their body axis, not by their image: the axis sits
 * off-centre and moves from frame to frame, so placing each frame on its own terms
 * would make the character shuffle sideways as it breathes. Instead the axis goes
 * wherever it must for the cycle's furthest reach either way to touch the sheet's
 * edges, and each frame follows from its own axis, feet on the sheet's bottom edge.
 *
 * `flipped` mirrors the character (the normal look for the player's own cards). The
 * mirroring itself is the caller's to apply — CSS about each image's own centre is
 * the same mirroring Pixi does about the axis, given these boxes — but it changes
 * which side of the axis reaches furthest, so it is accounted for here.
 */
export function placeIdleClip(
	frames: IdleClipFrame[],
	surface: { width: number; height: number },
	flipped: boolean = true
): IdleClipPlacement | null {
	if (frames.length === 0 || surface.width <= 0 || surface.height <= 0) return null;

	// The cycle at its native size: how far it reaches either side of the axis, and
	// how tall its tallest frame stands.
	const reachLeft = (frame: IdleClipFrame) =>
		(flipped ? 1 - frame.anchorX : frame.anchorX) * frame.width;
	const extentLeft = Math.max(...frames.map(reachLeft));
	const extentRight = Math.max(
		...frames.map((frame) => (flipped ? frame.anchorX : 1 - frame.anchorX) * frame.width)
	);
	const sheetWidth = extentLeft + extentRight;
	const sheetHeight = Math.max(...frames.map((frame) => frame.height));

	// Full height, unless the width is the tighter of the two.
	const scale = Math.min(surface.height / sheetHeight, surface.width / sheetWidth);
	const sheet: PlacedBox = {
		left: (surface.width - sheetWidth * scale) / 2,
		bottom: (surface.height - sheetHeight * scale) / 2,
		width: sheetWidth * scale,
		height: sheetHeight * scale
	};
	const axisX = sheet.left + extentLeft * scale;

	return {
		sheet,
		frames: frames.map((frame) => ({
			url: frame.url,
			left: axisX - reachLeft(frame) * scale,
			bottom: sheet.bottom,
			width: frame.width * scale,
			height: frame.height * scale
		}))
	};
}
