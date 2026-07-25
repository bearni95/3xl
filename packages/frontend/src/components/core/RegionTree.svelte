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
	// Municipality id to highlight (the one the player stands in), painted red
	// like its polygon; the branches leading to it open automatically.
	export let highlightId: string | null = null;

	// Which territories are open. Auto-open a territory when a new highlight lands
	// inside it; the deeper tiers reveal themselves the same way.
	let open = new Set<string>();

	function territoryContains(territory: RegionTerritory, id: string): boolean {
		const inComarques = (comarques: RegionTerritory['comarques']) =>
			comarques.some((c) => c.municipis.some((m) => m.id === id));
		return (
			territory.municipis.some((m) => m.id === id) ||
			inComarques(territory.comarques) ||
			territory.provincies.some(
				(p) => p.municipis.some((m) => m.id === id) || inComarques(p.comarques)
			)
		);
	}

	$: if (highlightId) {
		for (const territory of territories) {
			if (territoryContains(territory, highlightId)) open = new Set(open).add(territory.id);
		}
	}

	function toggle(id: string) {
		const next = new Set(open);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		open = next;
	}
</script>

<ul class="menu min-h-0 flex-1 flex-nowrap gap-1 overflow-y-auto p-2">
	{#each territories as territory (territory.id)}
		{@const isOpen = open.has(territory.id)}
		<li class="w-full">
			<button
				type="button"
				class="flex w-full items-center gap-2 border-l-4 border-error font-semibold"
				aria-expanded={isOpen}
				on:click={() => toggle(territory.id)}
			>
				<span class={classNames('text-xs transition-transform', { 'rotate-90': isOpen })}>▶</span>
				<span class="min-w-0 flex-1 truncate text-left">{territory.name}</span>
				<ShowChip show={territory.show} prefix="top" classes="max-w-[45%]" />
				<span class="badge badge-error badge-sm flex-none">{territory.count}</span>
			</button>

			{#if isOpen}
				<ul class="w-full border-l border-error/30">
					{#each territory.provincies as province (province.id)}
						<ProvinceNode {province} {highlightId} />
					{/each}
					{#each territory.comarques as comarca (comarca.id)}
						<ComarcaNode {comarca} {highlightId} />
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
