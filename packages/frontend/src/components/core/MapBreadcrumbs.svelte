<script lang="ts">
	import classNames from 'classnames';

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

	// The path from the top view down to the open region, root first. The last crumb is
	// where the map is and is not a link; every one before it walks back up to its tier.
	export let crumbs: { label: string; key: string | null }[] = [];
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
						<span class="font-semibold">{crumb.label}</span>
					{:else}
						<button type="button" class="link link-hover" on:click={() => onSelect(crumb.key)}>
							{crumb.label}
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
