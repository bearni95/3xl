<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import LocationSearchBox from '$components/core/LocationSearchBox.svelte';
	import { musicPressLabel } from '$components/core/MusicGlyph.svelte';
	import MusicLine from '$components/core/MusicLine.svelte';
	import RegionListRow from '$components/core/RegionListRow.svelte';
	import ShowShareGrid from '$components/core/ShowShareGrid.svelte';
	import { REGION_TYPE_KEYS } from '$components/core/region-types';
	import { musicService } from '$services/music.service';
	import type { MapBoosterBox } from '$types/map.type';
	import type { RegionType } from '$utils/geo/region-tree';

	// One place as this column draws it: the tile in its own colour, its name, and the show it
	// flies — the shape the breadcrumb bar is handed, because it is drawn by exactly the
	// component that bar draws its steps with (see RegionListRow). A column of them is that bar
	// stood on end, which is what the path already becomes when it is too long for its row (see
	// the dropped column in MapBreadcrumbs). Plus, where the booster window has one for it, the
	// box that place has waiting — the very `MapBoosterBox` the map is standing on that town.
	// Only a town ever has one: nothing coarser than a municipality is de festa.
	type Row = {
		key: string;
		label: string;
		showName: string | null;
		showId: number | null;
		tileClasses: string | null;
		box?: MapBoosterBox | null;
	};

	// What the open region divides into (see regionLevelNodes), already lettered by the caller —
	// and already without the head among them, since the caller is what tallies the shares over
	// exactly these rows.
	export let rows: Row[] = [];
	// The place the column is about, at the head of it with a rule under it: where the map is
	// looking, which is a different kind of thing from the rows below and is what a reader
	// looks for first. It stands whatever tier that place is — a town, which is one of the
	// sisters listed under it, and every coarser region, which is not one of its own
	// subdivisions — so the column always reads the same way round: this place, then the
	// level under it.
	export let current: Row | null = null;
	// How the rows below divide between the shows they fly, tallied over exactly those rows
	// by the caller (see ShowShareGrid). Empty draws the row anyway, since the way to search
	// is the last cell of it.
	export let shares: { id: number; name: string; share: number }[] = [];
	// Every place on the map matching what is typed in the field, lettered exactly as `rows`
	// are and carrying the tier each one is, which is what they are grouped under. The search
	// is the caller's — the tree is theirs and so is the matching — and while there is a query
	// these stand in the column where the level would be: a search is a list of places, and
	// this column is where this map lists places.
	export let searchRows: (Row & { type: RegionType })[] = [];
	// What is being looked for, and whether the field is out. Bound both ways: the glyph on the
	// shares row raises the field, the field folds itself when it is left empty, and the caller
	// is what has to know, since the caller is what matches.
	export let searchQuery: string = '';
	export let searchOpen: boolean = false;
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

	// Whether the column is showing what a search turned up instead of the level: a query, and
	// not the field being out. An empty field is somebody about to type, and the level is what
	// they were reading a moment ago.
	$: searching = searchQuery.trim().length > 0;

	// The tiers a search is grouped under, finest first. A place people look for by name is
	// nearly always a town — it is the tier there are thousands of and the only one anybody
	// lives in — so the towns are the answer and everything coarser is context under it. The
	// same order the drill runs in, read upwards.
	const SEARCH_TIERS: RegionType[] = ['Municipality', 'Comarca', 'Province', 'Territory'];

	// The matches under their tiers, and only the tiers that caught something: a heading over
	// nothing is the column saying it has an answer of that kind when it has not.
	$: searchGroups = SEARCH_TIERS.map((type) => ({
		type,
		rows: searchRows.filter((row) => row.type === type)
	})).filter((group) => group.rows.length > 0);

	// The width of the box a row carries, which is how its height is said: give a box either of
	// the two and it takes the other (see BoosterBox's 30:37), and the width is the one the
	// column has to know before it can lay a row out. The 2.5rem in it is how tall an entry
	// stands — the crumb's 32px tile in a row padded by 4 either side, which is the tallest
	// thing in one; the two lines of type it is set beside come to less. So the calc reads as
	// the sentence it is: the row's height, at the box's ratio. Written out rather than built
	// from a constant because Tailwind reads these class names out of the source text, and a
	// name assembled at run time is a name it never sees.
	const BOX_WIDTH = 'w-[calc(2.5rem*30/37)]';

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
	map and collapses rather than cutting a name short. -->
<div class={classNames('flex flex-col gap-0.5 p-2 text-white', classes)}>
	{#if current}
		<!-- Where the map is, at the head of its own level and lettered as the bar letters the
			step it is on — the same `current`, the same `aria-current`, since it is the same
			statement about the same place.
			Drawn by the very component the list below is drawn with, box and all: the head is a
			row like the rest, and a town at the head of the column is de festa or is not on the
			same terms as a town listed under it. `current` here is the row being the place the
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
			boxWidth={BOX_WIDTH}
			onSelect={pressHead}
			pressLabel={radioPlaying === null ? null : musicPressLabel(radioPlaying)}
		>
			<svelte:fragment slot="line">
				<MusicLine showName={current.showName} />
			</svelte:fragment>
		</RegionListRow>

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

	<!-- What the list below is made of, before the list itself: the shows those places fly and
		how much of them each has. It stands under the rule with the rows rather than above it
		with the head, because it is about them and not about the place they are under. And it is
		how the list is narrowed to one of them: the row that says what the level is made of is
		the row that says show me that part of it.
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
			On the shares row because that row is the one that acts on the list below: the cells
			beside it narrow the list to a show, and this goes and finds places that are not on this
			level at all. Lettered like a share cell rather than as an outlined square — a cell is
			the size a mark is read at in this column, and the square was the bar's answer to a row
			of 32px tiles. -->
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
			against the tree. -->
		<LocationSearchBox bind:value={searchQuery} bind:open={searchOpen} classes="my-1" />
	{/if}

	{#if searching}
		<!-- What the search turned up, in place of the level: a search is a list of places, and
			this column is where this map lists places, so the matches are the very rows the level
			is drawn with rather than cards on a plate of their own at the other corner of the
			screen (which is where they used to land — a question asked at the top right, answered
			at the top left).
			Under their tiers, finest first: a name typed into this field is nearly always a town's,
			so the towns are the answer and everything coarser is context under it. Each tier is a
			fold, open as it arrives — the reader asked for these, so nothing is hidden to begin
			with — and shut for the ones they are not looking at. `<details>` because that is what a
			fold is in a document: it remembers its own state, it is keyboard-operable and it needs
			nothing held here. -->
		{#each searchGroups as group (group.type)}
			<details open class="group">
				<summary
					class="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold hover:bg-white/10 [&::-webkit-details-marker]:hidden"
				>
					<!-- The one mark a fold needs: which way it is facing. Turned by the group's own
						open state rather than by anything held in the script. -->
					<span class="text-base leading-none transition-transform group-open:rotate-90">›</span>
					<span>{$_(REGION_TYPE_KEYS[group.type])}</span>
					<span class="opacity-60 tabular-nums">{group.rows.length}</span>
				</summary>
				<div class="flex flex-col gap-0.5">
					{#each group.rows as row (row.key)}
						<RegionListRow
							{row}
							current={row.key === current?.key}
							marked={row.key === current?.key}
							boxWidth={BOX_WIDTH}
							onSelect={(key) => dispatch('select', { key })}
						/>
					{/each}
				</div>
			</details>
		{:else}
			<p class="px-2 py-4 text-center text-xs opacity-60">{$_('map.search.empty')}</p>
		{/each}
	{:else}
		<!-- The level itself: every place the open region divides into, or the ones flying the
			show picked above. The row that is the place the map is open on takes the fill, so it
			can be found among its sisters without being counted along them — only a town is ever
			among its own level, so there is at most one of them. -->
		{#each visibleRows as row (row.key)}
			<RegionListRow
				{row}
				current={row.key === current?.key}
				marked={row.key === current?.key}
				boxWidth={BOX_WIDTH}
				onSelect={(key) => dispatch('select', { key })}
			/>
		{/each}
	{/if}
</div>
