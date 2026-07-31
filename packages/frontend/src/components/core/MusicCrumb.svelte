<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import MapBreadcrumb from '$components/core/MapBreadcrumb.svelte';
	import MusicToggle from '$components/core/MusicToggle.svelte';
	import StationDial from '$components/core/StationDial.svelte';
	import { musicService } from '$services/music.service';

	// The radio on the bar over the map: what is on air, the dial it is on, and the
	// play/pause — the whole plate from the burger menu, standing at the far end of the one
	// row that is always up.
	//
	// It replaced the bare play/pause square that was here. A square that only stops the
	// sound answers half of what a listener has to say about a radio, and the other half —
	// which station, and what is playing on it — was behind a menu; but this bar is already
	// a row of tiles with a name and what that name belongs to beside them, which is exactly
	// what a song over its station is. So the radio is drawn as one more of those (see
	// MapBreadcrumb): the same tile at the same 32px, the same two lines, the same white.
	// Nothing here has a shape of its own — what makes it the far end of the row rather than
	// a step of the path is the tile's neutral wash, where a crumb's carries its place's
	// colour, and the play beside it.
	//
	// It draws nothing until there is a song, like the plate and like the button before it:
	// a map whose music never arrived is a map with no radio on it, not one with a dead card.
	//
	// No state of its own. What is on air, whether it is running and which station it is on
	// all belong to musicService, which owns the audio element so the sound outlives anything
	// that happens on screen — including the menu the rest of the radio used to live in.

	export let classes: string = '';

	// The read that keeps the radio a clock rather than something the map has to ask for.
	// It is made here and not left to the MusicToggle inside, whose own mount used to be
	// what asked: the toggle now stands behind this card's `state.track` guard, so on a page
	// where nothing has loaded it would never be mounted to ask, and the collection that
	// would have given it a track would never be read. Idempotent — every mount shares one
	// fetch — so the menu's plate asking too costs nothing.
	onMount(() => void musicService.load().catch(() => undefined));

	const music = musicService.state;

	$: state = $music;
</script>

{#if state.track}
	<!-- `max-w` and not a width: the card is as wide as its song asks for, up to a cap, and
		past that the title and the station truncate (see `truncated`) rather than taking the
		row from the path beside them. The cap is the smaller of a fixed width and a share of
		the viewport, because it is holding two different things off: on a wide bar, a long
		title running away with a row that is mostly path; on a narrow one, a card that cannot
		shrink standing in a row that has already folded the whole path into one crumb — the
		end of this bar does not give way (the crumbs are what collapses), so a card that
		refused to get smaller would push the path out of a bar it no longer fits. -->
	<div class={classNames('flex min-w-0 max-w-[min(14rem,35vw)] items-center gap-1', classes)}>
		<div class="min-w-0 flex-1">
			<MapBreadcrumb
				label={state.track.title}
				showId={state.track.showId ?? null}
				tileClasses="bg-white/10 text-white"
				current
				truncated
			>
				<StationDial classes="text-xs font-medium text-white/70" />
			</MapBreadcrumb>
		</div>

		<!-- The same button as the plate's, over the same store, so either one says what the
			other did. A ghost circle rather than the outlined square the search and the burger
			beside it wear: those are marks on the bar, and this one is a control on a card. -->
		<MusicToggle
			classes="btn btn-circle btn-ghost btn-sm flex-none text-white hover:bg-white/10"
			iconClasses="size-4"
		/>
	</div>
{/if}
