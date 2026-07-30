/**
 * Which tier of pins a map draws at the view it is at.
 *
 * The map holds one rendering per division tier, coarsest first — territories, then
 * provinces, comarques, municipalities — and shows exactly one of them. The rule is that a
 * pin marks a PART of what is being looked at: the region on screen is named by the bar
 * across the top, so a pin standing for it would be that name a second time, on the one
 * mark whose click leads nowhere new. So the tier drawn is the one *inside* the region the
 * view is in — the children of the coarsest region that stands whole in the canvas.
 *
 * Which is also what makes a click on a pin drill: a click frames the region it named, and
 * a region framed whole is by definition a region that fits, so its children are what the
 * map then pins. The two halves are one statement as long as "fits" means the same thing to
 * the framing and to this — which is the caller's job (see `fits`), and the reason the
 * measuring is not done here: the projection and the canvas belong to the map.
 *
 * Pure and framework-agnostic: boxes, a centre and a predicate. Everything Leaflet knows —
 * how a box projects at a zoom, how big the canvas is, what margin is kept round a framed
 * region — stays in the component.
 */

import type { LatLngBounds } from './bounds';
import type { LatLng } from './center';

/** The little a tier's pin has to say about itself for the rule to place it. */
export interface LevelRegion {
	/** The region's own box. A pin without one takes no part in the containment tests. */
	bounds?: LatLngBounds;
	/** Where the pin stands, for the nearest-pin fallback. */
	position: LatLng;
}

/** Whether a box stands whole inside the canvas as it is right now. */
export type BoundsFit = (bounds: LatLngBounds) => boolean;

/** The union of every region of a tier — for the coarsest tier, the whole map. */
export function unionBounds(regions: readonly LevelRegion[]): LatLngBounds | null {
	let box: LatLngBounds | null = null;
	for (const region of regions) {
		if (!region.bounds) continue;
		const [[south, west], [north, east]] = region.bounds;
		if (!box) box = [[south, west], [north, east]];
		else {
			box[0][0] = Math.min(box[0][0], south);
			box[0][1] = Math.min(box[0][1], west);
			box[1][0] = Math.max(box[1][0], north);
			box[1][1] = Math.max(box[1][1], east);
		}
	}
	return box;
}

/** The region of a tier whose pin stands nearest a point. */
export function nearestRegion<T extends LevelRegion>(
	regions: readonly T[],
	centre: LatLng
): T | null {
	let nearest: T | null = null;
	let best = Infinity;
	for (const region of regions) {
		const dLat = region.position[0] - centre[0];
		const dLng = region.position[1] - centre[1];
		const distance = dLat * dLat + dLng * dLng;
		if (distance < best) {
			best = distance;
			nearest = region;
		}
	}
	return nearest;
}

/**
 * The region of a tier the view is INSIDE: the smallest of them whose box holds the centre.
 *
 * The nearest pin is not an answer to that question at a coarse tier, which is what this
 * replaces: a comarca of the Pyrenees framed on screen has Andorra's pin nearer its centre
 * than Catalunya's, and Andorra is small enough to stand whole in the canvas at any zoom a
 * comarca is read at — so the map folded back up to territories wherever one of the small
 * territories happened to be the nearest thing.
 *
 * Smallest-first because boxes of one tier overlap: of two that hold the centre, the tighter
 * is the better statement of where the view is. Falls back to the nearest pin where the
 * centre is inside nothing at all — over the sea, or over land this map does not divide.
 */
export function containingRegion<T extends LevelRegion>(
	regions: readonly T[],
	centre: LatLng
): T | null {
	let best: T | null = null;
	let smallest = Infinity;
	for (const region of regions) {
		if (!region.bounds) continue;
		const [[south, west], [north, east]] = region.bounds;
		if (centre[0] < south || centre[0] > north) continue;
		if (centre[1] < west || centre[1] > east) continue;
		const area = (north - south) * (east - west);
		if (area < smallest) {
			smallest = area;
			best = region;
		}
	}
	return best ?? nearestRegion(regions, centre);
}

/**
 * The index of the tier to draw, given the stack coarsest → finest.
 *
 * Each tier is asked about its CONTAINER rather than about itself: the whole map contains
 * the coarsest tier, and every tier below is contained by the region of the tier above that
 * the view is inside. The first container that fits is the region being looked at, and the
 * tier it contains is the one drawn. Containers shrink as the walk goes finer, so the first
 * one to fit is also the coarsest. Zoomed in past even the finest container, the finest tier
 * is all that is left to draw.
 *
 * A tier whose container cannot be measured — nothing there, or a region with no box — is
 * drawn rather than skipped: an unmeasurable container is not a reason to fold the map up.
 */
export function levelIndexForView(
	levels: readonly (readonly LevelRegion[])[],
	centre: LatLng,
	fits: BoundsFit
): number {
	const finest = levels.length - 1;
	if (finest < 0) return 0;
	for (let i = 0; i <= finest; i++) {
		const container = i === 0 ? unionBounds(levels[0]) : (containingRegion(levels[i - 1], centre)?.bounds ?? null);
		if (!container || fits(container)) return i;
	}
	return finest;
}
