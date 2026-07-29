/**
 * Idle clips, for the document
 *
 * A character's looping `idle` animation read straight off its frames manifest as
 * plain image URLs and pure geometry — no PixiJS, no canvas, nothing that needs a
 * WebGL context. This is what lets a character be stood up in the document itself
 * (an `<img>` per frame, swapped on a timer) wherever a whole canvas would be more
 * than the surface is worth: a small team strip beside the map, say.
 *
 * The size a character comes out at is not this module's to decide — it asks
 * {@link characterFitScale}, the same question the cards and the hex board ask, so a
 * character drawn in the document is the same size relative to the others as the one
 * drawn on a canvas beside it.
 */

import { characterFitScale, IDLE_SCALE_BOOST } from '../card/character-fit';
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

/** One frame placed inside a box, in CSS pixels: the box it occupies (`left` from
 * the box's left edge, `width`/`height`) with its feet on the clip's baseline. */
export interface PlacedIdleFrame {
	url: string;
	left: number;
	width: number;
	height: number;
}

/** A whole clip placed inside a box: every frame's box, and the baseline they all
 * stand on, given as an offset up from the box's bottom edge. */
export interface IdleClipPlacement {
	frames: PlacedIdleFrame[];
	bottom: number;
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
 * Place every frame of a clip inside a box, exactly as a card places it.
 *
 * Frames are pinned by their body axis, not by their image: the axis can sit
 * off-centre and its offset changes from frame to frame, so laying each frame out
 * on its own would make the character shuffle sideways as it breathes. The whole
 * cycle is therefore placed as one — the axis goes wherever it must for the cycle's
 * widest reach to left and right to be centred in the box, and each frame's image
 * box follows from its own axis. Feet sit on a common baseline, itself placed so the
 * tallest frame is vertically centred.
 *
 * `flipped` mirrors the character (the normal look for the player's own cards). The
 * mirroring itself is the caller's to apply — CSS about each image's own centre is
 * the same mirroring Pixi does about the axis, given these boxes — but it changes
 * which side of the axis reaches furthest, so it is accounted for here.
 */
export function placeIdleClip(
	frames: IdleClipFrame[],
	box: { width: number; height: number },
	flipped: boolean = true
): IdleClipPlacement | null {
	if (frames.length === 0 || box.width <= 0 || box.height <= 0) return null;

	const scale = characterFitScale(frames, box) * IDLE_SCALE_BOOST;
	// How far the art reaches either side of the axis, across the whole cycle.
	const reachLeft = (frame: IdleClipFrame) => (flipped ? 1 - frame.anchorX : frame.anchorX) * frame.width * scale;
	const extentLeft = Math.max(...frames.map(reachLeft));
	const extentRight = Math.max(
		...frames.map((frame) => (flipped ? frame.anchorX : 1 - frame.anchorX) * frame.width * scale)
	);
	// Offset the axis by half the difference in reach, so the sprite's bounding box —
	// not its axis — is what ends up centred.
	const axisX = box.width / 2 + (extentLeft - extentRight) / 2;
	const tallest = Math.max(...frames.map((frame) => frame.height)) * scale;

	return {
		frames: frames.map((frame) => ({
			url: frame.url,
			left: axisX - reachLeft(frame),
			width: frame.width * scale,
			height: frame.height * scale
		})),
		bottom: (box.height - tallest) / 2
	};
}
