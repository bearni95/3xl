<script lang="ts">
	import classNames from 'classnames';

	// One game-icons.net glyph in the document, as `<artist>/<slug>` — the form an
	// achievement stores its badge art in.
	//
	// These SVGs carry a baked white fill: they exist to be tinted into a Pixi
	// texture (see CLAUDE.md), which is not a place a stylesheet reaches, so they
	// are fetched by URL rather than inlined and the tile under them has to be dark
	// or there is nothing to see. That is the whole of why this is a tile and not
	// just an <img>.
	export let name: string = '';
	/** The tile's box, as a Tailwind size class the caller picks. */
	export let size: string = 'size-12';
	export let classes: string = '';

	$: computedClasses = classNames(
		'inline-flex flex-none items-center justify-center rounded-box bg-neutral',
		size,
		classes
	);
</script>

{#if name}
	<span class={computedClasses}>
		<img class="h-2/3 w-2/3 object-contain" src={`/assets/icons/${name}.svg`} loading="lazy" alt="" />
	</span>
{/if}
