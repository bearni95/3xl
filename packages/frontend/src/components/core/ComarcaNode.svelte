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
	// The selected node key (the map's single imaged region) and its setter.
	export let selected: string | null = null;
	export let onSelect: (key: string) => void;

	$: key = joinKey(parentKey, comarca.id);
	$: open = expanded.has(key);
</script>

<li class="w-full">
	<div
		class={classNames('flex w-full items-center gap-2 border-l-4 border-success', {
			'bg-success/15': selected === key
		})}
	>
		<button
			type="button"
			class="flex-none px-1 text-xs"
			aria-expanded={open}
			aria-label="Toggle {comarca.name}"
			on:click={() => onToggle(key)}
		>
			<span class={classNames('inline-block transition-transform', { 'rotate-90': open })}>▶</span>
		</button>
		<button
			type="button"
			class="flex min-w-0 flex-1 items-center gap-2 text-left"
			on:click={() => onSelect(key)}
		>
			<span class="min-w-0 flex-1 truncate">{comarca.name}</span>
			<ShowChip show={comarca.show} prefix="top" classes="max-w-[45%]" />
			<span class="badge badge-success badge-sm flex-none">{comarca.municipis.length}</span>
		</button>
	</div>

	{#if open}
		<ul class="w-full border-l border-success/30">
			{#each comarca.municipis as municipality (municipality.id)}
				<MunicipalityRow {municipality} {selected} {onSelect} />
			{/each}
		</ul>
	{/if}
</li>
