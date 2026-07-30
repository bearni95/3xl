<script lang="ts">
	import { onMount } from 'svelte';
	import { musicService } from '$services/music.service';

	// The radio's play/pause, on its own, because there are two places that need one and
	// they have to be the same button: the plate in the menu, where the whole radio is,
	// and the bar over the map, which is the one row that is always up. Turning the
	// sound off is not worth opening a menu for.
	//
	// It says what the element is really doing rather than what it was last told to do,
	// and it says it in both places at once, because both read the one service store —
	// pressing either is the same radio.
	//
	// It draws nothing until there is a song, like the plate: a map whose music never
	// arrived is a map with no music control on it, not one with a dead button.
	//
	// Shape is the caller's: this is a square on the bar over the terrain and a ghost
	// circle on the plate, and neither of those is a fact about a play button.

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
		aria-label={state.playing ? 'Pause music' : 'Play music'}
		on:click={() => musicService.toggle()}
	>
		{#if state.playing}
			<svg viewBox="0 0 24 24" fill="currentColor" class={iconClasses} aria-hidden="true">
				<path d="M6 5h4v14H6zM14 5h4v14h-4z" />
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="currentColor" class={iconClasses} aria-hidden="true">
				<path d="M8 5v14l11-7z" />
			</svg>
		{/if}
	</button>
{/if}
