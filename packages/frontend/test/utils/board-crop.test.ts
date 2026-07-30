import { describe, expect, it } from 'vitest';
import { contentCrop, type ContentBounds } from '$utils/mugen/mugen-board';

/**
 * Where the canvas is cut around the drawn board.
 *
 * Two sides of it are reserved rather than measured — standing room to the right for the
 * order buttons, and the empty row above the grid for everything that reaches up out of
 * the top one — and neither is drawn when the crop is taken. Reserved on one side only,
 * that room would push the board off-centre in its own canvas; so what is pinned here is
 * that each reservation is a floor on its own side *and* is matched on the opposite one,
 * leaving the board in the middle.
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

/** The two axes of a crop, as the room left on each side of the content. */
const room = (bounds: ContentBounds, crop: ReturnType<typeof contentCrop>) => ({
	left: bounds.minX - crop.left,
	right: crop.left + crop.width - bounds.maxX,
	top: bounds.minY - crop.top,
	bottom: crop.top + crop.height - bounds.maxY
});

describe('the crop the board is drawn inside', () => {
	it('leaves the same room on both sides of the content, on both axes', () => {
		const bounds = box(100, 140, 300, 320);
		const sides = room(bounds, contentCrop(bounds, { reserve: 50 }));

		expect(sides.left).toBeCloseTo(sides.right, 0);
		expect(sides.top).toBeCloseTo(sides.bottom, 0);
	});

	it('keeps the order buttons’ room to the right, and matches it on the left', () => {
		const bounds = box(100, 140, 300, 320);
		const margin = 8;
		const reserve = 50;
		const sides = room(bounds, contentCrop(bounds, { reserve, margin }));

		// The reserve is what it was: the buttons hung off the right-hand fighter still
		// have somewhere to stand.
		expect(sides.right).toBeCloseTo(margin + reserve, 0);
		// And the same width is given back on the left, which is what centres the board.
		expect(sides.left).toBeCloseTo(margin + reserve, 0);
	});

	it('keeps the empty row above the grid, and matches it underneath', () => {
		// Nothing is drawn above y = 140, but the layout's own top is zero — that gap is
		// the head room, and cropping it away would cut off the auras and callouts that
		// are drawn into it later.
		const bounds = box(100, 140, 300, 320);
		const crop = contentCrop(bounds, { reserve: 50 });
		const sides = room(bounds, crop);

		expect(crop.top).toBeLessThanOrEqual(0);
		expect(sides.top).toBeCloseTo(140, 0);
		expect(sides.bottom).toBeCloseTo(140, 0);
	});

	it('is a floor on that room and never a lid: anything drawn higher grows it', () => {
		// A character standing above the layout's zero is not cut off at it.
		const bounds = box(100, -60, 300, 320);
		const margin = 8;
		const sides = room(bounds, contentCrop(bounds, { margin }));

		expect(sides.top).toBeCloseTo(margin, 0);
		expect(sides.bottom).toBeCloseTo(margin, 0);
	});

	it('is the margin all round when nothing is reserved', () => {
		// Content that already spans the layout's top has no head room to mirror, so the
		// crop comes down to the breathing room kept off every edge.
		const bounds = box(100, 0, 300, 320);
		const margin = 8;
		const sides = room(bounds, contentCrop(bounds, { margin }));

		expect(sides.left).toBeCloseTo(margin, 0);
		expect(sides.right).toBeCloseTo(margin, 0);
		expect(sides.top).toBeCloseTo(margin, 0);
		expect(sides.bottom).toBeCloseTo(margin, 0);
	});
});
