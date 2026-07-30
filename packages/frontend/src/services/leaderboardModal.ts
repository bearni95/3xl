import { writable } from 'svelte/store';

/**
 * Whether the leaderboard is up. Like the roster and the badges it has no route of
 * its own — a full-view modal raised over the map, opened from the Leaderboard
 * button on the map panel. It was a tab of that panel, which meant a table of every
 * show's holdings could only be read by putting away whatever else the panel had
 * forward, in a column 450px wide.
 */
export const leaderboardModalOpen = writable(false);
