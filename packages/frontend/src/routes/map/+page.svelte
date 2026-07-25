<script lang="ts">
	import WorldMap from '$components/core/WorldMap.svelte';
	import type { MapOverlay } from '$types/map.type';

	// Països Catalans polygons, built by @3xl/data's generate:geo from the
	// Eurostat LAU set (WGS84) and served from that package's public/ at /data.
	// Drawn bottom-up: municipality fills, province lines, territory lines.
	const overlays: MapOverlay[] = [
		{
			url: '/data/geo/municipis.json',
			style: { color: '#6366f1', weight: 1, fillColor: '#6366f1', fillOpacity: 0.1 },
			hoverStyle: { weight: 2, fillOpacity: 0.3 },
			label: (feature) => {
				const props = feature.properties ?? {};
				return [props.name ?? 'Unknown', props.prov, props.territory]
					.filter(Boolean)
					.join(', ');
			},
			// Paint Badalona with the same One Piece poster the /claim page shows.
			imageFill: (feature) =>
				feature.properties?.name === 'Badalona'
					? 'http://localhost:2002/api/tmdb/image/w342/y7IozUi2dwICMl8aGvLxjTmJDYZ.jpg'
					: null
		},
		{
			url: '/data/geo/provincies.json',
			style: { color: '#eab308', weight: 2, fill: false },
			interactive: false
		},
		{
			url: '/data/geo/territoris.json',
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
