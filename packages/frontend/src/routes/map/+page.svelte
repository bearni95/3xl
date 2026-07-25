<script lang="ts">
	import WorldMap from '$components/core/WorldMap.svelte';
	import type { MapOverlay } from '$types/map.type';

	// ICGC "divisions administratives" polygons (WGS84, 1:250,000).
	// Drawn bottom-up: municipality fills, comarca lines, province lines.
	const overlays: MapOverlay[] = [
		{
			url: '/geo/municipis.json',
			style: { color: '#6366f1', weight: 1, fillColor: '#6366f1', fillOpacity: 0.1 },
			hoverStyle: { weight: 2, fillOpacity: 0.3 },
			label: (feature) => {
				const props = feature.properties ?? {};
				return [props.NOMMUNI ?? 'Unknown', props.NOMCOMAR, props.NOMPROV]
					.filter(Boolean)
					.join(', ');
			}
		},
		{
			url: '/geo/comarques.json',
			style: { color: '#eab308', weight: 2, fill: false },
			interactive: false
		},
		{
			url: '/geo/provincies.json',
			style: { color: '#ef4444', weight: 3, fill: false },
			interactive: false
		}
	];
</script>

<div class="flex h-[calc(100vh-4rem)] flex-col">
	<div class="flex items-center justify-between bg-base-200 px-4 py-2">
		<h1 class="text-lg font-bold">World Map</h1>
	</div>
	<WorldMap center={[41.8, 1.7]} zoom={8} {overlays} classes="min-h-0 flex-1" />
</div>
