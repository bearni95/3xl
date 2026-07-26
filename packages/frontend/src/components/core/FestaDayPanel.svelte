<script lang="ts">
	import ShowChip from '$components/core/ShowChip.svelte';
	import type { MunicipalityFesta } from '$types/festa.type';
	import type { RegionShow } from '$utils/geo/region-tree';

	// The selected date (`YYYY-MM-DD`) and the municipalities celebrating it.
	export let date: string | null = null;
	export let festes: MunicipalityFesta[] = [];
	// The map's municipality→show assignment, for the "shows" section.
	export let showByMunicipality: Map<string, RegionShow> = new Map();
	export let onClose: () => void;

	// The distinct shows assigned (on the map) to the day's municipalities, deduped
	// by show id and kept in first-seen order — mirrors what those towns paint on
	// the /map page.
	$: uniqueShows = (() => {
		const byId = new Map<number, RegionShow>();
		for (const festa of festes) {
			const show = showByMunicipality.get(festa.id);
			if (show && !byId.has(show.id)) byId.set(show.id, show);
		}
		return [...byId.values()];
	})();

	// Long-form Catalan date for the panel header, e.g. "15 d'agost de 2026".
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

	function formatDate(iso: string): string {
		const [year, month, day] = iso.split('-').map(Number);
		const name = monthNames[month - 1];
		// Catalan elides "de" → "d'" before a vowel-initial month.
		const preposition = /^[aeiou]/i.test(name) ? "d'" : 'de ';
		return `${day} ${preposition}${name} de ${year}`;
	}
</script>

<aside
	class="flex w-80 flex-none flex-col border-l border-base-300 bg-base-100 shadow-inner"
	aria-label="Festes del dia"
>
	<div class="flex items-center justify-between gap-4 border-b border-base-300 px-4 py-3">
		<div>
			<h2 class="text-sm font-bold uppercase tracking-wide opacity-70">Festes locals</h2>
			{#if date}
				<p class="text-base font-semibold">{formatDate(date)}</p>
			{/if}
		</div>
		<button class="btn btn-circle btn-ghost btn-sm" on:click={onClose} aria-label="Tanca">✕</button>
	</div>

	{#if date}
		{#if uniqueShows.length}
			<div class="border-b border-base-300 px-4 py-3">
				<h3 class="mb-2 text-xs font-bold uppercase tracking-wide opacity-70">
					Sèries ({uniqueShows.length})
				</h3>
				<div class="flex flex-col gap-1.5">
					{#each uniqueShows as show (show.id)}
						<ShowChip {show} />
					{/each}
				</div>
			</div>
		{/if}
		<div class="border-b border-base-300 px-4 py-2 text-xs opacity-70">
			{festes.length}
			{festes.length === 1 ? 'municipi' : 'municipis'}
		</div>
		<ul class="min-h-0 flex-1 overflow-y-auto">
			{#each festes as festa (festa.id)}
				<li class="border-b border-base-200 px-4 py-2">
					<div class="font-medium">{festa.name}</div>
					<div class="text-xs opacity-60">
						{[festa.comarca, festa.prov].filter(Boolean).join(' · ')}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="flex flex-1 items-center justify-center p-6 text-center text-sm opacity-60">
			Selecciona un dia amb festa per veure els municipis que la celebren.
		</div>
	{/if}
</aside>
