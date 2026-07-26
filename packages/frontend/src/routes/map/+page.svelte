<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import WorldMap from '$components/core/WorldMap.svelte';
	import RegionTable from '$components/core/RegionTable.svelte';
	import ClaimPanel from '$components/core/ClaimPanel.svelte';
	import {
		buildRegionTree,
		buildFillIndex,
		buildRegionNodes,
		visibleRegionRows,
		municipalityIdsForKey,
		type FillLevel,
		type RegionRow
	} from '$utils/geo/region-tree';
	import { boundsForFeatures } from '$utils/geo/bounds';
	import type { MapCircle, MapOverlay } from '$types/map.type';
	import type { MunicipalityShow, MunicipalityShowsCollection } from '$types/show.type';

	// The municipality polygons, feeding the region tree and the map framing.
	let municipalities: GeoJSON.FeatureCollection | null = null;
	// The baked municipality→show assignment, keyed by municipality id. Built
	// once from municipality-shows.json; every polygon's poster and every sidebar
	// row read from it.
	let assignmentsById = new Map<string, MunicipalityShow>();
	// Held until the fetches settle so the map renders against the loaded data.
	let ready = false;
	// Live map zoom, kept in sync by WorldMap and shown in the top-left panel.
	let currentZoom = 8;
	// The single region currently selected in the sidebar, by its node key — the
	// only region the map paints with its poster. A node's key matches the fill
	// index: a territory is its own id, deeper tiers append theirs, a municipality
	// is its own id. Null until the player picks a region.
	let selected: string | null = null;
	// The unfolded rows of the table, by region key. A row with children reveals
	// its next tier as indented subrows while its key is in this set.
	let expanded = new Set<string>();

	// The region-tier tabs above the table, which set the table's top tier — the
	// rows you drill down from. Territory is the default active tab.
	const tierTabs = ['Territory', 'Province', 'Comarca', 'Municipality'] as const;
	type Tier = (typeof tierTabs)[number];
	let activeTier: Tier = 'Territory';

	// Clicking a row marks its region as the one the map images and, when the row
	// has a deeper tier, unfolds (or re-folds) its children as subrows.
	function select(row: RegionRow) {
		selected = row.key;
		if (!row.hasChildren) return;
		const next = new Set(expanded);
		if (next.has(row.key)) next.delete(row.key);
		else next.add(row.key);
		expanded = next;
	}

	onMount(async () => {
		// Load the polygons (for the region tree + framing) and the baked show
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
			// The region tree simply stays empty if the polygons fail to load.
			municipalities = municipisResult.value;
		}
		if (showsResult.status === 'fulfilled') {
			// Municipalities fall back to their flat fill if the assignment fails.
			assignmentsById = new Map(
				showsResult.value.assignments.map((assignment) => [assignment.id, assignment])
			);
		}
		ready = true;
	});

	// Països Catalans polygons, built by @3xl/data's generate:geo from the
	// Eurostat LAU set (WGS84) and served from that package's public/ at /data.
	// Drawn bottom-up: municipality fills, comarca lines, province lines,
	// territory lines (green comarca lines sit under the yellow province ones,
	// so shared borders read as province).
	//
	// Every polygon is always drawn; imagery appears only inside the selected
	// region, and it images the region's *next* sub-division rather than the
	// region itself. Selecting a territory paints each of its provinces (or
	// comarques) with that child's own top show; selecting a province paints its
	// comarques; a comarca paints its municipalities. Because every municipality
	// under a given child returns that child's key + poster, WorldMap merges them
	// into one image spanning the child's whole shape. Selecting a municipality
	// (no deeper tier) paints just that municipality with its own show. Every
	// municipality outside the selection returns null and stays a plain polygon.
	// With nothing selected the map opens on its top view: every municipality
	// returns its territory tier (levels[0]), so each territory is merged into one
	// image of its own most-popular show.
	function buildOverlays(index: Map<string, FillLevel[]>, chosen: string | null): MapOverlay[] {
		return [
			{
				url: '/data/geo/municipis.json',
				style: { color: '#6366f1', weight: 1, fillColor: '#6366f1', fillOpacity: 0.1 },
				hoverStyle: { weight: 2, fillOpacity: 0.3 },
				label: (feature) => {
					const props = feature.properties ?? {};
					const show = assignmentsById.get(String(props.id))?.show.name;
					return [props.name ?? 'Unknown', props.comarca, props.prov, props.territory, show]
						.filter(Boolean)
						.join(', ');
				},
				imageFill: (feature) => {
					const levels = index.get(String(feature.properties?.id));
					if (!levels) return null;
					// Top view: with no region selected, image every municipality at its
					// territory tier (levels[0]), so each territory merges into one image
					// of its own most-popular show.
					if (!chosen) {
						const territory = levels[0];
						return territory?.url ? { key: territory.key, url: territory.url } : null;
					}
					// Find where the chosen region sits in this municipality's chain,
					// then image the tier one step deeper (its child sub-division) —
					// unless the chosen region is the municipality itself, which has no
					// deeper tier and images its own show.
					const at = levels.findIndex((tier) => tier.key === chosen);
					if (at === -1) return null;
					const level = levels[Math.min(at + 1, levels.length - 1)];
					return level?.url ? { key: level.key, url: level.url } : null;
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
	}

	// Rebuilt (so WorldMap repaints) whenever the tree loads or the selection
	// changes. fillIndex and selected are passed in so this statement tracks them.
	$: overlays = buildOverlays(fillIndex, selected);

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

	// Whether the portal sidebar — the /claim experience surfaced beside the map — is open.
	let portalOpen = false;

	// The mythical "Portal", floating in open Mediterranean water at the middle
	// of the Girona–l'Alguer line. Clicking it opens the claim panel in a right sidebar.
	const circles: MapCircle[] = [
		{
			center: PORTAL_CENTER,
			radius: 30000,
			style: { color: '#a855f7', weight: 2, fillColor: '#a855f7', fillOpacity: 0.35 },
			label: 'Portal',
			onClick: () => (portalOpen = true)
		}
	];

	// Municipality id → its seeded show, drawn from the full baked assignment
	// (every municipality, not just the rendered neighbourhood), so the tree can
	// label each town and tally each region's plurality show.
	$: showsById = new Map(
		[...assignmentsById].map(([id, assignment]) => [id, assignment.show])
	);

	// The red → yellow → green → blue region hierarchy (territory → province →
	// comarca → municipality) mirrored from the map's divisions, for the tree.
	$: regionTree = buildRegionTree(municipalities, showsById);

	// The nested region nodes, and the visible rows drilled from the active tier:
	// each top-tier region plus the unfolded children of any expanded row.
	$: regionNodes = buildRegionNodes(regionTree);
	$: regionRows = visibleRegionRows(regionNodes, activeTier, expanded);

	// Per-municipality chain of paint tiers, read by the map's imageFill to pick
	// each polygon's poster and by focusBounds to frame the selected region.
	$: fillIndex = buildFillIndex(regionTree);

	// The bounding box the map fits when a region is selected: the union of every
	// municipality polygon under the selected key. A fresh array each time (even
	// re-selecting the same region) so the map re-frames on every pick. Null while
	// nothing is selected, leaving the map where it is.
	$: focusBounds =
		selected && municipalities
			? boundsForFeatures(municipalities, municipalityIdsForKey(fillIndex, selected))
			: null;
</script>

<div class="flex h-[calc(100vh-4rem)]">
	<aside
		class="flex w-[36rem] flex-col border-r border-base-300 bg-base-100 shadow-inner"
		aria-label="Map regions"
	>
		<div class="border-b border-base-300 px-4 py-3">
			<h2 class="text-sm font-bold uppercase tracking-wide opacity-70">Regions</h2>
			<div class="join mt-2 grid grid-cols-4">
				{#each tierTabs as tier}
					<button
						type="button"
						class={classNames('btn btn-primary join-item', { 'btn-outline': activeTier !== tier })}
						on:click={() => (activeTier = tier)}
					>
						{tier}
					</button>
				{/each}
			</div>
		</div>

		<RegionTable rows={regionRows} {selected} onSelect={select} />
	</aside>

	<div class="relative flex min-w-0 flex-1 flex-col">
		{#if ready}
			<WorldMap
				center={[41.8, 1.7]}
				zoom={8}
				{overlays}
				{circles}
				{focusBounds}
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
	</div>

	{#if portalOpen}
		<aside
			class="flex flex-col overflow-y-auto border-l border-base-300 bg-base-100 shadow-inner"
			aria-label="Portal"
		>
			<div class="flex items-center justify-between gap-4 border-b border-base-300 px-4 py-3">
				<h2 class="text-sm font-bold uppercase tracking-wide opacity-70">Portal</h2>
				<button class="btn btn-circle btn-ghost btn-sm" on:click={() => (portalOpen = false)}>
					✕
				</button>
			</div>
			<div class="p-4">
				<ClaimPanel />
			</div>
		</aside>
	{/if}
</div>
