<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import type { PathOptions } from 'leaflet';
	import WorldMap from '$components/core/WorldMap.svelte';
	import type { MapCircle, MapOverlay } from '$types/map.type';
	import type { ShowEntry, ShowsCollection } from '$types/show.type';
	import {
		immediateNeighbourhood,
		showForMunicipality,
		showPosterUrl
	} from '$utils/geo/municipality-show';
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
	// The saved-show collection, seeded onto municipalities as their poster fill.
	let shows: ShowEntry[] = [];
	// The only municipalities that get a seeded poster: Barcelona and the towns
	// bordering it. Computed once from the polygons in onMount, before the map
	// renders (its `imageFill` closure reads this set during WorldMap's mount).
	let paintedIds = new Set<string>();
	// Held until the shows fetch settles so the overlay's `imageFill` closure
	// (read once, during WorldMap's mount) sees the loaded collection.
	let ready = false;

	$: location = $store;
	// The `properties.id` of the municipality the player is in, so WorldMap can
	// paint that one polygon red — null until a reading is taken and resolved.
	$: highlightId =
		hasLocation(location) && municipalities
			? (locationAdapter.toRegion(location, municipalities).id ?? null)
			: null;

	onMount(async () => {
		// Load the polygons (for highlight resolution) and the saved shows (for
		// the seeded poster fill) in parallel; both are optional, so settle each
		// independently and always flip `ready` so the map renders regardless.
		const [municipisResult, showsResult] = await Promise.allSettled([
			fetch('/data/geo/municipis.json').then((response) => response.json()),
			fetch('/data/shows.json').then((response) => response.json() as Promise<ShowsCollection>)
		]);

		if (municipisResult.status === 'fulfilled') {
			// Highlight simply stays off if the polygons fail to load.
			municipalities = municipisResult.value;
			paintedIds = immediateNeighbourhood(municipisResult.value, 'Barcelona');
		}
		if (showsResult.status === 'fulfilled') {
			// Municipalities fall back to their flat fill if the shows fail to load.
			shows = showsResult.value.shows;
		}
		ready = true;
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
				const show = paintedIds.has(String(props.id))
					? showForMunicipality(feature, shows)
					: null;
				return [props.name ?? 'Unknown', props.prov, props.territory, show?.show.name]
					.filter(Boolean)
					.join(', ');
			},
			// Paint Barcelona and its immediate neighbours with the poster of the
			// show seeded from each one's GPS coordinates; every other municipality
			// keeps its flat fill. WorldMap groups features by the URL returned
			// here, so any of these towns that land on the same show share one
			// poster spanning their combined shape, with each polygon's border
			// drawn over it — adjacent same-show cells merge into a single picture.
			imageFill: (feature) => {
				if (!paintedIds.has(String(feature.properties?.id))) return null;
				const show = showForMunicipality(feature, shows);
				return show ? showPosterUrl(show) : null;
			}
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
	{#if ready}
		<WorldMap
			center={[41.8, 1.7]}
			zoom={8}
			{overlays}
			{circles}
			{highlightId}
			{highlightStyle}
			classes="min-h-0 flex-1"
		/>
	{:else}
		<div class="flex min-h-0 flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{/if}

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
