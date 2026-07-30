import { writable } from 'svelte/store';

/**
 * Whether the achievements modal is up. Like the roster it has no route of its
 * own — a full-view modal raised over the map, opened from the Achievements
 * button on the map panel's Profile tab.
 */
export const achievementsModalOpen = writable(false);
