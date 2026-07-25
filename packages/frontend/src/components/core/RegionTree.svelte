<script lang="ts">
	import classNames from 'classnames';
	import ComarcaNode from '$components/core/ComarcaNode.svelte';
	import MunicipalityRow from '$components/core/MunicipalityRow.svelte';
	import ProvinceNode from '$components/core/ProvinceNode.svelte';
	import ShowChip from '$components/core/ShowChip.svelte';
	import type { RegionTerritory } from '$utils/geo/region-tree';

	// The territory → (province) → comarca → municipality tree, mirroring the
	// map's red / yellow / green / blue tiers.
	export let territories: RegionTerritory[] = [];
	// The shared set of open node keys (a territory's key is its own id; deeper
	// tiers append theirs), and the toggle that flips one. The map reads the same
	// set to decide which poster each polygon shows.
	export let expanded: Set<string>;
	export let onToggle: (key: string) => void;
	// Municipality id to highlight (the one the player stands in), painted red.
	export let highlightId: string | null = null;
</script>

<ul class="menu min-h-0 flex-1 flex-nowrap gap-1 overflow-y-auto p-2">
	{#each territories as territory (territory.id)}
		{@const open = expanded.has(territory.id)}
		<li class="w-full">
			<button
				type="button"
				class="flex w-full items-center gap-2 border-l-4 border-error font-semibold"
				aria-expanded={open}
				on:click={() => onToggle(territory.id)}
			>
				<span class={classNames('text-xs transition-transform', { 'rotate-90': open })}>▶</span>
				<span class="min-w-0 flex-1 truncate text-left">{territory.name}</span>
				<ShowChip show={territory.show} prefix="top" classes="max-w-[45%]" />
				<span class="badge badge-error badge-sm flex-none">{territory.count}</span>
			</button>

			{#if open}
				<ul class="w-full border-l border-error/30">
					{#each territory.provincies as province (province.id)}
						<ProvinceNode {province} parentKey={territory.id} {expanded} {onToggle} {highlightId} />
					{/each}
					{#each territory.comarques as comarca (comarca.id)}
						<ComarcaNode {comarca} parentKey={territory.id} {expanded} {onToggle} {highlightId} />
					{/each}
					{#each territory.municipis as municipality (municipality.id)}
						<MunicipalityRow {municipality} {highlightId} />
					{/each}
				</ul>
			{/if}
		</li>
	{:else}
		<li class="px-2 py-4 text-sm opacity-60">No regions loaded.</li>
	{/each}
</ul>
