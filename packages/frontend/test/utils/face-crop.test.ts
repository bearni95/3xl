import { describe, it, expect } from 'vitest';
import {
	clampFaceCrop,
	defaultFaceCrop,
	faceViewBox,
	sameFaceCrop
} from '$utils/mugen/face-crop';

describe('face crop', () => {
	it('defaults to the widest square at the top of a tall portrait', () => {
		// The group-9000 versus portraits are tall; the head sits at the top.
		expect(defaultFaceCrop(180, 442)).toEqual({ x: 0, y: 0, size: 180 });
	});

	it('centres the default square horizontally on a wide portrait', () => {
		expect(defaultFaceCrop(100, 40)).toEqual({ x: 30, y: 0, size: 40 });
	});

	it('caps the side to the shorter edge', () => {
		expect(clampFaceCrop({ x: 0, y: 0, size: 900 }, 180, 442)).toEqual({ x: 0, y: 0, size: 180 });
	});

	it('pulls a square that overhangs back inside the sprite', () => {
		expect(clampFaceCrop({ x: 150, y: 400, size: 100 }, 180, 442)).toEqual({
			x: 80,
			y: 342,
			size: 100
		});
	});

	it('clamps negative origins to the sprite corner and rounds to whole pixels', () => {
		expect(clampFaceCrop({ x: -12, y: -3.4, size: 60.6 }, 180, 442)).toEqual({
			x: 0,
			y: 0,
			size: 61
		});
	});

	it('never yields a side below one pixel', () => {
		expect(clampFaceCrop({ x: 0, y: 0, size: 0 }, 180, 442).size).toBe(1);
	});

	it('compares squares by value, and treats absent crops as equal only to each other', () => {
		expect(sameFaceCrop({ x: 1, y: 2, size: 3 }, { x: 1, y: 2, size: 3 })).toBe(true);
		expect(sameFaceCrop({ x: 1, y: 2, size: 3 }, { x: 1, y: 2, size: 4 })).toBe(false);
		expect(sameFaceCrop(null, null)).toBe(true);
		expect(sameFaceCrop(null, { x: 1, y: 2, size: 3 })).toBe(false);
	});

	it('renders the square as an SVG viewBox', () => {
		expect(faceViewBox({ x: 12, y: 30, size: 96 })).toBe('12 30 96 96');
	});
});
