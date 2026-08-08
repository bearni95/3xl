// What each tier of the region tree is called on screen.
//
// `RegionType` is the tree's own vocabulary — 'Municipality', 'Comarca' — and those
// literals are keys in a data structure, not words for a reader. Two surfaces name a
// tier (the drill table's cell and a search result's badge), and a second copy is how
// two of them come to disagree, so the map from tier to catalogue key is kept here in
// one place, exactly as the spawn colours are.
//
// Typed `Record<RegionType, string>` so a tier added to the tree fails to compile until
// it has been given a name, rather than reaching a player as a raw literal — which is
// what a key built at runtime from the type's own spelling would have allowed.

import type { MapBoosterBox } from '$types/map.type';
import type { RegionType } from '$utils/geo/region-tree';

/** The catalogue key naming each tier. */
export const REGION_TYPE_KEYS: Record<RegionType, string> = {
	Territory: 'region.type.territory',
	Province: 'region.type.province',
	Comarca: 'region.type.comarca',
	Municipality: 'region.type.municipality'
};

/**
 * One place as the map's furniture draws it: the tile in its own colour, its name, and the
 * show it flies — the shape the breadcrumb bar is handed, because it is drawn by exactly the
 * component that bar draws its steps with (see RegionListRow). Plus, where the booster window
 * has one for it, the box that place has waiting — the very `MapBoosterBox` the map is
 * standing on that town. Only a town ever has one: nothing coarser than a municipality is de
 * festa.
 *
 * Here rather than in either component because the head of the open region (RegionSubdivisions)
 * and the list of places (RegionLocationList) now stand in two different columns of the page,
 * and a place has to be the same thing in both: they letter the same rows off the same `crumbRow`.
 */
export type RegionRow = {
	key: string;
	label: string;
	showName: string | null;
	showId: number | null;
	tileClasses: string | null;
	box?: MapBoosterBox | null;
};

/**
 * The width the box a row carries is drawn at, which is how its height is said: give a box
 * either of the two and it takes the other (see BoosterBox's 30:37), and the width is the one a
 * list has to know before it can lay a row out. The 2.5rem in it is how tall an entry stands —
 * the crumb's 32px tile in a row padded by 4 either side, which is the tallest thing in one; the
 * two lines of type it is set beside come to less. So the calc reads as the sentence it is: the
 * row's height, at the box's ratio.
 *
 * Written out as a literal rather than built from a constant because Tailwind reads these class
 * names out of the source text, and a name assembled at run time is a name it never sees. Shared
 * for the same reason `RegionRow` is: the head row and the list rows stand in different columns
 * and must still be one column's worth of rows to the eye.
 */
export const REGION_ROW_BOX_WIDTH = 'w-[calc(2.5rem*30/37)]';
