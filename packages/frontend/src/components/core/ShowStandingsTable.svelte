<script lang="ts">
	import type { ShowStanding } from '$utils/geo/show-standings';
	import { showIconName } from '$utils/show/show-icon';
	import ShowIcon from '$components/core/ShowIcon.svelte';

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
				{@const showIcon = showIconName(row.id)}
				<tr>
					<!-- The show's glyph ahead of its name, drawn in the cell's own colour so it
						reads as part of the label. Pinned to 24px rather than left to track the
						cell's font size, so the artwork stays legible at the table's small type. A
						show with no icon drawn yet renders by name alone. -->
					<td class="font-medium">
						<span class="flex items-center gap-1.5">
							{#if showIcon}
								<ShowIcon name={showIcon} classes="[&>svg]:size-6" />
							{/if}
							<span class="truncate">{row.name}</span>
						</span>
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
