import { describe, expect, it } from 'vitest';
import { placeIdleClip, type IdleClipFrame } from '$utils/mugen/idle-clip';

const clip = (...frames: Omit<IdleClipFrame, 'url' | 'duration'>[]): IdleClipFrame[] =>
	frames.map((frame, index) => ({ ...frame, url: `f${index}.png`, duration: 100 }));

// The square the team strip stands a character in.
const SQUARE = { width: 120, height: 120 };

describe('placeIdleClip', () => {
	it('fills the surface height with the sheet', () => {
		const placement = placeIdleClip(clip({ width: 70, height: 81, anchorX: 0.5 }), SQUARE)!;
		expect(placement.sheet.height).toBeCloseTo(SQUARE.height, 10);
		expect(placement.sheet.bottom).toBeCloseTo(0, 10);
		// The tallest frame is the sheet, so it fills the height too.
		expect(placement.frames[0].height).toBeCloseTo(SQUARE.height, 10);
	});

	it('holds a very wide character to the width instead, uncut', () => {
		// Wider than it is tall: filling the height would push it out of the surface
		// sideways, so the width binds and the sheet is centred vertically.
		const placement = placeIdleClip(clip({ width: 400, height: 100, anchorX: 0.5 }), SQUARE)!;
		expect(placement.sheet.width).toBeCloseTo(SQUARE.width, 10);
		expect(placement.sheet.height).toBeLessThan(SQUARE.height);
		expect(placement.sheet.bottom).toBeCloseTo((SQUARE.height - placement.sheet.height) / 2, 10);
	});

	it('never places a frame outside the surface', () => {
		const frames = clip(
			{ width: 60, height: 100, anchorX: 0.25 },
			{ width: 40, height: 90, anchorX: 0.5 }
		);
		const placement = placeIdleClip(frames, SQUARE)!;
		for (const frame of placement.frames) {
			expect(frame.left).toBeGreaterThanOrEqual(-1e-9);
			expect(frame.left + frame.width).toBeLessThanOrEqual(SQUARE.width + 1e-9);
			expect(frame.bottom).toBeGreaterThanOrEqual(-1e-9);
			expect(frame.bottom + frame.height).toBeLessThanOrEqual(SQUARE.height + 1e-9);
		}
	});

	it('gives the whole cycle one sheet and one baseline', () => {
		// Frames of different widths, heights and body axes: the sheet is the box they
		// sweep out between them, so a border drawn on it never moves, and they all
		// stand on its bottom edge.
		const frames = clip(
			{ width: 60, height: 100, anchorX: 0.25 },
			{ width: 40, height: 80, anchorX: 0.5 }
		);
		const placement = placeIdleClip(frames, SQUARE, false)!;
		const left = Math.min(...placement.frames.map((frame) => frame.left));
		const right = Math.max(...placement.frames.map((frame) => frame.left + frame.width));
		expect(left).toBeCloseTo(placement.sheet.left, 10);
		expect(right).toBeCloseTo(placement.sheet.left + placement.sheet.width, 10);
		for (const frame of placement.frames) {
			expect(frame.bottom).toBeCloseTo(placement.sheet.bottom, 10);
		}
	});

	it('pins every frame by its body axis, so the character stays put', () => {
		const frames = clip(
			{ width: 60, height: 100, anchorX: 0.25 },
			{ width: 40, height: 100, anchorX: 0.5 }
		);
		const placement = placeIdleClip(frames, SQUARE, false)!;
		const scale = placement.sheet.height / 100;
		const axis = placement.frames.map(
			(frame, index) => frame.left + frames[index].anchorX * frames[index].width * scale
		);
		expect(axis[0]).toBeCloseTo(axis[1], 10);
	});

	it('reads the reach from the side the character faces', () => {
		// An off-centre axis reaches further one way than the other, and the flip swaps
		// which way — but the sheet it sweeps out is the same size either way.
		const frames = clip({ width: 60, height: 100, anchorX: 0.25 });
		const facing = placeIdleClip(frames, SQUARE, false)!;
		const flipped = placeIdleClip(frames, SQUARE, true)!;
		expect(flipped.sheet.width).toBeCloseTo(facing.sheet.width, 10);
		expect(flipped.frames[0].left).toBeCloseTo(facing.frames[0].left, 10);
	});

	it('has nothing to place without frames or a surface', () => {
		expect(placeIdleClip([], SQUARE)).toBeNull();
		expect(
			placeIdleClip(clip({ width: 60, height: 100, anchorX: 0.5 }), { width: 0, height: 0 })
		).toBeNull();
	});
});
