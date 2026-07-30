import { describe, expect, it } from 'vitest';
import { contentCrop, type ContentBounds } from '$utils/mugen/mugen-board';

/**
 * Where the canvas is cut around the board.
 *
 * The two axes are answered by different things, and both matter to how big the board is
 * seen: the canvas is scaled to fit its box, so canvas that is not board is scale the
 * board does not get. Across, the cut is the hexagons' own edges and nothing else — no
 * margin, nothing reserved beside them. Down, it is what is drawn, plus the empty row
 * kept above the grid for the auras and callouts that are not drawn yet, mirrored
 * underneath so the board sits in the middle rather than riding high.
 *
 * Pure arithmetic over a bounding box, so no Pixi app is booted and no WebGL context is
 * asked for.
 */
const box = (minX: number, minY: number, maxX: number, maxY: number): ContentBounds => ({
	minX,
	minY,
	maxX,
	maxY
});

/** The grid's own left and right edges, as `fitToContent` reads them off the geometry. */
const span = { left: 40, right: 1140 };

/** The room a crop leaves on each side of the content it was cut around. */
const room = (bounds: ContentBounds, crop: ReturnType<typeof contentCrop>) => ({
	top: bounds.minY - crop.top,
	bottom: crop.top + crop.height - bounds.maxY
});

describe('the crop the board is drawn inside', () => {
	it('is the grid’s own width, edge to edge', () => {
		// Whatever is standing on it: the hexagons reach both sides of the canvas, so the
		// board is drawn at the size its box can carry and no strip is kept clear beside it.
		const crop = contentCrop(box(100, 140, 300, 320), span);

		expect(crop.left).toBe(span.left);
		expect(crop.left + crop.width).toBe(span.right);
	});

	it('is that same width for a fighter standing outside the grid', () => {
		// A sprite wider than its cell on an outer column is clipped rather than given room
		// — the alternative is the whole board drawn smaller to frame one overhang.
		const wide = contentCrop(box(-200, 140, 1400, 320), span);

		expect(wide.left).toBe(span.left);
		expect(wide.width).toBe(span.right - span.left);
	});

	it('keeps the empty row above the grid, and matches it underneath', () => {
		// Nothing is drawn above y = 140, but the layout's own top is zero — that gap is
		// the head room, and cropping it away would cut off the auras and callouts drawn
		// into it later.
		const bounds = box(100, 140, 300, 320);
		const crop = contentCrop(bounds, span);
		const sides = room(bounds, crop);

		expect(crop.top).toBeLessThanOrEqual(0);
		expect(sides.top).toBeCloseTo(140, 0);
		expect(sides.bottom).toBeCloseTo(140, 0);
	});

	it('is a floor on that room and never a lid: anything drawn higher grows it', () => {
		// A character standing above the layout's zero is not cut off at it.
		const bounds = box(100, -60, 300, 320);
		const margin = 8;
		const sides = room(bounds, contentCrop(bounds, span, { margin }));

		expect(sides.top).toBeCloseTo(margin, 0);
		expect(sides.bottom).toBeCloseTo(margin, 0);
	});

	it('comes down to the margin when there is no head room to mirror', () => {
		const bounds = box(100, 0, 300, 320);
		const margin = 8;
		const sides = room(bounds, contentCrop(bounds, span, { margin }));

		expect(sides.top).toBeCloseTo(margin, 0);
		expect(sides.bottom).toBeCloseTo(margin, 0);
	});
});
