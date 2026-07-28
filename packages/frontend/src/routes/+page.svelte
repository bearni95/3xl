<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { characters } from '@3xl/data';
	import AuthMenu from '$components/core/AuthMenu.svelte';
	import WorldMap from '$components/core/WorldMap.svelte';
	import RegionTable from '$components/core/RegionTable.svelte';
	import TerritoryTable from '$components/core/TerritoryTable.svelte';
	import ShowStandingsTable from '$components/core/ShowStandingsTable.svelte';
	import RegionSearchResults from '$components/core/RegionSearchResults.svelte';
	import CharacterClaimPanel from '$components/core/CharacterClaimPanel.svelte';
	import ClaimPackOpener from '$components/core/pack/ClaimPackOpener.svelte';
	import ClaimPackGrid from '$components/core/pack/ClaimPackGrid.svelte';
	import PackDateCalendar from '$components/core/pack/PackDateCalendar.svelte';
	import CardCanvas from '$components/core/card/CardCanvas.svelte';
	import CombatArena from '$components/core/CombatArena.svelte';
	import Countdown from '$components/core/Countdown.svelte';
	import RosterModal from '$components/core/RosterModal.svelte';
	import { rosterModalOpen } from '$services/rosterModal';
	import type { OpenerPack } from '$components/core/pack/scene/opener-view.type';
	import { spawnService, type BoostersStatus } from '$services/spawn.service';
	import { authService } from '$services/auth.service';
	import { territoryService } from '$services/territory.service';
	import { territoryAdapter } from '$adapters/classes/territory.adapter';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { ULTRAMAR, ULTRAMAR_ID } from '$types/location.type';
	import type {
		MunicipalityChallenge,
		MunicipalityHolder,
		MunicipalitySiege,
		TerritoryWinRow
	} from '$types/territory.type';
	import type { TerritoryResult } from '$types/combat.type';
	import { TEAM_SIZE, teamService } from '$services/team.service';
	import { buildMunicipalityTeam, ogTeamSpawns } from '$utils/spawn/municipality-team';
	import { coordinateSeed } from '$utils/geo/municipality-show';
	import { teamShowId, showIdsByCharacter } from '$utils/spawn/team-show';
	import { showPosterUrl } from '$utils/geo/municipality-show';
	import { showIconName } from '$utils/show/show-icon';
	import { iconMarkup } from '$components/core/icon-markup';
	import { resolveCharacterFaceUrl } from '$utils/mugen/character-face';
	import type { CardModel } from '$utils/card/card-model.type';
	import { SpawnColor, type CharacterSpawn } from '$types/character-spawn.type';
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
		type RegionShow,
		type RegionType
	} from '$utils/geo/region-tree';
	import { buildRegionSieges } from '$utils/geo/region-siege';
	import { boundsForFeatures, boundsByFeatureId, type LatLngBounds } from '$utils/geo/bounds';
	import { buildShowStandings } from '$utils/geo/show-standings';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { nextCatalanMidnight } from '$utils/festes/catalan-day';
	import type { MapMarker, MapOverlay, MapStar } from '$types/map.type';
	import type {
		MunicipalityShow,
		MunicipalityShowsCollection,
		ShowsCollection
	} from '$types/show.type';
	import { festesService, catalanTodayIso } from '$services/festes.service';
	import type { FestaLocationRow } from '$types/festivity.type';

	// The municipality polygons, feeding the region tree and the map framing.
	let municipalities: GeoJSON.FeatureCollection | null = null;
	// The baked municipality→show assignment, keyed by municipality id. Built
	// once from municipality-shows.json; every polygon's poster and every sidebar
	// row read from it.
	let assignmentsById = new Map<string, MunicipalityShow>();
	// Held until the fetches settle so the map renders against the loaded data.
	let ready = false;
	// The municipalities celebrating a festa major today, read from Supabase — the
	// `festivities` fetch, so the map's stars and the
	// day's booster packs agree on which towns are "de festa". Each town's `id`
	// matches a municipality feature id, so it resolves to a polygon on the map.
	let todayFestes: FestaLocationRow[] = [];
	// All of today's booster packs, computed by a hidden CharacterClaimPanel, which
	// turns today's festes + the player's shows into openable packs. Kept here so clicking a star opens that town's pack at once,
	// with no extra loading. Empty when signed out or before the show pool loads.
	let claimPacks: OpenerPack[] = [];
	// The municipality whose festa pack the top-right panel's Booster tab shows, or
	// null when no star has been clicked yet.
	let packTownId: string | null = null;
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
	// The Location tab is brought forward with it: opening a region from a pin, a
	// crumb, a search hit or a won-town row has to put that region on screen, and
	// the panel is the only place it is drawn.
	function open(key: string | null) {
		panelTab = PanelTab.Location;
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
		const [municipisResult, showsResult, savedShowsResult] = await Promise.allSettled([
			fetch('/data/geo/municipis.json').then((response) => response.json()),
			fetch('/data/municipality-shows.json').then(
				(response) => response.json() as Promise<MunicipalityShowsCollection>
			),
			fetch('/data/shows.json').then((response) => response.json() as Promise<ShowsCollection>)
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
		if (savedShowsResult.status === 'fulfilled') {
			// Every authored show, so a ruling team's show id resolves to a name and a
			// poster even for shows no municipality was seeded with. Failing to load it
			// simply leaves every town on its seeded show.
			savedShowById = new Map(
				(savedShowsResult.value.shows ?? []).map((entry) => [
					entry.show.id,
					{ id: entry.show.id, name: entry.show.name, posterUrl: showPosterUrl(entry) }
				])
			);
		}
		ready = true;

		// Today's festa-major towns, loaded after the map is ready so a slow (or
		// unconfigured) Supabase never blocks the map: the stars simply pop in once
		// they arrive, and stay empty if the fetch fails.
		try {
			todayFestes = await festesService.loadTodayFestes();
		} catch {
			todayFestes = [];
		}

		// The show → renderable-character assignment, read once from Supabase so a
		// selected municipality can preview its top show's team client-side. Read-only:
		// nothing is written back. Stays empty (team preview hidden) if Supabase is
		// unconfigured or unreadable.
		try {
			const claimable = await spawnService.loadShows();
			showCharacterIds = new Map(claimable.map((show) => [show.id, show.characterIds]));
		} catch {
			showCharacterIds = new Map();
		}

		// Every character's own show names, read the same way the roster and the arena
		// read them, so a card drawn here names its show exactly as it does there.
		// Loaded on its own so a failure only costs the show row, not the team preview.
		try {
			characterShowNames = await spawnService.loadCharacterShowNames();
		} catch {
			characterShowNames = new Map();
		}

		// Who actually occupies each town, plus this player's own siege progress.
		// Loaded last and independently: a town with no holder simply stays on its
		// seeded OG team, which is exactly what an unconfigured or failing Supabase
		// leaves every town on.
		await reloadTerritory();
	});

	// --- Territory: the towns players have taken off their seeded teams ----------
	// A municipality with a holder row is occupied by that player's frozen team, and
	// that is what the panel shows and what a challenger fights; the seeded roll
	// below is only the fallback for towns nobody has taken yet. Taking a town needs
	// as many wins as it has changed hands, plus one — so every flip makes the
	// sitting team harder to shift. Those wins can only be banked one a day per town:
	// a player gets one challenge per municipality per Catalan day, so a town that has
	// flipped twice takes at least three days to take.

	// Every occupied town, this player's banked wins, and the towns they have already
	// challenged today, keyed by municipality id. Reassigned wholesale (never mutated)
	// so the reactive statements below re-run.
	let holders = new Map<string, MunicipalityHolder>();
	let sieges = new Map<string, MunicipalitySiege>();
	let challenges = new Map<string, MunicipalityChallenge>();

	// The signed-in player, so a town they already hold isn't offered as a target.
	const profile = authService.profile;

	async function reloadTerritory(): Promise<void> {
		try {
			holders = await territoryService.loadHolders();
		} catch {
			holders = new Map();
		}
		try {
			sieges = await territoryService.loadSieges();
		} catch {
			sieges = new Map();
		}
		await reloadChallenges();
	}

	// The day's spent challenges on their own — re-read whenever one is spent or a
	// fight settles, so the Challenge button closes the town off without a reload.
	async function reloadChallenges(): Promise<void> {
		try {
			challenges = await territoryService.loadChallenges();
		} catch {
			challenges = new Map();
		}
	}

	// A finished fight settled by the server: reload so the panel redraws the town
	// with whatever it now holds (a capture rewrites its team, turnover and holder).
	function onTerritory(_result: TerritoryResult): void {
		void reloadTerritory();
	}

	// --- The latest towns won (top-right panel) ---------------------------------
	// `municipality_holders` only gets a row when a town actually changes hands, so
	// the holder set the map already loads *is* the log of the towns players have
	// most recently won — newest capture first, capped so the panel stays a leaderboard
	// rather than a dump of every town ever taken.

	// How many of the most recent captures the panel lists.
	const RECENT_WINS_LIMIT = 20;

	// The panel's four views: the open region (the drill table, or a leaf town's show
	// and house team), the latest captures, the standing of every show across the whole
	// map, and the booster pack of whichever festa town's star was clicked last. Every
	// one of them lives here rather than in a panel of its own, so only one thing is
	// ever pinned over the map — the breadcrumbs above the strip stay put across all
	// four, since they name what the map is looking at whichever view is forward.
	const PanelTab = {
		Location: 'location',
		Latest: 'latest',
		Leaderboard: 'leaderboard',
		Pack: 'pack'
	} as const;
	type PanelTab = (typeof PanelTab)[keyof typeof PanelTab];
	// The strip's labels. Booster carries the day's allowance in parentheses — what is
	// left to open over the daily cap, "Booster (2/3)" — which is where that counter
	// lives now that the account card above no longer has a row for it. Plain "Booster"
	// until there is an allowance to name: signed out, or the status not yet in.
	let panelTabs: { id: PanelTab; label: string }[];
	$: panelTabs = [
		{ id: PanelTab.Location, label: 'Location' },
		{ id: PanelTab.Latest, label: 'Latest' },
		{ id: PanelTab.Leaderboard, label: 'Leaderboard' },
		{
			id: PanelTab.Pack,
			label: boosters ? `Booster (${boosters.remaining}/${boosters.level})` : 'Booster'
		}
	];
	// Opens on the location view: it is what the map itself is showing, and it follows
	// the zoom even before anything has been clicked.
	let panelTab: PanelTab = PanelTab.Location;

	// How many municipalities each show flies, and its share of them all. Tallied
	// over `showsById`, which is already the seeded assignment with every held
	// town's ruling show written over it — so a conquest moves a town from one
	// show's tally to another's the moment the holders reload.
	$: showStandings = buildShowStandings(showsById);

	// Municipality feature id → its raw name, so a holder row (which stores only the
	// feature id) can be named without walking the region tree.
	$: municipalityNamesById = new Map(
		(municipalities?.features ?? []).map((feature) => [
			String(feature.properties?.id),
			String(feature.properties?.name ?? '')
		])
	);

	// The most recently captured towns, each named, labelled with the show its sitting
	// team belongs to, and carrying the siege it would take to dethrone that team: the
	// wins required (from the town's own turnover count) and the wins the reader has
	// banked so far (their own `municipality_sieges` row — RLS means it is nobody
	// else's, and zero when signed out). Both figures come out of Supabase; neither is
	// invented here. Every input is named as an argument so the rows rebuild as the
	// holders and sieges reload, the polygons land and the ruling shows resolve.
	function buildRecentWins(
		occupied: ReadonlyMap<string, MunicipalityHolder>,
		banked: ReadonlyMap<string, MunicipalitySiege>,
		names: ReadonlyMap<string, string>,
		ruling: ReadonlyMap<string, RegionShow>
	): TerritoryWinRow[] {
		return [...occupied.values()]
			.sort((a, b) => b.takenAt.localeCompare(a.takenAt))
			.slice(0, RECENT_WINS_LIMIT)
			.map((holder) => {
				const name = names.get(holder.locationId);
				const progress = territoryService.progressFor(holder.locationId, occupied, banked);
				const show = ruling.get(holder.locationId) ?? null;
				return {
					locationId: holder.locationId,
					// A holder whose polygon isn't loaded still has to be listed, so it falls
					// back to its feature id rather than being dropped.
					name: name ? restoreCatalanArticle(name) : holder.locationId,
					holderName: holder.holderName,
					showName: show?.name ?? null,
					// Carried so the table can badge the row with the show's icon.
					showId: show?.id ?? null,
					wins: progress.wins,
					required: progress.required,
					takenAt: holder.takenAt
				};
			});
	}

	$: recentWins = buildRecentWins(holders, sieges, municipalityNamesById, rulingShowById);

	// Clicking a row opens that town exactly as picking it out of the region table
	// does: the URL region param drives the map framing and the Location tab, which
	// `open` brings forward — so the row hands the panel straight over to the town.
	function openWin(row: TerritoryWinRow) {
		open(row.locationId);
	}

	// Sieges and today's spent challenges are both RLS-scoped to the reader, so the
	// sets loaded before sign-in are nobody's. Reload whenever the signed-in account
	// changes (including signing out, which empties them). `$profile` is named
	// directly so the statement tracks it.
	let siegesForUser: string | null = null;
	$: if (ready && ($profile ? String($profile.id) : null) !== siegesForUser) {
		siegesForUser = $profile ? String($profile.id) : null;
		void territoryService
			.loadSieges()
			.then((loaded) => (sieges = loaded))
			.catch(() => (sieges = new Map()));
		void reloadChallenges();
	}

	// The colour every division line is drawn in — Tailwind's red-500, read as the
	// CSS variable the theme emits so the borders track the palette instead of
	// pinning a hex. Leaflet writes this straight onto the SVG `stroke` attribute,
	// where `var()` resolves like any other CSS value. The literal fallback matters:
	// the variable is only emitted while some utility in the app still uses red-500,
	// and an unresolvable var() computes to `none` — silently erasing every border.
	const lineColor = 'var(--color-red-500, oklch(63.7% 0.237 25.331))';

	// Països Catalans polygons, built by @3xl/data's generate:geo from the
	// Eurostat LAU set (WGS84) and served from that package's public/ at /data.
	// Drawn bottom-up: municipality lines, comarca lines, province lines, territory
	// lines. Every tier is the same red now, so a shared border reads by its weight
	// alone — the coarser the division, the thicker the line over it.
	//
	// Every tier is stroke-only — no polygon carries a fill, so the satellite
	// basemap reads through the whole map and the divisions are pure borders over
	// it. Each imaged region's top show is shown on a pin dropped at the region's
	// centre (see `markers`), not painted across its shape. Every tier is decorative
	// now — with no fill to light up there is nothing for a polygon hover to do, so
	// none of them capture pointer events and the pins and stars own every click.
	// `hiddenLineUrls` still thins the finer borders down to the tier the map is
	// focused on.
	const overlays: MapOverlay[] = [
		{
			url: '/data/geo/municipis.json',
			// The municipality borders draw in the same red as every coarser tier, but
			// only when this tier is the one imaged (the finest zoom) — the tier logic
			// below drops the stroke (opacity 0) at coarser views, so only the coarser
			// divisions show there while the town borders return once you zoom in.
			style: { color: lineColor, weight: 1, fill: false },
			interactive: false
		},
		{
			url: '/data/geo/comarques.json',
			style: { color: lineColor, weight: 1.5, fill: false },
			interactive: false
		},
		{
			url: '/data/geo/provincies.json',
			style: { color: lineColor, weight: 2, fill: false },
			interactive: false
		},
		{
			url: '/data/geo/territoris.json',
			style: { color: lineColor, weight: 3, fill: false },
			interactive: false
		}
	];

	// --- Which show a town flies -------------------------------------------------
	// A town starts on the show the build baked onto it, but once a player takes it
	// the town flies the ruling team's show instead: the pins, the sidebar and every
	// coarser region's plurality tally all read from the single map below, so a
	// conquest re-labels the town everywhere the map names a show at once.

	// Every authored show by id (name + poster), read from /data/shows.json — the
	// same source the baked assignment posters come from, so an overridden town's pin
	// draws exactly like a seeded one. Empty until the fetch lands.
	let savedShowById = new Map<number, RegionShow>();

	// character id → the shows it belongs to, reversed from the show → characters
	// assignment the claim flow already loads.
	$: showsByCharacter = showIdsByCharacter(showCharacterIds);

	// Municipality id → the show its ruling team belongs to, for every town a player
	// holds — the team's LEAD's show, as the roster defines a team's show, so the town
	// flies whatever its first card flies. A team whose lead is in no show, or whose
	// show isn't in the saved collection, yields no entry — that town simply keeps its
	// seeded show rather than losing its pin. A ruling show with no poster does replace
	// the seeded one, and its town then goes unpinned exactly as a town seeded with a
	// poster-less show already does. Named deps so it re-derives as holders and the
	// saved shows land.
	function buildRulingShows(
		occupied: ReadonlyMap<string, MunicipalityHolder>,
		byCharacter: ReadonlyMap<string, number[]>,
		saved: ReadonlyMap<number, RegionShow>
	): Map<string, RegionShow> {
		const ruling = new Map<string, RegionShow>();
		for (const holder of occupied.values()) {
			const showId = teamShowId(
				holder.team.map((member) => member.characterId),
				byCharacter
			);
			const show = showId == null ? null : saved.get(showId);
			if (show) ruling.set(holder.locationId, show);
		}
		return ruling;
	}

	$: rulingShowById = buildRulingShows(holders, showsByCharacter, savedShowById);

	// Municipality id → the show it flies: the baked seed for every town (the full
	// assignment, not just the rendered neighbourhood), overridden by the ruling
	// team's show wherever a player holds the town. This feeds the region tree, so
	// the override rides all the way up — a comarca or province tallies its
	// plurality over the shows its towns actually fly today.
	function buildTownShows(
		assignments: ReadonlyMap<string, MunicipalityShow>,
		ruling: ReadonlyMap<string, RegionShow>
	): Map<string, RegionShow> {
		const shows = new Map<string, RegionShow>();
		for (const [id, assignment] of assignments) shows.set(id, assignment.show);
		for (const [id, show] of ruling) shows.set(id, show);
		return shows;
	}

	$: showsById = buildTownShows(assignmentsById, rulingShowById);

	// --- Which colour a town flies -----------------------------------------------
	// The same compounding as the show above, one field over: a town's colour is its
	// team's LEAD's colour, exactly as its show is its lead's show — the seeded OG
	// roll's lead for a town nobody has taken, the winning team's lead once one has.
	// Fed into the region tree beside the shows, so a comarca, a province and a
	// territory each take the plurality colour of the towns beneath them just as they
	// take their plurality show, and a conquest re-colours every tier above it.

	// Municipality id → the GPS seed its team is rolled from — the very seed that
	// assigned its show. Hashing it walks every vertex of the polygon, so it is done
	// once off the geometry and kept: the colours below re-derive as towns change
	// hands without touching the shapes again.
	function buildMunicipalitySeeds(
		collection: GeoJSON.FeatureCollection | null
	): Map<string, number> {
		const seeds = new Map<string, number>();
		if (!collection) return seeds;
		for (const feature of collection.features) {
			const id = String(feature.properties?.id ?? '');
			if (id) seeds.set(id, coordinateSeed(feature.geometry));
		}
		return seeds;
	}

	$: municipalitySeeds = buildMunicipalitySeeds(municipalities);

	// Municipality id → the colour it flies. Every town gets its seeded team's lead
	// colour, overridden by the lead of whoever holds it — the same seed/override
	// pair buildTownShows draws the shows from. A town whose show has no roster
	// loaded yet (the assignment comes from Supabase) simply has no colour, and its
	// pin stays neutral rather than guessing one.
	function buildTownColors(
		seeds: ReadonlyMap<string, number>,
		shows: ReadonlyMap<string, RegionShow>,
		pools: ReadonlyMap<number, string[]>,
		occupied: ReadonlyMap<string, MunicipalityHolder>
	): Map<string, SpawnColor> {
		const colors = new Map<string, SpawnColor>();
		for (const [id, show] of shows) {
			const seed = seeds.get(id);
			if (seed == null) continue;
			// Only the lead is wanted, and the roll shuffles the whole pool before it
			// takes any member, so asking for a team of one lands on the very same lead
			// (character, colour and stat) as the full TEAM_SIZE roll the panel draws.
			const lead = buildMunicipalityTeam(seed, pools.get(show.id) ?? [], 1)[0];
			if (lead) colors.set(id, lead.color);
		}
		for (const holder of occupied.values()) {
			const lead = holder.team[0];
			if (lead) colors.set(holder.locationId, lead.color);
		}
		return colors;
	}

	$: colorsById = buildTownColors(municipalitySeeds, showsById, showCharacterIds, holders);

	// The red → yellow → green → blue region hierarchy (territory → province →
	// comarca → municipality) mirrored from the map's divisions, for the tree.
	$: regionTree = buildRegionTree(municipalities, showsById, colorsById);

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

	// The region whose children the sidebar lists: an explicit click (the URL
	// `region` param) wins, so a row always drills straight into what was clicked;
	// with nothing clicked the sidebar follows the zoom-driven focus instead.
	$: openRegion = selected ?? effectiveSelected;

	// The breadcrumb drill path down to (and including) the open region: the URL
	// path when a region is clicked, else the zoom focus path minus its frontier pin.
	$: displayPath = selected ? openPath : focusPath.slice(0, -1);

	// Every region's siege counter, so the drill table carries the same wins/needed
	// figure the latest-wins table does: a municipality's own — its holder row's
	// turnover sets the bar and the reader's own siege row the banked wins, with the
	// untaken town falling back to 0/1 — and, above that tier, the sum over every town
	// in the region. Named deps so it re-derives as the holders and sieges reload.
	$: regionSieges = buildRegionSieges(regionNodes, holders, sieges);

	$: regionRows = regionRowsForSelection(regionNodes, openRegion, regionSieges);

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

	// The open location's own node and its plurality ("most seen") show. Surfaced in the
	// panel's Location tab when the open region is a leaf municipality (the table there
	// lists child rows, so a leaf has nothing to list and shows the town's own show
	// instead), and used to pick the roster the town's OG team rolls from.
	$: openNode = openRegion ? findNode(regionNodes, openRegion) : null;
	$: openShow = openNode?.show ?? null;

	// --- The open municipality's deterministic "house team" ---------------------
	// A leaf region (a municipality) has no children to drill into; instead of an
	// empty table the Location tab previews the town's team: three cards rolled
	// deterministically from the town's own seed, drawn from its top show's roster.
	// It's a read-only, client-side mirror of the claim roll (a card is never written
	// to Supabase from here) — only the show→character assignment is read below.

	// The registry, indexed by id, so a rolled team member resolves to a label + sprite.
	const charactersById = new Map(characters.map((character) => [character.id, character]));

	// show id → its renderable character ids, read once from Supabase (the same
	// `show_characters` assignment the claim panel reads). Empty when Supabase is
	// unconfigured or unreadable — the team preview simply stays hidden then.
	let showCharacterIds = new Map<number, string[]>();

	// character id → the names of the shows it belongs to, read once from Supabase
	// (`show_characters` joined to `show_templates`). A card's show is the character's,
	// not the context it happens to be drawn in, so both canvases in this panel read it
	// from here — the same source the roster and the combat board use.
	let characterShowNames = new Map<string, string[]>();

	/** A character's shows as one card label, or null when it belongs to none. */
	function cardShowName(characterId: string, shows: ReadonlyMap<string, string[]>): string | null {
		return shows.get(characterId)?.join(', ') || null;
	}

	// character id → resolved active-face portrait, loaded lazily as team members
	// appear (mirrors the roster's face loading).
	let characterFaces = new Map<string, string | null>();
	const faceRequested = new Set<string>();

	// The open leaf municipality's feature (matched by id), and the GPS seed that
	// assigns its show — the same seed we reuse to roll its team, so a town's show and
	// its team are both stable functions of its shape. Null unless a municipality with
	// no sub-regions is open.
	$: municipalityFeature =
		openRegion && municipalities && regionRows.length === 0
			? (municipalities.features.find((feature) => String(feature.properties?.id) === openRegion) ??
				null)
			: null;
	$: municipalitySeed = municipalityFeature ? coordinateSeed(municipalityFeature.geometry) : null;

	// The town's seeded team: up to TEAM_SIZE distinct characters from its top show's
	// roster, rolled from the municipality seed and obeying the roster's colour rule.
	// The same for every player, and only what a town falls back on until somebody
	// takes it.
	$: seededTeam =
		municipalitySeed != null && openShow
			? buildMunicipalityTeam(municipalitySeed, showCharacterIds.get(openShow.id) ?? [], TEAM_SIZE)
			: [];

	// The town's holder, or null while it is still on its seeded team.
	$: openHolder = openRegion ? (holders.get(openRegion) ?? null) : null;

	// The team on the open town: whoever holds it comes first, with the seed as the
	// fallback for towns no player has beaten yet. This is what the panel draws and
	// what a challenger fights.
	$: municipalityTeam =
		openHolder && openHolder.team.length > 0
			? territoryAdapter.toTeamRolls(openHolder.team)
			: seededTeam;

	// How far this player has got towards taking the open town, and the bar. Wins
	// banked against a generation that has since been replaced count for nothing.
	$: siegeProgress = openRegion
		? territoryService.progressFor(openRegion, holders, sieges)
		: { wins: 0, required: 1, turnover: 0 };

	// A player can't challenge a town they already hold — there is nothing to take.
	$: holdsOpenTown = !!openHolder && !!$profile && openHolder.userId === String($profile.id);

	// Nor one they have already been to today: a town is good for one challenge per
	// Catalan day. The server is what enforces it (`start_challenge`); this only
	// closes the button so the fight isn't opened onto a refusal.
	$: challengedOpenTown = !!openRegion && challenges.has(openRegion);

	// And when it opens up again: the next Catalan midnight, which is the boundary
	// `start_challenge` measures the day against. Recomputed as the panel moves to
	// another town so a countdown left running past midnight gets the new deadline.
	$: challengeUnlocksAt = challengedOpenTown ? nextCatalanMidnight().getTime() : 0;

	// Kick off face loading for whichever team members are on screen.
	$: void loadFaces(municipalityTeam.map((member) => member.characterId));

	// The team as display CardModels for the shared renderer — the same shape the
	// claim/roster cards use. `characterFaces` and `characterShowNames` are threaded in
	// so the statement re-runs as faces and shows resolve. The show row names each
	// character's own show — a held town fields the occupier's claimed characters, so
	// labelling them with the town's top show would be a lie.
	$: municipalityTeamCards = ((
		faces: Map<string, string | null>,
		shows: Map<string, string[]>
	): CardModel[] =>
		municipalityTeam.map((member) => ({
			label: charactersById.get(member.characterId)?.label ?? member.characterId,
			basePath: charactersById.get(member.characterId)?.basePath ?? null,
			faceUrl: faces.get(member.characterId) ?? null,
			color: member.color,
			rarity: null,
			showName: cardShowName(member.characterId, shows),
			locationName: municipalityFeature
				? restoreCatalanArticle(String(municipalityFeature.properties?.name ?? ''))
				: null,
			spawnedAt: null
		})))(characterFaces, characterShowNames);

	// --- The player's own active team (the panel's account section) --------------
	// Drawn on the very same CardCanvas as a town's team, right under the account card:
	// the side this player would field, so what they are challenging with is read
	// against the town they are looking at without leaving the map for the roster.
	// Slots hold spawn ids, so the team is only renderable once the player's spawns are
	// in; empty slots are simply left out, and a team with none drawn shows nothing.
	const teamStore = teamService.store;
	const playerSpawns = spawnService.spawns;

	// The signed-in player's id, or null — what their spawns are loaded for.
	$: currentUserId = $profile ? String($profile.id) : null;

	// One load per signed-in player, exactly as the roster and the arena do it. A
	// failure leaves the strip empty rather than breaking the panel.
	let spawnsLoadedFor: string | null = null;
	$: if (currentUserId && currentUserId !== spawnsLoadedFor) {
		spawnsLoadedFor = currentUserId;
		void spawnService.loadSpawns(currentUserId).catch(() => {});
	}

	// Whichever roster team is marked active (teams live in localStorage), and the
	// spawns its filled slots name, in slot order — the leader first, as on the board.
	$: activeTeam = $teamStore.teams.find((team) => team.id === $teamStore.activeTeamId) ?? null;
	$: playerSpawnById = new Map($playerSpawns.map((spawn) => [spawn.id, spawn]));
	$: activeTeamSpawns = (activeTeam?.memberIds ?? [])
		.map((id) => (id ? (playerSpawnById.get(id) ?? null) : null))
		.filter((spawn): spawn is CharacterSpawn => !!spawn);

	// Their portraits, through the same lazy loader the town's team uses.
	$: void loadFaces(activeTeamSpawns.map((spawn) => spawn.characterId));

	// geojson feature id → municipality name, so each card can name where it was
	// claimed. Null until the layer the map is drawn from has loaded.
	$: municipalityNames = municipalities ? locationAdapter.municipalityNames(municipalities) : null;

	/** A spawn's claim place; the Ultramar sentinel and any unresolved id read as Ultramar. */
	function claimPlaceFor(id: string | null | undefined, names: Map<string, string> | null): string {
		if (id && id !== ULTRAMAR_ID) {
			const name = names?.get(id);
			if (name) return restoreCatalanArticle(name);
		}
		return ULTRAMAR.municipality;
	}

	// The active team as display CardModels. Same shape as the town's, from the
	// player's own spawns instead of a seeded roll: the rolled colour is theirs, the
	// claim place is where they pulled it, and the show row names the
	// character's own show as it does on the roster and the combat board. No rarity —
	// this panel doesn't read that Supabase layer. Every resolved map is threaded in so
	// the statement re-runs as faces, shows and place names arrive.
	$: activeTeamCards = ((
		faces: Map<string, string | null>,
		shows: Map<string, string[]>,
		names: Map<string, string> | null
	): CardModel[] =>
		activeTeamSpawns.map((spawn) => ({
			label: charactersById.get(spawn.characterId)?.label ?? spawn.characterId,
			basePath: charactersById.get(spawn.characterId)?.basePath ?? null,
			faceUrl: faces.get(spawn.characterId) ?? null,
			color: spawn.color,
			rarity: null,
			showName: cardShowName(spawn.characterId, shows),
			locationName: claimPlaceFor(spawn.locationId, names),
			spawnedAt: spawn.createdAt
		})))(characterFaces, characterShowNames, municipalityNames);

	// The open combat modal: the challenged town's sitting team (as synthetic spawns)
	// plus everything the fight has to be reported against — the town's id, the
	// turnover generation it was on and who held it — all frozen at click time. Null
	// when the modal is closed. The player's own active team is the other side,
	// fielded by CombatArena — combat happens right here over the map, never
	// navigating away.
	let fightSpawns: CharacterSpawn[] = [];
	let fightName: string | null = null;
	let fightLocationId: string | null = null;
	let fightTurnover = 0;
	let fightHolderName: string | null = null;
	let fightOpen = false;

	// True while the day's challenge is being claimed off the server, so a double
	// click can't fire two `start_challenge` calls (the second of which the server
	// would refuse anyway).
	let challengeStarting = false;

	// --- The panel's mobile shape ------------------------------------------------
	// Narrow viewports have no room for a 36rem column floating over the map, so below
	// `md` the same panel becomes a sheet stuck to the bottom edge: 30vh of it showing,
	// with the handle row at its top toggling it up to the full screen and back. Both
	// states are plain heights on the one element, so the CSS height transition slides
	// its top edge up and down — no second panel, no remount, nothing in the tabs
	// (breadcrumbs, search, a half-sliced pack) resets on the way.
	let panelExpanded = false;

	// The single panel pinned over the map's right edge, holding all four views. It
	// slides off while a fight is on, so the arena has the map to itself — translated
	// (not unmounted) to keep the breadcrumb/search state alive and animate back in on
	// close. It leaves the way it came in: off the right edge on the desktop panel
	// (`right-4` means it must travel its own width plus that gap to clear the
	// viewport), straight down off the bottom edge on the mobile sheet.
	//
	// One height for every tab on the desktop panel: the account card and the
	// full-width team strip above the tab strip take a fixed slice of the panel before a
	// tab draws anything, so the short panel the two tables used to get left them with
	// almost no rows. Whatever the header does not use goes to the tab, which is the only
	// part that scrolls.
	//
	// z-[900] is the whole of its layering: above every Leaflet layer (the map's own
	// panes and controls top out at 800) and below every modal. DaisyUI puts `.modal`
	// at 999, so the profile card, the avatar picker, the username prompt and anything
	// added later come up over the panel without each having to name a z-index — the
	// panel is furniture, and a dialog is never behind its furniture. The two things
	// that must clear it outright — the combat arena (1200) and the roster (1300) —
	// carry their own z above the modal layer.
	$: panelClasses = classNames(
		'fixed z-[900] flex flex-col overflow-hidden',
		'border border-base-300 shadow-lg',
		'transition-[transform,height,background-color] duration-300 ease-in-out',
		// Mobile: the bottom sheet. It spans the full width and sits flush on the bottom
		// edge, so only its top corners are rounded and its bottom border would be off
		// screen anyway. The peek stays see-through so the map still reads under it, but
		// pulled up to the full screen there is no map left to read — so the surface goes
		// opaque, and fades back to the reduced alpha as it collapses. The two mobile
		// alphas are written as one branch each (rather than an override on a shared base)
		// so only ever one of them is on the element and neither can lose to source order.
		'inset-x-0 bottom-0 rounded-t-[var(--radius-box)] border-b-0',
		panelExpanded ? 'h-screen max-md:bg-base-100' : 'h-[30vh] max-md:bg-base-100/70',
		// md and up: the floating right-hand column, exactly as before — every mobile
		// anchor is unset so the sheet's geometry doesn't leak into it, and it keeps the
		// reduced alpha whatever the sheet's toggle was last left on.
		'md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:w-[36rem] md:rounded-box md:border-b',
		'md:bg-base-100/70',
		// The panel is only as tall as what it holds, and stops there — a short town or a
		// three-row table no longer drags an empty box down the whole viewport. The cap is
		// what it used to take outright: past it the forward tab's own scroller takes over.
		// The Booster tab is the exception. Its packs are a WebGL scene with no content
		// height of its own — it draws into whatever box it is handed — so there is nothing
		// there to hug, and it keeps the full height it has always had.
		panelTab === PanelTab.Pack ? 'md:h-[calc(100vh-2rem)]' : 'md:h-auto md:max-h-[calc(100vh-2rem)]',
		{ 'translate-y-full md:translate-y-0 md:translate-x-[calc(100%+1.5rem)]': fightOpen }
	);

	// Fight this town: spend the day's challenge on it, then snapshot whichever team
	// currently sits on it — the holder's if a player has taken it, the seeded roll
	// otherwise — into synthetic spawns and open the combat modal. The town only
	// changes hands server-side, once the fight is reported and enough wins have been
	// banked.
	//
	// The day's challenge is claimed *before* the arena opens, and by the server: a
	// town is good for one fight per Catalan day, and it is spent on opening rather
	// than on reporting, so walking out of a fight that is going badly doesn't hand
	// back a free retry. A refusal (the town already fought today, another tab having
	// taken the slot first) leaves the arena closed and re-reads the day's challenges,
	// which closes the button too.
	//
	// Signed out there is no ledger to spend from — and no fight that could ever be
	// reported — so nothing is claimed and the arena opens exactly as it used to,
	// onto its own "no active team" gate.
	async function challenge(): Promise<void> {
		if (municipalityTeam.length === 0 || holdsOpenTown || challengedOpenTown) return;
		if (challengeStarting) return;
		const townId = openRegion;
		if (!townId) return;

		if ($profile) {
			challengeStarting = true;
			try {
				await territoryService.startChallenge(townId);
			} catch {
				await reloadChallenges();
				return;
			} finally {
				challengeStarting = false;
			}
			// The panel may have moved on while the RPC was in flight; the spent challenge
			// belongs to the town that was clicked, so only that town's fight may open.
			if (openRegion !== townId) return;
		}

		fightSpawns = ogTeamSpawns(municipalityTeam, openRegion ?? '');
		fightName = municipalityFeature ? String(municipalityFeature.properties?.name ?? '') : null;
		fightLocationId = openRegion;
		// The generation being fought, so a win landing after somebody else took the
		// town is recognised as having beaten a team that no longer holds it.
		fightTurnover = siegeProgress.turnover;
		fightHolderName = openHolder?.holderName ?? null;
		fightOpen = true;
	}

	// Fetch the active-face portrait for any team character not yet requested, then
	// reassign the map so the cards re-render with their faces.
	async function loadFaces(ids: string[]): Promise<void> {
		const missing = ids.filter((id) => !faceRequested.has(id));
		if (missing.length === 0) return;
		for (const id of missing) faceRequested.add(id);
		await Promise.all(
			missing.map(async (id) => {
				const basePath = charactersById.get(id)?.basePath ?? null;
				characterFaces.set(id, basePath ? await resolveCharacterFaceUrl(id, basePath) : null);
			})
		);
		characterFaces = characterFaces;
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
	// selected), otherwise the effective region's child tier — the sub-division its
	// pins mark. A municipality (a leaf) images itself.
	function imagedRank(chosen: string | null, nodes: RegionNode[]): number {
		if (!chosen) return tierRank.Territory;
		const node = findNode(nodes, chosen);
		return tierRank[node?.children[0]?.type ?? 'Municipality'];
	}

	// Hide the stroke of every line overlay finer than the tier currently imaged, so
	// only the tier on screen (and everything coarser) keeps its borders — the finer
	// divisions inside would just clutter the pinned regions. Keyed off the ZOOM focus
	// (`effectiveSelected`), never the frozen click, so the borders stay in lockstep
	// with the pins: both advance a tier together as the map zooms in, and coarsen
	// together as it zooms out — a clicked region no longer pins its border tier while
	// the zoom marches on past it.
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

	// A gold star dropped on every municipality celebrating a festa major today,
	// at the centre of the town's bounding box (its own key in the region geometry).
	// Clicking a star loads that town's festa booster pack into the top-right panel and
	// flips the panel to its Booster tab, so the pack replaces the tables. A festa town
	// whose polygon isn't on the map (no box) is skipped. Named deps (`todayFestes`,
	// `regionGeometry`) so the stars repaint when either lands.
	$: festaStars = (() => {
		const boxes = regionGeometry.boxes;
		const result: MapStar[] = [];
		for (const festa of todayFestes) {
			const box = boxes.get(festa.id);
			if (!box) continue;
			const [[south, west], [north, east]] = box;
			result.push({
				id: festa.id,
				position: [(south + north) / 2, (west + east) / 2],
				label: festa.name,
				onClick: () => openPack(festa.id)
			});
		}
		return result;
	})();

	// Show a town's pack: remember which town, and bring the Booster tab forward so the
	// pack is on screen straight away (the tab renders the opener, so this is what
	// mounts its canvas). The stars only ever mark today's festes, so this also walks
	// the browsed day back to today.
	function openPack(id: string): void {
		clearPackFeedback();
		packDate = todayIso;
		calendarMonth = todayIso.slice(0, 7);
		packTownId = id;
		panelTab = PanelTab.Pack;
	}

	// --- Which day's packs the Booster tab shows ---------------------------------
	// The tab opens on today and its arrows walk the festivity calendar a day at a
	// time. Only today's packs can be opened — `claim_booster` mints a booster solely
	// for a town that is de festa today, and the server is the one enforcing it — so
	// every other day is a read-only preview of the packs that day holds.

	// Today in Catalan time, the same day boundary the server claims against.
	const todayIso = catalanTodayIso();
	let packDate = todayIso;
	$: isPackToday = packDate === todayIso;

	// Step the browsed day, and drop back to that day's grid. The date is rebuilt from
	// its own parts in UTC rather than parsed and offset, so the arithmetic stays on
	// calendar days and no DST change can shift it.
	function stepPackDate(days: number): void {
		const [year, month, day] = packDate.split('-').map(Number);
		packDate = new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
		calendarMonth = packDate.slice(0, 7);
		showPackGrid();
	}

	// --- The calendar behind the date ---------------------------------------------
	// The date in the header toggles open a month calendar that prints, on every day,
	// how many municipalities are de festa then; picking a day browses to it.

	let calendarOpen = false;
	let calendarMonth = packDate.slice(0, 7);

	function toggleCalendar(): void {
		calendarOpen = !calendarOpen;
		if (calendarOpen) calendarMonth = packDate.slice(0, 7);
	}

	function pickPackDate(iso: string): void {
		packDate = iso;
		calendarMonth = iso.slice(0, 7);
		calendarOpen = false;
		showPackGrid();
	}

	// Per-month festa counts, kept once fetched so paging back and forth through the
	// calendar doesn't re-query Supabase, plus the month currently in flight.
	let countsByMonth = new Map<string, Map<string, number>>();
	let loadingCountsMonth: string | null = null;

	async function loadCountsFor(month: string): Promise<void> {
		if (countsByMonth.has(month)) return;
		loadingCountsMonth = month;
		const [year, monthNumber] = month.split('-').map(Number);
		// Day 0 of the next month is the last day of this one.
		const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
		let counts = new Map<string, number>();
		try {
			counts = await festesService.loadFestaCountsForRange(
				`${month}-01`,
				`${month}-${String(lastDay).padStart(2, '0')}`
			);
		} catch {
			// A failed month simply reads as having no festes.
			counts = new Map();
		}
		countsByMonth.set(month, counts);
		countsByMonth = countsByMonth;
		if (loadingCountsMonth === month) loadingCountsMonth = null;
	}

	// Only fetched while the calendar is on screen — a panel nobody opened costs nothing.
	$: if (calendarOpen) void loadCountsFor(calendarMonth);
	$: calendarCounts = countsByMonth.get(calendarMonth) ?? new Map<string, number>();

	// Festes for every day browsed so far, so stepping back and forth doesn't re-query
	// Supabase. Today's are already loaded into `todayFestes` (the map's stars read the
	// same set), so only other days land here.
	let festesByDate = new Map<string, FestaLocationRow[]>();
	// The day currently being fetched, so the panel can show a spinner for it.
	let loadingDate: string | null = null;

	async function loadFestesFor(iso: string): Promise<void> {
		if (iso === todayIso || festesByDate.has(iso)) return;
		loadingDate = iso;
		let rows: FestaLocationRow[] = [];
		try {
			rows = await festesService.loadFestesForDate(iso);
		} catch {
			// A failed day simply reads as having no festes.
			rows = [];
		}
		festesByDate.set(iso, rows);
		festesByDate = festesByDate;
		if (loadingDate === iso) loadingDate = null;
	}

	$: void loadFestesFor(packDate);

	// The browsed day's celebrating towns, and the packs the grid lays out for them:
	// today's are the real, openable ones the claim panel computed (each carrying its
	// own roll), while another day's are built here from the map's baked town→show
	// assignment — cover art and a name, with a roll that can never fire because the
	// grid is mounted read-only for those days.
	$: dayFestes = isPackToday ? todayFestes : (festesByDate.get(packDate) ?? []);

	function buildPreviewPacks(
		festes: FestaLocationRow[],
		assignments: ReadonlyMap<string, MunicipalityShow>
	): OpenerPack[] {
		return festes.map((festa) => {
			const show = assignments.get(festa.id)?.show ?? null;
			return {
				id: festa.id,
				coverUrl: show?.posterUrl ?? null,
				locationName: festa.name,
				label: show?.name ?? festa.name,
				claim: async () => []
			};
		});
	}

	$: dayPacks = isPackToday ? claimPacks : buildPreviewPacks(dayFestes, assignmentsById);

	// The browsed day, written out in Catalan. Formatted at midday UTC so the calendar
	// day can't slip either way, and rendered with a CSS-capitalised first letter —
	// Catalan weekday names come out lowercase.
	const packDateFormat = new Intl.DateTimeFormat('ca-ES', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	});
	$: packDateLabel = packDateFormat.format(new Date(`${packDate}T12:00:00Z`));

	// What the hidden claim panel reports back about opening a pack: the player's
	// remaining daily allowance, and why the last roll was refused (empty when it
	// wasn't). The server is what enforces both — every refusal in `claim_booster`
	// (signed out, town not de festa today, allowance spent, show with no claimable
	// characters) surfaces here, and the pack reveals no cards. Shown in the Booster
	// tab, because a pack that opens onto nothing has to say why. The allowance is also
	// what the Booster tab's own label counts down, so this one read serves both.
	let claimError = '';
	let boosters: BoostersStatus | null = null;

	// Nothing left to open today: the packs stay on screen but stop being openable, so
	// the tab says so up front instead of letting a pack slice open onto nothing. Null
	// (signed out, or the status hasn't loaded) leaves them openable — the server has
	// the last word either way.
	$: allowanceSpent = !!boosters && boosters.remaining <= 0;

	// How many cards the last pack opened in this panel revealed, or null before any
	// has been opened. Zero means the pack sliced open onto an empty canvas: the roll
	// resolved to nothing. That is normally a refusal (and `claimError` then says which),
	// but it is reported separately so an empty reveal is never silent.
	let lastRevealed: number | null = null;

	// Drop whatever the last open said, so its alert doesn't hang over the next pack.
	function clearPackFeedback(): void {
		lastRevealed = null;
		claimError = '';
	}

	function onPackOpened(revealed: number): void {
		lastRevealed = revealed;
		// A successful open spends one of the day's packs; re-read the allowance so the
		// counter in the header follows along.
		void spawnService
			.boostersStatus()
			.then((status) => (boosters = status))
			.catch(() => {});
	}

	// The pack picked on the grid canvas — named in the header, and the reason the
	// "all packs" control shows. Plus a counter bumped to remount the grid, since a
	// picked pack has zoomed in and only a fresh scene lays the full grid back out.
	let gridPack: OpenerPack | null = null;
	let gridSession = 0;

	// Back to the whole day's grid, from a star-opened town or a picked pack alike.
	// The session bump remounts the canvas, which is the only way to rebuild a grid a
	// pack has already zoomed out of — so it is spent only when a pack really was
	// picked. Every remount is a fresh WebGL context, and the browser hands out a
	// limited number of those across the whole page.
	function showPackGrid(): void {
		clearPackFeedback();
		if (gridPack) gridSession += 1;
		packTownId = null;
		gridPack = null;
	}

	// Picking the Booster tab by its own button always lands on the grid of every pack
	// the day offers; only a star click narrows the tab to one town's pack.
	function selectTab(id: PanelTab): void {
		if (id === PanelTab.Pack) showPackGrid();
		panelTab = id;
	}

	// The grid remounts whenever the browsed day's set of packs changes (a new day, they
	// load in, or the player signs in), so a stale grid never lingers. The closures are
	// rebuilt on every recompute while the ids stay stable, so key on the ids alone.
	$: packsKey = dayPacks.map((pack) => pack.id).join(',');

	// The single pack the Booster tab shows — the clicked town's, picked out of the full
	// day's set. Null when no star has been clicked, the player is signed out, or the
	// town has no claimable show yet.
	$: packForTown = packTownId
		? (claimPacks.find((pack) => pack.id === packTownId) ?? null)
		: null;

	// A pin frame's fill per region colour: the same six swatches the cards, the
	// avatar rings and the combat buttons paint with, each with the ink that reads
	// on it — yellow is the one light enough to want black. Written out in full
	// because Tailwind only emits classes it can see spelled in the source.
	const pinColorClasses: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'bg-red-500 text-white',
		[SpawnColor.Yellow]: 'bg-yellow-400 text-black',
		[SpawnColor.Blue]: 'bg-blue-500 text-white',
		[SpawnColor.Orange]: 'bg-orange-500 text-white',
		[SpawnColor.Green]: 'bg-green-500 text-white',
		[SpawnColor.Purple]: 'bg-purple-500 text-white'
	};

	// One pin per region that has a show, dropped at the centre of the region's
	// bounding box, captioned with the show and tooltipped with the region name;
	// clicking a pin opens that region. Pins clear of the selection are flagged
	// `dimmed` so the map fades them rather than dropping them.
	//
	// The pin carries the show's glyph — the same icon the panel's tables badge a
	// show with — not its poster: a poster is a tall photographic rectangle that
	// reads as a picture dropped on the map, while the flat monochrome glyph reads
	// as a marking of the territory. A show with no glyph drawn yet keeps its pin
	// and shows by name alone, exactly as it does in those tables.
	//
	// The frame behind the glyph is filled with the region's colour, so a pin says
	// both what a region flies and in which colour it flies it.
	function buildMarkers(
		nodes: RegionNode[],
		geometry: RegionGeometry,
		relevant: Set<string> | null
	): MapMarker[] {
		const pins: MapMarker[] = [];
		for (const node of nodes) {
			if (!node.show) continue;
			const box = geometry.boxes.get(node.key);
			if (!box) continue;
			const [[south, west], [north, east]] = box;
			pins.push({
				id: node.key,
				position: [(south + north) / 2, (west + east) / 2],
				bounds: box,
				iconSvg: iconMarkup(showIconName(node.show.id)),
				frameClasses: node.color ? pinColorClasses[node.color] : null,
				title: node.show.name,
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

	// Selecting a region no longer repaints its polygons — with every tier stroke-only
	// there is nothing to fill — so the open selection reads from the map purely
	// through its framing (focusBounds) and its pins, which still fade outside it.
</script>

<div class="flex h-screen">
	<!-- The one panel pinned over the map, on four tabs — top-right on a wide viewport, a
		bottom sheet below `md` (30vh showing, its handle row toggling it up to the full
		screen). Same markup either way. The profile card sits
		at the very top, above the breadcrumbs, and the breadcrumbs above the tab strip
		rather than inside any tab: who you are and how many packs you have left is read
		against every view, as is the region the map is looking at (clicked, or followed
		from the zoom), so both stay on screen whichever tab is forward.
		— Location: the drill table for the open region — its siblings and its children —
		  or, for a leaf municipality with nothing left to list, that town's show and the
		  team sitting on it. The search box above it matches every location in the tree.
		— Latest: the towns players have most recently won off their sitting team, each
		  with the show its current leading team comes from. Read straight out of
		  `municipality_holders` (a row is only written when a town changes hands), so it
		  stays empty until the first town falls and refreshes after every settled fight.
		  Clicking a row drills the map into that town, exactly like a region row.
		— Leaderboard: how much of the map each show flies, tallied over every
		  municipality's current show — seeded, or the ruling team's where a town has been
		  taken.
		— Booster: a day's festa packs. Picked from the tab strip it lays every one of the
		  day's packs out on ClaimPackGrid's canvas (two to a row at this width) —
		  pick one to zoom it up and slice it open. Its header's arrows walk the calendar,
		  though only today's packs can actually be opened. Reached by clicking a town's
		  gold star instead, it skips straight to that town's pack on the single-pack
		  opener, already fitted and centred. -->
	<aside class={panelClasses} aria-label="Map panel">
		<!-- The sheet's handle row, mobile only: the whole row is the toggle between the
			30vh peek and the full screen, drawn as the grab bar the gesture would use. The
			panel animates the change itself (its height is transitioned), so this only has
			to flip the flag. -->
		<button
			type="button"
			class="flex flex-none items-center justify-center border-b border-base-300 py-2.5 md:hidden"
			aria-expanded={panelExpanded}
			aria-label={panelExpanded ? 'Collapse panel' : 'Expand panel'}
			on:click={() => (panelExpanded = !panelExpanded)}
		>
			<span class="h-1.5 w-10 rounded-full bg-base-content/30"></span>
		</button>

		<!-- On the mobile sheet this is the one scroller: the sections below keep their
			natural heights inside it (it is a plain block there, so their `flex-1` is
			inert) and the whole panel scrolls as one, which is the only thing that works
			when the header alone is taller than the collapsed 30vh. On the desktop panel it
			is `display: contents` — it draws no box at all, so its children go back to being
			the aside's own flex children and each tab keeps its own scroller. -->
		<div class="min-h-0 flex-1 overflow-y-auto md:contents">
			<!-- Its own section, on its own border: the account card belongs to the player,
				not to any of the tabs, and never changes as they are switched. Nothing but the
				border separates it — it draws no surface of its own — so the padding is the
				section's, and it is the breadcrumbs' below. -->
			<div class="flex-none border-b border-base-300 px-4 py-3">
				<AuthMenu embedded />

				{#if activeTeamCards.length > 0}
					<!-- The team this player fields, on the same card canvas a town's team is drawn
						on — so the side challenging and the side holding read alike. Under the
						account card because it is part of who the player is here, not part of any
						tab. The grid layout sizes the row to fill the width exactly: each card is
						as wide as its cell, at 1:1, never scaled down to fit a box. Its height is
						therefore the width's — one row of TEAM_SIZE cards at the canvas's 2:3
						portrait aspect comes to half the width, which is what aspect-[2/1] gives
						it, so the whole row is on screen with nothing to pan or clip. The player's
						own cards keep the canvas's default mirrored art, unlike a rival town's. -->
					<div class="mt-3 aspect-[2/1] w-full overflow-hidden rounded-box bg-base-200">
						<CardCanvas cards={activeTeamCards} columns={TEAM_SIZE} layout="grid" />
					</div>
				{/if}
			</div>

			<div class="flex flex-none flex-col gap-3 border-b border-base-300 px-4 py-3">
				<div class="breadcrumbs max-w-full py-0 text-sm">
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

				<!-- One column per tab, so the four split the panel's width evenly however long
					their labels are (Booster's grows a counter) instead of each being as wide as
					its own text. Still a join: `grid` only overrides its inline-flex display —
					the joined radii and collapsed borders come from child rules that hold in a
					grid just as well. -->
				<div class="join grid grid-cols-4">
					{#each panelTabs as tab (tab.id)}
						<!-- The tab that is forward is filled in the theme's primary; the rest stay
							outlined. btn-active only darkened the outline, which barely read as a
							selection at this size. -->
						<button
							type="button"
							class={classNames(
								'btn btn-sm join-item',
								panelTab === tab.id ? 'btn-primary' : 'btn-outline'
							)}
							aria-pressed={panelTab === tab.id}
							on:click={() => selectTab(tab.id)}
						>
							{tab.label}
						</button>
					{/each}
				</div>
			</div>

			{#if panelTab === PanelTab.Location}
				<div class="flex-none border-b border-base-300 px-4 py-3">
					<input
						type="search"
						class="input input-bordered input-sm w-full"
						placeholder="Search locations…"
						bind:value={searchQuery}
					/>
				</div>

				{#if normalizedQuery}
					<RegionSearchResults results={searchResults} onSelect={openSearchResult} />
				{:else if regionRows.length === 0}
					<!-- A leaf region (a municipality) has no children to drill into, so instead of
						an empty table we surface its own top show — the only place the open location's
						show appears — plus the town's deterministic house team on the shared card
						canvas (three cards rolled from the town's seed and its show's roster). -->
					<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
						{#if openShow}
							<div class="flex flex-none items-center gap-3">
								{#if openShow.posterUrl}
									<img
										src={openShow.posterUrl}
										alt={openShow.name}
										class="h-16 w-auto flex-none rounded shadow"
									/>
								{/if}
								<div class="min-w-0">
									<!-- A held town flies its ruling team's show, so the label says so
										rather than claiming it is the town's most-seen one. -->
									<p class="text-xs font-bold uppercase tracking-wide opacity-60">
										{openHolder ? 'Ruling show' : 'Most seen'}
									</p>
									<p class="truncate font-semibold">{openShow.name}</p>
								</div>
							</div>
						{:else}
							<p class="flex-none text-center opacity-60">No show here yet.</p>
						{/if}

						{#if municipalityTeamCards.length > 0}
							<!-- Whoever holds the town. Until a player beats it, that's the town's
								built-in, seed-rolled "OG" (original) roster — the same for every
								player, badged so it reads as the house team. Once somebody takes the
								town it's their frozen winning team instead, and it's their name on
								the badge. -->
							<div class="flex flex-none items-center gap-2">
								{#if openHolder}
									<span class="badge badge-secondary badge-sm font-bold">HOLD</span>
									<span class="truncate text-xs font-bold uppercase tracking-wide opacity-60">
										{openHolder.holderName}
									</span>
								{:else}
									<span class="badge badge-primary badge-sm font-bold">OG</span>
									<span class="text-xs font-bold uppercase tracking-wide opacity-60">Team</span>
								{/if}
								{#if holdsOpenTown}
									<span class="badge badge-success badge-sm ml-auto">Yours</span>
								{:else}
									<!-- The same siege counter the two tables carry, for the one town the
										panel is down to: wins banked over wins needed. It reads exactly as
										the column a drill row shows for this municipality, so opening a
										town never restates the figure in different terms. -->
									<span
										class="ml-auto flex flex-none items-center gap-1.5 text-xs tabular-nums"
										title="Your wins banked / wins needed to take the town"
									>
										<span class="font-bold uppercase tracking-wide opacity-60">Siege</span>
										<span class={siegeProgress.wins > 0 ? 'font-semibold' : 'opacity-70'}>
											{siegeProgress.wins}/{siegeProgress.required}
										</span>
									</span>
									<!-- One challenge per town per day: once today's has been spent the
										button gives way to the time left until Catalan midnight, which is
										when the town can be fought again. The server enforces the limit
										either way (`start_challenge`); when the countdown runs out the
										day's challenges are re-read and the button comes back. -->
									{#if challengedOpenTown}
										<Countdown
											until={challengeUnlocksAt}
											title="Already challenged today — the next one unlocks at midnight"
											classes="badge badge-ghost badge-sm flex-none font-semibold"
											on:elapsed={() => void reloadChallenges()}
										/>
									{:else}
										<button
											type="button"
											class="btn btn-primary btn-xs flex-none"
											disabled={challengeStarting}
											title="Fight this town for its team"
											on:click={challenge}
										>
											Challenge
										</button>
									{/if}
								{/if}
							</div>
							<!-- Sized like the player's own team strip above it: one row of TEAM_SIZE
								cards at the canvas's 2:3 portrait aspect is half the width tall, which is
								what aspect-[2/1] gives it. It takes that and no more — stretching it down
								the rest of the panel only drew the same row over a taller field of empty
								board. -->
							<div class="relative aspect-[2/1] w-full flex-none overflow-hidden rounded-box bg-base-200">
								<!-- The town's team is a rival team, so its cards use the board's rival
									variant (unmirrored art), matching the rival's hand cards on the game
									canvas. -->
								<CardCanvas
									cards={municipalityTeamCards}
									columns={TEAM_SIZE}
									layout="grid"
									pannable
									flipped={false}
								/>
							</div>
						{/if}
					</div>
				{:else}
					<RegionTable rows={regionRows} onSelect={select} />
				{/if}
			{:else if panelTab === PanelTab.Latest}
				<TerritoryTable rows={recentWins} onSelect={openWin} />
			{:else if panelTab === PanelTab.Leaderboard}
				<ShowStandingsTable rows={showStandings} />
			{:else}
				<!-- Two ways in, one tab: a star click narrows it to that town's pack on the
					single-pack opener, while picking the tab itself shows the whole day's packs
					on the shared ClaimPackGrid canvas — two to a row here, since the
					panel is a third of the viewport's width. Either way the pack is sliced open in
					place; "Tots els sobres" goes back to the grid. -->
				<!-- The one tab that has to be told a height on the mobile sheet: its packs are a
					WebGL scene that draws into whatever box it is handed, and inside the sheet's
					scroller there is no leftover space to hand it. 60vh is enough of a stage to
					pick and slice a pack on, and the sheet scrolls to it when collapsed. -->
				<div class="flex min-h-0 flex-1 flex-col max-md:min-h-[60vh]">
					<!-- The day being browsed: an arrow at each end of the row and the date in the
						middle, where it doubles as the toggle for the month calendar. Only today's
						packs open; any other day's grid is mounted read-only and drawn in black and
						white, so it reads as a look-ahead (or look-back) at what that day holds. -->
					<div class="flex flex-none items-center gap-2 border-b border-base-300 px-4 py-2">
						<button
							type="button"
							class="btn btn-ghost btn-xs flex-none"
							on:click={() => stepPackDate(-1)}
							aria-label="Dia anterior"
						>
							‹
						</button>
						<button
							type="button"
							class="btn btn-ghost btn-xs min-w-0 flex-1"
							on:click={toggleCalendar}
							aria-expanded={calendarOpen}
						>
							<span class="truncate text-sm font-bold first-letter:uppercase">{packDateLabel}</span>
						</button>
						<button
							type="button"
							class="btn btn-ghost btn-xs flex-none"
							on:click={() => stepPackDate(1)}
							aria-label="Dia següent"
						>
							›
						</button>
					</div>

					<!-- Why the last roll revealed nothing. `claim_booster` refuses for reasons the
						player can act on (the allowance is spent, the town isn't de festa today), and
						the panel that normally reports them is mounted hidden here — so a pack sliced
						open onto an empty canvas would say nothing at all without this. -->
					{#if isPackToday && claimError}
						<div class="alert alert-error mx-3 mt-3 flex-none py-2 text-xs" role="alert">
							<span>{claimError}</span>
						</div>
					{:else if isPackToday && lastRevealed === 0}
						<!-- The pack opened and the roll came back with nothing, without an error to
							go with it. Rare, but it must not read as a blank canvas. -->
						<div class="alert alert-warning mx-3 mt-3 flex-none py-2 text-xs" role="alert">
							<span>El sobre s'ha obert però no n'ha sortit cap carta.</span>
						</div>
					{:else if isPackToday && allowanceSpent}
						<div class="alert alert-warning mx-3 mt-3 flex-none py-2 text-xs">
							<span>Ja has obert tots els sobres d'avui. Se'n desbloquegen més a mitjanit.</span>
						</div>
					{/if}

					<div class="relative min-h-0 flex-1 p-3">
						<!-- The calendar lives over the pack canvas rather than above it, sliding down
							from the date row and back up again — so opening it never re-sizes the
							canvas underneath (a resized WebGL grid would have to re-lay itself out). -->
						{#if calendarOpen}
							<div class="absolute inset-x-3 top-3 z-10" transition:slide={{ duration: 200 }}>
								<PackDateCalendar
									month={calendarMonth}
									value={packDate}
									today={todayIso}
									counts={calendarCounts}
									loading={loadingCountsMonth === calendarMonth}
									classes="shadow-xl"
									on:month={(event) => (calendarMonth = event.detail)}
									on:select={(event) => pickPackDate(event.detail)}
								/>
							</div>
						{/if}

						{#if packTownId}
							<!-- Keyed on the town so clicking another star remounts a fresh, unsliced
								pack rather than reusing the last one's scene. -->
							{#if packForTown}
								{#key packForTown.id}
									<ClaimPackOpener
										coverUrl={packForTown.coverUrl}
										locationName={packForTown.locationName}
										claim={packForTown.claim}
										onOpenComplete={onPackOpened}
										classes="rounded-md bg-gradient-to-b from-base-300/80 to-base-200"
									/>
								{/key}
							{:else}
								<div class="flex h-full items-center justify-center rounded-md bg-base-200 p-6 text-center">
									<p class="max-w-xs text-sm opacity-60">
										Aquest municipi encara no té cap sobre per obrir. Inicia sessió i torna-ho a provar.
									</p>
								</div>
							{/if}
						{:else if loadingDate === packDate}
							<div class="flex h-full items-center justify-center rounded-md bg-base-200">
								<span class="loading loading-spinner loading-lg text-primary"></span>
							</div>
						{:else if dayPacks.length}
							<!-- Two packs to a row at this width, and an opened one unfolds its cards
								into two columns as well — the panel is far too narrow for the claim
								page's three. Keyed on the day too, so stepping the date rebuilds the
								grid from that day's packs. -->
							{#key `${packDate}:${packsKey}:${gridSession}`}
								<ClaimPackGrid
									packs={dayPacks}
									columns={2}
									revealColumns={2}
									interactive={isPackToday && !allowanceSpent}
									classes={classNames('rounded-md bg-gradient-to-b from-base-300/80 to-base-200', {
										'grayscale': !isPackToday,
										'opacity-50': allowanceSpent
									})}
									on:select={(event) => {
										clearPackFeedback();
										gridPack = event.detail;
									}}
									on:openComplete={(event) => onPackOpened(event.detail)}
								/>
							{/key}
						{:else}
							<div class="flex h-full items-center justify-center rounded-md bg-base-200 p-6 text-center">
								<p class="max-w-xs text-sm opacity-60">
									{#if isPackToday}
										Ara mateix no hi ha cap sobre per obrir. Inicia sessió i clica una estrella daurada
										del mapa.
									{:else}
										Cap municipi no celebra la festa major aquest dia.
									{/if}
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</aside>

	<!-- The map keeps the full width at all times. The tabbed panel floats over its right
		edge (a fixed z-[900] aside, like the pinned auth menu) rather than reserving space
		here, so drilling into a region or opening a pack never re-frames or re-projects the
		map — the view stays exactly where it was and clicking another star or another tab
		just switches the panel's contents. -->
	<div class="relative flex min-w-0 flex-1 flex-col">
		{#if ready}
			<WorldMap
				center={[41.8, 1.7]}
				zoom={8}
				minZoom={7}
				{overlays}
				{markerLevels}
				stars={festaStars}
				{hiddenLineUrls}
				{focusBounds}
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

</div>

<!-- Hidden, but mounted: the claim panel, kept alive only
	to compute today's booster packs (bind:packs) so a star click can open the town's
	pack instantly. Its own UI is never shown here — but the two things it says that the
	panel cannot do without are bound out of it: the daily allowance, and the reason a
	roll was refused. Without those a spent allowance (or any other `claim_booster`
	refusal) reads as a pack that opens onto nothing at all. -->
<div class="hidden" aria-hidden="true">
	<CharacterClaimPanel bind:packs={claimPacks} bind:claimError bind:boosters />
</div>

<!-- Challenge → the board's combat arena, hosted as a full-viewport floating panel over
	the map so a fight for a town plays out without ever navigating away. This is the
	only place combat is mounted — there is no standalone combat route any more. A plain
	fixed panel (not a DaisyUI modal) at z-[1200] — above the map's panel (z-[900]) and
	above the modal layer (999) — over a 30%-white wash so the map still reads through
	behind it.
	CombatArena fields the player's active roster team against the town's sitting team
	(its holder's, or the seeded OG one) and handles all its own gating; the town id and
	the turnover it was on ride along so a win is reported against the right generation.
	Keyed so each new challenge remounts a clean fight. -->
{#if fightOpen}
	<div class="fixed inset-0 z-[1200] flex items-center justify-center overflow-auto bg-white/30 p-4">
		<!-- Keyed on the town and the generation as well as the line-up: challenging a
			different town whose sitting team happens to field the same characters is
			still a different fight, and must remount rather than reuse the last one. -->
		{#key `${fightLocationId}:${fightTurnover}:${fightSpawns.map((spawn) => spawn.characterId).join(',')}`}
			<CombatArena
				ogTeam={fightSpawns}
				ogName={fightName}
				ogLocationId={fightLocationId}
				ogTurnover={fightTurnover}
				ogHolderName={fightHolderName}
				closable
				on:territory={(event) => onTerritory(event.detail)}
				on:close={() => (fightOpen = false)}
			/>
		{/key}
	</div>
{/if}

<!-- The roster, over the map. Mounted only while it is open — it builds a card canvas
	of its own, and every mount is a fresh WebGL context the browser hands out a limited
	number of. Opened from the Roster button on the panel's account card, beside Profile,
	and from the arena's "no active team" card, both through `rosterModalOpen`. -->
{#if $rosterModalOpen}
	<RosterModal />
{/if}
