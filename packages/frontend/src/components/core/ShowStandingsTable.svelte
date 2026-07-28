<script lang="ts">
	import type { ShowStanding } from '$utils/geo/show-standings';

	// Every show that flies over at least one municipality, biggest first. Nothing
	// to drill into — a show isn't a place — so the rows are plain, not clickable.
	export let rows: ShowStanding[] = [];

	// One decimal is enough to separate the tail of the table, where shows sit a
	// few towns apart out of thousands.
	const share = (value: number) => `${(value * 100).toFixed(1)}%`;
</script>

<div class="min-h-0 flex-1 overflow-y-auto">
	<table class="table table-pin-rows table-sm">
		<thead>
			<tr>
				<th>Show</th>
				<th class="text-right">Municipalities</th>
				<th class="text-right">Share</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.id)}
				<tr>
					<td class="font-medium">
						<span class="truncate">{row.name}</span>
					</td>
					<td class="text-right tabular-nums opacity-70">{row.count}</td>
					<td class="text-right tabular-nums opacity-70">{share(row.share)}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="3" class="py-4 text-center opacity-60">No shows on the map yet.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
