<script lang="ts" context="module">
	// Every generated show glyph, inlined into the bundle as raw markup.
	//
	// These are NOT rendered through Icon.svelte, which points an <img> at
	// /assets/icons/…: an <img> is an opaque document, so its artwork cannot inherit
	// anything from the page and always paints in its own baked colour. These glyphs
	// have to be the same colour as the show name beside them in both panel tables,
	// which means the SVG has to be part of this document — inlined, so its
	// `fill="currentColor"` resolves against the surrounding text's `color`.
	//
	// Pulled in with a glob rather than a hand-written import list so that
	// `pnpm generate:show-icons` is the only step needed to add one: drop the SVG at
	// the repo root, run it, and the icon is in the bundle. Eager, so there is no
	// fetch and no frame where a row renders without its glyph; these are a few
	// hundred bytes each.
	const modules = import.meta.glob('../../../../assets/public/icons/shows/*.svg', {
		query: '?raw',
		import: 'default',
		eager: true
	}) as Record<string, string>;

	// Re-keyed by the "shows/<slug>" name showIconName returns, so a lookup takes the
	// value straight from the shared mapping with no path juggling at the call site.
	const markupByName = new Map(
		Object.entries(modules).map(([path, markup]) => [
			`shows/${path.split('/').pop()!.replace(/\.svg$/, '')}`,
			markup
		])
	);
</script>

<script lang="ts">
	import classNames from 'classnames';

	// The icon's name as `showIconName` gives it, e.g. "shows/bow-and-arrow".
	export let name: string;
	export let classes: string = '';

	$: markup = markupByName.get(name) ?? null;

	// The glyph is sized in `em` by the generator, so it tracks the font size of
	// whatever it sits in; `text-current` keeps it on the surrounding text's colour.
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
