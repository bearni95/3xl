<script lang="ts">
	import classNames from 'classnames';

	// The glyph, as `<folder>/<slug>` — the form an achievement and a show both store.
	// Empty renders the placeholder tile instead, for "no icon chosen yet".
	export let name: string = '';
	// The tile's box, as a Tailwind size class the caller picks.
	export let size: string = 'size-12';
	export let classes: string = '';

	// Which ink the artwork carries is decided by which folder it came out of, and the
	// tile under it has to be the other one or there is nothing to see. The
	// game-icons.net set is vendored in the site's white-on-nothing variant — it exists
	// to be tinted into a Pixi texture, not to inherit a page's colour — so it needs a
	// dark tile. The `shows` folder is the Noun Project marks, which ship as
	// `currentColor`; inside an <img> that resolves against nothing and comes out black,
	// so those need a light one. (The player's app inlines them instead, which is what
	// lets them take a real colour — see the frontend's ShowIcon.)
	$: showGlyph = name.startsWith('shows/');

	$: computedClasses = classNames(
		'inline-flex flex-none items-center justify-center rounded-box',
		name
			? showGlyph
				? 'border border-base-300 bg-base-100 text-base-content'
				: 'bg-neutral'
			: 'border border-dashed border-base-content/30 bg-base-200',
		size,
		classes
	);
</script>

<span class={computedClasses}>
	{#if name}
		<!-- Lazy: the icon picker draws a grid of these, and an off-screen row of a
		     few thousand-strong set should not be a few thousand requests. -->
		<img
			class="h-2/3 w-2/3 object-contain"
			src={`/assets/icons/${name}.svg`}
			loading="lazy"
			alt=""
		/>
	{/if}
</span>
