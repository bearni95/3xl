<script lang="ts">
	import classNames from 'classnames';

	// game-icons.net SVGs live in @3xl/assets and are served at
	// /assets/icons/<author>/<name>.svg (see packages/assets/public/icons).
	// `name` is the "<author>/<name>" path without the .svg extension,
	// e.g. "skoll/d10".
	//
	// An <img> is an opaque document, so anything drawn through here paints in its
	// own baked colour. The show glyphs under icons/shows/ need to take the colour of
	// the text they sit beside, so they are inlined by ShowIcon.svelte instead of
	// being rendered here.
	export let name: string;
	export let alt: string = '';
	export let classes: string = '';

	$: src = `/assets/icons/${name}.svg`;
	$: computedClasses = classNames('inline-block', classes);
</script>

<img {src} {alt} class={computedClasses} />
