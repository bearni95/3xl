<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import ShowChip from '$components/core/ShowChip.svelte';
	import { catalanTodayIso, festesService } from '$services/festes.service';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import type { FestaLocationRow } from '$types/festivity.type';
	import type { MunicipalityShowsCollection } from '$types/show.type';
	import type { RegionShow } from '$utils/geo/region-tree';

	// Fires when a celebrating municipality (with a seeded show) is picked, so the
	// parent can open that show's booster from this place instead of the GPS reading.
	const dispatch = createEventDispatcher<{
		claim: { festa: FestaLocationRow; show: RegionShow };
	}>();

	// Today's celebrating municipalities read from Supabase (the `festivities`
	// tables the admin /seasons page syncs), plus the map's municipality→show
	// assignment (a separate baked dataset). Both fetched once on mount.
	let todayLocations: FestaLocationRow[] = [];
	let showByMunicipality = new Map<string, RegionShow>();
	// Held until the fetch settles so we don't flash an empty state first.
	let ready = false;

	// Today's date key, in Catalan (Europe/Madrid) time — matching the festes the
	// service fetches and the day boundary the claim RPC enforces. Header only.
	const today = catalanTodayIso();

	// Long-form Catalan date for the section header, e.g. "27 de juliol de 2026".
	const monthNames = [
		'gener',
		'febrer',
		'març',
		'abril',
		'maig',
		'juny',
		'juliol',
		'agost',
		'setembre',
		'octubre',
		'novembre',
		'desembre'
	];

	onMount(async () => {
		const [festesResult, showsResult] = await Promise.allSettled([
			festesService.loadTodayFestes(),
			fetch('/data/municipality-shows.json').then(
				(response) => response.json() as Promise<MunicipalityShowsCollection>
			)
		]);

		if (festesResult.status === 'fulfilled') todayLocations = festesResult.value;
		if (showsResult.status === 'fulfilled') {
			showByMunicipality = new Map(
				showsResult.value.assignments.map((assignment) => [assignment.id, assignment.show])
			);
		}
		ready = true;
	});

	// The municipalities celebrating their festa major today, each paired with the
	// series the map assigns it (absent when the town has no seeded show).
	$: todayFestes = todayLocations.map((festa) => ({
		festa,
		show: showByMunicipality.get(festa.id)
	}));

	function formatDate(iso: string): string {
		const [year, month, day] = iso.split('-').map(Number);
		const name = monthNames[month - 1];
		const preposition = /^[aeiou]/i.test(name) ? "d'" : 'de ';
		return `${day} ${preposition}${name} de ${year}`;
	}
</script>

<div class="card w-full max-w-md bg-base-100 shadow-xl">
	<div class="card-body gap-4">
		<div>
			<h2 class="card-title">Festes majors d'avui</h2>
			{#if today}
				<p class="text-sm opacity-70">{formatDate(today)}</p>
			{/if}
		</div>

		{#if !ready}
			<div class="flex items-center gap-2 text-sm opacity-70">
				<span class="loading loading-spinner loading-sm"></span>
				Carregant les festes locals…
			</div>
		{:else if todayFestes.length}
			<div class="text-xs opacity-60">
				{todayFestes.length}
				{todayFestes.length === 1 ? 'municipi' : 'municipis'} de festa
			</div>
			<ul class="-mx-2 max-h-96 divide-y divide-base-200 overflow-y-auto">
				{#each todayFestes as { festa, show } (festa.id)}
					<li>
						{#if show}
							<button
								type="button"
								class="flex w-full items-center justify-between gap-3 rounded px-2 py-2 text-left hover:bg-base-200"
								title="Obre el sobre de {show.name} des de {restoreCatalanArticle(festa.name)}"
								on:click={() => dispatch('claim', { festa, show })}
							>
								<div class="min-w-0">
									<div class="truncate font-medium">{restoreCatalanArticle(festa.name)}</div>
									<div class="truncate text-xs opacity-60">
										{[festa.comarca, festa.prov].filter(Boolean).join(' · ')}
									</div>
								</div>
								<ShowChip {show} classes="flex-none justify-end" />
							</button>
						{:else}
							<div class="flex items-center justify-between gap-3 px-2 py-2">
								<div class="min-w-0">
									<div class="truncate font-medium">{restoreCatalanArticle(festa.name)}</div>
									<div class="truncate text-xs opacity-60">
										{[festa.comarca, festa.prov].filter(Boolean).join(' · ')}
									</div>
								</div>
								<span class="flex-none text-xs italic opacity-40">sense sèrie</span>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm opacity-70">Avui cap municipi celebra la seva festa major.</p>
		{/if}
	</div>
</div>
