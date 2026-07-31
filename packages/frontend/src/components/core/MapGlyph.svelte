<script lang="ts">
	import classNames from 'classnames';

	// A folded map, drawn in the surrounding ink. What an empty rung of the breadcrumb ladder
	// is marked with: a position with no place in it still stands for a tier of the map, and
	// pressing it takes the map to that tier's zoom — so the one thing it can say is "the map",
	// and a square with nothing in it said nothing at all.
	//
	// Inlined rather than served through the icon sets: the show glyphs are inlined but keyed
	// off a TMDB id, and the game-icons artwork is white-on-nothing for a canvas to tint (see
	// CLAUDE.md), which on this bar would be white on a translucent surface with no tile under
	// it. This is a stroke in `currentColor`, so it takes the colour the square is already
	// lettered in and follows it through the hover.
	export let classes: string = '';

	$: computedClasses = classNames('size-4 flex-none', classes);
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={computedClasses}
	aria-hidden="true"
	focusable="false"
>
	<path
		d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
	/>
</svg>
