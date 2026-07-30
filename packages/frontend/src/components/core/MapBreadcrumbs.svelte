<script lang="ts">
	import classNames from 'classnames';

	// Where the map is looking, as a bar across the top of the map itself rather than a line
	// in the panel beside it. What the crumbs name is the view — the region the map is
	// framed on, walked into from a pin, a crumb or the zoom — so they belong over the thing
	// they are about, and they head the corner's stack of plates rather than heading a
	// column that is about other things.
	//
	// Black on white like every other plate at this corner: it stands over satellite
	// imagery, and lettering has to be read off the plate and not off whatever terrain has
	// ended up behind it.

	// The path from the top view down to the open region, root first. The last crumb is
	// where the map is and is not a link; every one before it walks back up to its tier.
	export let crumbs: { label: string; key: string | null }[] = [];
	export let onSelect: (key: string | null) => void;
	export let classes: string = '';
</script>

<!-- The bar is as wide as the map and the crumbs scroll inside it: a drill path down to a
	municipality is longer than any width can promise, and a bar that grew with it would
	push its own end off the map. DaisyUI's `breadcrumbs` brings that scroller with it. -->
<div class={classNames('rounded-lg bg-black px-3 py-1.5 text-white shadow-xl', classes)}>
	<div class="breadcrumbs max-w-full py-0 text-sm">
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
</div>
