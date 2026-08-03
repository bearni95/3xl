<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import MusicTitle from '$components/core/MusicTitle.svelte';
	import MusicToggle from '$components/core/MusicToggle.svelte';
	import { musicService } from '$services/music.service';

	// The radio as the column beside the map draws it: a row of its own, with the play/pause at
	// the head of it and the song lettered across the rest.
	//
	// The two of them stood on the row that names the open place for a while — the button coming
	// up on that place's tile under the pointer, the title in the far corner — on the reasoning
	// that the tile was already the station, since the map tunes the radio to the show the open
	// place flies (see musicService.follow). What that cost was a control nobody could see until
	// they happened to point at it, and a song squeezed into whatever the place's name left of a
	// row. A row of its own says both plainly: this is playing, and this is how to stop it.
	//
	// It keeps the column's own geometry so it reads as one of its rows rather than a plate laid
	// among them — the button where every other row wears its tile, the line where every other
	// row wears its name. No glyph and no station name: the show is on the tile of the row above
	// and a station is a show, so a mark here would be one thing said a third time.
	//
	// That row above carries the song and the play mark too, and is the same press (see
	// MusicLine): this is the plain statement of it, a button that looks like a button in a row
	// that is about nothing else.
	//
	// Nothing at all until there is a song, like every other piece of the radio: a map whose
	// music never arrived is a map with no radio on it, not one with an empty row in its column.

	export let classes: string = '';

	// The read that keeps the radio a clock rather than something a surface has to ask for. Made
	// here as well as in the menu's plate because this row is up on every visit and that plate is
	// only mounted while the drawer is open. Idempotent: every mount shares one fetch.
	onMount(() => void musicService.load().catch(() => undefined));

	const music = musicService.state;

	$: state = $music;
</script>

{#if state.track}
	<!-- The guard is here as well as inside each of the two, because what must not be drawn
		without a song is the row: the pieces knowing to draw nothing would still leave an empty
		band of hover between the place and what stands on it. -->
	<div class={classNames('flex items-stretch rounded-md hover:bg-white/10', classes)}>
		<!-- Where every other row of this column carries its tile: 8px in from the edge, centred
			on the row's own height, at the tile's own 32px. So the marks down the column line up
			whether they are a place's square or this button. -->
		<span class="flex flex-none items-center ps-2">
			<MusicToggle
				classes="flex size-8 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
				iconClasses="size-4"
			/>
		</span>

		<!-- `min-w-0` is what lets the banner be narrower than its line, and `flex-1` is what
			gives it the rest of the row: the two together are the box a title is measured against
			(see MarqueeText). The padding is the gap the column spaces a name from its tile by. -->
		<MusicTitle classes="min-w-0 flex-1 self-center px-2 py-1" />
	</div>
{/if}
