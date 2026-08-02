<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import MarqueeText from '$components/core/MarqueeText.svelte';
	import { musicService } from '$services/music.service';

	// What is playing, at the far end of the row that says where the map is looking — the whole
	// of what the radio has left to say there.
	//
	// Not the show's glyph and not the station's name: the row this stands on already carries
	// both, on the tile at its head and in the line under the place's name, and the radio is
	// tuned to that show by the map itself (see musicService.follow). A player that repeated
	// them would be saying the same thing three times across one row. So a song, and nothing
	// else — the one fact about the radio that is not already written here.
	//
	// A banner rather than a truncation (see MarqueeText): the box is a corner of a row and a
	// song is whatever the record is called, and half an announcement is not one. It is drawn
	// still whenever the title fits, which is most of them.
	//
	// Nothing at all until there is a song, like every other piece of the radio: a map whose
	// music never arrived is a map with no radio on it, not one with an empty line at the end
	// of its head row.

	/** The line's own classes — its ink is the row's, and its width is settled here. */
	export let classes: string = '';

	// The collection, asked for by every surface that draws any of the radio. Idempotent: they
	// all share the one fetch.
	onMount(() => void musicService.load().catch(() => undefined));

	const music = musicService.state;

	$: state = $music;
</script>

{#if state.track}
	<!-- The width is said here rather than left to the content, and it is what makes the banner
		possible at all: a box that took its line's width could never be narrower than it, and a
		title that widened this row would push the name of the place off the other end. `pe-2` is
		the row's own edge — or the gap before the box a town de festa carries after it. -->
	<span class={classNames('block w-28 pe-2', classes)}>
		<MarqueeText text={state.track.title} classes="text-xs font-medium opacity-70" />
	</span>
{/if}
