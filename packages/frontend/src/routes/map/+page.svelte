<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import type { PathOptions } from 'leaflet';
	import WorldMap from '$components/core/WorldMap.svelte';
	import type { MapCircle, MapOverlay } from '$types/map.type';
	import { locationService, hasLocation } from '$services/location.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';

	const store = locationService.store;

	// Paint the municipality the player stands in solid red over its base fill.
	const highlightStyle: PathOptions = {
		color: '#ef4444',
		weight: 2,
		fillColor: '#ef4444',
		fillOpacity: 0.55
	};

	let loading = false;
	let error = '';
	// The municipality polygons, used to resolve a reading to its feature id.
	let municipalities: GeoJSON.FeatureCollection | null = null;

	$: location = $store;
	// The `properties.id` of the municipality the player is in, so WorldMap can
	// paint that one polygon red — null until a reading is taken and resolved.
	$: highlightId =
		hasLocation(location) && municipalities
			? (locationAdapter.toRegion(location, municipalities).id ?? null)
			: null;

	onMount(async () => {
		try {
			const response = await fetch('/data/geo/municipis.json');
			municipalities = await response.json();
		} catch {
			// Highlight simply stays off if the polygons fail to load.
		}
	});

	function requestLocation() {
		error = '';

		if (!('geolocation' in navigator)) {
			error = 'Geolocation is not supported by this browser.';
			return;
		}

		loading = true;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				locationService.set(locationAdapter.fromBrowser(position));
				loading = false;
			},
			(positionError) => {
				error = positionError.message || 'Unable to retrieve your location.';
				loading = false;
			},
			{ enableHighAccuracy: true }
		);
	}

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
			// Paint Badalona + Montgat together with the same One Piece poster the
			// /claim page shows: the two municipalities share one image spanning
			// their combined shape, with each polygon's border drawn over it.
			imageFill: (feature) =>
				feature.properties?.name === 'Badalona' || feature.properties?.name === 'Montgat'
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

	// A mythical "Portal" region floating in the Mediterranean, in open water
	// between the mainland coast and the Balearic Islands (roughly off Ibiza).
	const circles: MapCircle[] = [
		{
			center: [39.6, 1.4],
			radius: 30000,
			style: { color: '#a855f7', weight: 2, fillColor: '#a855f7', fillOpacity: 0.35 },
			label: 'Portal'
		}
	];
</script>

<div class="relative flex h-[calc(100vh-4rem)] flex-col">
	<WorldMap
		center={[41.8, 1.7]}
		zoom={8}
		{overlays}
		{circles}
		{highlightId}
		{highlightStyle}
		classes="min-h-0 flex-1"
	/>

	<div class="absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
		<button
			class={classNames('btn btn-primary btn-sm shadow-lg', { 'btn-disabled': loading })}
			on:click={requestLocation}
		>
			{#if loading}
				<span class="loading loading-spinner loading-xs"></span>
				Locating…
			{:else if highlightId}
				Update my location
			{:else}
				Show my location
			{/if}
		</button>

		{#if error}
			<div class="alert alert-error max-w-xs py-2 text-sm shadow-lg">{error}</div>
		{/if}
	</div>
</div>
