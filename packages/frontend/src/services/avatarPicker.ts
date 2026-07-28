import { writable } from 'svelte/store';

/**
 * Whether the "choose your avatar" modal is open. Clicking the profile picture on
 * the account card — the one pinned to the map panel, or the navbar's — flips
 * this; the modal itself lives once at the layout root, like the username prompt.
 */
export const avatarPickerOpen = writable(false);
