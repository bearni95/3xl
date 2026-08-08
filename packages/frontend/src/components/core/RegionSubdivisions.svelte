<script lang="ts">
	import classNames from 'classnames';
	import type { RegionRow } from '$components/core/region-types';

	// Everything the open region has to say for itself bar its own name: how far it has been
	// taken and the fight to be had, and the cut it sits inside.
	//
	// Everything else that stood here has gone to the column that is about the map, because
	// everything else that stood here was about the map. The list of those places is a tab over
	// the terrain (see RegionLocationList); the row of shows that level divides between, and the
	// field that looks past it, are the tab beside that one (see +page.svelte's `shows` tab) —
	// what they narrow and what they fill were both over there already, and a press read off one
	// column that answers in another is one control cut in half. The row that names the open
	// place — and the radio playing for it — is the page's own top band (see RegionCurrentBadge),
	// because it is about all three columns and not this one. The side standing on the town is
	// laid at the foot of the terrain, which is the place it is a picture of.
	//
	// So this column is what is left when the map has taken back what was its: the standing on
	// the open place, and where that place sits.

	// What the open region divides into (see regionLevelNodes), already lettered by the caller.
	// Not drawn here any more: the count alone is read, for the rule that says there is a level
	// at all.
	export let rows: RegionRow[] = [];
	// The place the column is about, though it is not the column that names it any more (see
	// RegionCurrentBadge). Read for whether there is a place at all, which is what decides
	// whether the standing is drawn.
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
		<!-- The side standing on the town opened this column — a `detail` slot above the standing,
			holding the same three statues the town's pin carries. It is laid over the terrain now,
			at the foot of the map, so this column opens on how far the place has been taken. -->

		<!-- How far the place at the head has been taken and the one control that acts on it,
			across the whole width of the column: the caller's, because only a town has either.
			Under the side standing on the town rather than over it — the side is who would have
			to be beaten and the standing is how far beating them has got, so the reading follows
			what it is a reading of. A row of its own rather than a block at the end of the name's,
			that having made a column of the row that names the place. Empty for every tier with no
			such thing to say, which costs the column a row of nothing. -->
		<slot name="standing" />

		<!-- The rule that says the rest of this column is a different thing from what stands above
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
