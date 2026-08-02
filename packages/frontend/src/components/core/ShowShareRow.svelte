<script lang="ts">
	import classNames from 'classnames';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import { forShow } from '$utils/show/show-icon';
	import { showGlyphs } from '$services/shows.service';

	// How a list of places divides between the shows they fly, said in one line above the
	// list: each show's own glyph and the share of the places below carrying it, biggest
	// first. The map already paints this — every pin and every polygon flies its region's
	// colour and its show's mark — but only for what is on screen at the zoom the reader
	// happens to be at; this says it of the whole list, however long it is and however far
	// down it runs.
	//
	// The glyph and nothing else names the show: it is the mark this game gives a show
	// everywhere it is named in a line (see ShowIcon), and a row of names with percentages
	// after them would be the list below said twice. The name is on the chip's `title`, which
	// is what an unlettered mark needs to be readable at all.
	export let shares: { id: number; name: string; share: number }[] = [];
	export let classes: string = '';
</script>

<div class={classNames('flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1 text-xs', classes)}>
	{#each shares as entry (entry.id)}
		{@const glyph = forShow($showGlyphs, entry.id)}
		<span class="flex items-center gap-1" title={entry.name}>
			{#if glyph}
				<!-- In the line's own ink, at the size of the type it stands in — the glyph is a
					word of this line and not a picture beside it. -->
				<ShowIcon markup={glyph} classes="[&>svg]:size-5" />
			{/if}
			<!-- Rounded to the whole percent, which is the precision a share of a list this size
				can honestly be read at. Tabular so a row of them lines up. -->
			<span class="font-medium tabular-nums">{Math.round(entry.share * 100)}%</span>
		</span>
	{/each}
</div>
