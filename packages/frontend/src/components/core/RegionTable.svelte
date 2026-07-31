<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { RegionRow } from '$utils/geo/region-tree';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { forShow } from '$utils/show/show-icon';
	import { showGlyphs } from '$services/shows.service';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import { REGION_TYPE_KEYS } from '$components/core/region-types';

	// The current drill level: the sub-regions of the open region (or the top
	// territories when nothing is open). Clicking a row drills one tier deeper;
	// going back up is done through the breadcrumbs, not this table.
	export let rows: RegionRow[] = [];
	export let onSelect: (row: RegionRow) => void;

	// Only a town carries a siege, so the column is worth its width only on a level
	// that lists towns — above that it would be a header over nothing but empty cells.
	// `rows` is named directly so the statement re-runs as the drill level changes.
	$: hasMunicipalities = rows.some((row) => row.type === 'Municipality');
</script>

<!-- The siege column is the reader's own: `municipality_sieges` is RLS-scoped, so the
	banked wins are theirs and read 0 while signed out, while the required count is the
	town's own and the same for everyone. It is only drawn on a level that lists towns,
	and even there only a town's own row carries a count. -->

<div class="min-h-0 flex-1 overflow-y-auto">
	<table class="table table-pin-rows table-sm">
		<thead>
			<tr>
				<th>{$_('region.table.name')}</th>
				<th>{$_('region.table.type')}</th>
				<th>{$_('region.table.show')}</th>
				{#if hasMunicipalities}
					<!-- The same sentence the pin's own siege bar carries, and deliberately the
						same key: it explains the same two numbers, and two copies of it are two
						things that can come to say different. -->
					<th class="text-right" title={$_('map.challenge.siege')}>
						{$_('region.table.siege')}
					</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.key)}
				{@const showIcon = forShow($showGlyphs, row.show?.id)}
				<tr class="cursor-pointer hover" on:click={() => onSelect(row)}>
					<td class="font-medium">
						<span class="flex items-center justify-between gap-2">
							<span class="truncate">{restoreCatalanArticle(row.name)}</span>
							{#if row.hasChildren}
								<span class="flex-none text-base opacity-40">›</span>
							{/if}
						</span>
					</td>
					<td class="opacity-70">{$_(REGION_TYPE_KEYS[row.type])}</td>
					<!-- The show's glyph ahead of its name: in the cell's own colour so it reads as
						part of the label, and pinned to 24px so the artwork stays legible at the
						table's small type. A show with no icon picked renders by name alone. -->
					<td class="opacity-70">
						<span class="flex items-center gap-1.5">
							{#if showIcon}
								<ShowIcon markup={showIcon} classes="[&>svg]:size-6" />
							{/if}
							<span class="truncate">{row.show?.name ?? '—'}</span>
						</span>
					</td>
					{#if hasMunicipalities}
						<td class="text-right tabular-nums">
							{#if row.type === 'Municipality'}
								<span class={row.siege.wins > 0 ? 'font-semibold' : 'opacity-70'}>
									{row.siege.wins}/{row.siege.required}
								</span>
							{/if}
						</td>
					{/if}
				</tr>
			{:else}
				<tr>
					<td colspan="3" class="py-4 text-center opacity-60">{$_('region.table.empty')}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
