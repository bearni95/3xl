<script lang="ts">
	import CharacterClaimPanel from '$components/core/CharacterClaimPanel.svelte';
	import ClaimTodayFestes from '$components/core/ClaimTodayFestes.svelte';
	import ClaimBoosterHistory from '$components/core/ClaimBoosterHistory.svelte';
	import ClaimPackOpenerPanel from '$components/core/pack/ClaimPackOpenerPanel.svelte';
	import type { OpenerView } from '$components/core/pack/scene/opener-view.type';
	import type { FestaLocationRow } from '$types/festivity.type';
	import type { RegionShow } from '$utils/geo/region-tree';

	// Pack-opener state surfaced by CharacterClaimPanel (bound below). While a pack
	// is open it drives the canvas column to the right of the claim content; the
	// character panel's exported methods drive it.
	let opener: OpenerView | null = null;
	let characterPanel: CharacterClaimPanel;

	// Claims are location-driven by the celebrating town, not the browser's GPS: a
	// festa pick opens that show's booster from that municipality's place.
	function claimFromFesta(festa: FestaLocationRow, show: RegionShow) {
		characterPanel?.claimFromShowId(show.id, {
			id: festa.id,
			municipality: festa.name,
			province: festa.prov ?? '',
			country: festa.territory ?? ''
		});
	}
</script>

<div class="flex w-full max-w-6xl flex-col items-stretch gap-6">
	<div
		class="flex w-full flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:justify-center"
	>
	<!-- Left column: the character panel (auth + result) and today's festes list,
	     which is the only way to open a booster. -->
	<div class="flex w-full flex-col items-center gap-6 lg:max-w-md lg:shrink-0">
		<CharacterClaimPanel bind:this={characterPanel} bind:opener />

		<ClaimTodayFestes on:claim={(event) => claimFromFesta(event.detail.festa, event.detail.show)} />
	</div>

	<!-- Right column: the pack-opening canvas. Always visible — a placeholder prompt
	     until a festa is picked, then the live opener. -->
	<div class="w-full lg:min-w-0 lg:flex-1">
		{#if opener}
			<ClaimPackOpenerPanel
				coverUrl={opener.coverUrl}
				packLabel={opener.label}
				locationName={opener.locationName}
				claim={opener.claim}
				openSession={opener.openSession}
				openAnotherBusy={opener.openAnotherBusy}
				openAnotherDisabled={opener.openAnotherDisabled}
				on:close={() => characterPanel.closeOpener()}
				on:openAnother={() => characterPanel.openAnother()}
			/>
		{:else}
			<div class="card h-full min-h-[32rem] w-full bg-base-100 shadow-xl">
				<div class="card-body items-center justify-center gap-2 text-center">
					<h2 class="text-lg font-bold">No booster open</h2>
					<p class="max-w-xs text-sm opacity-60">
						Pick a town celebrating its festa major today to open its booster here.
					</p>
				</div>
			</div>
		{/if}
		</div>
	</div>

	<!-- Full-width history of the booster packs the player has opened, newest first.
	     Reactive to the spawn store, so a pack opened above appears here at once. -->
	<ClaimBoosterHistory />
</div>
