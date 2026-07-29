/**
 * How big a character is drawn
 *
 * The one answer the surfaces that stand a MUGEN character up *among others* ask for
 * — the cards and the hex board — so a character is the same size relative to the
 * rest of the roster on either of them. Kept apart from {@link CardSprite} (which is
 * where it used to live) because the answer is pure arithmetic over frame sizes,
 * owing nothing to PixiJS or to a card.
 */

import {
	DEFAULT_RENDER_SCALE,
	RENDER_SCALE_MAX,
	RENDER_SCALE_MIN
} from '../../types/character-definition.type';

/**
 * Native source-pixel height treated as a "full-height" character. Every surface
 * scales its idle by the same ratio (art-box height ÷ this value) so on-screen size
 * tracks a character's real sprite size relative to the roster — a short character
 * renders smaller than a tall one instead of each being stretched to fill its box.
 * Sized so a tall MUGEN character (Trunks ~136px) nearly fills the art box; anything
 * taller is capped to the box by {@link characterFitScale}.
 */
export const REFERENCE_SOURCE_HEIGHT = 150;

/** Multiplier applied to the fitted idle scale so the character (and its shadow)
 * reads a little bigger than the strict fit — a deliberate 30% zoom. */
export const IDLE_SCALE_BOOST = 1.3;

/** One frame as the fit needs to read it: its native size and its body axis (0..1
 * across the frame), which is the pivot every frame of a cycle is placed by. */
export interface FitFrame {
	width: number;
	height: number;
	anchorX: number;
}

/**
 * How a surface places a character across its box, which is the whole of what the
 * width cap has to measure:
 *
 *   · `axis` — the body axis is pinned to a point and the character hangs off it, as
 *     on the hex board, where a fighter stands on its cell's mark. What must fit in
 *     half the box is then the furthest the cycle reaches from that axis, however
 *     little of the character is out there.
 *   · `sweep` — the rectangle the whole cycle sweeps out is centred in the box, which
 *     is what the cards and the statues do (both offset the axis by half the difference
 *     of its two reaches precisely to centre the art rather than the axis). What must
 *     fit is then that rectangle, and the reach to one side of the axis is no bound at
 *     all: a character whose art hangs far off its axis is drawn at its own size instead
 *     of being shrunk until its longest limb fitted a half-box it is not centred in.
 *
 * Frieza is the whole of the difference in the roster today: his idle sweeps a tail
 * most of a body-width to one side, so the axis rule held him a head shorter than his
 * own sprite is, on surfaces that were centring his silhouette anyway.
 */
export type FitReach = 'axis' | 'sweep';

/**
 * The source→screen ratio a character's art is drawn at inside a box of the given
 * size. This is the whole of how a character's on-screen size is decided.
 *
 * The ratio is {@link REFERENCE_SOURCE_HEIGHT} → the box's height, shared by every
 * character: a short character (Krillin, ~81 source px) renders visibly smaller than
 * a tall one (Trunks, ~136), rather than each being stretched to fill its box, which
 * is what made stocky characters balloon. The shared ratio is then capped so nobody
 * spills out of the box:
 *
 *   · **height** — a character taller than the reference (Perfect Cell, ~185) is
 *     brought back to the box's height instead of standing out of it.
 *   · **width** — what has to fit across the box is whichever of the two the surface's
 *     own placing makes it (see {@link FitReach}): twice the cycle's widest reach from
 *     its body axis where the axis is pinned, or the sweep the cycle occupies where the
 *     art itself is centred.
 *
 * `renderScale` is the one thing a character may say about this for itself, read from
 * its own definition JSON (see `CharacterDefinition.renderScale`): the whole scheme
 * assumes every sheet is drawn at the same pixels-per-person, and MUGEN authors do
 * not agree on one, so a set drawn small says so and is drawn up by that much. It
 * lowers the height the character is *measured against* rather than raising the box,
 * which is why the two caps still hold: a scaled-up character that would now stand
 * taller than its box stops at the box, exactly as an over-tall one always has.
 */
export function characterFitScale(
	frames: FitFrame[],
	box: { width: number; height: number },
	renderScale: number = DEFAULT_RENDER_SCALE,
	reach: FitReach = 'axis'
): number {
	const maxHeight = Math.max(...frames.map((frame) => frame.height));
	// How far the cycle reaches either side of its axis, at its native size. Neither
	// figure belongs to any one frame: the axis sits in a different place from frame to
	// frame, and what a cycle needs is the furthest any of them goes each way.
	const reachOne = Math.max(...frames.map((frame) => frame.anchorX * frame.width));
	const reachOther = Math.max(...frames.map((frame) => (1 - frame.anchorX) * frame.width));
	// The source width that has to fit across the box. Which side is which depends on
	// whether the art is mirrored, and neither figure here cares: a pinned axis wants the
	// larger of the two doubled, and a centred sweep wants their sum — a mirror swaps the
	// pair and changes neither answer.
	const sourceWidth =
		reach === 'axis' ? 2 * Math.max(reachOne, reachOther) : reachOne + reachOther;
	// A missing, zero or nonsense scale must never shrink a character to nothing or
	// flip the ratio: anything outside the authored range reads as "no correction".
	const scale =
		Number.isFinite(renderScale) && renderScale >= RENDER_SCALE_MIN && renderScale <= RENDER_SCALE_MAX
			? renderScale
			: DEFAULT_RENDER_SCALE;
	return Math.min(
		box.height / (REFERENCE_SOURCE_HEIGHT / scale),
		box.height / maxHeight,
		box.width / sourceWidth
	);
}
