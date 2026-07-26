<script lang="ts">
	import classNames from 'classnames';
	import type { RegionRow } from '$utils/geo/region-tree';

	// The visible rows: top-tier regions plus the unfolded children of any expanded
	// row. Computed upstream from the active tier tab and the expanded key set.
	export let rows: RegionRow[] = [];
	// The selected region key — the one the map images — and the row-click setter,
	// which both selects the region and toggles its children unfolding.
	export let selected: string | null = null;
	export let onSelect: (row: RegionRow) => void;

	// Indent each row by its nesting depth (Tailwind padding, no inline styles).
	const depthPadding = ['pl-0', 'pl-4', 'pl-8', 'pl-12'];
</script>

<div class="min-h-0 flex-1 overflow-y-auto">
	<table class="table table-pin-rows table-sm">
		<thead>
			<tr>
				<th>Name</th>
				<th>Region type</th>
				<th>Top show</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.key)}
				<tr
					class={classNames('cursor-pointer hover', { 'bg-primary/15': selected === row.key })}
					on:click={() => onSelect(row)}
				>
					<td class="font-medium">
						<span
							class={classNames(
								'flex items-center gap-1',
								depthPadding[Math.min(row.depth, depthPadding.length - 1)]
							)}
						>
							<span class="w-3 flex-none text-xs opacity-60">
								{#if row.hasChildren}{row.expanded ? '▾' : '▸'}{/if}
							</span>
							<span class="truncate">{row.name}</span>
						</span>
					</td>
					<td class="opacity-70">{row.type}</td>
					<td class="opacity-70">{row.show?.name ?? '—'}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="3" class="py-4 text-center opacity-60">No regions loaded.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
