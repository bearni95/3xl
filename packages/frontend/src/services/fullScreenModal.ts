import { readonly, writable } from 'svelte/store';

// Whether any full-view sheet is up over the map, how many, and whether any of them is one
// the map leans back for.
//
// FullScreenModal is the one full-view surface this app has, and everything drawn on it
// covers the whole viewport — so while one is up, the map's own chrome is not being read.
// The map blurs it away rather than leaving it sharp under a sheet (see the root page and
// WorldMap's `markersBlurred`), and what it needs to know that is exactly "is a sheet up",
// not which one. So the sheet says so itself, from its own mount and unmount, and the map
// reads this rather than the five stores that happen to raise one today: a sixth sheet
// blurs the map behind it without anything being wired to it.
//
// A count and not a flag, because two of these can be up at once — the combat arena sends
// the player to their roster, and the roster is drawn over the arena — and the first of the
// two to be dismissed must not unblur a map still under the other.
//
// The unmount is what drops the count, which happens after the sheet's own slide-out has
// played: the map comes back into focus behind a sheet that has already left, rather than
// sharpening under one still on its way down.
let raised = 0;
// The same count, over the sheets that asked the map to tilt as well (see FullScreenModal's
// `tiltsMap` — today that is the combat arena and nothing else). Kept apart from `raised`
// rather than derived from it, because the two questions have different answers whenever a
// tilting sheet and a plain one are up together.
let tilting = 0;

const open = writable(false);
const tilted = writable(false);

/**
 * A sheet has been mounted. `tilt` is that sheet's `tiltsMap`; pair it with the identical
 * argument to `dropSheet`, or the counts come apart.
 */
export function raiseSheet(tilt: boolean = false): void {
	raised += 1;
	open.set(true);
	if (tilt) {
		tilting += 1;
		tilted.set(true);
	}
}

/** A sheet has been unmounted (after its outro). */
export function dropSheet(tilt: boolean = false): void {
	raised = Math.max(0, raised - 1);
	open.set(raised > 0);
	if (tilt) {
		tilting = Math.max(0, tilting - 1);
		tilted.set(tilting > 0);
	}
}

/** Whether a full-view sheet is currently up over the map. */
export const fullScreenModalOpen = readonly(open);

/** Whether one of the sheets currently up is one the map leans back for. */
export const mapTilted = readonly(tilted);
