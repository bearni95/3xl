<script lang="ts">
	import type { RegionRow } from '$utils/geo/region-tree';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';

	// The current drill level: the sub-regions of the open region (or the top
	// territories when nothing is open). Clicking a row drills one tier deeper;
	// going back up is done through the breadcrumbs, not this table.
	export let rows: RegionRow[] = [];
	export let onSelect: (row: RegionRow) => void;
</script>

<!-- The siege column is the reader's own, exactly as it is on the latest-wins table:
	`municipality_sieges` is RLS-scoped, so the banked wins are theirs and read 0 while
	signed out, and the required count is the town's own and the same for everyone. A
	row above municipality level carries the sum over every town beneath it. -->

<div class="min-h-0 flex-1 overflow-y-auto">
	<table class="table table-pin-rows table-sm">
		<thead>
			<tr>
				<th>Name</th>
				<th>Region type</th>
				<th>Top show</th>
				<th class="text-right" title="Your wins banked / wins needed to take every town here">
					Siege
				</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.key)}
				<tr class="cursor-pointer hover" on:click={() => onSelect(row)}>
					<td class="font-medium">
						<span class="flex items-center justify-between gap-2">
							<span class="truncate">{restoreCatalanArticle(row.name)}</span>
							{#if row.hasChildren}
								<span class="flex-none text-base opacity-40">›</span>
							{/if}
						</span>
					</td>
					<td class="opacity-70">{row.type}</td>
					<td class="opacity-70">{row.show?.name ?? '—'}</td>
					<td class="text-right tabular-nums">
						<span class={row.siege.wins > 0 ? 'font-semibold' : 'opacity-70'}>
							{row.siege.wins}/{row.siege.required}
						</span>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="4" class="py-4 text-center opacity-60">No sub-regions.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
