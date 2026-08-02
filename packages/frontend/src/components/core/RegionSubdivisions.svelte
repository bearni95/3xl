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
	// The row that is the place being looked at rather than a place under it, when one of
	// them is: a town listing its sisters is one of the sisters, and a name somewhere down a
	// column of forty is not where a reader looks for where they are. It is lifted to the
	// head of the column with a rule under it, so the column reads as this place and then
	// the ones beside it. Null on every other tier, where the rows are what the open region
	// divides into and the open region itself is named by the bar over the map.
	export let currentKey: string | null = null;
	export let classes: string = '';

	// Picking one is picking a region, which is the map's own gesture and not this
	// column's: the page answers it exactly as it answers a pin or a crumb.
	const dispatch = createEventDispatcher<{ select: { key: string } }>();

	// The column in the order it is read. `rows` is named directly so the split re-runs as
	// the level changes; a `currentKey` naming no row leaves the level exactly as it came,
	// which is what an unheard-of key or a level with nothing lifted out of it should do.
	$: current = currentKey ? (rows.find((row) => row.key === currentKey) ?? null) : null;
	$: rest = current ? rows.filter((row) => row.key !== current.key) : rows;
</script>

<!-- White ink, as on the bar: a crumb letters what it flies in white at 70% and is drawn to
	be read over the map's own surface, which is what this column is.
	Each row is a block and not a flex box, so the crumb's own span fills the width and the
	name truncates against it — the column is a fixed width, where the bar is as wide as the
	map and collapses rather than cutting a name short. -->
<div class={classNames('flex flex-col gap-0.5 p-2 text-white', classes)}>
	{#if current}
		<!-- Where the map is, at the head of its own level and lettered as the bar letters the
			step it is on — the same `current`, the same `aria-current`, since it is the same
			statement about the same place. Pressed like any other row: the view can be taken off
			the place while the column goes on listing it, so there is somewhere for it to go. -->
		<button
			type="button"
			aria-current="page"
			class="block w-full rounded-md px-2 py-1 text-left hover:bg-white/10"
			on:click={() => dispatch('select', { key: current.key })}
		>
			<MapBreadcrumb
				label={current.label}
				showName={current.showName}
				showId={current.showId}
				tileClasses={current.tileClasses}
				current
				truncated
			/>
		</button>
		<!-- The rule that says the rest of the column is a different thing from the row above
			it: not more of the level, but the level the row above is one of. -->
		<div class="divider my-0"></div>
	{/if}

	{#each rest as row (row.key)}
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
