<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import MarqueeText from '$components/core/MarqueeText.svelte';
	import MusicGlyph from '$components/core/MusicGlyph.svelte';
	import { musicService } from '$services/music.service';

	// The second line of the row at the head of the column beside the map: what is playing,
	// behind the mark that says whether it is playing.
	//
	// That line was the show the open place flies, and it is still that whenever there is no
	// song — but a station *is* a show and the map tunes the radio to the open place's own (see
	// musicService.follow), so where the two would be written one under the other the line says
	// the more particular of them. The show is not lost: it is the fill and the glyph on that
	// row's own tile, which is where this map says a show first.
	//
	// The row it stands on is the press (see RegionListRow's `pressLabel` and
	// RegionCurrentBadge), so this draws no button of its own — a button does not hold a button.
	// The glyph is the same one the standalone control wears and turns over on the same store,
	// so the triangle and the two bars are never two different answers about one radio.
	//
	// A banner rather than a truncation for the title (see MarqueeText): a song is whatever the
	// record is called, and a row is a fixed width.

	/** The show that place flies, which is what the line says when no song is loaded. */
	export let showName: string | null = null;
	/** Anything more the caller wants on the line. The ink is the crumb's own second-line ink,
		spelled here rather than passed in, since this *is* that line and it has to read as one
		whichever of the two things it is saying. */
	export let classes: string = '';

	const LINE = 'text-xs font-medium opacity-70';

	// The read that keeps the radio a clock rather than something a surface has to ask for. Made
	// here as well as in the menu's plate because this line is up on every visit and that plate
	// is only mounted while the drawer is open. Idempotent: every mount shares one fetch.
	onMount(() => void musicService.load().catch(() => undefined));

	const music = musicService.state;

	$: state = $music;
</script>

<!-- Spans throughout: this stands inside a crumb, which stands inside a button, whose content
	model is phrasing only. -->
{#if state.track}
	<span class={classNames('flex min-w-0 items-center gap-1', LINE, classes)}>
		<MusicGlyph playing={state.playing} classes="size-3 flex-none" />
		<!-- `min-w-0` is what lets the banner be narrower than its line, and `flex-1` is what
			gives it the rest of the line: together they are the box the title is measured
			against. -->
		<MarqueeText text={state.track.title} classes="min-w-0 flex-1" />
	</span>
{:else if showName}
	<!-- The line the crumb letters everywhere else, spelled here because a slot given to a
		crumb is the whole of its second line (see MapBreadcrumb): a map whose music never
		arrived has to read exactly as it did before there was a radio. -->
	<span class={classNames('truncate', LINE, classes)}>{showName}</span>
{/if}
