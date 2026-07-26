<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import WorldMap from '$components/core/WorldMap.svelte';
	import RegionTable from '$components/core/RegionTable.svelte';
	import RegionSearchResults from '$components/core/RegionSearchResults.svelte';
	import ClaimPanel from '$components/core/ClaimPanel.svelte';
	import {
		buildRegionTree,
		buildFillIndex,
		buildRegionNodes,
		regionRowsForSelection,
		flattenRegionNodes,
		nodePath,
		municipalityIdsForKey,
		type FillLevel,
		type RegionRow,
		type RegionNode,
		type RegionType
	} from '$utils/geo/region-tree';
	import { boundsForFeatures, boundsByFeatureId, type LatLngBounds } from '$utils/geo/bounds';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
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
	// The tier of pins WorldMap is currently drawing (0 = coarsest), reported back
	// as the map zooms. Drives the effective breakdown the sidebar and polygons show.
	let activeLevel = 0;
	// The map centre WorldMap reports, used to tell which region the view is
	// focused on so the sidebar and polygons follow what's zoomed into.
	let currentCenter: [number, number] = [41.8, 1.7];
	// The single open region, driven entirely by the `region` query param, by its
	// node key — the only region the map paints with its poster, and the head of
	// the one open drill path. A node's key matches the fill index: a territory is
	// its own id, deeper tiers append theirs, a municipality is its own id. Null
	// (no param) means nothing is open — the map's top view.
	$: selected = $page.url.searchParams.get('region');

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

	// Clicking a row drills into that region — the table then shows its children
	// as the new current level, and the breadcrumbs grow a crumb. Going back up is
	// done through the breadcrumbs, never the table.
	function select(row: RegionRow) {
		open(row.key);
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
			style: { color: '#ce74ff', weight: 1, fillColor: '#ce74ff', fillOpacity: 0.1 },
			// Hovering the region (via its pin or its polygons) paints the whole area's
			// fill fully solid, with the municipis stroke suppressed (opacity 0) so the
			// internal subdivision borders don't show — only the fill fills in. The
			// region's outer outline still comes from the coarser line overlays.
			hoverStyle: { fillOpacity: 1, opacity: 0 }
		},
		{
			url: '/data/geo/comarques.json',
			style: { color: '#00e8ff', weight: 1.5, fill: false },
			interactive: false
		},
		{
			url: '/data/geo/provincies.json',
			style: { color: '#ff6596', weight: 2, fill: false },
			interactive: false
		},
		{
			url: '/data/geo/territoris.json',
			style: { color: '#111a3b', weight: 3, fill: false },
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
			style: { color: '#ce74ff', weight: 2, fillColor: '#ce74ff', fillOpacity: 0.35 },
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

	// The nested region nodes. The table shows only two tiers at a time — the open
	// region's siblings and its children (see regionRowsForSelection) — while the
	// breadcrumbs carry the full drill path back up.
	$: regionNodes = buildRegionNodes(regionTree);

	// The chain of nodes from the top territory down to the open (URL-selected)
	// region, kept so the clicked region and its ancestors stay highlighted.
	$: openPath = selected ? nodePath(regionNodes, selected) : [];

	// The level of pins WorldMap is currently drawing (clamped to what exists),
	// driven purely by zoom — the tier of groupings on screen right now.
	$: effectiveDepth = Math.min(Math.max(activeLevel, 0), Math.max(markerLevels.length - 1, 0));

	// The path from the top region down to the pin nearest the map centre at that
	// level — the region the view is focused on. Zoom centres on the pointer, so
	// this is the grouping under the cursor. The pin sits at the frontier tier; its
	// parent is the "open" region whose children that tier is.
	$: focusPath = focusedPath(effectiveDepth, markerLevels, currentCenter, regionNodes);

	// The effective open region the sidebar and polygons reflect: the focused pin's
	// parent (null at the top view). So zooming into an area unfolds the breadcrumbs,
	// table and border detail into it and zooming out walks them back up — following
	// the pointer, without touching the URL selection.
	$: effectiveSelected = focusPath.length >= 2 ? focusPath[focusPath.length - 2].key : null;

	// The breadcrumb drill path down to (not including) the focused pin.
	$: displayPath = focusPath.slice(0, -1);

	$: regionRows = regionRowsForSelection(regionNodes, effectiveSelected);

	// Free-text search across every location in the whole tree (all tiers), matched
	// against each region's displayed name (case- and accent-insensitive). While the
	// box holds text the sidebar shows the matches as cards instead of the drill
	// table; an empty box falls back to the table for the current view.
	let searchQuery = '';
	const foldText = (value: string) =>
		value
			.toLowerCase()
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '');
	$: normalizedQuery = foldText(searchQuery.trim());
	$: allRegions = flattenRegionNodes(regionNodes);
	$: searchResults = normalizedQuery
		? allRegions
				.filter((entry) => foldText(restoreCatalanArticle(entry.name)).includes(normalizedQuery))
				.slice(0, 100)
		: [];

	// Opening a search result reuses the drill logic (URL region param → map
	// framing + table), then clears the search so the cards give way to the table.
	function openSearchResult(entry: { key: string }) {
		searchQuery = '';
		open(entry.key);
	}

	// The breadcrumb crumbs: a root crumb back to the top view, then one per
	// ancestor down to the effective region. The last crumb is the current region
	// and renders as plain text; the rest link back up to their tier.
	$: crumbs = [
		{ label: 'Països Catalans', key: null as string | null },
		...displayPath.map((node) => ({ label: restoreCatalanArticle(node.name), key: node.key as string | null }))
	];

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
	// selected), otherwise the effective region's child tier — the sub-division its
	// pins mark. A municipality (a leaf) images itself.
	function imagedRank(chosen: string | null, nodes: RegionNode[]): number {
		if (!chosen) return tierRank.Territory;
		const node = findNode(nodes, chosen);
		return tierRank[node?.children[0]?.type ?? 'Municipality'];
	}

	// Hide the stroke of every line overlay finer than the imaged tier, so only the
	// tier the map is focused on (and everything coarser) keeps its borders — the
	// finer divisions inside would just clutter the pinned regions. Keyed off the
	// effective (zoom-driven) selection, so the borders coarsen as the map zooms out.
	$: hiddenRank = imagedRank(effectiveSelected, regionNodes);
	$: hiddenLineUrls = new Set(
		lineTiers.filter(([, rank]) => rank > hiddenRank).map(([url]) => url)
	);

	// The frontier of the WHOLE forest at a given depth: every node reached at
	// exactly `depth` tiers down, plus any branch that bottoms out sooner (its own
	// leaf), so no area is left unpinned. Depth 0 is the territories, 1 their
	// children, and so on. This is the set of regions the map marks with a pin at
	// that breakdown tier.
	function frontierAtDepth(depth: number, nodes: RegionNode[]): RegionNode[] {
		const frontier: RegionNode[] = [];
		const walk = (node: RegionNode, atDepth: number) => {
			if (atDepth === depth || node.children.length === 0) frontier.push(node);
			else for (const child of node.children) walk(child, atDepth + 1);
		};
		for (const node of nodes) walk(node, 0);
		return frontier;
	}

	// The number of tiers on the deepest branch (territory-only = 1, down to
	// municipality = 4), so the pin stack can span every drill level.
	function treeDepth(nodes: RegionNode[]): number {
		let depth = 0;
		for (const node of nodes) depth = Math.max(depth, 1 + treeDepth(node.children));
		return depth;
	}

	// The path from a root region down to the pin nearest the map centre among those
	// drawn at `level` — the region the view is centred (and so zoomed) on. A plain
	// squared lat/lng delta is enough to pick the nearest. Empty when the level has
	// no pins.
	function focusedPath(
		level: number,
		levels: MapMarker[][],
		centre: [number, number],
		nodes: RegionNode[]
	): RegionNode[] {
		const pins = levels[level] ?? [];
		if (!pins.length) return [];
		let nearest = pins[0];
		let best = Infinity;
		for (const pin of pins) {
			const dLat = pin.position[0] - centre[0];
			const dLng = pin.position[1] - centre[1];
			const distance = dLat * dLat + dLng * dLng;
			if (distance < best) {
				best = distance;
				nearest = pin;
			}
		}
		return nodePath(nodes, nearest.id);
	}

	// Every key inside a node's subtree (the node itself and all descendants),
	// used to tell which breakdown pins fall within the selected area.
	function subtreeKeys(node: RegionNode, keys: Set<string> = new Set()): Set<string> {
		keys.add(node.key);
		for (const child of node.children) subtreeKeys(child, keys);
		return keys;
	}

	// The keys whose region overlaps the selection — its ancestors (the crumbs down
	// to it), the selection itself, and its whole subtree — or null when nothing is
	// selected (then no pin is dimmed). A pin whose region isn't in this set sits
	// clear of the selection and renders faded. Ancestors are included so a coarse
	// pin that CONTAINS the selection (shown once the map zooms out to that tier)
	// isn't dimmed alongside the disjoint regions around it.
	$: relevantKeys = selected
		? new Set<string>([
				...subtreeKeys(
					findNode(regionNodes, selected) ?? { key: '', name: '', type: 'Territory', children: [] }
				),
				...openPath.map((node) => node.key)
			])
		: null;

	// The deepest drill level in the tree (territory = level 0), so the pin stack
	// can span every level down to the municipalities.
	$: maxLevel = treeDepth(regionNodes) - 1;

	// A region key's union bounding box + the municipality ids beneath it.
	type RegionGeometry = { boxes: Map<string, LatLngBounds>; muniIds: Map<string, string[]> };

	// One pass over the polygons for each municipality's own box, then aggregated up
	// every municipality's fill chain so each region key carries the union box and
	// its municipality ids. Precomputed so buildMarkers is O(regions), not
	// O(regions × polygons) — the municipality level alone is thousands of pins.
	function buildRegionGeometry(
		polygons: GeoJSON.FeatureCollection | null,
		index: Map<string, FillLevel[]>
	): RegionGeometry {
		const boxes = new Map<string, LatLngBounds>();
		const muniIds = new Map<string, string[]>();
		if (!polygons) return { boxes, muniIds };

		const munBoxes = boundsByFeatureId(polygons);
		for (const [id, levels] of index) {
			const box = munBoxes.get(id);
			for (const level of levels) {
				let ids = muniIds.get(level.key);
				if (!ids) muniIds.set(level.key, (ids = []));
				ids.push(id);
				if (!box) continue;
				const current = boxes.get(level.key);
				if (!current) {
					boxes.set(level.key, [[box[0][0], box[0][1]], [box[1][0], box[1][1]]]);
				} else {
					current[0][0] = Math.min(current[0][0], box[0][0]);
					current[0][1] = Math.min(current[0][1], box[0][1]);
					current[1][0] = Math.max(current[1][0], box[1][0]);
					current[1][1] = Math.max(current[1][1], box[1][1]);
				}
			}
		}
		return { boxes, muniIds };
	}

	$: regionGeometry = buildRegionGeometry(municipalities, fillIndex);

	// One pin per imaged region that has a show, dropped at the centre of the
	// region's bounding box, captioned with the show and tooltipped with the region
	// name; clicking a pin opens that region. Pins clear of the selection are
	// flagged `dimmed` so the map fades them rather than dropping them.
	function buildMarkers(
		nodes: RegionNode[],
		geometry: RegionGeometry,
		relevant: Set<string> | null
	): MapMarker[] {
		const pins: MapMarker[] = [];
		for (const node of nodes) {
			const poster = node.show?.posterUrl;
			if (!poster) continue;
			const box = geometry.boxes.get(node.key);
			if (!box) continue;
			const [[south, west], [north, east]] = box;
			pins.push({
				id: node.key,
				position: [(south + north) / 2, (west + east) / 2],
				bounds: box,
				imageUrl: poster,
				title: node.show!.name,
				subtitle: restoreCatalanArticle(node.name),
				featureIds: geometry.muniIds.get(node.key) ?? [],
				dimmed: relevant ? !relevant.has(node.key) : false,
				onClick: () => open(node.key)
			});
		}
		return pins;
	}

	// The map's pin renderings as a coarse → fine stack, one per drill level from the
	// whole-map territory frontier (level 0) down to the municipalities (maxLevel).
	// WorldMap draws the finest level that stays legible at the current zoom and
	// steps between them as the map zooms in and out, so zooming in unfolds the next
	// grouping and zooming out folds back up. All named here so the statement tracks them.
	function buildMarkerLevels(
		depth: number,
		nodes: RegionNode[],
		geometry: RegionGeometry,
		relevant: Set<string> | null
	): MapMarker[][] {
		const levels: MapMarker[][] = [];
		for (let d = 0; d <= depth; d++) {
			levels.push(buildMarkers(frontierAtDepth(d, nodes), geometry, relevant));
		}
		return levels;
	}

	$: markerLevels = buildMarkerLevels(maxLevel, regionNodes, regionGeometry, relevantKeys);

	// The bounding box the map fits when a region is selected: the union of every
	// municipality polygon under the selected key. A fresh array each time (even
	// re-selecting the same region) so the map re-frames on every pick. Null while
	// nothing is selected, leaving the map where it is.
	$: focusBounds =
		selected && municipalities
			? boundsForFeatures(municipalities, municipalityIdsForKey(fillIndex, selected))
			: null;

	// The municipality ids under the open (URL-selected) region — every polygon the
	// map paints with the selected fill, so the whole selected location stays filled.
	$: selectedIds =
		selected && municipalities ? municipalityIdsForKey(fillIndex, selected) : new Set<string>();

	// The persistent fill painted across the selected region's municipality polygons.
	const selectedFillStyle = { fillColor: '#ce74ff', fillOpacity: 0.45, weight: 1 };
</script>

<div class="flex h-[calc(100vh-4rem)]">
	<aside
		class="fixed left-4 top-20 z-[1100] flex max-h-[40vh] w-[36rem] flex-col overflow-hidden rounded-box border border-base-300 bg-base-100/70 shadow-lg"
		aria-label="Map regions"
	>
		<div class="border-b border-base-300 px-4 py-3">
			<h2 class="text-sm font-bold uppercase tracking-wide opacity-70">Regions</h2>
			<div class="breadcrumbs mt-1 max-w-full text-sm">
				<ul>
					{#each crumbs as crumb, i}
						<li>
							{#if i === crumbs.length - 1}
								<span class="font-semibold">{crumb.label}</span>
							{:else}
								<button type="button" class="link link-hover" on:click={() => open(crumb.key)}>
									{crumb.label}
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<div class="border-b border-base-300 px-4 py-3">
			<input
				type="search"
				class="input input-bordered input-sm w-full"
				placeholder="Search locations…"
				bind:value={searchQuery}
			/>
		</div>

		{#if normalizedQuery}
			<RegionSearchResults results={searchResults} onSelect={openSearchResult} />
		{:else}
			<RegionTable rows={regionRows} onSelect={select} />
		{/if}
	</aside>

	<div class="relative flex min-w-0 flex-1 flex-col">
		{#if ready}
			<WorldMap
				center={[41.8, 1.7]}
				zoom={8}
				minZoom={7}
				{overlays}
				{circles}
				{markerLevels}
				{hiddenLineUrls}
				{focusBounds}
				{selectedIds}
				selectedStyle={selectedFillStyle}
				bind:currentZoom
				bind:activeLevel
				bind:currentCenter
				classes="min-h-0 flex-1"
			/>
		{:else}
			<div class="flex min-h-0 flex-1 items-center justify-center">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{/if}
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
