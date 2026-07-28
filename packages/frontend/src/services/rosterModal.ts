import { writable } from 'svelte/store';

/**
 * Whether the roster modal is up. The roster has no route of its own — it is a
 * modal raised over the map, opened from the map panel's Roster button and from
 * anywhere else that has to send the player to their cards (the combat arena's
 * "no active team" card).
 */
export const rosterModalOpen = writable(false);
