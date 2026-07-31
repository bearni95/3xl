import { describe, it, expect } from 'vitest';
import { layoutPins, type PinAnchor } from '$utils/map/pin-layout';

const VIEWPORT = { width: 1000, height: 800 };

function pin(id: string, x: number, y: number, width = 200, height = 60): PinAnchor {
	return { id, x, y, width, height };
}

/** The box a placed pin occupies, the same way the layout reckons it. */
function boxOf(anchor: PinAnchor, offset: { dx: number; dy: number }) {
	const left = anchor.x + offset.dx;
	const top = anchor.y + offset.dy - anchor.height / 2;
	return { left, top, right: left + anchor.width, bottom: top + anchor.height };
}

function overlap(a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>): boolean {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

describe('layoutPins', () => {
	it('stands a lone pin on its own point, with nothing to explain', () => {
		const one = pin('a', 400, 400);
		const offsets = layoutPins([one], VIEWPORT, { lead: 16 });
		// Centred on the point: the left edge is half a plate to the left of it.
		expect(offsets.get('a')).toEqual({ dx: -100, dy: 0, moved: false });
	});

	it('moves the pin it cannot leave on its point, and says so', () => {
		const first = pin('first', 400, 400);
		const second = pin('second', 400, 400);
		const offsets = layoutPins([first, second], VIEWPORT);
		expect(offsets.get('first')!.moved).toBe(false);
		expect(offsets.get('second')!.moved).toBe(true);
	});

	it('places every pin it is given', () => {
		const pins = Array.from({ length: 40 }, (_, i) => pin(`p${i}`, 300 + i, 400 + i));
		const offsets = layoutPins(pins, VIEWPORT);
		expect(offsets.size).toBe(40);
	});

	it('moves pins off one another when they share a point', () => {
		const pins = [pin('a', 400, 400), pin('b', 400, 400), pin('c', 400, 400)];
		const offsets = layoutPins(pins, VIEWPORT);
		const boxes = pins.map((p) => boxOf(p, offsets.get(p.id)!));
		for (let i = 0; i < boxes.length; i++) {
			for (let j = i + 1; j < boxes.length; j++) {
				expect(overlap(boxes[i], boxes[j])).toBe(false);
			}
		}
	});

	it('keeps a crowd of pins clear of one another', () => {
		// Twenty towns within a plate's height of one line — the comarca case.
		const pins = Array.from({ length: 20 }, (_, i) => pin(`p${i}`, 200 + (i % 3) * 12, 400 + i));
		const offsets = layoutPins(pins, VIEWPORT);
		const boxes = pins.map((p) => boxOf(p, offsets.get(p.id)!));
		for (let i = 0; i < boxes.length; i++) {
			for (let j = i + 1; j < boxes.length; j++) {
				expect(overlap(boxes[i], boxes[j])).toBe(false);
			}
		}
	});

	it('gives the first pin offered its point, and moves the ones after it', () => {
		const first = pin('first', 400, 400);
		const second = pin('second', 400, 400);
		const offsets = layoutPins([first, second], VIEWPORT, { lead: 16 });
		expect(offsets.get('first')).toEqual({ dx: -100, dy: 0, moved: false });
		expect(offsets.get('second')!.dy).not.toBe(0);
	});

	it('moves a pin it must move to the right of its point, as every other', () => {
		const first = pin('first', 400, 400);
		const second = pin('second', 400, 400);
		const offsets = layoutPins([first, second], VIEWPORT, { lead: 16 });
		expect(offsets.get('second')!.dx).toBe(16);
	});

	it('settles the same view the same way twice', () => {
		const pins = Array.from({ length: 15 }, (_, i) => pin(`p${i}`, 300, 380 + i * 4));
		expect(layoutPins(pins, VIEWPORT)).toEqual(layoutPins(pins, VIEWPORT));
	});

	it('keeps a pin standing on a free point clear of the placed ones', () => {
		// A plate's width apart on the same line: both stand on their own points, and neither
		// has to be moved for it.
		const pins = [pin('a', 300, 400), pin('b', 600, 400)];
		const offsets = layoutPins(pins, VIEWPORT);
		expect(offsets.get('a')!.moved).toBe(false);
		expect(offsets.get('b')!.moved).toBe(false);
		expect(overlap(boxOf(pins[0], offsets.get('a')!), boxOf(pins[1], offsets.get('b')!))).toBe(
			false
		);
	});

	it('pulls a pin near the right edge back onto the canvas', () => {
		const edge = pin('edge', 900, 400);
		const offsets = layoutPins([edge], VIEWPORT, { lead: 16, margin: 4 });
		const box = boxOf(edge, offsets.get('edge')!);
		expect(box.right).toBeLessThanOrEqual(VIEWPORT.width - 4);
		// Pulled left of the point it marks, since 200px of plate cannot stand right of it.
		expect(offsets.get('edge')!.dx).toBeLessThan(0);
	});

	it('keeps a pin near the top edge below it', () => {
		const high = pin('high', 400, 10);
		const offsets = layoutPins([high], VIEWPORT, { margin: 4 });
		const box = boxOf(high, offsets.get('high')!);
		expect(box.top).toBeGreaterThanOrEqual(4);
	});

	it('keeps a pin out of the band the chrome has taken', () => {
		// A point under the breadcrumb bar: the mark has to come out below it.
		const under = pin('under', 400, 30);
		const offsets = layoutPins([under], VIEWPORT, { insets: { top: 80 } });
		const box = boxOf(under, offsets.get('under')!);
		expect(box.top).toBeGreaterThanOrEqual(80);
	});

	it('keeps a pin clear of a right-hand inset', () => {
		const edge = pin('edge', 700, 400);
		const offsets = layoutPins([edge], VIEWPORT, { insets: { right: 240 }, margin: 4 });
		const box = boxOf(edge, offsets.get('edge')!);
		expect(box.right).toBeLessThanOrEqual(VIEWPORT.width - 240 - 4);
	});

	it('keeps a pin out of room something else is standing in', () => {
		// A booster box in the top-right corner: the pin whose point is under it has to come
		// out from under it, not merely stay on the canvas.
		const corner = { left: 700, top: 40, right: 900, bottom: 290 };
		const under = pin('under', 780, 150);
		const offsets = layoutPins([under], VIEWPORT, { reserved: [corner] });
		const box = boxOf(under, offsets.get('under')!);
		expect(overlap(box, corner)).toBe(false);
		expect(offsets.get('under')!.moved).toBe(true);
	});

	it('ignores chrome that claims more room than there is', () => {
		const one = pin('a', 400, 400);
		const offsets = layoutPins([one], VIEWPORT, { insets: { top: 900, bottom: 900 } });
		expect(offsets.get('a')).toBeDefined();
	});

	it('does not refuse a pin taller than the viewport a place to stand', () => {
		const tall = pin('tall', 400, 400, 200, 900);
		const offsets = layoutPins([tall], { width: 1000, height: 800 });
		expect(offsets.get('tall')).toBeDefined();
	});

	it('respects the gap asked for between two pins', () => {
		const pins = [pin('a', 400, 400), pin('b', 400, 400)];
		const offsets = layoutPins(pins, VIEWPORT, { gap: 20 });
		const [a, b] = pins.map((p) => boxOf(p, offsets.get(p.id)!));
		const clearance = Math.max(a.top - b.bottom, b.top - a.bottom);
		expect(clearance).toBeGreaterThanOrEqual(20);
	});
});
