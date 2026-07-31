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

import type { RegionType } from '$utils/geo/region-tree';

/** The catalogue key naming each tier. */
export const REGION_TYPE_KEYS: Record<RegionType, string> = {
	Territory: 'region.type.territory',
	Province: 'region.type.province',
	Comarca: 'region.type.comarca',
	Municipality: 'region.type.municipality'
};
