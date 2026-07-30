<script lang="ts">
	import classNames from 'classnames';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import { showIconName } from '$utils/show/show-icon';

	// One step of the map's breadcrumb path, drawn the way the town panel draws the town it
	// is open on: the show's glyph on a tile in the place's own colour, and beside it the
	// place over the show it flies. A crumb and that panel are the same statement about the
	// same kind of thing — this is where the map is looking — so they are lettered alike, and
	// walking up the path reads as a column of those plates laid on their side.
	//
	// Every step has a show, not just a town: above the municipality it is the plurality of
	// the towns underneath, which is the same show that tier's polygon is filled from, and
	// at the head of the path it is the plurality of every town on the map.
	//
	// Split out of MapBreadcrumbs because a crumb has two states and one body: the step the
	// map is on is inert text and every step above it is a button back to its tier, and
	// neither wants its own copy of a tile, a glyph and two lines.

	// The place, with its article already restored by the caller.
	export let label: string = '';
	// The show this place flies, and its id for the glyph. A tier with no show named leaves
	// the second line off rather than lettering a dash: a crumb is read in a row of crumbs,
	// and a column of dashes down the path says nothing.
	export let showName: string | null = null;
	export let showId: number | null = null;
	// The tile's fill plus the ink that reads on it — the place's own colour, in the same six
	// the pins, the cards and the town panel paint with. Null leaves the tile on the neutral
	// surface, which is what a tier with nothing rolled under it yet gets.
	export let tileClasses: string | null = null;
	// The step the map is actually on: the end of the path, and the one crumb that is not a
	// way of leaving it. Only the weight of the name changes — a crumb is the same statement
	// whether or not it is the one being made.
	export let current: boolean = false;

	$: showIcon = showIconName(showId);
</script>

<!-- Spans throughout, not divs: a crumb above the current one is wrapped in a `<button>`,
	whose content model is phrasing only. `whitespace-nowrap` rather than the panel's
	`truncate` — the bar scrolls sideways, so a long name is something to scroll to and not
	something to cut short. -->
<span class="flex items-center gap-2">
	{#if tileClasses || showIcon}
		<!-- The tile the town panel and the pins draw, at 32px with a 20px glyph: the same
			plate, sized for a line of them. The glyph is sized through ShowIcon rather than from
			here, since the component wraps the svg in a span of its own that a rule aimed at
			this span's children would never reach; `currentColor` is what the tile's ink gives
			it. Decorative — the show is named in the line right beside it. -->
		<span
			class={classNames(
				'flex size-8 flex-none items-center justify-center rounded-md',
				tileClasses ?? 'bg-base-100 text-base-content'
			)}
			aria-hidden="true"
		>
			{#if showIcon}
				<ShowIcon name={showIcon} classes="[&>svg]:size-5" />
			{/if}
		</span>
	{/if}

	<span class="flex flex-col text-left leading-tight">
		<span class={classNames('whitespace-nowrap text-sm', current ? 'font-semibold' : 'font-medium')}>
			{label}
		</span>
		{#if showName}
			<span class="whitespace-nowrap text-xs font-medium text-white/70">{showName}</span>
		{/if}
	</span>
</span>
