<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import BoosterBox from '$components/core/pack/BoosterBox.svelte';
	import MapBreadcrumb from '$components/core/MapBreadcrumb.svelte';
	import ShowShareGrid from '$components/core/ShowShareGrid.svelte';
	import type { MapBoosterBox } from '$types/map.type';

	// What the open region divides into (see regionLevelNodes), already lettered by the
	// caller — and already without the head among them, since the caller is what tallies the
	// shares over exactly these rows: exactly the shape the breadcrumb bar is handed, because
	// it is drawn by exactly the component that bar draws its steps with. A place on this map
	// is one thing — the tile in its own colour, its name, and the show it flies — and a
	// column of them is that bar stood on end, which is what the path already becomes when it
	// is too long for its row (see the dropped column in MapBreadcrumbs).
	export let rows: {
		key: string;
		label: string;
		showName: string | null;
		showId: number | null;
		tileClasses: string | null;
		// The box that place has waiting, where the window has one for it — the very box the
		// map is standing on that town at this moment, off the same `MapBoosterBox` a pin is
		// handed (see TownPin). Only a town ever has one: nothing coarser than a municipality
		// is de festa. Absent everywhere else, which is every row of every other tier.
		box?: MapBoosterBox | null;
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
	// How the rows below divide between the shows they fly, tallied over exactly those rows
	// by the caller (see ShowShareGrid). Empty says nothing rather than saying nought.
	export let shares: { id: number; name: string; share: number }[] = [];
	export let classes: string = '';

	// Picking one is picking a region, which is the map's own gesture and not this
	// column's: the page answers it exactly as it answers a pin or a crumb.
	const dispatch = createEventDispatcher<{ select: { key: string } }>();

	// The width of the box a row carries, which is how its height is said: give a box either of
	// the two and it takes the other (see BoosterBox's 30:37), and the width is the one the
	// column has to know before it can lay a row out. The 2.5rem in it is how tall an entry
	// stands — the crumb's 32px tile in a row padded by 4 either side, which is the tallest
	// thing in one; the two lines of type it is set beside come to less. So the calc reads as
	// the sentence it is: the row's height, at the box's ratio. Written out rather than built
	// from a constant because Tailwind reads these class names out of the source text, and a
	// name assembled at run time is a name it never sees.
	const BOX_WIDTH = 'w-[calc(2.5rem*30/37)]';
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

		<!-- How far the place at the head has been taken and the one control that acts on it,
			directly under the row that names it and across the whole width of the column: the
			caller's, because only a town has either. A row of its own rather than a block at the
			end of the name's — the standing is two things stacked, a reading and a doing, and
			hanging them off the end of a line of type made a column of the row that names the
			place and left the name set against the middle of it. Here the head reads down
			instead: this is where you are, and this is what is left to do about it. Empty for
			every tier that has no such thing to say, which costs the column a row of nothing. -->
		<slot name="standing" />
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
		{#if rows.length}
			<div class="divider my-0"></div>
		{/if}
	{/if}

	<!-- Whose level the rest of the column is, at the head of it: the path down to the place
		the rows below are the inside of, which is the open region everywhere except on a town —
		a town is listed among its own sisters, and what they are all the inside of is the region
		above them. It stands under the rule with the rows and above the shares, because
		everything below the rule is about that place and this says which place it is.
		The caller's, and drawn by the caller with the very bar that stands over the map, so a
		path 400px cannot hold folds itself to one step and a dots button rather than being cut
		short — see MapBreadcrumbs. -->
	<slot name="path" />

	{#if shares.length}
		<!-- What the list below is made of, before the list itself: the shows those places fly
			and how much of them each has. It stands under the rule with the rows rather than
			above it with the head, because it is about them and not about the place they are
			under. -->
		<ShowShareGrid {shares} />
	{/if}

	{#each rows as row (row.key)}
		<!-- The row is the press, and the box beside it is not: a box here says what that town
			has waiting, the way the tile says what it flies, and it is the row that is pressed —
			to the same end, since the pack is reached by opening the town. So the whole row
			lights on hover while the press itself stays on the name, and the box stands outside
			the button rather than inside it: a button holds phrasing content, which is why the
			crumb in it is spans throughout (see MapBreadcrumb), and a box is a block of planes.
			The row is a plain flex box where there is nothing to stand beside the name, which is
			every row of every tier above the municipality. -->
		<div class="flex items-stretch rounded-md hover:bg-white/10">
			<button
				type="button"
				class="block min-w-0 flex-1 px-2 py-1 text-left"
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

			{#if row.box}
				<!-- At the far end of the entry and as tall as the entry is. The height is the one
					that is said here, and it is said as a width: a box hands back whichever of the two
					it is not given (see BoosterBox's 30:37), and it is the width that has to be
					settled before the row is laid out, since a flex item nobody has given a width is
					measured by what is inside it — which for a box whose every figure is a share of
					its own width is not a measurement at all, and came out wider than the column.
					So the width is stated and the ratio returns the row's height: ROW_HEIGHT is the
					crumb's own — a 32px tile in a row padded by 4 — which is what makes the box
					exactly as tall as the entry rather than as tall as it can get away with.
					Hidden from a screen reader: the box is printed with the town's own name, which
					the row beside it has just said, and it is not a control here. -->
				<div class="flex-none pr-2" aria-hidden="true">
					<BoosterBox
						coverUrl={row.box.coverUrl ?? null}
						logoUrl={row.box.logoUrl ?? null}
						showId={row.box.showId ?? null}
						locationName={row.box.locationName ?? null}
						light={row.box.light ?? false}
						classes={BOX_WIDTH}
					/>
				</div>
			{/if}
		</div>
	{/each}
</div>
