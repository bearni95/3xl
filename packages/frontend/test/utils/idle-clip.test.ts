import { describe, expect, it } from 'vitest';
import { placeIdleClip, type IdleClipFrame } from '$utils/mugen/idle-clip';
import { REFERENCE_SOURCE_HEIGHT } from '$utils/card/character-fit';

const clip = (...frames: Omit<IdleClipFrame, 'url' | 'duration'>[]): IdleClipFrame[] =>
	frames.map((frame, index) => ({ ...frame, url: `f${index}.png`, duration: 100 }));

// The square the team strip stands a character in.
const SQUARE = { width: 120, height: 120 };

describe('placeIdleClip', () => {
	it('fills the surface with a character of the reference height', () => {
		const tall = clip({ width: 80, height: REFERENCE_SOURCE_HEIGHT, anchorX: 0.5 });
		const placement = placeIdleClip(tall, SQUARE)!;
		expect(placement.sheet.height).toBeCloseTo(SQUARE.height, 10);
		expect(placement.sheet.bottom).toBeCloseTo(0, 10);
	});

	it('draws a short character shorter than a tall one', () => {
		// Chopper against Trunks: normalised to their own sprite heights, not stretched
		// to the same box, so the head of difference between them survives.
		const chopper = placeIdleClip(clip({ width: 60, height: 81, anchorX: 0.5 }), SQUARE)!;
		const trunks = placeIdleClip(clip({ width: 80, height: 136, anchorX: 0.5 }), SQUARE)!;
		expect(chopper.sheet.height / trunks.sheet.height).toBeCloseTo(81 / 136, 10);
		expect(chopper.sheet.height).toBeLessThan(SQUARE.height);
	});

	it('brings a character taller than the reference back into the surface', () => {
		const cell = placeIdleClip(clip({ width: 109, height: 185, anchorX: 0.5 }), SQUARE)!;
		expect(cell.sheet.height).toBeCloseTo(SQUARE.height, 10);
	});

	it('stands the character on the baseline, in the room left above it', () => {
		// A surface whose floor is a ground plane rather than its bottom edge: the feet
		// go on that line, and what is left above it is all the character has to fill.
		const tall = clip({ width: 80, height: REFERENCE_SOURCE_HEIGHT, anchorX: 0.5 });
		const baseline = SQUARE.height / 4;
		const placement = placeIdleClip(tall, SQUARE, { baseline })!;
		expect(placement.sheet.bottom).toBeCloseTo(baseline, 10);
		expect(placement.sheet.height).toBeCloseTo(SQUARE.height - baseline, 10);
		for (const frame of placement.frames) {
			expect(frame.bottom).toBeCloseTo(baseline, 10);
			expect(frame.bottom + frame.height).toBeLessThanOrEqual(SQUARE.height + 1e-9);
		}
	});

	it('never places a frame outside the surface', () => {
		const frames = clip(
			{ width: 400, height: 100, anchorX: 0.25 },
			{ width: 380, height: 90, anchorX: 0.5 }
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
		// stand on the same floor.
		const frames = clip(
			{ width: 60, height: 100, anchorX: 0.25 },
			{ width: 40, height: 80, anchorX: 0.5 }
		);
		const placement = placeIdleClip(frames, SQUARE, { flipped: false })!;
		const left = Math.min(...placement.frames.map((frame) => frame.left));
		const right = Math.max(...placement.frames.map((frame) => frame.left + frame.width));
		expect(left).toBeCloseTo(placement.sheet.left, 10);
		expect(right).toBeCloseTo(placement.sheet.left + placement.sheet.width, 10);
		for (const frame of placement.frames) {
			expect(frame.bottom).toBeCloseTo(0, 10);
		}
	});

	it('pins every frame by its body axis, so the character stays put', () => {
		const frames = clip(
			{ width: 60, height: 100, anchorX: 0.25 },
			{ width: 40, height: 100, anchorX: 0.5 }
		);
		const placement = placeIdleClip(frames, SQUARE, { flipped: false })!;
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
		const facing = placeIdleClip(frames, SQUARE, { flipped: false })!;
		const flipped = placeIdleClip(frames, SQUARE, { flipped: true })!;
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
