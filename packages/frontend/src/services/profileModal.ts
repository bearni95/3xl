import { writable } from 'svelte/store';

/**
 * Whether the full profile card is up as a modal. The account card pinned to the
 * map panel is a glance card, so its Profile button flips this; the modal itself
 * lives once at the layout root, like the username prompt and the avatar picker.
 *
 * It has to live out there rather than inside the panel: the panel is a fixed,
 * z-indexed element, so anything rendered within it is trapped in its stacking
 * context and could never rise above it — a dialog raised from the panel would be
 * pinned under every other modal on the page.
 */
export const profileModalOpen = writable(false);
