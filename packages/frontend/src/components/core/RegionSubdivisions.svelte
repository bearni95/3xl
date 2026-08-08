<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import LocationSearchBox from '$components/core/LocationSearchBox.svelte';
	import { musicPressLabel } from '$components/core/MusicGlyph.svelte';
	import MusicLine from '$components/core/MusicLine.svelte';
	import RegionListRow from '$components/core/RegionListRow.svelte';
	import ShowShareGrid from '$components/core/ShowShareGrid.svelte';
	import { REGION_ROW_BOX_WIDTH, type RegionRow } from '$components/core/region-types';
	import { musicService } from '$services/music.service';

	// The head of the open region and the two controls that act on what it divides into. The
	// list of those places was under here for a long time and is a tab over the map now (see
	// RegionLocationList, and the grid in +page.svelte) — so this column is the place the map is
	// open on and everything it has to say for itself, and the level is read on the terrain it
	// is a level of.
	//
	// The shares row and the field stay here even though what they narrow and what they fill is
	// over there: they are read with the place they are a division of, and the reader picking a
	// show off this row is asking about the open region.

	// What the open region divides into (see regionLevelNodes), already lettered by the caller —
	// and already without the head among them, since the caller is what tallies the shares over
	// exactly these rows. Not drawn here any more: the count alone is read, for the rule that
	// says there is a level at all.
	export let rows: RegionRow[] = [];
	// The place the column is about, at the head of it with a rule under it: where the map is
	// looking, which is a different kind of thing from the rows below and is what a reader
	// looks for first. It stands whatever tier that place is — a town, which is one of the
	// sisters listed under it, and every coarser region, which is not one of its own
	// subdivisions — so the column always reads the same way round: this place, then the
	// level under it.
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

	// Picking one is picking a region, which is the map's own gesture and not this
	// column's: the page answers it exactly as it answers a pin or a crumb.
	const dispatch = createEventDispatcher<{ select: { key: string } }>();

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

	// The radio, read here for the one thing the head row has to decide: what its press does.
	// The line itself reads the same store on its own (see MusicLine) — this is not the column
	// holding a copy of the radio, it is the column asking whether there is one to press.
	const music = musicService.state;

	// A press on the head row: the radio's play/pause while there is a song, and otherwise the
	// press that row has always had. That row is the place the map is already open on, so the
	// press it gives up is the one with the least to give — opening what is open — and a row
	// whose own second line is the song and the mark saying whether it is running is a row that
	// reads as the thing to press. Without a song the line is the show again and so is the
	// press, which is a map with no radio on it reading exactly as it did before there was one.
	$: radioPlaying = $music.track ? $music.playing : null;
	$: pressHead = (key: string) => {
		if ($music.track) musicService.toggle();
		else dispatch('select', { key });
	};
</script>

<!-- White ink, as on the bar: a crumb letters what it flies in white at 70% and is drawn to
	be read over the map's own surface, which is what this column is.
	Each row is a block and not a flex box, so the crumb's own span fills the width and the
	name truncates against it — the column is a fixed width, where the bar is as wide as the
	map and collapses rather than cutting a name short.

	This was two parts with a rule between them, the second of them a scrolling list of the
	places under the open one; the list is a tab over the terrain now (see RegionLocationList),
	so what is left is one block that says the place and hands over the two controls that act on
	that list. It scrolls as a whole rather than pinning anything: there is no longer a run of
	forty rows under it to push a head off the screen, and a town at the head of a phone's third
	still has a side, a standing, a path and a shares row to get through. -->
<div
	class={classNames('flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 py-2 text-white', classes)}
>
	{#if current}
		<!-- Where the map is, at the head of its own level and lettered as the bar letters the
			step it is on — the same `current`, the same `aria-current`, since it is the same
			statement about the same place.
			Drawn by the very component the list of places is drawn with, box and all: the head is a
			row like the rest, and a town at the head of this column is de festa or is not on the
			same terms as a town listed over the map. `current` here is the row being the place the
			map is on, which is what takes the fill.

			Its second line is the radio: the song, behind the mark that says whether it is
			running (MusicLine). That line was the show this place flies, and a station is a show —
			the map tunes the radio to the open place's own (see musicService.follow) — so where
			the two would have been written one under the other, the line says the more particular
			of them and the show goes on being said by the tile at the head of the row. And the
			whole row is that mark's press: it was the one press on this column with the least to
			do, being the place the map is already open on, and a row lettered with a play mark and
			a song is a row that reads as the thing to press. Without a song it is the show and the
			press it always was (see pressHead).

			So this row is the whole of the radio on the map. The play/pause stood under it on a
			row of its own for a while, as a plain button beside the song — the same two things
			said twice running, which is one radio too many in a column of places. -->
		<RegionListRow
			row={current}
			current
			boxWidth={REGION_ROW_BOX_WIDTH}
			onSelect={pressHead}
			pressLabel={radioPlaying === null ? null : musicPressLabel(radioPlaying)}
		>
			<svelte:fragment slot="line">
				<MusicLine showName={current.showName} />
			</svelte:fragment>
		</RegionListRow>

		<!-- Whatever else the place at the head has to say for itself: the caller's, because what
			a place carries depends on what kind of place it is — a town has a side standing on it,
			an occupant and a fight to be had, and nothing coarser has any of those. Above the rule,
			so it reads as more about that place and never as the beginning of something else. -->
		<slot name="detail" />

		<!-- How far the place at the head has been taken and the one control that acts on it,
			across the whole width of the column: the caller's, because only a town has either.
			Under the side standing on the town rather than over it — the side is who would have
			to be beaten and the standing is how far beating them has got, so the reading follows
			what it is a reading of. A row of its own rather than a block at the end of the name's,
			that having made a column of the row that names the place. Empty for every tier with no
			such thing to say, which costs the column a row of nothing. -->
		<slot name="standing" />

		<!-- The rule that says the rest of this column is a different thing from the row above it:
			not more about the place, but about what is around and under it. Drawn only when there
			is a level to divide off — a rule over nothing would be the column claiming to have more
			to say than it has. -->
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
