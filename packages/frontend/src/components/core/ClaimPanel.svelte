<script lang="ts">
	import CharacterClaimPanel from '$components/core/CharacterClaimPanel.svelte';
	import ClaimTodayFestes from '$components/core/ClaimTodayFestes.svelte';
	import ClaimBoosterHistory from '$components/core/ClaimBoosterHistory.svelte';
	import ClaimPackGridPanel from '$components/core/pack/ClaimPackGridPanel.svelte';
	import type { OpenerPack } from '$components/core/pack/scene/opener-view.type';
	import type { TodayFestaPair } from '$types/festivity.type';

	// Today's celebrating (festa, show) pairs, produced by the festes list and fed to
	// the character panel, which turns the claimable ones into rendered grid packs.
	let pairs: TodayFestaPair[] = [];
	// The day's booster packs, assembled by the character panel and laid out by the
	// pack-grid canvas to the right of the claim content.
	let packs: OpenerPack[] = [];
	let gridPanel: ClaimPackGridPanel;
</script>

<div class="flex w-full max-w-6xl flex-col items-stretch gap-6">
	<div
		class="flex w-full flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:justify-center"
	>
		<!-- Left column: the character panel (auth + allowance) and today's festes list.
		     The list still drives claims — clicking a town opens its pack on the grid. -->
		<div class="flex w-full flex-col items-center gap-6 lg:max-w-md lg:shrink-0">
			<CharacterClaimPanel {pairs} bind:packs />

			<ClaimTodayFestes
				bind:pairs
				on:claim={(event) => gridPanel?.selectPack(event.detail.festa.id)}
			/>
		</div>

		<!-- Right column: the pack-grid canvas. Renders every one of today's booster
		     packs; clicking one centres + zooms it, then the click-to-cut open begins. -->
		<div class="w-full lg:min-w-0 lg:flex-1">
			<ClaimPackGridPanel bind:this={gridPanel} {packs} />
		</div>
	</div>

	<!-- Full-width history of the booster packs the player has opened, newest first.
	     Reactive to the spawn store, so a pack opened above appears here at once. -->
	<ClaimBoosterHistory />
</div>
