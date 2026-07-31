import { readonly, writable } from 'svelte/store';

// Whether any full-view sheet is up over the map, and how many.
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
//
// Blur is the whole of what a sheet asks the map for. The arena used to lean it back as
// well, which cost the map its imagery for as long as a fight was on (see WorldMap's
// container comment), so the map is left alone: what moves for a sheet is what the map
// draws over its terrain, never the terrain.
let raised = 0;

const open = writable(false);

/** A sheet has been mounted. Returns nothing; pair it with `dropSheet` on unmount. */
export function raiseSheet(): void {
	raised += 1;
	open.set(true);
}

/** A sheet has been unmounted (after its outro). */
export function dropSheet(): void {
	raised = Math.max(0, raised - 1);
	open.set(raised > 0);
}

/** Whether a full-view sheet is currently up over the map. */
export const fullScreenModalOpen = readonly(open);
