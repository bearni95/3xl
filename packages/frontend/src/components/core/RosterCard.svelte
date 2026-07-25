<script lang="ts">
	import MugenStage from '$components/core/MugenStage.svelte';

	// A single claimed spawn, already resolved to display-ready values by the
	// parent (labels/sprites come from the local @3xl/data registry, place names
	// from the municipality layer) — this card renders UI only.
	export let label: string;
	export let basePath: string | null = null;
	export let showName: string;
	export let locationName: string;
	export let claimedAt: string;
</script>

<div class="card bg-base-100 shadow-md">
	<figure class="bg-base-200 pt-4">
		{#if basePath}
			<MugenStage {basePath} width={220} height={180} scale={1.4} />
		{:else}
			<div class="flex h-[180px] w-[220px] items-center justify-center opacity-40">
				<span class="text-4xl">👤</span>
			</div>
		{/if}
	</figure>
	<div class="card-body gap-2 p-4">
		<h2 class="card-title text-base">{label}</h2>
		<div class="flex flex-wrap gap-2">
			<span class="badge badge-ghost">{showName}</span>
			<span class="badge badge-secondary">📍 {locationName}</span>
		</div>
		<span class="text-xs opacity-60">{claimedAt}</span>
	</div>
</div>
