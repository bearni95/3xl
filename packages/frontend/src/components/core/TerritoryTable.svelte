<script lang="ts">
	import type { TerritoryWinRow } from '$types/territory.type';
	import { showIconName } from '$utils/show/show-icon';
	import ShowIcon from '$components/core/ShowIcon.svelte';

	// The towns players have most recently won, newest first. Clicking a row opens
	// that municipality on the map, exactly as picking it out of the region table does.
	export let rows: TerritoryWinRow[] = [];
	export let onSelect: (row: TerritoryWinRow) => void;
</script>

<!-- The siege column is the reader's own: `municipality_sieges` is RLS-scoped, so the
	banked wins are theirs and read 0 while signed out. The required count is the town's,
	and is the same for everyone. -->


<div class="min-h-0 flex-1 overflow-y-auto">
	<table class="table table-pin-rows table-sm">
		<thead>
			<tr>
				<th>Municipality</th>
				<th>Leading team</th>
				<th>Show</th>
				<th class="text-right" title="Your wins banked / wins needed to take the town">Siege</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.locationId)}
				{@const showIcon = showIconName(row.showId)}
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
					<!-- The show's glyph sits ahead of its name, drawn in the cell's own colour
						and at its own font size, so it reads as part of the label rather than as a
						pasted-on image. A show with no icon drawn yet renders by name alone. -->
					<td class="opacity-70">
						<span class="flex items-center gap-1.5">
							{#if showIcon}
								<ShowIcon name={showIcon} />
							{/if}
							<span class="truncate">{row.showName ?? '—'}</span>
						</span>
					</td>
					<td class="text-right tabular-nums">
						<span class={row.wins > 0 ? 'font-semibold' : 'opacity-70'}>
							{row.wins}/{row.required}
						</span>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="4" class="py-4 text-center opacity-60">No towns won yet.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
