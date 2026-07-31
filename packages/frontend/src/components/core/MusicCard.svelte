<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import MarqueeText from '$components/core/MarqueeText.svelte';
	import MusicToggle from '$components/core/MusicToggle.svelte';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import StationDial from '$components/core/StationDial.svelte';
	import { musicService } from '$services/music.service';
	import { forShow } from '$utils/show/show-icon';
	import { showGlyphs } from '$services/shows.service';

	// The radio at the foot of the map: what is on air, the dial it is on, and the
	// play/pause — the whole plate from the burger menu, standing beside the account that
	// is playing.
	//
	// It stood on the breadcrumb bar, drawn as one more of the cards that bar is a row of.
	// The bar is a path, and a path is read across: a card at the end of it took the room
	// the path needs on any window narrow enough to matter, and the song's title paid for
	// that in an ellipsis. The map's other corner is a column of plates about the player
	// rather than about the map — the side they field, and under it who they are — and a
	// radio is the same kind of statement: something the player has switched on, not
	// somewhere the map is looking. So it is the left half of that account row now (see
	// the map page), and the title is a banner rather than a truncation: a song is being
	// announced, and half an announcement is not one (see MarqueeText).
	//
	// Which makes it no longer a crumb. It carries the plate the account's does — base-100
	// at four fifths with the map coming through it, lettered white — rather than the
	// breadcrumb tile it wore while it stood in that row, and it is built here rather than
	// out of MapBreadcrumb, whose shape it no longer shares.
	//
	// The tile is the bar's 32px and not the menu plate's 40px: this card is the narrow
	// half of a two-column row, and what room there is belongs to the line that has to be
	// read.
	//
	// It draws nothing until there is a song, like the plate and like the button before it:
	// a map whose music never arrived is a map with no radio on it, not one with a dead
	// card.
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
	$: showIcon = forShow($showGlyphs, state.track?.showId);
</script>

{#if state.track}
	<div
		class={classNames(
			'flex min-w-0 items-center gap-2 rounded-lg bg-base-100/80 p-2 text-white shadow-xl',
			classes
		)}
	>
		<!-- The show the song opens, on the tile the crumbs and the town panel draw at 32px
			with a 20px glyph. Decorative: the show is named in the line beside it, which is
			the dial. -->
		{#if showIcon}
			<span
				class="flex size-8 flex-none items-center justify-center rounded-md bg-white/10"
				aria-hidden="true"
			>
				<ShowIcon markup={showIcon} classes="[&>svg]:size-5" />
			</span>
		{/if}

		<!-- The two lines, in the same type the account's plate beside it is read in.
			`min-w-0` is what leaves the banner a box to be narrower than its line — a flex
			item's floor is its content otherwise, and a title that could widen this card
			would never scroll. -->
		<div class="flex min-w-0 flex-1 flex-col text-left leading-tight">
			<MarqueeText text={state.track.title} classes="text-sm font-semibold" />
			<StationDial classes="text-xs font-medium text-white/70" />
		</div>

		<!-- The same button as the plate's, over the same store, so either one says what the
			other did. A ghost circle: the card is a plate now, and a control on a plate is
			the quiet round one the menu's plate wears. -->
		<MusicToggle
			classes="btn btn-circle btn-ghost btn-sm flex-none text-white hover:bg-white/10"
			iconClasses="size-4"
		/>
	</div>
{/if}
