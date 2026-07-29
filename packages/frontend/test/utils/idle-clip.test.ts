import { describe, expect, it } from 'vitest';
import { placeIdleClip, type IdleClipFrame } from '$utils/mugen/idle-clip';
import { characterFitScale, IDLE_SCALE_BOOST } from '$utils/card/character-fit';

const clip = (...frames: Omit<IdleClipFrame, 'url' | 'duration'>[]): IdleClipFrame[] =>
	frames.map((frame, index) => ({ ...frame, url: `f${index}.png`, duration: 100 }));

const BOX = { width: 168, height: 118 };

describe('placeIdleClip', () => {
	it('draws a character at the size the fit gives it', () => {
		const frames = clip({ width: 70, height: 81, anchorX: 0.5 });
		const placement = placeIdleClip(frames, BOX);
		const expected = characterFitScale(frames, BOX) * IDLE_SCALE_BOOST;
		expect(placement?.frames[0].height).toBeCloseTo(81 * expected, 10);
		expect(placement?.frames[0].width).toBeCloseTo(70 * expected, 10);
	});

	it('keeps a short character shorter than a tall one', () => {
		const krillin = placeIdleClip(clip({ width: 70, height: 81, anchorX: 0.5 }), BOX);
		const trunks = placeIdleClip(clip({ width: 80, height: 136, anchorX: 0.5 }), BOX);
		expect(krillin!.frames[0].height / trunks!.frames[0].height).toBeCloseTo(81 / 136, 10);
	});

	it('centres the cycle, not each frame on its own', () => {
		// Two frames of different widths whose body axis sits off-centre: the cycle's
		// reach either side of the axis is what gets centred, so the axis lands in the
		// same place for both frames and the character does not shuffle sideways.
		const frames = clip(
			{ width: 60, height: 100, anchorX: 0.25 },
			{ width: 40, height: 100, anchorX: 0.5 }
		);
		const placement = placeIdleClip(frames, BOX, false)!;
		const scale = characterFitScale(frames, BOX) * IDLE_SCALE_BOOST;
		const axis = [0, 1].map(
			(index) => placement.frames[index].left + frames[index].anchorX * frames[index].width * scale
		);
		expect(axis[0]).toBeCloseTo(axis[1], 10);

		// And the box the whole cycle sweeps out is itself centred in the box — its
		// furthest reach left (frame 1) balanced against its furthest right (frame 0).
		const left = Math.min(...placement.frames.map((frame) => frame.left));
		const right = Math.max(...placement.frames.map((frame) => frame.left + frame.width));
		expect(left + right).toBeCloseTo(BOX.width, 10);
	});

	it('mirrors the reach when the character is flipped', () => {
		const frames = clip({ width: 60, height: 100, anchorX: 0.25 });
		const scale = characterFitScale(frames, BOX) * IDLE_SCALE_BOOST;
		const facing = placeIdleClip(frames, BOX, false)!;
		const flipped = placeIdleClip(frames, BOX, true)!;
		// The image box is the same size and, for a single frame, the same place — the
		// mirroring itself is CSS's, about that box's own centre.
		expect(flipped.frames[0].width).toBeCloseTo(60 * scale, 10);
		expect(flipped.frames[0].left).toBeCloseTo(facing.frames[0].left, 10);
	});

	it('stands the tallest frame centred, with every frame on one baseline', () => {
		const frames = clip(
			{ width: 60, height: 100, anchorX: 0.5 },
			{ width: 60, height: 80, anchorX: 0.5 }
		);
		const placement = placeIdleClip(frames, BOX)!;
		const scale = characterFitScale(frames, BOX) * IDLE_SCALE_BOOST;
		// The baseline is shared, so a shorter frame simply reaches less high above it.
		expect(placement.bottom).toBeCloseTo((BOX.height - 100 * scale) / 2, 10);
		expect(placement.frames[1].height).toBeCloseTo(80 * scale, 10);
	});

	it('has nothing to place without frames or a box', () => {
		expect(placeIdleClip([], BOX)).toBeNull();
		expect(placeIdleClip(clip({ width: 60, height: 100, anchorX: 0.5 }), { width: 0, height: 0 })).toBeNull();
	});
});
