<script lang="ts">
	import classNames from 'classnames';
	import MunicipalityRow from '$components/core/MunicipalityRow.svelte';
	import ShowChip from '$components/core/ShowChip.svelte';
	import { joinKey, type RegionComarca } from '$utils/geo/region-tree';

	// A green comarca toggle revealing its blue municipalities.
	export let comarca: RegionComarca;
	// Key of the parent tier (territory or province) this comarca hangs off.
	export let parentKey: string;
	// The shared set of open node keys, and the toggle that mutates it.
	export let expanded: Set<string>;
	export let onToggle: (key: string) => void;
	export let highlightId: string | null = null;

	$: key = joinKey(parentKey, comarca.id);
	$: open = expanded.has(key);
</script>

<li class="w-full">
	<button
		type="button"
		class="flex w-full items-center gap-2 border-l-4 border-success"
		aria-expanded={open}
		on:click={() => onToggle(key)}
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
