/**
 * Which booster box to go to next: the nearest one still worth walking to.
 *
 * The map stands a box on every town whose festa major falls inside the booster
 * window, which is days of festes at once scattered across the whole of the Països
 * Catalans — findable by panning, and only by panning. This is the other way of
 * asking: from where the reader is standing, which box is closest that they have not
 * already opened and are not already looking at.
 *
 * Both exclusions are the point rather than tidiness. A box already spent is a place
 * with nothing left to give, and the box under the open town is the one the reader can
 * see — an answer of "the one you are on" is a press that does nothing.
 *
 * Distances are compared, never reported, so they are left squared and in degrees: the
 * whole map is under two degrees of latitude tall, where a metre-accurate great circle
 * and a flat plane rank the same towns in the same order. Longitude degrees are the
 * shorter of the two at these latitudes (about 0.74 of a latitude degree at 42°N), so
 * they are scaled by the cosine before being squared — without it the nearest box would
 * be biased east and west.
 */

import type { LatLng } from './center';

/** All a box has to say for itself to be found: where it is, and whether it is spent. */
export interface LocatableBox {
	/** The municipality the box stands on. */
	id: string;
	/** Where it stands, as Leaflet takes it: `[lat, lng]`. */
	position: LatLng;
	/** Whether this reader has already opened it, in which case it is not a destination. */
	claimed?: boolean;
}

/**
 * The nearest box to `from` that is neither claimed nor `exclude` (the town already
 * open). Null when there is no such box at all — nothing in the window, or every one of
 * them opened already — which is a radar with nothing to point at rather than an error.
 *
 * Ties keep the earlier box, so the same list asked twice answers the same town.
 */
export function nearestUnclaimedBox<T extends LocatableBox>(
	from: LatLng,
	boxes: readonly T[],
	exclude?: string | null
): T | null {
	const lngScale = Math.cos((from[0] * Math.PI) / 180);
	let best: T | null = null;
	let bestDistance = Infinity;

	for (const box of boxes) {
		if (box.claimed) continue;
		if (exclude && box.id === exclude) continue;
		const dLat = box.position[0] - from[0];
		const dLng = (box.position[1] - from[1]) * lngScale;
		const distance = dLat * dLat + dLng * dLng;
		if (distance < bestDistance) {
			bestDistance = distance;
			best = box;
		}
	}

	return best;
}
