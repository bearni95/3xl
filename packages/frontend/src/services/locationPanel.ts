import localStorageWritableStore from '$utils/localStorageWritableStore';

/**
 * Whether the map corner's Location plate is folded away to its title bar.
 *
 * It starts folded: the plate is the drill table for wherever the map is looking, which
 * is a thing a player goes to rather than a thing they need in front of them, and it
 * stands over the map — an unasked-for table covering the corner of the very map it is
 * about is the wrong default. Unfolding it is a decision, so it is kept: the plate comes
 * back the way it was left, on this device, across reloads.
 */
export const locationPanelCollapsed = localStorageWritableStore('location-panel-collapsed', true);
