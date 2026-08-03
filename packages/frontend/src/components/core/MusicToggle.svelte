<script lang="ts">
	import { onMount } from 'svelte';
	import MusicGlyph, { musicPressLabel } from '$components/core/MusicGlyph.svelte';
	import { musicService } from '$services/music.service';

	// The radio's play/pause, on its own, because there are two places that need one and
	// they have to be the same button: the plate in the menu, where the whole radio is,
	// and the map itself, which is up whether or not a menu is. Turning the sound off is
	// not worth opening a menu for.
	//
	// It says what the element is really doing rather than what it was last told to do,
	// and it says it in both places at once, because both read the one service store —
	// pressing either is the same radio.
	//
	// It draws nothing until there is a song, like the plate: a map whose music never
	// arrived is a map with no music control on it, not one with a dead button.
	//
	// Shape is the caller's: a ghost circle on the menu's plate, and on the map a square at the
	// head of the radio's own row in the column, where every other row of that column wears a
	// place's tile (see MusicRow). None of that is a fact about a play button.

	/** The button's own classes — its shape and colour belong to where it stands. */
	export let classes: string = '';

	/** The glyph's size, which follows the row of marks it is standing in. */
	export let iconClasses: string = 'size-5';

	// The read that used to be the plate's. The plate now lives in a menu that is only
	// mounted while it is open, so this is what asks for the collection on a page where
	// nobody opens the menu — and the radio is a clock, so it wants to be running
	// whether or not anyone has looked at it. Idempotent: every mount shares one fetch.
	onMount(() => void musicService.load().catch(() => undefined));

	const music = musicService.state;

	$: state = $music;
</script>

{#if state.track}
	<button
		type="button"
		class={classes}
		aria-label={musicPressLabel(state.playing)}
		on:click={() => musicService.toggle()}
	>
		<!-- The one mark, drawn where it is also drawn inside a line of text that is its own
			press (see MusicGlyph, MusicLine): a triangle stopped, two bars running. -->
		<MusicGlyph playing={state.playing} classes={iconClasses} />
	</button>
{/if}
