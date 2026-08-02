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
		// The box that place has waiting, exactly as a row below carries one and off the same
		// `MapBoosterBox`: the head is a row like the rest, and a town at the head of the column
		// is de festa or is not on the same terms as a town listed under it. Only a town ever
		// has one here either.
		box?: MapBoosterBox | null;
	} | null = null;
	// How the rows below divide between the shows they fly, tallied over exactly those rows
	// by the caller (see ShowShareGrid). Empty says nothing rather than saying nought.
	export let shares: { id: number; name: string; share: number }[] = [];
	export let classes: string = '';

	// Picking one is picking a region, which is the map's own gesture and not this
	// column's: the page answers it exactly as it answers a pin or a crumb.
	const dispatch = createEventDispatcher<{ select: { key: string } }>();

	// The show the list is being read through, picked off the shares above it. Held here and
	// nowhere else: it changes nothing about the map, nothing about the URL and nothing any
	// other surface can see — it is this column being read one show at a time, which is a
	// question about the list and lives with the list.
	let activeShow: number | null = null;

	// Pressing the picked show again clears it, pressing another turns the list over to that
	// one. So there is one gesture and it is its own undo, and the reader can never be left
	// with a filter they have to find the way out of.
	function toggleShow(id: number) {
		activeShow = activeShow === id ? null : id;
	}

	// A filter belongs to the list it was picked over. Walk into another region and the list is
	// another list — of another level, in another place — so the show goes with the old one
	// rather than silently hiding most of what has just been opened. `current` is named in the
	// statement so it re-runs when the column changes place.
	let filteredFor: string | null = null;
	$: if ((current?.key ?? null) !== filteredFor) {
		filteredFor = current?.key ?? null;
		activeShow = null;
	}

	// The rows as they are drawn: all of them, or the ones flying the picked show. The shares
	// above are deliberately left whole — they are the division of the level, and a division
	// recomputed over a filtered list would say 100% of one show the moment one was picked,
	// which is the reader's own press read back to them as a fact about the map.
	$: visibleRows = activeShow === null ? rows : rows.filter((row) => row.showId === activeShow);

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
			the place while the column goes on listing it, so there is somewhere for it to go.
			Laid out as a row of the list is and not as a bare button, because it carries what a
			row carries: the press is the name, and the box beside it stands outside the button,
			since a button holds phrasing content and a box is a block of planes. -->
		<div class="flex items-stretch rounded-md hover:bg-white/10">
			<button
				type="button"
				aria-current="page"
				class="block min-w-0 flex-1 px-2 py-1 text-left"
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

			{#if current.box}
				<!-- The box the place at the head has waiting, drawn exactly as a row's is and at
					exactly its size: the same stated width returning the same row height through the
					box's own ratio (see BOX_WIDTH), so the head and the rows under it line up down the
					column's far edge.
					Pressed for the box's own click and not the row's — the town's pack, which is what
					a click on this same `MapBoosterBox` does wherever it is drawn (see `onClick`). So
					it is a button beside the name's button rather than a picture inside it, and it
					takes its accessible name from the one the box is printed with. -->
				<button
					type="button"
					class="flex-none pr-2"
					on:click={() => current?.box?.onClick?.()}
				>
					<BoosterBox
						coverUrl={current.box.coverUrl ?? null}
						logoUrl={current.box.logoUrl ?? null}
						showId={current.box.showId ?? null}
						locationName={current.box.locationName ?? null}
						light={current.box.light ?? false}
						classes={BOX_WIDTH}
					/>
				</button>
			{/if}
		</div>

		<!-- Whatever else the place at the head has to say for itself, between its name and the
			level below it: the caller's, because what a place carries depends on what kind of
			place it is — a town has a side standing on it, an occupant and a fight to be had,
			and nothing coarser has any of those. Inside the head's own part of the column, above
			the rule, so it reads as more about that place and never as the first of its
			subdivisions. -->
		<slot name="detail" />

		<!-- How far the place at the head has been taken and the one control that acts on it,
			across the whole width of the column: the caller's, because only a town has either.
			Under the side standing on the town rather than over it — the side is who would have
			to be beaten and the standing is how far beating them has got, so the reading follows
			what it is a reading of, and the button that starts the fight is the last thing in the
			block and the thing nearest the list the reader came from. A row of its own rather
			than a block at the end of the name's, that having made a column of the row that names
			the place. Empty for every tier with no such thing to say, which costs the column a
			row of nothing. -->
		<slot name="standing" />

		<!-- The rule that says the rest of the column is a different thing from the row above
			it: not more of the level, but the level under it. Drawn only when there is a level
			to divide off — a rule over nothing would be the column claiming to have more to say
			than it has. -->
		{#if rows.length}
			<div class="divider my-0"></div>
		{/if}
	{/if}

	<!-- Where the place at the head of this column is: the cut it sits inside, which is the one
		thing about that place its own row cannot say — a row names a place, and naming it twice
		over is not naming where it is. It stands under the rule with the rows rather than up
		with the head, because what is under the rule is that place's surroundings: what it is
		one of, and what it is made of.
		The caller's, since which cut that is is the map's business and not this column's. -->
	<slot name="path" />

	{#if shares.length}
		<!-- What the list below is made of, before the list itself: the shows those places fly
			and how much of them each has. It stands under the rule with the rows rather than
			above it with the head, because it is about them and not about the place they are
			under. And it is how the list is narrowed to one of them: the row that says what the
			level is made of is the row that says show me that part of it. -->
		<!-- It is handed the whole division whatever is picked, and the tally is the caller's
			over every row: a share is what this level is, not what is left of it after a press. -->
		<ShowShareGrid
			{shares}
			active={activeShow}
			on:select={(event) => toggleShow(event.detail.id)}
		/>
	{/if}

	{#each visibleRows as row (row.key)}
		<!-- Two presses on one row: the name, which opens the town, and the box, which opens what
			the town has waiting. They were one press for a while — the box was a picture and the
			row was pressed to the same end, the pack being reached by opening the town — but a box
			is the mark this game asks to be tapped, and a picture of one that answers by drilling
			the map is not that mark. So the whole row lights on hover, and each half does its own
			thing. The box stands outside the name's button either way: a button holds phrasing
			content, which is why the crumb in it is spans throughout (see MapBreadcrumb), and a
			box is a block of planes. The row is a plain flex box where there is nothing to stand
			beside the name, which is every row of every tier above the municipality. -->
		<!-- The one row among the sisters that is the place the map is open on takes the primary
			fill, so it can be found in the list without being counted along it. Only a town is
			ever among its own level — every coarser region is listed above what it divides into,
			never beside it — so this is the town's own row and there is at most one of them.
			The head above says the same place, but a head is where a reader looks first and not
			where they look for a town: the list is what is read against, and a place in it that
			is not marked in it is not in it. The fill is the marking, so the ink over it is the
			fill's own (see the crumb's second line, which takes it from here) and the box beside
			it stands on the fill unchanged — a box is printed artwork and not ink. -->
		<div
			class={classNames(
				'flex items-stretch rounded-md',
				row.key === current?.key
					? 'bg-primary text-primary-content hover:bg-primary/90'
					: 'hover:bg-white/10'
			)}
		>
			<button
				type="button"
				aria-current={row.key === current?.key ? 'page' : undefined}
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
					Its own press, and not the row's: this is the same `MapBoosterBox` the map is
					standing on that town, so it does here what it does there — raises that town's
					pack (see its `onClick`), which opens the town on the way. The row beside it still
					opens the town alone. It is a button and no longer a picture hidden from a screen
					reader, and it is named by the name printed on the box itself. -->
				<button type="button" class="flex-none pr-2" on:click={() => row.box?.onClick?.()}>
					<BoosterBox
						coverUrl={row.box.coverUrl ?? null}
						logoUrl={row.box.logoUrl ?? null}
						showId={row.box.showId ?? null}
						locationName={row.box.locationName ?? null}
						light={row.box.light ?? false}
						classes={BOX_WIDTH}
					/>
				</button>
			{/if}
		</div>
	{/each}
</div>
