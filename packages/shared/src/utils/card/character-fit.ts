/**
 * How big a character is drawn
 *
 * The one answer every surface that stands a MUGEN character up asks for — the
 * cards, the hex board, the sidebar's team strip — so a character is the same size
 * relative to the others wherever it appears. Kept apart from {@link CardSprite}
 * (which is where it used to live) because the answer is pure arithmetic over frame
 * sizes: a surface drawn in the document rather than on a canvas needs it just as
 * much, and must not have to pull PixiJS in to ask.
 */

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
 *   · **width** — each frame is placed by its body axis, which can sit off-centre, so
 *     the widest axis-to-edge reach of the cycle must fit in half the box.
 */
export function characterFitScale(
	frames: FitFrame[],
	box: { width: number; height: number }
): number {
	const maxHeight = Math.max(...frames.map((frame) => frame.height));
	const maxHalfExtent = Math.max(
		...frames.map((frame) => Math.max(frame.anchorX, 1 - frame.anchorX) * frame.width)
	);
	return Math.min(
		box.height / REFERENCE_SOURCE_HEIGHT,
		box.height / maxHeight,
		box.width / 2 / maxHalfExtent
	);
}
