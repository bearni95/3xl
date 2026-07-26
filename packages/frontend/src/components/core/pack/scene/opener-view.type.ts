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
	/** Full name of the place the pack belongs to, drawn across its bottom. */
	locationName: string | null;
	/**
	 * Rolls the booster against Supabase and returns the cards to reveal. The canvas
	 * calls this when the player slices the pack open — so the spawn is persisted at
	 * open time, not when the pack was selected. Rejections/empties reveal no cards.
	 */
	claim: () => Promise<ClaimPull[]>;
	/** Bumped on every open so the canvas remounts with a fresh pack. */
	openSession: number;
	/** True while the parent is rolling the next claim. */
	openAnotherBusy: boolean;
	/** Disable "Open another" (no location claimed, mid-open, etc). */
	openAnotherDisabled: boolean;
}
