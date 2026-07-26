<script lang="ts">
	import classNames from 'classnames';
	import ShowChip from '$components/core/ShowChip.svelte';
	import type { RegionMunicipality } from '$utils/geo/region-tree';

	// A blue municipality leaf: dot + name + its seeded show.
	export let municipality: RegionMunicipality;
	// The selected node key (the map's single imaged region) and its setter — a
	// municipality's key is its own id.
	export let selected: string | null = null;
	export let onSelect: (key: string) => void;
</script>

<li class="w-full">
	<button
		type="button"
		class={classNames('flex w-full items-center gap-2 border-l-4 border-info text-left', {
			'bg-info/20': selected === municipality.id
		})}
		on:click={() => onSelect(municipality.id)}
	>
		<span class="h-2 w-2 flex-none rounded-full bg-info"></span>
		<span class="min-w-0 flex-1 truncate">{municipality.name}</span>
		<ShowChip show={municipality.show} classes="max-w-[50%]" />
	</button>
</li>
