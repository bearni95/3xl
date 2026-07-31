import { describe, it, expect } from 'vitest';
import { groupPins, type GroupCandidate } from '$utils/map/pin-groups';

function pin(id: string, x: number, y: number, width = 200, height = 60): GroupCandidate {
	return { id, x, y, width, height };
}

describe('groupPins', () => {
	it('leaves a pin nobody crowds standing alone', () => {
		const groups = groupPins([pin('a', 100, 100), pin('b', 600, 500)]);
		expect(groups.map((group) => group.ids)).toEqual([['a'], ['b']]);
	});

	it('folds the pins that would have stood on one another into one mark', () => {
		const groups = groupPins([pin('a', 400, 400), pin('b', 410, 405), pin('c', 395, 398)]);
		expect(groups.length).toBe(1);
		expect(groups[0].ids).toEqual(['a', 'b', 'c']);
	});

	it('stands the mark it folds them into amid the places it is about', () => {
		const groups = groupPins([pin('a', 400, 400), pin('b', 420, 440)]);
		expect(groups[0].x).toBe(410);
		expect(groups[0].y).toBe(420);
	});

	it('gives every mark back exactly once', () => {
		const pins = Array.from({ length: 40 }, (_, i) => pin(`p${i}`, 300 + i * 3, 400 + i * 2));
		const groups = groupPins(pins);
		const ids = groups.flatMap((group) => group.ids);
		expect(ids.length).toBe(40);
		expect(new Set(ids).size).toBe(40);
	});

	it('keeps two crowds a plate apart two crowds', () => {
		const groups = groupPins([
			pin('a', 200, 200),
			pin('b', 210, 205),
			pin('c', 800, 600),
			pin('d', 805, 610)
		]);
		expect(groups.map((group) => group.ids)).toEqual([
			['a', 'b'],
			['c', 'd']
		]);
	});

	it('never folds a mark that is not to be folded, nor folds anything into it', () => {
		const picked = { ...pin('picked', 400, 400), groupable: false };
		const groups = groupPins([picked, pin('a', 405, 402), pin('b', 410, 404)]);
		expect(groups[0].ids).toEqual(['picked']);
		expect(groups[1].ids).toEqual(['a', 'b']);
	});

	it('respects the gap asked for', () => {
		// Two plates 210 apart: clear of each other by 10, which a gap of 20 will not have.
		const pins = [pin('a', 200, 400), pin('b', 410, 400)];
		expect(groupPins(pins, { gap: 4 }).length).toBe(2);
		expect(groupPins(pins, { gap: 20 }).length).toBe(1);
	});

	it('folds the same view the same way twice', () => {
		const pins = Array.from({ length: 15 }, (_, i) => pin(`p${i}`, 300 + i * 20, 380 + i * 4));
		expect(groupPins(pins)).toEqual(groupPins(pins));
	});

	it('takes a mark into the nearer of two crowds it touches', () => {
		const groups = groupPins([pin('far', 200, 400), pin('near', 560, 400), pin('joiner', 520, 400)]);
		const home = groups.find((group) => group.ids.includes('joiner'))!;
		expect(home.ids).toContain('near');
		expect(home.ids).not.toContain('far');
	});
});
