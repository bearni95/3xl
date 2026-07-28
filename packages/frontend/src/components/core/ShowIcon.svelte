<script lang="ts">
	import classNames from 'classnames';
	import { showIconMarkup } from '$components/core/show-icon-markup';

	// The icon's name as `showIconName` gives it, e.g. "shows/bow-and-arrow".
	export let name: string;
	export let classes: string = '';

	$: markup = showIconMarkup(name);

	// The glyph is sized in `em` by the generator, so by default it tracks the font
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
