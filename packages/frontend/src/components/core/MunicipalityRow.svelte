<script lang="ts">
	import classNames from 'classnames';
	import ShowChip from '$components/core/ShowChip.svelte';
	import type { RegionMunicipality } from '$utils/geo/region-tree';

	// A blue municipality leaf: dot + name + its seeded show.
	export let municipality: RegionMunicipality;
	// Painted red like its polygon when it's the town the player stands in.
	export let highlightId: string | null = null;
</script>

<li class="w-full">
	<span
		class={classNames('flex w-full items-center gap-2 border-l-4 border-info', {
			'bg-error/20 font-semibold': highlightId === municipality.id
		})}
	>
		<span class="h-2 w-2 flex-none rounded-full bg-info"></span>
		<span class="min-w-0 flex-1 truncate">{municipality.name}</span>
		<ShowChip show={municipality.show} classes="max-w-[50%]" />
	</span>
</li>
