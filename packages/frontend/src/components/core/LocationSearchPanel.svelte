<script lang="ts">
	import classNames from 'classnames';
	import RegionSearchResults from '$components/core/RegionSearchResults.svelte';
	import type { RegionSearchEntry } from '$utils/geo/region-tree';

	// The matches for what the bar's search box holds, on a plate of their own at the map's
	// right corner, directly under the field that produced them. They used to be a third thing
	// the Location plate could be showing, at the other corner and behind that plate's fold —
	// so a search typed at the top right answered at the bottom left, in a plate a query had to
	// unfold on the player's behalf. A search is its own subject, not a state of the plate
	// about the open region, so it gets its own surface and the region plate keeps only what
	// is about the region.
	//
	// No title: a list of place names under a search box is already saying what it is, and the
	// only thing a strip over it has to carry is the way out. So the strip is the close button
	// and nothing else, at the end of the plate's own black chrome, above the themed body the
	// cards are drawn on.

	export let results: RegionSearchEntry[] = [];
	export let onSelect: (entry: RegionSearchEntry) => void;
	/** Pressing the cross. The search itself is the caller's, so ending it is too. */
	export let onClose: () => void;
	export let classes: string = '';
</script>

<div class={classNames('overflow-hidden rounded-lg bg-black text-white shadow-xl', classes)}>
	<div class="flex items-center justify-end px-1 py-1">
		<button
			type="button"
			class="btn btn-square btn-ghost btn-xs text-white hover:bg-white/10 hover:text-white"
			aria-label="Close the search"
			on:click={onClose}
		>
			<svg viewBox="0 0 24 24" fill="currentColor" class="size-4" aria-hidden="true">
				<path
					d="M18.3 5.71 12 12.01 5.71 5.71 4.29 7.12l6.3 6.3-6.3 6.29 1.42 1.42 6.29-6.3 6.3 6.3 1.41-1.42-6.3-6.29 6.3-6.3z"
				/>
			</svg>
		</button>
	</div>

	<!-- A height it cannot pass, with the cards scrolling inside it: this is a corner of the
		map, not a column. The body is the host's own surface, since the cards are drawn for the
		theme rather than for the plate's black. -->
	<div class="flex max-h-[50vh] flex-col bg-base-100 text-base-content">
		<RegionSearchResults {results} {onSelect} />
	</div>
</div>
