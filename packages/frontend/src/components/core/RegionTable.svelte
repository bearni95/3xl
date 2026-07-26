<script lang="ts">
	import classNames from 'classnames';
	import type { RegionRow } from '$utils/geo/region-tree';

	// The regions of the active tier, one per row. Filtered upstream by the tier tabs.
	export let rows: RegionRow[] = [];
	// The selected region key — the one the map images — and the row-click setter.
	export let selected: string | null = null;
	export let onSelect: (key: string) => void;
</script>

<div class="min-h-0 flex-1 overflow-y-auto">
	<table class="table table-zebra table-pin-rows table-sm">
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
					on:click={() => onSelect(row.key)}
				>
					<td class="font-medium">{row.name}</td>
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
