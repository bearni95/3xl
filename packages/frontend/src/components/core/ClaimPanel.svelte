<script lang="ts">
	import CharacterClaimPanel from '$components/core/CharacterClaimPanel.svelte';
	import ClaimTodayFestes from '$components/core/ClaimTodayFestes.svelte';
	import ClaimPackOpenerPanel from '$components/core/pack/ClaimPackOpenerPanel.svelte';
	import type { OpenerView } from '$components/core/pack/scene/opener-view.type';
	import type { MunicipalityFesta } from '$types/festa.type';
	import type { RegionShow } from '$utils/geo/region-tree';

	// Pack-opener state surfaced by CharacterClaimPanel (bound below). While a pack
	// is open it drives the canvas column to the right of the claim content; the
	// character panel's exported methods drive it.
	let opener: OpenerView | null = null;
	let characterPanel: CharacterClaimPanel;

	// Claims are location-driven by the celebrating town, not the browser's GPS: a
	// festa pick opens that show's booster from that municipality's place.
	function claimFromFesta(festa: MunicipalityFesta, show: RegionShow) {
		characterPanel?.claimFromShowId(show.id, {
			id: festa.id,
			municipality: festa.name,
			province: festa.prov ?? '',
			country: festa.territory ?? ''
		});
	}
</script>

<div
	class="flex w-full max-w-6xl flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:justify-center"
>
	<!-- Left column: the character panel (auth + result) and today's festes list,
	     which is the only way to open a booster. -->
	<div class="flex w-full flex-col items-center gap-6 lg:max-w-md lg:shrink-0">
		<CharacterClaimPanel bind:this={characterPanel} bind:opener />

		<ClaimTodayFestes on:claim={(event) => claimFromFesta(event.detail.festa, event.detail.show)} />
	</div>

	<!-- Right column: the pack-opening canvas, shown once a character is claimed. -->
	{#if opener}
		<div class="w-full lg:min-w-0 lg:flex-1">
			<ClaimPackOpenerPanel
				coverUrl={opener.coverUrl}
				packLabel={opener.label}
				pulls={opener.pulls}
				openSession={opener.openSession}
				openAnotherBusy={opener.openAnotherBusy}
				openAnotherDisabled={opener.openAnotherDisabled}
				on:close={() => characterPanel.closeOpener()}
				on:openAnother={() => characterPanel.openAnother()}
			/>
		</div>
	{/if}
</div>
