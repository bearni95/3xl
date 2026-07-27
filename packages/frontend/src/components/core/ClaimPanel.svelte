<script lang="ts">
	import CharacterClaimPanel from '$components/core/CharacterClaimPanel.svelte';
	import ClaimBoosterHistory from '$components/core/ClaimBoosterHistory.svelte';
	import ClaimPackGridPanel from '$components/core/pack/ClaimPackGridPanel.svelte';
	import type { OpenerPack } from '$components/core/pack/scene/opener-view.type';

	// The day's booster packs, assembled by the character panel from today's festes and
	// laid out by the pack-grid canvas below it.
	let packs: OpenerPack[] = [];
</script>

<div class="flex w-full max-w-6xl flex-col items-stretch gap-6">
	<!-- The claim panel: auth, daily allowance, and today's festes loaded into packs. -->
	<CharacterClaimPanel bind:packs />

	<!-- The pack-grid canvas: every one of today's booster packs. Clicking one centres
	     + zooms it, then the click-to-cut open begins. -->
	<ClaimPackGridPanel {packs} />

	<!-- History of the booster packs the player has opened, newest first. Reactive to
	     the spawn store, so a pack opened above appears here at once. -->
	<ClaimBoosterHistory />
</div>
