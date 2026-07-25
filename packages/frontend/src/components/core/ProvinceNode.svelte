<script lang="ts">
	import classNames from 'classnames';
	import ComarcaNode from '$components/core/ComarcaNode.svelte';
	import MunicipalityRow from '$components/core/MunicipalityRow.svelte';
	import ShowChip from '$components/core/ShowChip.svelte';
	import type { RegionProvince } from '$utils/geo/region-tree';

	// A yellow province toggle revealing its green comarques.
	export let province: RegionProvince;
	export let highlightId: string | null = null;

	let open = false;
	// Auto-open (and stay open) when the highlighted town is anywhere within.
	$: contains =
		highlightId != null &&
		(province.municipis.some((m) => m.id === highlightId) ||
			province.comarques.some((c) => c.municipis.some((m) => m.id === highlightId)));
	$: if (contains) open = true;
</script>

<li class="w-full">
	<button
		type="button"
		class="flex w-full items-center gap-2 border-l-4 border-warning font-medium"
		aria-expanded={open}
		on:click={() => (open = !open)}
	>
		<span class={classNames('text-xs transition-transform', { 'rotate-90': open })}>▶</span>
		<span class="min-w-0 flex-1 truncate text-left">{province.name}</span>
		<ShowChip show={province.show} prefix="top" classes="max-w-[45%]" />
		<span class="badge badge-warning badge-sm flex-none">{province.count}</span>
	</button>

	{#if open}
		<ul class="w-full border-l border-warning/30">
			{#each province.comarques as comarca (comarca.id)}
				<ComarcaNode {comarca} {highlightId} />
			{/each}
			{#each province.municipis as municipality (municipality.id)}
				<MunicipalityRow {municipality} {highlightId} />
			{/each}
		</ul>
	{/if}
</li>
