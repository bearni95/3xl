<script lang="ts">
	import classNames from 'classnames';
	import { _ } from 'svelte-i18n';
	import LocationSearchBox from '$components/core/LocationSearchBox.svelte';
	import ShowShareGrid from '$components/core/ShowShareGrid.svelte';
	import type { RegionRow } from '$components/core/region-types';

	// Everything the open region has to say for itself bar its own name: the side standing on it,
	// how far it has been taken and the fight to be had, the cut it sits inside, what the level
	// under it is made of, and the way to look for a place that is not on it.
	//
	// Two things have left. The list of those places is a tab over the terrain (see
	// RegionLocationList), because a list of places is about the map. The row that names the open
	// place — and the radio playing for it — is the page's own top band (see RegionCurrentBadge),
	// because it is about all three columns and not this one. So this column is the middle of what
	// was one column: below the name, above the level.
	//
	// The shares row and the field stay here even though what they narrow and what they fill is
	// over there: they are read with the place they are a division of, and the reader picking a
	// show off this row is asking about the open region.

	// What the open region divides into (see regionLevelNodes), already lettered by the caller —
	// and already without the head among them, since the caller is what tallies the shares over
	// exactly these rows. Not drawn here any more: the count alone is read, for the rule that
	// says there is a level at all.
	export let rows: RegionRow[] = [];
	// The place the column is about, though it is not the column that names it any more (see
	// RegionCurrentBadge). Read for two things: whether there is a place at all, which decides
	// whether the side and the standing are drawn, and which place it is, which is what puts a
	// picked show back when the map opens somewhere else.
	export let current: RegionRow | null = null;
	// How the rows below divide between the shows they fly, tallied over exactly those rows
	// by the caller (see ShowShareGrid). Empty draws the row anyway, since the way to search
	// is the last cell of it.
	export let shares: { id: number; name: string; share: number }[] = [];
	// What is being looked for, and whether the field is out. Bound both ways: the glyph on the
	// shares row raises the field, the field folds itself when it is left empty, and the caller
	// is what has to know, since the caller is what matches — and what hands the matches to the
	// list over the map.
	export let searchQuery: string = '';
	export let searchOpen: boolean = false;
	export let classes: string = '';

	// The show the level is being read through, picked off the shares row here. Bound out to the
	// caller rather than held here alone, because the list it narrows is not in this column any
	// more (see RegionLocationList): the press belongs with the division it is read off, the
	// filtering belongs with the rows it hides, and the page is what the two have in common. It
	// still changes nothing about the map, nothing about the URL and nothing any other surface
	// can see.
	export let activeShow: number | null = null;

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

</script>

<!-- White ink, as on the band above and in the list beside: a crumb letters what it flies in
	white at 70% and is drawn to be read over the map's own surface, which is what this column is.

	It scrolls as a whole rather than pinning anything: there is no head left to pin — the name is
	the page's top band now — and no run of forty rows to push one off the screen, but a town still
	brings a side, a standing, a path and a shares row that together outrun a phone's third. -->
<div
	class={classNames('flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 py-2 text-white', classes)}
>
	{#if current}
		<!-- The side standing on the town opened this column — a `detail` slot above the standing,
			holding the same three statues the town's pin carries. It is laid over the terrain now,
			at the foot of the map, so this column opens on how far the place has been taken. -->

		<!-- How far the place at the head has been taken and the one control that acts on it,
			across the whole width of the column: the caller's, because only a town has either.
			Under the side standing on the town rather than over it — the side is who would have
			to be beaten and the standing is how far beating them has got, so the reading follows
			what it is a reading of. A row of its own rather than a block at the end of the name's,
			that having made a column of the row that names the place. Empty for every tier with no
			such thing to say, which costs the column a row of nothing. -->
		<slot name="standing" />

		<!-- The rule that says the rest of this column is a different thing from what stands above
			it: not the place itself, but what is around and under it. Drawn only when there is a
			level to divide off — a rule over nothing would be the column claiming to have more to
			say than it has. -->
		{#if rows.length}
			<div class="divider my-0"></div>
		{/if}
	{/if}

	<!-- Where the place at the head of this column is: the cut it sits inside, which is the one
		thing about that place its own row cannot say — a row names a place, and naming it twice
		over is not naming where it is. It stands under the rule, because what is under the rule is
		that place's surroundings: what it is one of, and what it is made of.
		The caller's, since which cut that is is the map's business and not this column's. -->
	<slot name="path" />

	<!-- What the level under this place is made of: the shows those places fly and how much of
		them each has. Under the rule, because it is about them and not about the place they are
		under. And it is how the list of them is narrowed to one: the row that says what the level
		is made of is the row that says show me that part of it.
		The list itself is over the map now (see RegionLocationList), and this row stays here
		regardless — a division is read with the place it is a division of, and picking a show off
		it is a question about the open region. What it picks is bound out to the page, which is
		the one thing this column and that list have in common.
		It is handed the whole division whatever is picked, and the tally is the caller's over
		every row: a share is what this level is, not what is left of it after a press.
		Drawn even with nothing to divide, because the way to search is the last cell of it. -->
	<ShowShareGrid
		{shares}
		active={activeShow}
		on:select={(event: CustomEvent<{ id: number }>) => toggleShow(event.detail.id)}
	>
		<!-- The looking glass, as the last cell of that grid. It stood at the far end of the
			breadcrumb bar over the map, where it had to fold a field away into a glyph to leave the
			path any room; here the glyph is a cell like the shares beside it and the field comes
			down on the row under it, with the whole width of the column to be typed in.
			On the shares row because that row is the one that acts on the level: the cells beside it
			narrow it to a show, and this goes and finds places that are not on it at all. Lettered
			like a share cell rather than as an outlined square — a cell is the size a mark is read
			at in this column, and the square was the bar's answer to a row of 32px tiles. -->
		<button
			slot="end"
			type="button"
			class="flex items-center justify-center rounded-md p-1 hover:bg-white/10"
			aria-label={$_('map.search.label')}
			aria-expanded={searchOpen}
			on:click={() => (searchOpen = true)}
		>
			<img src="/assets/icons/lorc/magnifying-glass.svg" class="w-full" alt="" />
		</button>
	</ShowShareGrid>

	{#if searchOpen}
		<!-- The field itself, on its own row under the glyph that asked for it. It puts itself
			away when it is left empty and takes the matches with it on Escape (see
			LocationSearchBox); what it holds is the caller's, since the caller is what matches it
			against the tree and hands the matches to the list over the map. -->
		<LocationSearchBox bind:value={searchQuery} bind:open={searchOpen} classes="my-1" />
	{/if}
</div>
