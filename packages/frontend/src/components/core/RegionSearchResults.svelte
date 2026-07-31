<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { RegionSearchEntry } from '$utils/geo/region-tree';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { REGION_TYPE_KEYS } from '$components/core/region-types';

	// The locations matching the current search, shown as cards in place of the
	// drill table. Clicking a card centres that location and loads its table view.
	export let results: RegionSearchEntry[] = [];
	export let onSelect: (entry: RegionSearchEntry) => void;
</script>

<div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
	{#each results as entry (entry.key)}
		<button
			type="button"
			class="card w-full bg-base-200 text-left shadow-sm transition-colors hover:bg-base-300"
			on:click={() => onSelect(entry)}
		>
			<div class="card-body gap-1 p-3">
				<div class="flex items-center justify-between gap-2">
					<span class="truncate font-medium">{restoreCatalanArticle(entry.name)}</span>
					<span class="badge badge-ghost badge-sm flex-none">
						{$_(REGION_TYPE_KEYS[entry.type])}
					</span>
				</div>
				{#if entry.path.length}
					<span class="truncate text-xs opacity-60">
						{entry.path.map((name) => restoreCatalanArticle(name)).join(' › ')}
					</span>
				{/if}
				<span class="truncate text-xs opacity-70">{entry.show?.name ?? '—'}</span>
			</div>
		</button>
	{:else}
		<p class="py-4 text-center opacity-60">{$_('map.search.empty')}</p>
	{/each}
</div>
