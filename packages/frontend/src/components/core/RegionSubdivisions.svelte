<script lang="ts">
	import classNames from 'classnames';
	import type { RegionRow } from '$components/core/region-types';

	// Where the open region sits: the cut above it, and the rule that says the cut is a different
	// thing from the place itself.
	//
	// Everything else that stood here has gone to the column that is about the map, because
	// everything else that stood here was about the map. The list of those places is a tab over
	// the terrain (see RegionLocationList); the row of shows that level divides between, and the
	// field that looks past it, are the tab beside that one (see +page.svelte's `shows` tab) —
	// what they narrow and what they fill were both over there already, and a press read off one
	// column that answers in another is one control cut in half. The row that names the open
	// place — and the radio playing for it — is the page's own top band (see RegionCurrentBadge),
	// because it is about all three columns and not this one. The side standing on the town and
	// the fight to be had for it are the town's own mark, laid at the foot of the terrain, which
	// is the place they are both about.
	//
	// So this column is what is left when the map has taken back what was its.

	// What the open region divides into (see regionLevelNodes), already lettered by the caller.
	// Not drawn here any more: the count alone is read, for the rule that says there is a level
	// at all.
	export let rows: RegionRow[] = [];
	// The place the column is about, though it is not the column that names it any more (see
	// RegionCurrentBadge). Read for whether there is a place at all, which is what decides
	// whether the rule is drawn.
	export let current: RegionRow | null = null;
	export let classes: string = '';
</script>

<!-- White ink, as on the band above and in the list beside: a crumb letters what it flies in
	white at 70% and is drawn to be read over the map's own surface, which is what this column is.

	It scrolls as a whole rather than pinning anything: there is no head left to pin — the name is
	the page's top band now — and no run of forty rows to push one off the screen, but a standing
	and a path can still outrun a phone's third between them. -->
<div
	class={classNames('flex min-h-0 flex-col gap-0.5 overflow-y-auto px-2 py-2 text-white', classes)}
>
	{#if current}
		<!-- The side standing on the town opened this column, and how far the town had been taken
			stood under it — a `detail` slot and a `standing` slot, the two halves of the very mark
			the map draws on that town. Both are that mark again now, whole, at the foot of the
			terrain: the three of them are a picture of who holds the place and the fight to be had
			is a thing to be done about those three, so neither reads as anything on its own over
			here (see +page.svelte's map column).

			The rule that says the rest of this column is a different thing from what stands above
			it: not the place itself, but what is around and under it. Drawn only when there is a
			level to divide off — a rule over nothing would be the column claiming to have more to
			say than it has. -->
		{#if rows.length}
			<div class="divider my-0"></div>
		{/if}
	{/if}

	<!-- Where the place at the head of this column is: the cut it sits inside, which is the one
		thing about that place its own row cannot say — a row names a place, and naming it twice
		over is not naming where it is. It stands under the rule, because what is under the rule is
		that place's surroundings: what it is one of, and what it is made of.
		The caller's, since which cut that is is the map's business and not this column's. -->
	<slot name="path" />

	<!-- What the level under this place is made of — the shows those places fly, each with its
		share — closed this column, with the way to search as the last cell of that row. Both are a
		tab over the terrain now (see +page.svelte): what a share narrows and what a search fills
		are the list of places, and that list is over there. -->
</div>
