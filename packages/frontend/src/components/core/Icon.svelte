<script lang="ts">
	import classNames from 'classnames';

	// game-icons.net SVGs live in @3xl/assets and are served at
	// /assets/icons/<author>/<name>.svg (see packages/assets/public/icons).
	// `name` is the "<author>/<name>" path without the .svg extension,
	// e.g. "skoll/d10".
	export let name: string;
	export let alt: string = '';
	export let classes: string = '';

	$: src = `/assets/icons/${name}.svg`;
	$: computedClasses = classNames('inline-block', classes);
</script>

<img {src} {alt} class={computedClasses} />
