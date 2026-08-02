<script lang="ts">
	import classNames from 'classnames';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import { forShow } from '$utils/show/show-icon';
	import { showGlyphs } from '$services/shows.service';

	// How a list of places divides between the shows they fly, said above the list: each
	// show's own glyph with its share of the places below written under it, biggest first.
	// The map already paints this — every pin and every polygon flies its region's colour and
	// its show's mark — but only for what is on screen at the zoom the reader happens to be
	// at; this says it of the whole list, however long it is and however far down it runs.
	//
	// The glyph and nothing else names the show: it is the mark this game gives a show
	// everywhere it is named in a line (see ShowIcon), and a grid of names with percentages
	// after them would be the list below said twice. The name is on the cell's `title`, which
	// is what an unlettered mark needs to be readable at all.
	//
	// Seven to the row, and the artwork drawn to the whole width of its cell: a glyph sized to
	// the type beside it is a mark read as punctuation in a line, and this is not a line — it
	// is the one place in the column where the shows themselves are what is being looked at,
	// so they are given the size the column has room for. Seven is what settles that size,
	// since the cells divide the column's own width: the marks grow and shrink with it rather
	// than being pinned to a number of pixels chosen in here.
	export let shares: { id: number; name: string; share: number }[] = [];
	export let classes: string = '';
</script>

<div class={classNames('grid grid-cols-7 gap-2 px-2 py-1 text-xs', classes)}>
	{#each shares as entry (entry.id)}
		{@const glyph = forShow($showGlyphs, entry.id)}
		<span class="flex flex-col items-center gap-0.5" title={entry.name}>
			{#if glyph}
				<!-- The whole cell wide, in the grid's own ink. The svg carries its own 1em width
					and height, which a class outranks (see ShowIcon); `h-auto` is what leaves the
					artwork square as it takes that width, the viewBox doing the rest. -->
				<ShowIcon markup={glyph} classes="w-full [&>svg]:h-auto [&>svg]:w-full" />
			{/if}
			<!-- Its own line under the mark, rounded to the whole percent — the precision a share
				of a list this size can honestly be read at. Tabular so a grid of them lines up. -->
			<span class="font-medium tabular-nums">{Math.round(entry.share * 100)}%</span>
		</span>
	{/each}
</div>
