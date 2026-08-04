import { describe, it, expect } from 'vitest';
import { nearestUnclaimedBox, type LocatableBox } from '$utils/geo/nearest-box';

/** A box on a town, at `[lat, lng]`, unopened unless said otherwise. */
function box(id: string, lat: number, lng: number, claimed = false): LocatableBox {
	return { id, position: [lat, lng], claimed };
}

describe('nearestUnclaimedBox', () => {
	it('answers the closest box to the point asked from', () => {
		const boxes = [box('far', 42.5, 2.5), box('near', 41.6, 1.8), box('middling', 42, 2)];
		expect(nearestUnclaimedBox([41.5, 1.7], boxes)?.id).toBe('near');
	});

	it('skips boxes this reader has already opened', () => {
		const boxes = [box('near', 41.6, 1.8, true), box('next', 42, 2)];
		expect(nearestUnclaimedBox([41.5, 1.7], boxes)?.id).toBe('next');
	});

	it('skips the town already open, however close it is', () => {
		const boxes = [box('here', 41.5, 1.7), box('elsewhere', 42, 2)];
		expect(nearestUnclaimedBox([41.5, 1.7], boxes, 'here')?.id).toBe('elsewhere');
	});

	it('has nothing to point at when every box is spent', () => {
		const boxes = [box('a', 41.6, 1.8, true), box('b', 42, 2, true)];
		expect(nearestUnclaimedBox([41.5, 1.7], boxes)).toBeNull();
	});

	it('has nothing to point at with no boxes at all', () => {
		expect(nearestUnclaimedBox([41.5, 1.7], [])).toBeNull();
	});

	it('scales longitude by the latitude, so east and west are not made to look nearer', () => {
		// A degree of longitude at 42°N is about 0.74 of a degree of latitude, so 1.4° east
		// is 1.04 latitude-degrees away — the further of these two, despite the raw
		// difference in degrees being the smaller one. Unscaled, east would win.
		const boxes = [box('east', 42, 3.4), box('north', 43, 2)];
		expect(nearestUnclaimedBox([42, 2], boxes)?.id).toBe('north');
	});

	it('keeps the earlier box when two are equally close', () => {
		const boxes = [box('first', 42, 2.1), box('second', 42, 1.9)];
		expect(nearestUnclaimedBox([42, 2], boxes)?.id).toBe('first');
	});
});
