<script lang="ts">
	import classNames from 'classnames';
	import MapBreadcrumb from '$components/core/MapBreadcrumb.svelte';

	// Where the map is looking, as a bar across the top of the map itself rather than a line
	// in the panel beside it. What the crumbs name is the view — the region the map is
	// framed on, walked into from a pin, a crumb or the zoom — so they belong over the thing
	// they are about, and they head the corner's stack of plates rather than heading a
	// column that is about other things.
	//
	// The bar wears the panel's own surface rather than the plates' black: the crumbs head
	// the map the way the panel heads its column, so the two read as one chrome. It is
	// still a plate and not a caption laid on the imagery — 80% of that surface, so the
	// terrain shows through without the lettering ever having to be read off it.
	//
	// Each step is drawn the way the town panel draws the town it is open on — tile, place,
	// show — see MapBreadcrumb. Naming a place on this map and naming its show are one
	// statement, and this is the line already saying which place.

	// The path from the top view down to the open region, root first. The last crumb is
	// where the map is and is not a link; every one before it walks back up to its tier.
	//
	// Each crumb also carries the show its place flies and the colour that place is drawn
	// in, which every tier has — a town's own, and above it the plurality of the towns
	// under it. The caller decides what those are (a held town flies its ruling team's
	// show, not its own most-seen one); this bar just letters whatever it is handed.
	export let crumbs: {
		label: string;
		key: string | null;
		showName?: string | null;
		showId?: number | null;
		tileClasses?: string | null;
	}[] = [];
	export let onSelect: (key: string | null) => void;
	export let classes: string = '';
</script>

<!-- The bar is as wide as the map, and it is a row: the crumbs on the left, and at its far
	end whatever the `end` slot puts there — the one place on the map that is about where the
	map is looking, so a way of naming a place belongs at the end of the path to one.
	The crumbs scroll inside their own share of the row: a drill path down to a municipality
	is longer than any width can promise, and a bar that grew with it would push its own end
	off the map. DaisyUI's `breadcrumbs` brings that scroller with it, and `min-w-0` is what
	lets it shrink far enough to start scrolling instead of shoving the slot off the end. -->
<div
	class={classNames(
		'flex items-center gap-3 rounded-lg bg-base-100/80 px-3 py-1.5 text-white shadow-xl',
		classes
	)}
>
	<div class="breadcrumbs min-w-0 flex-1 py-0 text-sm">
		<ul>
			{#each crumbs as crumb, i}
				<li>
					{#if i === crumbs.length - 1}
						<!-- The step the map is on. `aria-current` and not a control: it is where you
							already are, so there is nowhere for it to go — which is also why it undoes
							DaisyUI's `cursor: pointer`, put on every child of an `li` on the assumption
							that a crumb is a link. -->
						<span aria-current="page" class="cursor-default hover:no-underline">
							<MapBreadcrumb
								label={crumb.label}
								showName={crumb.showName ?? null}
								showId={crumb.showId ?? null}
								tileClasses={crumb.tileClasses ?? null}
								current
							/>
						</span>
					{:else}
						<!-- A step back up the path. Not underlined on hover, which is what DaisyUI does
							to a crumb and what the `link` class here used to add on top: an underline drawn
							across a tile and two lines of type reads as a rule struck through the crumb
							rather than as a word that can be pressed. What answers the pointer is the crumb
							lifting onto a surface of its own instead. -->
						<button
							type="button"
							class="-mx-1 rounded-md px-1 py-0.5 hover:bg-white/10 hover:no-underline"
							on:click={() => onSelect(crumb.key)}
						>
							<MapBreadcrumb
								label={crumb.label}
								showName={crumb.showName ?? null}
								showId={crumb.showId ?? null}
								tileClasses={crumb.tileClasses ?? null}
							/>
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	</div>

	<!-- Never squeezed by the path: the crumbs are what gives way, since they can scroll and
		an input cannot. -->
	{#if $$slots.end}
		<div class="flex-none">
			<slot name="end" />
		</div>
	{/if}
</div>
