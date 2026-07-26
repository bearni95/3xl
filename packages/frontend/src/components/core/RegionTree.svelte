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
	// tiers append theirs), and the toggle that flips one. Drives which regions
	// reveal their children.
	export let expanded: Set<string>;
	export let onToggle: (key: string) => void;
	// The single selected node key — the one region the map images — and the
	// setter a row calls when clicked.
	export let selected: string | null = null;
	export let onSelect: (key: string) => void;
</script>

<ul class="menu min-h-0 flex-1 flex-nowrap gap-1 overflow-y-auto p-2">
	{#each territories as territory (territory.id)}
		{@const open = expanded.has(territory.id)}
		<li class="w-full">
			<div
				class={classNames('flex w-full items-center gap-2 border-l-4 border-error font-semibold', {
					'bg-error/15': selected === territory.id
				})}
			>
				<button
					type="button"
					class="flex-none px-1 text-xs"
					aria-expanded={open}
					aria-label="Toggle {territory.name}"
					on:click={() => onToggle(territory.id)}
				>
					<span class={classNames('inline-block transition-transform', { 'rotate-90': open })}
						>▶</span
					>
				</button>
				<button
					type="button"
					class="flex min-w-0 flex-1 items-center gap-2 text-left"
					on:click={() => onSelect(territory.id)}
				>
					<span class="min-w-0 flex-1 truncate">{territory.name}</span>
					<ShowChip show={territory.show} prefix="top" classes="max-w-[45%]" />
					<span class="badge badge-error badge-sm flex-none">{territory.count}</span>
				</button>
			</div>

			{#if open}
				<ul class="w-full border-l border-error/30">
					{#each territory.provincies as province (province.id)}
						<ProvinceNode
							{province}
							parentKey={territory.id}
							{expanded}
							{onToggle}
							{selected}
							{onSelect}
						/>
					{/each}
					{#each territory.comarques as comarca (comarca.id)}
						<ComarcaNode
							{comarca}
							parentKey={territory.id}
							{expanded}
							{onToggle}
							{selected}
							{onSelect}
						/>
					{/each}
					{#each territory.municipis as municipality (municipality.id)}
						<MunicipalityRow {municipality} {selected} {onSelect} />
					{/each}
				</ul>
			{/if}
		</li>
	{:else}
		<li class="px-2 py-4 text-sm opacity-60">No regions loaded.</li>
	{/each}
</ul>
