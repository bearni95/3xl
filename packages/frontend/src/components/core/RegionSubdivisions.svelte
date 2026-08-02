<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import MapBreadcrumb from '$components/core/MapBreadcrumb.svelte';

	// What the open region divides into (see regionLevelNodes), already lettered by the
	// caller: exactly the shape the breadcrumb bar is handed, because it is drawn by exactly
	// the component that bar draws its steps with. A place on this map is one thing — the
	// tile in its own colour, its name, and the show it flies — and a column of them is that
	// bar stood on end, which is what the path already becomes when it is too long for its
	// row (see the dropped column in MapBreadcrumbs).
	export let rows: {
		key: string;
		label: string;
		showName: string | null;
		showId: number | null;
		tileClasses: string | null;
	}[] = [];
	export let classes: string = '';

	// Picking one is picking a region, which is the map's own gesture and not this
	// column's: the page answers it exactly as it answers a pin or a crumb.
	const dispatch = createEventDispatcher<{ select: { key: string } }>();
</script>

<!-- White ink, as on the bar: a crumb letters what it flies in white at 70% and is drawn to
	be read over the map's own surface, which is what this column is.
	Each row is a block and not a flex box, so the crumb's own span fills the width and the
	name truncates against it — the column is a fixed width, where the bar is as wide as the
	map and collapses rather than cutting a name short. -->
<div class={classNames('flex flex-col gap-0.5 p-2 text-white', classes)}>
	{#each rows as row (row.key)}
		<button
			type="button"
			class="block w-full rounded-md px-2 py-1 text-left hover:bg-white/10"
			on:click={() => dispatch('select', { key: row.key })}
		>
			<MapBreadcrumb
				label={row.label}
				showName={row.showName}
				showId={row.showId}
				tileClasses={row.tileClasses}
				truncated
			/>
		</button>
	{/each}
</div>
