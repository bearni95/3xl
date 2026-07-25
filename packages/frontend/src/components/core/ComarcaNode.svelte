<script lang="ts">
	import classNames from 'classnames';
	import MunicipalityRow from '$components/core/MunicipalityRow.svelte';
	import ShowChip from '$components/core/ShowChip.svelte';
	import type { RegionComarca } from '$utils/geo/region-tree';

	// A green comarca toggle revealing its blue municipalities.
	export let comarca: RegionComarca;
	export let highlightId: string | null = null;

	let open = false;
	// Auto-open (and stay open) whenever the highlighted town lives in here.
	$: contains = highlightId != null && comarca.municipis.some((m) => m.id === highlightId);
	$: if (contains) open = true;
</script>

<li class="w-full">
	<button
		type="button"
		class="flex w-full items-center gap-2 border-l-4 border-success"
		aria-expanded={open}
		on:click={() => (open = !open)}
	>
		<span class={classNames('text-xs transition-transform', { 'rotate-90': open })}>▶</span>
		<span class="min-w-0 flex-1 truncate text-left">{comarca.name}</span>
		<ShowChip show={comarca.show} prefix="top" classes="max-w-[45%]" />
		<span class="badge badge-success badge-sm flex-none">{comarca.municipis.length}</span>
	</button>

	{#if open}
		<ul class="w-full border-l border-success/30">
			{#each comarca.municipis as municipality (municipality.id)}
				<MunicipalityRow {municipality} {highlightId} />
			{/each}
		</ul>
	{/if}
</li>
