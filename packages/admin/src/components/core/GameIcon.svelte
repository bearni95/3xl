<script lang="ts">
	import classNames from 'classnames';

	// The glyph, as `<artist>/<slug>` — the form an achievement stores.
	// Empty renders the placeholder tile instead, for "no icon chosen yet".
	export let name: string = '';
	// The tile's box, as a Tailwind size class the caller picks.
	export let size: string = 'size-12';
	export let classes: string = '';

	// These SVGs carry a baked white fill — they exist to be tinted into a Pixi
	// texture, not to inherit a page's colour — so the tile under them has to be
	// dark or there is nothing to see.
	$: computedClasses = classNames(
		'inline-flex flex-none items-center justify-center rounded-box',
		name ? 'bg-neutral' : 'border border-dashed border-base-content/30 bg-base-200',
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
