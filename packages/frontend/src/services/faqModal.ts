import { writable } from 'svelte/store';

/**
 * Whether the questions sheet is up. Like the roster, the album and the leaderboard it
 * has no route of its own — a full-view modal raised over the map, opened from the
 * question mark beside the radar at the top of it.
 *
 * The store lives out here, as the other modal stores do, so that the sheet can be
 * mounted at the page root and raised from anywhere: raised from inside the map's
 * pinned panel it would be trapped in that panel's stacking context.
 */
export const faqModalOpen = writable(false);

/** Raise the questions sheet. */
export function openFaq(): void {
	faqModalOpen.set(true);
}

/** Put it away. */
export function closeFaq(): void {
	faqModalOpen.set(false);
}
