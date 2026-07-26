import type { ClaimPull } from './pull.type';

/**
 * Everything the (non-modal) pack-opener canvas needs to render one open,
 * surfaced by {@link CharacterClaimPanel} to its parent so the canvas can live
 * in a sibling column to the right of the claim content. Null while no pack is
 * open. Purely presentation state — assembled after a roll resolves.
 */
export interface OpenerView {
	/** Show poster URL used as the pack cover, or null for a plain frame. */
	coverUrl: string | null;
	/** Pack label — the show name shown across the pack. */
	label: string;
	/** The claimed character(s) revealed by this open. */
	pulls: ClaimPull[];
	/** Bumped on every open so the canvas remounts with a fresh pack. */
	openSession: number;
	/** True while the parent is rolling the next claim. */
	openAnotherBusy: boolean;
	/** Disable "Open another" (no location claimed, mid-open, etc). */
	openAnotherDisabled: boolean;
}
