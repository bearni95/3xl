<script context="module" lang="ts">
	// What pressing the mark is called, wherever the mark is drawn — the button on the menu's
	// plate, and the band across the top of the page that is itself the press (see MusicToggle,
	// MusicLine, RegionCurrentBadge). One radio, so one name for the press: two names would be
	// two controls to anyone who reaches them by their names.
	export const musicPressLabel = (playing: boolean) => (playing ? 'Pause music' : 'Play music');
</script>

<script lang="ts">
	// The radio's one mark: a triangle when it is stopped, two bars when it is running.
	//
	// Its own component because it is drawn in two kinds of place — inside the button that
	// presses it (MusicToggle) and inside a line of text that is itself the press (MusicLine) —
	// and the second cannot hold a button. Two copies of the paths would be how the game comes
	// to show a triangle in one corner and two bars in the other for one radio.
	//
	// It says what the audio element is really doing rather than what it was last told to do:
	// both callers read it off the one service store.

	/** Which of the two it is. */
	export let playing: boolean = false;
	/** The glyph's size, which follows whatever it stands in. */
	export let classes: string = 'size-5';
</script>

<svg viewBox="0 0 24 24" fill="currentColor" class={classes} aria-hidden="true">
	{#if playing}
		<path d="M6 5h4v14H6zM14 5h4v14h-4z" />
	{:else}
		<path d="M8 5v14l11-7z" />
	{/if}
</svg>
