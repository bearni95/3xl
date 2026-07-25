<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import type { PathOptions } from 'leaflet';
	import WorldMap from '$components/core/WorldMap.svelte';
	import RegionTree from '$components/core/RegionTree.svelte';
	import { buildRegionTree } from '$utils/geo/region-tree';
	import type { MapCircle, MapOverlay } from '$types/map.type';
	import type { MunicipalityShow, MunicipalityShowsCollection } from '$types/show.type';
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
	// The baked municipality→show assignment, keyed by municipality id. Built
	// once from municipality-shows.json; every polygon's poster and every sidebar
	// row read from it. The whole collection is fetched, but only the entries
	// flagged `neighbourOfCenter` (Barcelona + its neighbours) are rendered.
	let assignmentsById = new Map<string, MunicipalityShow>();
	// The subset flagged for rendering: Barcelona and its immediate neighbours,
	// listed in the right sidebar and the only towns painted with a poster.
	let neighbourhood: MunicipalityShow[] = [];
	// The ids in `neighbourhood`, so the overlay's `imageFill` closure (read once
	// during WorldMap's mount) can decide which polygons get a poster.
	let paintedIds = new Set<string>();
	// Held until the fetches settle so the overlay's `imageFill` closure (read
	// once, during WorldMap's mount) sees the loaded assignment.
	let ready = false;
	// Live map zoom, kept in sync by WorldMap and shown in the top-left panel.
	let currentZoom = 8;

	$: location = $store;
	// The `properties.id` of the municipality the player is in, so WorldMap can
	// paint that one polygon red — null until a reading is taken and resolved.
	$: highlightId =
		hasLocation(location) && municipalities
			? (locationAdapter.toRegion(location, municipalities).id ?? null)
			: null;

	onMount(async () => {
		// Load the polygons (for highlight resolution) and the baked show
		// assignment (for the poster fill + sidebar) in parallel; both are
		// optional, so settle each independently and always flip `ready` so the
		// map renders regardless.
		const [municipisResult, showsResult] = await Promise.allSettled([
			fetch('/data/geo/municipis.json').then((response) => response.json()),
			fetch('/data/municipality-shows.json').then(
				(response) => response.json() as Promise<MunicipalityShowsCollection>
			)
		]);

		if (municipisResult.status === 'fulfilled') {
			// Highlight simply stays off if the polygons fail to load.
			municipalities = municipisResult.value;
		}
		if (showsResult.status === 'fulfilled') {
			// Municipalities fall back to their flat fill if the assignment fails.
			assignmentsById = new Map(
				showsResult.value.assignments.map((assignment) => [assignment.id, assignment])
			);
			neighbourhood = showsResult.value.assignments.filter((a) => a.neighbourOfCenter);
			paintedIds = new Set(neighbourhood.map((a) => a.id));
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
	// Drawn bottom-up: municipality fills, comarca lines, province lines,
	// territory lines (green comarca lines sit under the yellow province ones,
	// so shared borders read as province).
	const overlays: MapOverlay[] = [
		{
			url: '/data/geo/municipis.json',
			style: { color: '#6366f1', weight: 1, fillColor: '#6366f1', fillOpacity: 0.1 },
			hoverStyle: { weight: 2, fillOpacity: 0.3 },
			label: (feature) => {
				const props = feature.properties ?? {};
				const assignment = assignmentsById.get(String(props.id));
				const show = paintedIds.has(String(props.id)) ? assignment?.show.name : null;
				return [props.name ?? 'Unknown', props.comarca, props.prov, props.territory, show]
					.filter(Boolean)
					.join(', ');
			},
			// Paint Barcelona and its immediate neighbours with the poster of the
			// show baked onto each one; every other municipality keeps its flat
			// fill. WorldMap groups features by the URL returned here, so any of
			// these towns that land on the same show share one poster spanning
			// their combined shape, with each polygon's border drawn over it —
			// adjacent same-show cells merge into a single picture.
			imageFill: (feature) => {
				const id = String(feature.properties?.id);
				if (!paintedIds.has(id)) return null;
				return assignmentsById.get(id)?.show.posterUrl ?? null;
			}
		},
		{
			url: '/data/geo/comarques.json',
			style: { color: '#22c55e', weight: 1.5, fill: false },
			interactive: false
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

	// The portal axis: an imaginary straight line from the municipality of Girona
	// (centroid ~[41.99, 2.83]) out to l'Alguer — the lone Italian territory in
	// the map (Alghero, Sardinia; centroid ~[40.60, 8.27]). The portal sits on
	// this line, at its midpoint out in the open Mediterranean.
	const GIRONA: [number, number] = [41.988, 2.828];
	const ALGUER: [number, number] = [40.598, 8.268];
	const PORTAL_CENTER: [number, number] = [
		(GIRONA[0] + ALGUER[0]) / 2,
		(GIRONA[1] + ALGUER[1]) / 2
	];

	// The mythical "Portal", floating in open Mediterranean water at the middle
	// of the Girona–l'Alguer line.
	const circles: MapCircle[] = [
		{
			center: PORTAL_CENTER,
			radius: 30000,
			style: { color: '#a855f7', weight: 2, fillColor: '#a855f7', fillOpacity: 0.35 },
			label: 'Portal'
		}
	];

	// Paint the same red as the geolocation highlight onto the sidebar row for
	// the municipality the player is standing in, when it's in the neighbourhood.
	$: highlightRowId = highlightId ? String(highlightId) : null;

	// The red → green → blue region hierarchy (territory → comarca →
	// municipality) mirrored from the map's divisions, for the sidebar tree.
	$: regionTree = buildRegionTree(municipalities);
</script>

<div class="flex h-[calc(100vh-4rem)]">
	<div class="relative flex min-w-0 flex-1 flex-col">
		{#if ready}
			<WorldMap
				center={[41.8, 1.7]}
				zoom={8}
				{overlays}
				{circles}
				{highlightId}
				{highlightStyle}
				bind:currentZoom
				classes="min-h-0 flex-1"
			/>
		{:else}
			<div class="flex min-h-0 flex-1 items-center justify-center">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{/if}

		<div class="badge badge-neutral absolute left-4 top-4 z-[1000] gap-1 py-3 shadow-lg">
			<span class="opacity-70">Zoom</span>
			<span class="font-bold tabular-nums">{currentZoom}</span>
		</div>

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

	<aside
		class="flex w-[36rem] flex-col border-l border-base-300 bg-base-100 shadow-inner"
		aria-label="Map regions"
	>
		<div class="border-b border-base-300 px-4 py-3">
			<h2 class="text-sm font-bold uppercase tracking-wide opacity-70">Regions</h2>
			<p class="flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-60">
				<span class="flex items-center gap-1"
					><span class="h-2 w-2 rounded-full bg-error"></span>Territory</span
				>
				<span class="flex items-center gap-1"
					><span class="h-2 w-2 rounded-full bg-success"></span>Comarca</span
				>
				<span class="flex items-center gap-1"
					><span class="h-2 w-2 rounded-full bg-info"></span>Municipality</span
				>
			</p>
		</div>

		<RegionTree territories={regionTree} highlightId={highlightRowId} />
	</aside>
</div>
