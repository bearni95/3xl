import { writable } from 'svelte/store';

/**
 * Whether the credits sheet is up. Like the questions, the roster and the album it has
 * no route of its own — a full-view modal raised over the map, opened from the mark
 * beside the question mark at the top of it.
 *
 * The store lives out here, as the other modal stores do, so that the sheet can be
 * mounted at the page root and raised from anywhere: raised from inside the map's
 * pinned panel it would be trapped in that panel's stacking context.
 */
export const creditsModalOpen = writable(false);

/** Raise the credits sheet. */
export function openCredits(): void {
	creditsModalOpen.set(true);
}

/** Put it away. */
export function closeCredits(): void {
	creditsModalOpen.set(false);
}
