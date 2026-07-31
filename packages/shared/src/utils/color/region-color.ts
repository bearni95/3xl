/**
 * The map's palette: every colour a region may be painted in, as a CSS colour
 * value — the six a card can be rolled in (borrowed whole from
 * {@link SPAWN_COLOR_CSS}, so a region and a card never disagree about what red
 * is) plus the map's own grey for a place nobody holds.
 *
 * Written as the very variable Tailwind emits for the swatch, for the same reason
 * the spawn palette is: a colour painted outside the class system (a Leaflet fill,
 * say) then tracks the theme's palette instead of pinning a copy of it. The
 * literal fallback matters just as much — the variable only exists while some
 * utility in the app still spells that swatch, and an unresolvable `var()`
 * computes to `none`, silently erasing whatever it paints.
 */

import { ArtificialColor, type RegionColor } from '../../types/region-color.type';
import { SPAWN_COLOR_CSS } from '../spawn/color';

/** The map's own colours, the ones no card carries. */
export const ARTIFICIAL_COLOR_CSS: Record<ArtificialColor, string> = {
	[ArtificialColor.Gray]: 'var(--color-gray-500, oklch(55.1% 0.027 264.364))'
};

/** Every colour a region may fly, card-rolled and artificial alike. */
export const REGION_COLOR_CSS: Record<RegionColor, string> = {
	...SPAWN_COLOR_CSS,
	...ARTIFICIAL_COLOR_CSS
};
