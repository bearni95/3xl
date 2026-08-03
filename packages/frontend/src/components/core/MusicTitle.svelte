<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import MarqueeText from '$components/core/MarqueeText.svelte';
	import { musicService } from '$services/music.service';

	// What is playing, lettered across the radio's own row in the column beside the map (see
	// MusicRow) — the whole of what the radio has to say there beyond the button.
	//
	// Not the show's glyph and not the station's name: the row above already carries both, on
	// the open place's tile and in the line under its name, and the radio is tuned to that show
	// by the map itself (see musicService.follow). A player that repeated them would be saying
	// the same thing three times down one corner of the screen. So a song, and nothing else —
	// the one fact about the radio that is not already written here.
	//
	// A banner rather than a truncation (see MarqueeText): a song is whatever the record is
	// called, and half an announcement is not one. It is drawn still whenever the title fits,
	// which is most of them.
	//
	// Nothing at all until there is a song, like every other piece of the radio.

	/** The line's own classes — ink, width and padding all belong to where it stands. */
	export let classes: string = '';

	// The collection, asked for by every surface that draws any of the radio. Idempotent: they
	// all share the one fetch.
	onMount(() => void musicService.load().catch(() => undefined));

	const music = musicService.state;

	$: state = $music;
</script>

{#if state.track}
	<!-- The width is the caller's and it is what makes the banner possible at all: a box that
		took its line's width could never be narrower than it, and there would be nothing for the
		title to scroll past. What is said here is only that the box is a block, since a marquee
		is measured against something that has a width of its own. -->
	<span class={classNames('block', classes)}>
		<MarqueeText text={state.track.title} classes="text-xs font-medium opacity-70" />
	</span>
{/if}
