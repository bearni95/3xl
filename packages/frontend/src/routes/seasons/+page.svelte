<script lang="ts">
	import { onMount } from 'svelte';
	import FestaCalendar from '$components/core/FestaCalendar.svelte';
	import FestaDayPanel from '$components/core/FestaDayPanel.svelte';
	import {
		indexFestesByDate,
		buildMonthGrids,
		type FestaMonthGrid
	} from '$utils/festes/festa-calendar';
	import type { FestesCollection, MunicipalityFesta } from '$types/festa.type';

	// The baked festes-locals collection (Generalitat open data), fetched once.
	let collection: FestesCollection | null = null;
	// Held until the fetch settles so the calendar renders against loaded data.
	let ready = false;
	// The day the panel is detailing — a `YYYY-MM-DD` key, or null for none.
	let selected: string | null = null;

	onMount(async () => {
		try {
			const response = await fetch('/data/festes-locals.json');
			collection = (await response.json()) as FestesCollection;
		} catch {
			// The calendar simply renders empty if the dataset fails to load.
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

	// The municipalities for the open day, and headline totals for the banner.
	$: dayFestes = (selected && index.get(selected)) || ([] as MunicipalityFesta[]);
	$: totalMunicipalities = collection?.festes.length ?? 0;
	$: totalDays = collection?.festes.reduce((sum, festa) => sum + festa.dates.length, 0) ?? 0;

	function selectDate(date: string) {
		selected = date;
	}
</script>

<div class="flex h-[calc(100vh-4rem)]">
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
						<div class="text-center">
							<div class="text-xl font-bold tabular-nums">{totalMunicipalities}</div>
							<div class="opacity-60">municipis</div>
						</div>
						<div class="text-center">
							<div class="text-xl font-bold tabular-nums">{totalDays}</div>
							<div class="opacity-60">dies de festa</div>
						</div>
					</div>
				{/if}
			</div>
			{#if collection}
				<p class="mt-2 text-xs opacity-50">
					Font:
					<a class="link" href={collection.source.url} target="_blank" rel="noopener noreferrer">
						{collection.source.name}
					</a>
					— {collection.source.publisher}. Només Catalunya.
				</p>
			{/if}
		</div>

		{#if ready}
			{#if collection && grids.length}
				<div class="min-h-0 flex-1 overflow-y-auto p-4">
					<FestaCalendar {grids} {countByDate} {selected} onSelect={selectDate} />
				</div>
			{:else}
				<div class="flex min-h-0 flex-1 items-center justify-center p-6 text-center opacity-60">
					No s'han pogut carregar les festes locals.
				</div>
			{/if}
		{:else}
			<div class="flex min-h-0 flex-1 items-center justify-center">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{/if}
	</div>

	{#if selected}
		<FestaDayPanel date={selected} festes={dayFestes} onClose={() => (selected = null)} />
	{/if}
</div>
