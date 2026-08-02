<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import MusicToggle from '$components/core/MusicToggle.svelte';
	import ShowTile from '$components/core/ShowTile.svelte';
	import { musicService } from '$services/music.service';

	// The radio's play/pause, standing on the tile of the place the map is open on: the show's
	// glyph as it always was, with the button coming up over it under the pointer.
	//
	// It is on that tile and not beside it because the tile is already the station. The radio
	// follows the map (see musicService.follow), so the show on this square is the show that is
	// playing — one mark saying both, which is why nothing here draws a second glyph or names
	// the station a second time. What is left to say is the song, and that is said at the other
	// end of the same row (see MusicTitle).
	//
	// The button covers the tile exactly and wears the tile's own colours, so what the hover
	// does is swap the mark on the square rather than put a control on top of a picture: the
	// place's square is where the show was, and where the play is.
	//
	// Nothing appears for a page with no music: MusicToggle draws nothing until there is a song,
	// which leaves this exactly the tile it was before the radio came to stand here.

	// The place's show and colour — the same pair the crumb beside it is handed, since this is
	// that crumb's tile stood outside it (see RegionListRow's `lead`).
	export let showId: number | null = null;
	export let tileClasses: string | null = null;

	// The read that keeps the radio a clock rather than something a surface has to ask for. Made
	// here as well as in the menu's plate because this tile is up on every visit and that plate
	// is only mounted while the drawer is open. Idempotent: every mount shares one fetch.
	onMount(() => void musicService.load().catch(() => undefined));
</script>

<!-- `group` on the square rather than on the row: the button appears when the pointer is on the
	tile, which is what makes it the tile's own control and not a fourth thing the row reveals.
	`focus-visible` on the button itself is the same statement for a keyboard, which reaches it
	in the row's own order — it is where it looks like it is.
	A span, since the head row hands this into a crumb's world of phrasing content. -->
<span class="group relative flex size-8 flex-none items-center justify-center">
	<ShowTile {showId} {tileClasses} />

	<MusicToggle
		classes={classNames(
			'absolute inset-0 flex items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
			tileClasses ?? 'bg-base-100 text-base-content'
		)}
		iconClasses="size-4"
	/>
</span>
