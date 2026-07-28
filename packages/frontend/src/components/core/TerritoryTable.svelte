<script lang="ts">
	import type { TerritoryWinRow } from '$types/territory.type';

	// The towns players have most recently won, newest first. Clicking a row opens
	// that municipality on the map, exactly as picking it out of the region table does.
	export let rows: TerritoryWinRow[] = [];
	export let onSelect: (row: TerritoryWinRow) => void;
</script>

<div class="min-h-0 flex-1 overflow-y-auto">
	<table class="table table-pin-rows table-sm">
		<thead>
			<tr>
				<th>Municipality</th>
				<th>Leading team</th>
				<th>Show</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.locationId)}
				<tr class="cursor-pointer hover" on:click={() => onSelect(row)}>
					<td class="font-medium">
						<span class="flex items-center justify-between gap-2">
							<span class="truncate">{row.name}</span>
							<span class="flex-none text-base opacity-40">›</span>
						</span>
					</td>
					<td class="opacity-70">
						<span class="truncate">{row.holderName}</span>
					</td>
					<td class="opacity-70">{row.showName ?? '—'}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="3" class="py-4 text-center opacity-60">No towns won yet.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
