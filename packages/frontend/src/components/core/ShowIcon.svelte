<script lang="ts">
	import classNames from 'classnames';

	// The glyph as inline-ready markup, which is how `showGlyphs` hands it over. The
	// artwork has to be part of *this* document rather than pointed at with an <img>:
	// an <img> is an opaque document, so its artwork cannot inherit anything from the
	// page and always paints in its own baked colour. These have to take the colour of
	// the line they sit in — the show name beside them in both panel tables, the pin
	// frame on the map, the label of the button they fill — which is what the
	// `fill="currentColor"` the service rewrites in resolves against once inline.
	export let markup: string | null = null;
	export let classes: string = '';

	// The glyph is sized in `em` by the service, so by default it tracks the font
	// size of whatever it sits in; a caller that wants a fixed size overrides the
	// svg's own width/height through `classes` (e.g. `[&>svg]:size-6`), which wins
	// because a CSS rule outranks a presentation attribute. `text-current` keeps it
	// on the surrounding text's colour either way.
	$: computedClasses = classNames('inline-flex flex-none items-center text-current', classes);
</script>

<!-- Decorative: the show is already named in text right beside this, so announcing
	the glyph as well would just read the name twice. -->
{#if markup}
	<span class={computedClasses} aria-hidden="true">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html markup}
	</span>
{/if}
