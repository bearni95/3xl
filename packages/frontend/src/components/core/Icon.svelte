<script lang="ts">
	import classNames from 'classnames';
	import { iconMarkup } from '$components/core/icon-markup';

	// game-icons.net SVGs live in @3xl/assets under public/icons/<artist>/, and
	// `name` is that path without the .svg extension, e.g. "lorc/broadsword".
	//
	// The glyph is inlined rather than pointed at with an <img> so it paints in
	// `currentColor` — the colour of whatever it sits in, which is the only way an
	// icon can sit on a button and stay legible however that button is styled. See
	// icon-markup.ts.
	export let name: string;
	// What the glyph is *for*, for anything that cannot see it. Leave empty where the
	// icon is decorative — where its meaning is already carried by text beside it, or
	// by a label on the control it sits inside — and it is hidden from assistive tech
	// rather than announced twice.
	export let label: string = '';
	export let classes: string = '';

	$: markup = iconMarkup(name);

	// The glyph is sized in `em`, so by default it tracks the font size of whatever it
	// sits in; a caller that wants a fixed size overrides the svg's own width/height
	// through `classes` (e.g. `[&>svg]:size-6`), which wins because a CSS rule
	// outranks a presentation attribute.
	$: computedClasses = classNames('inline-flex flex-none items-center text-current', classes);
</script>

{#if markup}
	<span
		class={computedClasses}
		role={label ? 'img' : undefined}
		aria-label={label || undefined}
		aria-hidden={label ? undefined : 'true'}
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html markup}
	</span>
{/if}
