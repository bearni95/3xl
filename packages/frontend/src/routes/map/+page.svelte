<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
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
		type RegionRow,
		type RegionNode,
		type RegionType
	} from '$utils/geo/region-tree';
	import { boundsForFeatures } from '$utils/geo/bounds';
	import type { MapCircle, MapMarker, MapOverlay } from '$types/map.type';
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
	// The single open region, driven entirely by the `region` query param, by its
	// node key — the only region the map paints with its poster, and the head of
	// the one open drill path. A node's key matches the fill index: a territory is
	// its own id, deeper tiers append theirs, a municipality is its own id. Null
	// (no param) means nothing is open — the map's top view.
	$: selected = $page.url.searchParams.get('region');

	// The breadcrumb tiers, shown as a 4-col button grid above the table. The
	// active button mirrors the open region's tier; the table itself always drills
	// from Territory.
	const tierTabs = ['Territory', 'Province', 'Comarca', 'Municipality'] as const;

	// Point the URL at a region (or clear it), which reactively re-derives every
	// piece of open/expanded/selected state below. Pushed as history so the back
	// button walks the drill path; focus and scroll are preserved across the nav.
	function open(key: string | null) {
		const params = new URLSearchParams($page.url.searchParams);
		if (key) params.set('region', key);
		else params.delete('region');
		const query = params.toString();
		goto(query ? `?${query}` : location.pathname, { keepFocus: true, noScroll: true });
	}

	// Clicking a row opens its region; clicking the already-open row collapses one
	// tier back up its path (to its parent, or the top view for a territory). Only
	// the clicked path is ever open, so the table behaves as a single accordion.
	function select(row: RegionRow) {
		if (row.key === selected) {
			const path = nodePath(regionNodes, row.key);
			open(path.length > 1 ? path[path.length - 2].key : null);
		} else {
			open(row.key);
		}
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
	// The polygons are plain outlines now — each imaged region's top show is shown
	// on a pin dropped at the region's centre (see `markers`), not painted across
	// its shape. The municipality layer stays interactive for its hover highlight
	// and tooltip; the coarser tiers are decorative outlines. `hiddenLineUrls`
	// still thins the finer borders down to the tier the map is focused on.
	const overlays: MapOverlay[] = [
		{
			url: '/data/geo/municipis.json',
			style: { color: '#6366f1', weight: 1, fillColor: '#6366f1', fillOpacity: 0.1 },
			hoverStyle: { weight: 2, fillOpacity: 0.3 },
			// On hover, paint the municipality with its own assigned show's cover.
			hoverImage: (feature) =>
				assignmentsById.get(String(feature.properties?.id))?.show.posterUrl ?? null,
			label: (feature) => {
				const props = feature.properties ?? {};
				const show = assignmentsById.get(String(props.id))?.show.name;
				return [props.name ?? 'Unknown', props.comarca, props.prov, props.territory, show]
					.filter(Boolean)
					.join(', ');
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

	// The nested region nodes. The table always drills from Territory; the single
	// open path (below) is what unfolds, so exactly one branch is ever expanded.
	$: regionNodes = buildRegionNodes(regionTree);
	$: regionRows = visibleRegionRows(regionNodes, 'Territory', expanded);

	// The chain of nodes from the top territory down to the open region (empty when
	// nothing is open). Its keys are the expanded set — every ancestor plus the
	// open node itself (so the open region's own children unfold) — which is what
	// makes the table a single accordion.
	$: openPath = selected ? nodePath(regionNodes, selected) : [];
	$: expanded = new Set(openPath.map((node) => node.key));

	// The tier the open region sits at (Territory at the top view), which the
	// breadcrumb grid highlights. Each button carries the ancestor at its tier, if
	// the open path reaches it, so clicking collapses back up to that tier.
	$: openTier = openPath.length ? openPath[openPath.length - 1].type : 'Territory';
	$: tierButtons = tierTabs.map((tier) => ({
		tier,
		node: openPath.find((node) => node.type === tier) ?? null,
		active: tier === openTier
	}));

	// The path of nodes from a root territory down to `key`, or [] if not found.
	function nodePath(nodes: RegionNode[], key: string): RegionNode[] {
		for (const node of nodes) {
			if (node.key === key) return [node];
			const below = nodePath(node.children, key);
			if (below.length) return [node, ...below];
		}
		return [];
	}

	// Per-municipality chain of region tiers, read by buildMarkers/focusBounds to
	// find the municipalities under a region and frame or pin it.
	$: fillIndex = buildFillIndex(regionTree);

	// Coarse → fine rank of each division tier, used to compare a line overlay's
	// tier against the tier the map is currently imaging.
	const tierRank: Record<RegionType, number> = {
		Territory: 0,
		Province: 1,
		Comarca: 2,
		Municipality: 3
	};

	// The line overlays that subdivide a region, each with its own tier rank. The
	// territory outline (rank 0) is never hidden, so it isn't listed. municipis
	// carries the fill too, so hiding it drops only its stroke, not its fill.
	const lineTiers: [string, number][] = [
		['/data/geo/provincies.json', tierRank.Province],
		['/data/geo/comarques.json', tierRank.Comarca],
		['/data/geo/municipis.json', tierRank.Municipality]
	];

	// Find a region node by its key anywhere in the nested tree.
	function findNode(nodes: RegionNode[], key: string): RegionNode | null {
		for (const node of nodes) {
			if (node.key === key) return node;
			const found = findNode(node.children, key);
			if (found) return found;
		}
		return null;
	}

	// The tier the map is imaging right now: territories at the top view (nothing
	// selected), otherwise the selected region's child tier — the sub-division its
	// pins mark. A selected municipality (a leaf) images itself.
	function imagedRank(chosen: string | null, nodes: RegionNode[]): number {
		if (!chosen) return tierRank.Territory;
		const node = findNode(nodes, chosen);
		return tierRank[node?.children[0]?.type ?? 'Municipality'];
	}

	// Hide the stroke of every line overlay finer than the imaged tier, so only the
	// tier the map is focused on (and everything coarser) keeps its borders — the
	// finer divisions inside would just clutter the pinned regions.
	$: hiddenRank = imagedRank(selected, regionNodes);
	$: hiddenLineUrls = new Set(
		lineTiers.filter(([, rank]) => rank > hiddenRank).map(([url]) => url)
	);

	// The regions the map marks with a pin — the breakdown applied to the WHOLE
	// map, not just the open region. We take the frontier of the entire forest one
	// tier below the open region: territories at the top view, every territory's
	// children once a territory is open, every comarca once a province is open, and
	// so on. Branches that don't reach that deep contribute their own leaf, so no
	// area is left unpinned. (WorldMap culls this to the pins in view, so a fine,
	// map-wide breakdown stays performant.)
	function breakdownNodes(chosen: string | null, nodes: RegionNode[]): RegionNode[] {
		const depth = (chosen ? nodePath(nodes, chosen).length : 0);
		const frontier: RegionNode[] = [];
		const walk = (node: RegionNode, atDepth: number) => {
			if (atDepth === depth || node.children.length === 0) frontier.push(node);
			else for (const child of node.children) walk(child, atDepth + 1);
		};
		for (const node of nodes) walk(node, 0);
		return frontier;
	}

	// One pin per imaged region that has a show, dropped at the centre of the
	// region's bounding box, captioned with the show and tooltipped with the region
	// name; clicking a pin opens that region. Rebuilt when the selection, tree or
	// polygons change (all named here so the statement tracks them).
	function buildMarkers(
		nodes: RegionNode[],
		polygons: GeoJSON.FeatureCollection | null,
		index: Map<string, FillLevel[]>
	): MapMarker[] {
		if (!polygons) return [];
		const pins: MapMarker[] = [];
		for (const node of nodes) {
			const poster = node.show?.posterUrl;
			if (!poster) continue;
			const ids = municipalityIdsForKey(index, node.key);
			const box = boundsForFeatures(polygons, ids);
			if (!box) continue;
			const [[south, west], [north, east]] = box;
			pins.push({
				id: node.key,
				position: [(south + north) / 2, (west + east) / 2],
				imageUrl: poster,
				title: node.show!.name,
				subtitle: node.name,
				featureIds: [...ids],
				onClick: () => open(node.key)
			});
		}
		return pins;
	}

	$: markers = buildMarkers(breakdownNodes(selected, regionNodes), municipalities, fillIndex);

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
				{#each tierButtons as { tier, node, active }}
					<button
						type="button"
						class={classNames('btn btn-primary join-item', { 'btn-outline': !active })}
						disabled={!active && !node}
						on:click={() => node && node.key !== selected && open(node.key)}
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
				{markers}
				{hiddenLineUrls}
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
