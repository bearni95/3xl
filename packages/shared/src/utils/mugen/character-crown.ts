/**
 * A character's **crown**: the highest painted pixel of a sprite frame, and where across
 * the frame it sits.
 *
 * MUGEN gives every frame an axis, and the axis is what holds an animation together —
 * it is the same point on the fighter from frame to frame, so aligning frames through
 * it is what stops a cycle from juddering. What it is *not* is the middle of the
 * fighter. The axis sits between the feet, and a sprite sheet is drawn for a side-on
 * brawler: a fighter leans into its stance, throws its weight onto one leg, sweeps a
 * tail or a sword out to one side. Stood on its axis in the middle of a cell, such a
 * character reads as standing off to one side of it — because the part of it a viewer
 * takes for "the character" is the head, and the head is not over the axis.
 *
 * So the board stands a fighter by its crown instead. The head is the top of a standing
 * sprite, so the highest painted pixels are the head; the middle of them is the point a
 * viewer reads as the character's own centre, and putting *that* over the middle of the
 * cell is what makes a fighter look like it is standing in its cell.
 *
 * Only the offset between the two is taken from here. Frames still align to each other
 * through the axis, as they must — the crown is measured once, off the pose the
 * character stands in, and the whole fighter is moved by it.
 *
 * The rule is on for every character and off for the ones whose own file says so
 * ({@link readCrownAlign}): what is highest in a sheet is usually a head, and where it is
 * not, no reading of the pixels can tell.
 */

import {
	DEFAULT_CROWN_ALIGN,
	type CharacterDefinition
} from '../../types/character-definition.type';

/**
 * How opaque a pixel has to be to count as painted, out of 255.
 *
 * Not zero. Decoded MUGEN artwork carries a fringe of nearly-transparent pixels along
 * its edges — the palette's transparent index bled through resampling — and a fringe a
 * viewer cannot see is not the top of the character's head. A low threshold takes the
 * artwork and leaves the fringe.
 */
const PAINTED_ALPHA = 8;

/**
 * Whether to stand this character by its crown. Only an explicit `false` turns it off —
 * a definition that says nothing, one that predates the field, and one whose value is
 * some other thing entirely all get the rule, because it is the placement every
 * character is meant to have and an unreadable file is not a reason to single one out.
 */
export function readCrownAlign(definition: Partial<CharacterDefinition> | null): boolean {
	return definition?.crownAlign === false ? false : DEFAULT_CROWN_ALIGN;
}

/** The highest painted pixels of a frame: which row they are on, and where across it. */
export interface Crown {
	/** Row of the topmost painted pixel, in the frame's own pixels from its top edge. */
	top: number;
	/**
	 * The middle of the painted run on that row, in the frame's own pixels — measured
	 * along the pixel grid's edges, so a single painted pixel at index `i` gives
	 * `i + 0.5`, its own middle, rather than its left edge.
	 */
	x: number;
}

/**
 * The rule itself, over RGBA rows: scan down from the top edge and stop at the first row
 * with any paint on it, since nothing below it can be higher. The answer across that row
 * is the middle of its painted span rather than its first painted pixel — a head is as
 * wide as it is, and one edge of it is not its middle. Null for a frame with no paint.
 */
export function crownOfPixels(
	pixels: ArrayLike<number>,
	width: number,
	height: number
): Crown | null {
	for (let y = 0; y < height; y++) {
		let left = -1;
		let right = -1;
		for (let x = 0; x < width; x++) {
			if (pixels[(y * width + x) * 4 + 3] <= PAINTED_ALPHA) continue;
			if (left < 0) left = x;
			right = x;
		}
		if (left >= 0) return { top: y, x: (left + right + 1) / 2 };
	}
	return null;
}

/**
 * Read `source`'s highest painted pixels. Returns null when the frame is empty, when
 * there is no 2D canvas to read it through, or when the read is refused — every one of
 * which is a reason to leave the character on its axis rather than to fail placing it.
 *
 * The frame is drawn into a canvas of its own size and read back once. Sprite frames are
 * small and this is asked once per character as the board opens, so the cost lands in
 * the load and never in the render loop.
 */
export function paintedCrown(
	source: CanvasImageSource,
	width: number,
	height: number
): Crown | null {
	const w = Math.max(1, Math.round(width));
	const h = Math.max(1, Math.round(height));
	if (typeof document === 'undefined') return null;

	try {
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		if (!context) return null;
		context.drawImage(source, 0, 0, w, h);
		return crownOfPixels(context.getImageData(0, 0, w, h).data, w, h);
	} catch {
		// A tainted canvas (an asset served cross-origin) throws on read. The board is
		// still perfectly drawable without the correction.
		return null;
	}
}
