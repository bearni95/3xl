import { writable } from 'svelte/store';

/**
 * Whether the account's settings sheet is up as a modal. The player's row in the map
 * panel is where their name, level and experience are read; the settings sheet is
 * everything about the account that is not that reading — the name they are typing,
 * which address they signed in with, since when, and the way out — so the row's
 * Settings button flips this. The modal itself lives once at the layout root, like the
 * avatar picker.
 *
 * It has to live out there rather than inside the panel: the panel is a fixed,
 * z-indexed element, so anything rendered within it is trapped in its stacking
 * context and could never rise above it — a dialog raised from the panel would be
 * pinned under every other modal on the page.
 */
export const settingsModalOpen = writable(false);
