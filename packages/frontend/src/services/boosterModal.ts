import { writable } from 'svelte/store';

/**
 * Whether the booster packs are up. A full-view modal over the map like the roster
 * and the badges, raised from the map panel's Booster button and from the box
 * standing on a festa town — the box narrows it to that town's pack, the button
 * opens on the whole window's grid.
 *
 * It was a tab of the map's right-hand panel, so a pack was sliced open in a 450px
 * column and the cards it gave stood three to a row in whatever height the panel
 * had left over.
 */
export const boosterModalOpen = writable(false);
