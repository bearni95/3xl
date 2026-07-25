<script lang="ts">
	import classNames from 'classnames';
	import type { RegionShow } from '$utils/geo/region-tree';

	// The show to render as a small poster + name; nothing renders when absent.
	export let show: RegionShow | undefined = undefined;
	// A muted prefix before the name, e.g. "top" for the plurality on a region.
	export let prefix: string = '';
	export let classes: string = '';
</script>

{#if show}
	<span class={classNames('flex min-w-0 items-center gap-1.5', classes)}>
		{#if show.posterUrl}
			<img
				src={show.posterUrl}
				alt={show.name}
				class="h-6 w-4 flex-none rounded object-cover"
				loading="lazy"
			/>
		{/if}
		<span class="truncate text-xs opacity-70">
			{#if prefix}<span class="opacity-60">{prefix} </span>{/if}{show.name}
		</span>
	</span>
{/if}
