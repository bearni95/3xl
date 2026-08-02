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
	// The place the column is about, at the head of it with a rule under it: where the map is
	// looking, which is a different kind of thing from the rows below and is what a reader
	// looks for first. It stands whatever tier that place is — a town, which is one of the
	// sisters listed under it, and every coarser region, which is not one of its own
	// subdivisions — so the column always reads the same way round: this place, then the
	// level under it.
	export let current: {
		key: string;
		label: string;
		showName: string | null;
		showId: number | null;
		tileClasses: string | null;
	} | null = null;
	export let classes: string = '';

	// Picking one is picking a region, which is the map's own gesture and not this
	// column's: the page answers it exactly as it answers a pin or a crumb.
	const dispatch = createEventDispatcher<{ select: { key: string } }>();

	// The level with the head taken out of it, so a town at the top of its own list of
	// sisters is not also standing among them. Nothing to take out on any other tier — a
	// region is never one of the things it divides into — which is why this is a filter and
	// not a rule about municipalities. `current` is named directly so it re-runs with it.
	$: rest = current ? rows.filter((row) => row.key !== current?.key) : rows;
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
		<!-- Whatever else the place at the head has to say for itself, between its name and the
			level below it: the caller's, because what a place carries depends on what kind of
			place it is — a town has a side standing on it, an occupant and a fight to be had,
			and nothing coarser has any of those. Inside the head's own part of the column, above
			the rule, so it reads as more about that place and never as the first of its
			subdivisions. -->
		<slot name="detail" />

		<!-- The rule that says the rest of the column is a different thing from the row above
			it: not more of the level, but the level under it. Drawn only when there is a level
			to divide off — a rule over nothing would be the column claiming to have more to say
			than it has. -->
		{#if rest.length}
			<div class="divider my-0"></div>
		{/if}
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
