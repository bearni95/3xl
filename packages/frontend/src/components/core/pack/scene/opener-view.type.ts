import type { ClaimPull } from './pull.type';

/**
 * One booster pack in the today's-festes grid the claim canvas lays out: the show
 * poster used as its cover, the celebrating place it belongs to, its show label,
 * and the roll it fires when the player slices it open. Assembled by
 * {@link CharacterClaimPanel} from today's (festa, show) pairs and handed to the
 * grid scene, which renders one {@link PackSprite} per entry.
 */
export interface OpenerPack {
	/** Stable id — the celebrating municipality's feature id. */
	id: string;
	/** Show poster URL used as the pack cover, or null for a plain frame. */
	coverUrl: string | null;
	/**
	 * The show's wordmark, said across the foot of the pack, or null when the author
	 * has enabled none — the pack then says the show by its poster alone rather than
	 * by a stand-in mark. Resolved from the same saved collection the cover is.
	 */
	logoUrl: string | null;
	/** Full name of the place the pack belongs to, drawn across its top. */
	locationName: string | null;
	/** Pack label — the show name shown under the grid pack / in the header. */
	label: string;
	/**
	 * Rolls this pack's booster against Supabase and returns the cards to reveal.
	 * The grid scene calls it when the player slices the selected pack open — so the
	 * spawn is persisted at open time. Rejections/empties reveal no cards.
	 */
	claim: () => Promise<ClaimPull[]>;
}

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
