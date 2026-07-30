import { describe, it, expect } from 'vitest';
import {
	containingRegion,
	levelIndexForView,
	unionBounds,
	type LevelRegion
} from '$utils/geo/level-of-detail';
import type { LatLngBounds } from '$utils/geo/bounds';

/**
 * The map's level-of-detail rule: which tier of pins is drawn at the view the map is at,
 * and — because the two are one statement — where a click on a pin lands.
 *
 * Clicking a pin frames its region whole, so what these cases pin is that a region framed
 * whole has its CHILDREN drawn: a click on a tier always opens the tier below it, whichever
 * tier was clicked, and a town (which has no tier below) simply comes to rest framed.
 *
 * The regions are a square map cut in halves, quarters and sixteenths, and `framing` is the
 * canvas a region fills when the map frames it — which is the region's own size, that being
 * what framing means. Degrees stand in for projected pixels: the projection is monotone, so
 * every comparison the rule makes has the same answer either way.
 */

const box = (south: number, west: number, north: number, east: number): LatLngBounds => [
	[south, west],
	[north, east]
];

const region = (bounds: LatLngBounds): LevelRegion => ({
	bounds,
	position: [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
});

const centreOf = (bounds: LatLngBounds): [number, number] => [
	(bounds[0][0] + bounds[1][0]) / 2,
	(bounds[0][1] + bounds[1][1]) / 2
];

// A canvas of the given span, as the fit predicate the map hands the rule.
const canvas =
	(height: number, width: number) =>
	(bounds: LatLngBounds): boolean =>
		bounds[1][0] - bounds[0][0] <= height && bounds[1][1] - bounds[0][1] <= width;

// The canvas a region gets when the map frames it: the region, exactly.
const framing = (bounds: LatLngBounds) =>
	canvas(bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]);

// A 16×16 map: two territories, four provinces, sixteen comarques, sixty-four towns.
const TERRITORIES = [box(0, 0, 16, 8), box(0, 8, 16, 16)];
const PROVINCES = [box(0, 0, 8, 8), box(8, 0, 16, 8), box(0, 8, 8, 16), box(8, 8, 16, 16)];
const COMARQUES: LatLngBounds[] = [];
for (let south = 0; south < 16; south += 4) {
	for (let west = 0; west < 16; west += 4) COMARQUES.push(box(south, west, south + 4, west + 4));
}
const TOWNS: LatLngBounds[] = [];
for (let south = 0; south < 16; south += 2) {
	for (let west = 0; west < 16; west += 2) TOWNS.push(box(south, west, south + 2, west + 2));
}

const LEVELS = [TERRITORIES, PROVINCES, COMARQUES, TOWNS].map((tier) => tier.map(region));

describe('levelIndexForView', () => {
	it('draws the coarsest tier when the whole map stands in the canvas', () => {
		expect(levelIndexForView(LEVELS, [8, 8], canvas(20, 20))).toBe(0);
	});

	it('draws a tier deeper for each tier that stops fitting', () => {
		// The whole map no longer fits, but a territory does: its provinces are the pins.
		expect(levelIndexForView(LEVELS, [4, 4], canvas(16, 8))).toBe(1);
		expect(levelIndexForView(LEVELS, [4, 4], canvas(8, 8))).toBe(2);
		expect(levelIndexForView(LEVELS, [2, 2], canvas(4, 4))).toBe(3);
	});

	it('opens a clicked region into its own subdivisions, at every tier', () => {
		// What a click does: frame the region, then draw. Every tier but the last must come
		// back one deeper than the tier clicked — its subdivisions, which are what can be
		// clicked next.
		for (const [tier, regions] of LEVELS.entries()) {
			for (const { bounds } of regions) {
				const drawn = levelIndexForView(LEVELS, centreOf(bounds!), framing(bounds!));
				expect(drawn, `tier ${tier} region ${JSON.stringify(bounds)}`).toBe(
					Math.min(tier + 1, LEVELS.length - 1)
				);
			}
		}
	});

	it('leaves a town framed whole at the finest tier, having nothing to open into', () => {
		const town = TOWNS[0];
		expect(levelIndexForView(LEVELS, centreOf(town), framing(town))).toBe(LEVELS.length - 1);
		// And zoomed in past the town, there is still nothing finer to fold out to.
		expect(levelIndexForView(LEVELS, centreOf(town), canvas(0.5, 0.5))).toBe(LEVELS.length - 1);
	});

	it('is not folded back up by a small region that happens to lie near the view', () => {
		// Andorra, in miniature: a territory small enough to stand in any canvas a comarca is
		// read at, sitting next to the comarca being looked at. Measuring the tier by the
		// NEAREST pin drew that territory's own tier — the map folded up to provinces
		// wherever one of the small territories was the nearest thing to the centre.
		const comarca = COMARQUES.find(
			(bounds) => bounds[0][0] === 4 && bounds[0][1] === 4
		)!;
		const speck = box(4.5, 4.5, 5.5, 5.5);
		const levels = [
			[...TERRITORIES, speck].map(region),
			...LEVELS.slice(1)
		];
		const centre = centreOf(comarca);
		// The speck's pin is the nearest thing at the coarsest tier…
		expect(containingRegion([region(speck)], centre)).not.toBeNull();
		// …but the view is not inside it, so it is not what the tier is measured against.
		expect(levelIndexForView(levels, centre, framing(comarca))).toBe(3);
	});

	it('draws a tier whose container cannot be measured rather than folding up', () => {
		expect(levelIndexForView([], [0, 0], canvas(1, 1))).toBe(0);
		expect(levelIndexForView([[{ position: [0, 0] }]], [0, 0], canvas(1, 1))).toBe(0);
	});
});

describe('containingRegion', () => {
	it('takes the tightest box holding the point', () => {
		const wide = region(box(0, 0, 10, 10));
		const tight = region(box(4, 4, 6, 6));
		expect(containingRegion([wide, tight], [5, 5])).toBe(tight);
	});

	it('falls back to the nearest pin where the point is inside nothing', () => {
		const near = region(box(0, 0, 2, 2));
		const far = region(box(20, 20, 22, 22));
		expect(containingRegion([near, far], [5, 5])).toBe(near);
	});
});

describe('unionBounds', () => {
	it('is the whole map when handed the coarsest tier', () => {
		expect(unionBounds(TERRITORIES.map(region))).toEqual(box(0, 0, 16, 16));
	});

	it('is null when nothing carries a box', () => {
		expect(unionBounds([{ position: [0, 0] }])).toBeNull();
	});
});
