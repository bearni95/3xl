<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { musicPressLabel } from '$components/core/MusicGlyph.svelte';
	import MusicLine from '$components/core/MusicLine.svelte';
	import RegionListRow from '$components/core/RegionListRow.svelte';
	import { REGION_ROW_BOX_WIDTH, type RegionRow } from '$components/core/region-types';
	import { musicService } from '$services/music.service';

	// Where the map is, and the radio playing for it — the middle of the band across the top of
	// the page, between the game's name and the two marks that answer for it. It stood at the head
	// of the column beside the map for a long time, over everything else that column had to say
	// about the open place. That is what it had grown into anyway: the row names the place every
	// column under it is about, and it carries the one control — play/pause — that belongs to none
	// of them.
	//
	// Its own component because the row it draws is the map's answer to "where am I", and the two
	// things that answer it — the place and the song — were held in two different places while
	// this was a slot of RegionSubdivisions: the row there, the radio in the store, and the press
	// that decides between them written into a column that has nothing else to do with either.

	// The place the map is open on, lettered exactly as a crumb and as a row of the list of places
	// is (see crumbRow in +page.svelte), box and all: a town at the head of the page is de festa or
	// is not on the same terms as a town listed over the map. Null draws nothing, which the page
	// never asks for — the top view is a place like any other here.
	export let row: RegionRow | null = null;
	export let classes: string = '';

	// Pressing it, when there is no song to pause, is picking a region — the map's own gesture and
	// not this row's: the page answers it exactly as it answers a pin or a crumb.
	const dispatch = createEventDispatcher<{ select: { key: string } }>();

	// The radio, read here for the one thing this row has to decide: what its press does. The line
	// itself reads the same store on its own (see MusicLine) — this is not a copy of the radio, it
	// is the row asking whether there is one to press.
	const music = musicService.state;

	// A press on the row: the radio's play/pause while there is a song, and otherwise the press
	// the row has always had. It is the place the map is already open on, so the press it gives up
	// is the one with the least to give — opening what is open — and a row lettered with a play
	// mark and a song is a row that reads as the thing to press. Without a song the line is the
	// show again and so is the press, which is a map with no radio on it reading exactly as it did
	// before there was one.
	$: radioPlaying = $music.track ? $music.playing : null;
	$: press = (key: string) => {
		if ($music.track) musicService.toggle();
		else dispatch('select', { key });
	};
</script>

<!-- White ink, as on the bar and in the columns below: a crumb letters what it flies in white at
	70%. No surface and no padding of its own: it is a cell of the band above, which carries the
	fill, the inset and the gap for all four of them (see +page.svelte). What it does carry is a
	box, so `classes` can hand it the `min-w-0 flex-1` that makes it the part of the row that
	gives.

	Its second line is the radio: the song, behind the mark that says whether it is running
	(MusicLine). That line was the show this place flies, and a station is a show — the map tunes
	the radio to the open place's own (see musicService.follow) — so where the two would have been
	written one under the other, the line says the more particular of them and the show goes on
	being said by the tile at the head of the row.

	So this row is the whole of the radio on the map. The play/pause stood under it on a row of its
	own for a while, as a plain button beside the song — the same two things said twice running,
	which is one radio too many. -->
<div class={classNames('flex flex-col justify-center text-white', classes)}>
	{#if row}
		<RegionListRow
			{row}
			current
			boxWidth={REGION_ROW_BOX_WIDTH}
			onSelect={press}
			pressLabel={radioPlaying === null ? null : musicPressLabel(radioPlaying)}
		>
			<svelte:fragment slot="line">
				<MusicLine showName={row.showName} />
			</svelte:fragment>
		</RegionListRow>
	{/if}
</div>
