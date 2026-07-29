<script lang="ts">
	import { onMount } from 'svelte';
	import FestivitySyncBar from '$components/core/FestivitySyncBar.svelte';
	import FestaCalendar from '$components/core/FestaCalendar.svelte';
	import FestaDayPanel from '$components/core/FestaDayPanel.svelte';
	import {
		indexFestesByDate,
		buildMonthGrids,
		type FestaMonthGrid
	} from '$utils/festes/festa-calendar';
	import type { FestesCollection, MunicipalityFesta } from '$types/festa.type';
	import { BOOSTER_DAYS_BEHIND, shiftIsoDate } from '$utils/festes/booster-window';

	// The baked festes-locals collection (Generalitat open data) — the same file
	// the frontend /seasons page paints, served here at /data by the admin's
	// serveWorkspacePublic() plugin.
	let collection: FestesCollection | null = null;
	// Held until the fetch settles so the calendar renders against loaded data.
	let ready = false;
	// The day the panel is detailing — a `YYYY-MM-DD` key, or null for none.
	let selected: string | null = null;

	// The sync window that the "Sync → Supabase" button mirrors: from three days
	// before today — the booster window still lets those days' packs be opened, so
	// the sync must not prune them — through the calendar year's end. Computed
	// client-side purely to highlight which selected day would be pushed; the
	// backend recomputes it authoritatively.
	const pad = (n: number): string => String(n).padStart(2, '0');
	const now = new Date();
	const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const windowStartIso = shiftIsoDate(todayIso, -BOOSTER_DAYS_BEHIND);

	onMount(async () => {
		try {
			const res = await fetch('/data/festes-locals.json');
			collection = (await res.json()) as FestesCollection;
		} catch {
			collection = null;
		}
		ready = true;
	});

	// date → the municipalities celebrating it, and the per-date counts driving the
	// calendar heat. Both derive from the loaded collection.
	$: index = indexFestesByDate(collection);
	$: countByDate = new Map([...index].map(([date, list]) => [date, list.length]));

	// The year's twelve month grids (built once the collection's year is known).
	$: grids = collection ? buildMonthGrids(collection.year) : ([] as FestaMonthGrid[]);
	$: endOfYear = collection ? `${collection.year}-12-31` : '';

	// The municipalities for the open day, headline totals, and whether the open
	// day sits inside the sync window.
	$: dayFestes = (selected && index.get(selected)) || ([] as MunicipalityFesta[]);
	$: totalDays = collection?.festes.reduce((sum, festa) => sum + festa.dates.length, 0) ?? 0;
	$: selectedInWindow = !!selected && selected >= windowStartIso && selected <= endOfYear;

	$: covered = collection?.municipalitiesCovered ?? 0;
	$: totalGeo = collection?.municipalitiesTotal ?? 0;
	$: coveragePct = totalGeo ? Math.round((covered / totalGeo) * 100) : 0;
	$: coverageTitle = (collection?.coverage ?? [])
		.map((row) => `${row.territory}: ${row.covered}/${row.total}`)
		.join('\n');

	function selectDate(date: string) {
		selected = date;
	}
</script>

<div class="flex min-h-0 flex-1">
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="border-b border-base-300 bg-base-100 px-6 py-4">
			<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
				<div>
					<h1 class="text-2xl font-bold">Festes majors {collection?.year ?? ''}</h1>
					<p class="text-sm opacity-70">
						Els dies de festa local de cada municipi — la festa major hi és un d'ells.
					</p>
				</div>
				{#if collection}
					<div class="flex gap-4 text-sm">
						<div class="cursor-help text-center" title={coverageTitle}>
							<div class="text-xl font-bold tabular-nums text-primary">{coveragePct}%</div>
							<div class="opacity-60">cobertura</div>
						</div>
						<div class="text-center">
							<div class="text-xl font-bold tabular-nums">{covered}</div>
							<div class="opacity-60">/ {totalGeo} municipis</div>
						</div>
						<div class="text-center">
							<div class="text-xl font-bold tabular-nums">{totalDays}</div>
							<div class="opacity-60">dies de festa</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto p-4">
			<div class="mb-4">
				<FestivitySyncBar />
			</div>

			{#if ready}
				{#if collection && grids.length}
					<FestaCalendar {grids} {countByDate} {selected} onSelect={selectDate} />
				{:else}
					<div class="flex items-center justify-center p-6 text-center opacity-60">
						No s'han pogut carregar les festes locals.
					</div>
				{/if}
			{:else}
				<div class="flex items-center justify-center p-10">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{/if}
		</div>
	</div>

	{#if selected}
		<FestaDayPanel
			date={selected}
			festes={dayFestes}
			inWindow={selectedInWindow}
			onClose={() => (selected = null)}
		/>
	{/if}
</div>
