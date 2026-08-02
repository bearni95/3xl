<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import type { RegionNode } from '$utils/geo/region-tree';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';

	// What the open region divides into, already worked out (see regionLevelNodes): a
	// level of the tree, in the order the tree holds it, which is by name.
	export let nodes: RegionNode[] = [];
	export let classes: string = '';

	// Picking one is picking a region, which is the map's own gesture and not this
	// column's: the page answers it exactly as it answers a pin or a crumb.
	const dispatch = createEventDispatcher<{ select: { key: string } }>();
</script>

<!-- One name per row and nothing else — a single column, read down. The names are the
	map's own, so each is given its article back before it is printed. -->
<div class={classNames('flex flex-col', classes)}>
	{#each nodes as node (node.key)}
		<button
			type="button"
			class="truncate px-3 py-2 text-left text-sm hover:bg-base-200"
			on:click={() => dispatch('select', { key: node.key })}
		>
			{restoreCatalanArticle(node.name)}
		</button>
	{/each}
</div>
