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
	import { battleService } from '$services/battle.service';
	import { territoryAdapter } from '$adapters/classes/territory.adapter';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { ULTRAMAR, ULTRAMAR_ID } from '$types/location.type';
	import type {
		MunicipalityChallenge,
		MunicipalityHolder,
		MunicipalitySiege
	} from '$types/territory.type';
	import type { TerritoryResult } from '$types/combat.type';
	import { TEAM_SIZE, teamService } from '$services/team.service';
	import { buildMunicipalityTeam, ogTeamSpawns } from '$utils/spawn/municipality-team';
	import { SPAWN_COLOR_CSS } from '$utils/spawn/color';
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
	// The municipality whose festa pack the side panel's Booster tab shows, or
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

		// And the fight this player is already in, if any — which opens the arena on
		// top of the map they have just landed on. A battle is not this tab's, so it is
		// waiting here however they left it and wherever they left it.
		await reloadBattle();
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

	// The fight this player is already in, if any. A battle outlives the arena, the
	// page and the device it was started on, so it is loaded like any other ledger and
	// the map offers the way back into it instead of a new fight.
	const openBattle = battleService.open;

	async function reloadBattle(): Promise<void> {
		try {
			await battleService.load();
		} catch {
			battleService.clear();
		}
	}

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

	// The arena is gone. Re-read the day's challenges, because the fight that just
	// closed may no longer have cost anything: a town taken by somebody else while
	// this fight was open hands the day back (the slot is voided server-side), and
	// that applies to a fight walked away from as much as to a reported one — which
	// is a fight `on:territory` never hears about.
	function onFightClosed(): void {
		fightOpen = false;
		void reloadChallenges();
	}

	// Bring the player back to their open battle the moment the map knows about one —
	// on load, and again after signing in. Closing the arena is not leaving the fight,
	// so this deliberately fires once per battle: it puts them back in front of it, and
	// the Challenge button is what walks back in after that.
	let resumedBattle: string | null = null;
	$: if ($openBattle && $openBattle.startedAt !== resumedBattle) {
		resumedBattle = $openBattle.startedAt;
		resumeBattle();
	}
	$: if (!$openBattle) resumedBattle = null;

	// The panel's three views: the open region (the drill table, or a leaf town's show
	// and house team), the standing of every show across the whole map, and the booster
	// pack of whichever festa town's star was clicked last. Every one of them lives here
	// rather than in a panel of its own, so the map only ever gives up room to one of
	// them — the breadcrumbs above the strip stay put across all three, since they name
	// what the map is looking at whichever view is forward.
	const PanelTab = {
		Location: 'location',
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

	// Sieges and today's spent challenges are both RLS-scoped to the reader, so the
	// sets loaded before sign-in are nobody's. Reload whenever the signed-in account
	// changes (including signing out, which empties them). `$profile` is named
	// directly so the statement tracks it.
	// The open battle is the same: it belongs to an account, not to a page, so signing
	// in is what reveals the fight already waiting — and signing out puts it away.
	let siegesForUser: string | null = null;
	$: if (ready && ($profile ? String($profile.id) : null) !== siegesForUser) {
		siegesForUser = $profile ? String($profile.id) : null;
		void territoryService
			.loadSieges()
			.then((loaded) => (sieges = loaded))
			.catch(() => (sieges = new Map()));
		void reloadChallenges();
		if (siegesForUser) void reloadBattle();
		else battleService.clear();
	}

	// The colour every division line is drawn in, at every tier. White, and
	// deliberately not the red the whole map used to be drawn in nor the colour of
	// the region it encloses: red is one of the six colours a region can fly now, so
	// a coloured border would read as a claim of its own. Colour is the wash's to
	// say; the lines only say where one region stops and the next begins, and white
	// tells that over any of the six and over the satellite alike.
	const lineColor = '#fff';

	// Coarse → fine rank of each division tier. Shared by the overlays below (which
	// tier carries the wash) and the border logic further down (which tiers keep
	// their lines), so both read the hierarchy off one list.
	const tierRank: Record<RegionType, number> = {
		Territory: 0,
		Province: 1,
		Comarca: 2,
		Municipality: 3
	};

	// Every region's colour, keyed the way its own polygons name themselves so a
	// feature can be looked up straight from the layer it arrives in: a municipality
	// by its feature id, and every grouping by its NAME — the geo layers carry codes
	// of their own (`AT08`, `IT_alguer`) that the tree's slugged ids don't match,
	// while comarca, province and territory names are each unique across the map.
	type RegionColors = Record<RegionType, Map<string, SpawnColor>>;

	function buildRegionColors(nodes: RegionNode[]): RegionColors {
		const colors: RegionColors = {
			Territory: new Map(),
			Province: new Map(),
			Comarca: new Map(),
			Municipality: new Map()
		};
		const walk = (node: RegionNode) => {
			if (node.color) {
				colors[node.type].set(node.type === 'Municipality' ? node.key : node.name, node.color);
			}
			for (const child of node.children) walk(child);
		};
		for (const node of nodes) walk(node);
		return colors;
	}

	$: regionColors = buildRegionColors(regionNodes);

	// The colour a polygon of `tier` flies, or null when its region has none (its
	// show's roster hasn't landed, or the town has no show at all) — such a shape
	// keeps its white outline and simply goes unwashed, leaving the satellite bare
	// there. A province polygon also answers from its territory: the tree drops the
	// province tier where a territory holds a single one (Illes Balears, Catalunya
	// Nord, Andorra, l'Alguer), and there the province polygon IS the territory.
	function featureColor(
		tier: RegionType,
		feature: GeoJSON.Feature | undefined,
		colors: RegionColors
	): SpawnColor | null {
		const props = feature?.properties;
		if (!props) return null;
		const key = tier === 'Municipality' ? String(props.id ?? '') : String(props.name ?? '');
		const own = colors[tier].get(key);
		if (own) return own;
		if (tier === 'Province' && props.territory) {
			return colors.Territory.get(String(props.territory)) ?? null;
		}
		return null;
	}

	// One tier's paint: a solid white line of this tier's weight, plus — on the tier
	// the map is imaging — a wash of the region's own colour at 90% across the shape.
	// Only that one tier washes: the layers stack coarsest-on-top, so a territory
	// filling too would bury every division under it, and the imaged tier is exactly
	// the one whose pins are on screen, so the polygons say in colour what the pins
	// over them already say.
	function tierStyle(tier: RegionType, weight: number, colors: RegionColors, imaged: number) {
		return (feature?: GeoJSON.Feature) => {
			const color = featureColor(tier, feature, colors);
			const washes = color != null && tierRank[tier] === imaged;
			return {
				color: lineColor,
				weight,
				opacity: 1,
				fill: washes,
				fillColor: washes ? SPAWN_COLOR_CSS[color!] : lineColor,
				fillOpacity: 0.9
			};
		};
	}

	// Països Catalans polygons, built by @3xl/data's generate:geo from the
	// Eurostat LAU set (WGS84) and served from that package's public/ at /data.
	// Drawn bottom-up: municipalities, comarques, províncies, territoris — so the
	// coarser a division, the higher its line sits over the finer ones inside it,
	// and the thicker that line is drawn.
	//
	// Every tier draws its borders in white, and the tier the map is imaging also
	// washes each of its shapes in the colour that region's pin flies — so a region
	// is coloured on the map exactly as it is on its pin. Every other tier is
	// line-only, so the satellite basemap keeps reading through them, and
	// `hiddenLineUrls` still drops the lines of the tiers finer than the imaged one.
	// All decorative: the wash is not something to click or hover, so no layer
	// captures pointer events and the pins and stars own every click.
	//
	// Rebuilt (a fresh array) whenever a region changes colour or the map images
	// another tier — that is what repaints the layers, which are fetched only once.
	$: overlays = [
		{
			url: '/data/geo/municipis.json',
			style: tierStyle('Municipality', 1, regionColors, hiddenRank),
			interactive: false
		},
		{
			url: '/data/geo/comarques.json',
			style: tierStyle('Comarca', 1.5, regionColors, hiddenRank),
			interactive: false
		},
		{
			url: '/data/geo/provincies.json',
			style: tierStyle('Province', 2, regionColors, hiddenRank),
			interactive: false
		},
		{
			url: '/data/geo/territoris.json',
			style: tierStyle('Territory', 3, regionColors, hiddenRank),
			interactive: false
		}
	] satisfies MapOverlay[];

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
	// Catalan day. The server is what enforces it (`start_battle`); this only
	// closes the button so the fight isn't opened onto a refusal. A challenge the
	// server has handed back — the town was taken by somebody else while the fight
	// was open — is not in the loaded set at all, so the town reads as unfought.
	$: challengedOpenTown = !!openRegion && challenges.has(openRegion);

	// A player already in a fight is not offered another one, on this town or any
	// other: the button becomes the way back into the one they are in. The rule is the
	// server's (`start_battle` refuses a second battle); this is only what the button
	// says about it.
	$: inBattle = !!$openBattle;

	// And when it opens up again: the next Catalan midnight, which is the boundary
	// `start_battle` measures the day against. Recomputed as the panel moves to
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
	// plus everything the fight has to be reported against — the town's id and the
	// turnover generation it was on — all frozen at click time. Null when the modal is
	// closed. The player's own active team is the other side, fielded by CombatArena —
	// combat happens right here over the map, never navigating away.
	let fightSpawns: CharacterSpawn[] = [];
	let fightLocationId: string | null = null;
	let fightTurnover = 0;
	let fightOpen = false;

	// True while the day's challenge is being claimed off the server, so a double
	// click can't fire two `start_battle` calls (the second of which the server
	// would refuse anyway).
	let challengeStarting = false;

	// --- The panel's mobile shape ------------------------------------------------
	// Narrow viewports have no room for a 36rem column beside the map, so below `md` the
	// same panel docks under it instead: 30vh of it showing, with the handle row at its
	// top toggling it up to the full screen and back. Both states are plain heights on
	// the one element, so the CSS height transition slides its top edge up and down — no
	// second panel, no remount, nothing in the tabs (breadcrumbs, search, a half-sliced
	// pack) resets on the way. The map takes whatever height is left, so growing the
	// panel shrinks the map rather than covering it.
	let panelExpanded = false;

	// The single panel holding all three views, a sibling of the map rather than a layer
	// over it: it takes its own 36rem of the row (its own 30vh of the column on mobile)
	// and the map gets the rest. Nothing of the map is ever hidden behind it, which is
	// why it needs no z-index of its own, no shadow lifting it off anything, and no
	// see-through surface — with no map underneath there is nothing left to read
	// through, so the base surface is opaque at both mobile heights.
	//
	// It is flush against the viewport edges it docks to, so it carries no radius: the
	// only line it draws is the one separating it from the map — a left border in the
	// desktop row, a top border in the mobile column.
	//
	// One height for every tab: the account card and the full-width team strip above the
	// tab strip take a fixed slice of the panel before a tab draws anything, so whatever
	// the header does not use goes to the tab, which is the only part that scrolls. The
	// column is as tall as the row, since a panel hugging its content would leave the
	// rest of its own column as bare background beside the map.
	$: panelClasses = classNames(
		'flex flex-none flex-col overflow-hidden bg-base-100',
		'border-base-300',
		'transition-[height] duration-300 ease-in-out',
		// Mobile: the full-width strip under the map, on the bottom edge. Its height is
		// the toggle — the handle row swaps the peek for the whole screen, which squeezes
		// the map above it down to nothing rather than covering it.
		'w-full border-t',
		panelExpanded ? 'h-screen' : 'h-[30vh]',
		// md and up: the right-hand column of the row, at the width it has always had —
		// full height, since it is the row that bounds it now.
		'md:h-full md:w-[36rem] md:border-t-0 md:border-l'
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
		// A player in a fight is offered the way back into it, never a second one.
		if ($openBattle) {
			resumeBattle();
			return;
		}
		if (municipalityTeam.length === 0 || holdsOpenTown || challengedOpenTown) return;
		if (challengeStarting) return;
		const townId = openRegion;
		if (!townId) return;

		const rivals = municipalityTeam;
		// The generation being fought, so a win landing after somebody else took the
		// town is recognised as having beaten a team that no longer holds it. It is
		// recorded server-side with the battle, not carried to the report.
		const turnover = siegeProgress.turnover;

		if ($profile) {
			challengeStarting = true;
			try {
				// Opens the battle and spends the day's challenge in one transaction, and
				// freezes the team being fought — so the fight survives the town changing
				// hands, and cannot be walked away from for a fresh one.
				const challengeSlot = await battleService.start(townId, turnover, rivals);
				if (challengeSlot) territoryService.noteChallenge(challengeSlot);
			} catch {
				// Refused: already fought today, already in a battle, or the town is the
				// player's own. Re-read both ledgers so the button tells the truth.
				await reloadChallenges();
				await reloadBattle();
				return;
			} finally {
				challengeStarting = false;
			}
			// The panel may have moved on while the RPC was in flight; the battle belongs
			// to the town that was clicked, so only that town's fight may open.
			if (openRegion !== townId) return;
		}

		fightSpawns = ogTeamSpawns(rivals, townId);
		fightLocationId = townId;
		fightTurnover = turnover;
		fightOpen = true;
	}

	// Put the player back into the fight they are already in. The rival line-up was
	// frozen when the battle opened, so it is fielded from there rather than rolled off
	// the town again — the fight goes on being against the three that were sitting
	// there, whoever holds the town now.
	function resumeBattle(): void {
		const battle = $openBattle;
		if (!battle) return;
		fightSpawns = ogTeamSpawns(battle.rivals, battle.locationId);
		fightLocationId = battle.locationId;
		fightTurnover = battle.turnover;
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

	// The line overlays that subdivide a region, each with its own tier rank. The
	// territory outline (rank 0) is never hidden, so it isn't listed.
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

	// The rank of the tier on screen — the one whose polygons carry the colour wash
	// (see the overlays) and the finest one to keep its borders. Keyed off the ZOOM
	// focus (`effectiveSelected`), never the frozen click, so the paint stays in
	// lockstep with the pins: both advance a tier together as the map zooms in, and
	// coarsen together as it zooms out — a clicked region no longer pins its border
	// tier while the zoom marches on past it.
	$: hiddenRank = imagedRank(effectiveSelected, regionNodes);

	// Hide the stroke of every line overlay finer than that tier, so only the tier on
	// screen (and everything coarser) keeps its borders — the finer divisions inside
	// would just clutter the pinned regions.
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
	// Clicking a star loads that town's festa booster pack into the side panel and
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

	// Selecting a region doesn't repaint its polygons — a shape's colour says which
	// region it belongs to, not which one is open — so the open selection reads from
	// the map purely through its framing (focusBounds) and its pins, which still fade
	// outside it.
</script>

<!-- The map and its panel split the viewport between them — the panel is never over the
	map. Both orders are the reverse of the markup's, which puts the panel first for
	reading order and second on screen: the right-hand column of the row on a wide
	viewport, the strip under the map on a narrow one. -->
<div class="flex h-screen flex-col-reverse md:flex-row-reverse">
	<!-- The one panel beside the map, on three tabs — the right-hand column on a wide
		viewport, docked under the map below `md` (30vh showing, its handle row toggling it
		up to the full screen). Same markup either way. The profile card sits
		at the very top, above the breadcrumbs, and the breadcrumbs above the tab strip
		rather than inside any tab: who you are and how many packs you have left is read
		against every view, as is the region the map is looking at (clicked, or followed
		from the zoom), so both stay on screen whichever tab is forward.
		— Location: the drill table for the open region — its siblings and its children —
		  or, for a leaf municipality with nothing left to list, that town's show and the
		  team sitting on it. The search box above it matches every location in the tree.
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
		<!-- The panel's handle row, mobile only: the whole row is the toggle between the
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

		<!-- On the mobile panel this is the one scroller: the sections below keep their
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
									<!-- A fight already in progress takes the button over, whichever town
										the panel is on: there is only ever one battle, and this is the way
										back into it rather than the way into another.

										Otherwise: one challenge per town per day, and once today's has
										been spent the button gives way to the time left until Catalan
										midnight, which is when the town can be fought again. The server
										enforces both limits either way (`start_battle`); when the countdown
										runs out the day's challenges are re-read and the button comes
										back. -->
									{#if inBattle}
										<button
											type="button"
											class="btn btn-primary btn-xs flex-none"
											title="You have a battle in progress — go back to it"
											on:click={resumeBattle}
										>
											Resume battle
										</button>
									{:else if challengedOpenTown}
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
			{:else if panelTab === PanelTab.Leaderboard}
				<ShowStandingsTable rows={showStandings} />
			{:else}
				<!-- Two ways in, one tab: a star click narrows it to that town's pack on the
					single-pack opener, while picking the tab itself shows the whole day's packs
					on the shared ClaimPackGrid canvas — two to a row here, since the
					panel is a third of the viewport's width. Either way the pack is sliced open in
					place; "Tots els sobres" goes back to the grid. -->
				<!-- The one tab that has to be told a height on the mobile panel: its packs are a
					WebGL scene that draws into whatever box it is handed, and inside that panel's
					one scroller there is no leftover space to hand it. 60vh is enough of a stage to
					pick and slice a pack on, and the panel scrolls to it when collapsed. -->
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

	<!-- The map takes whatever the panel leaves — the rest of the row on a wide viewport,
		the rest of the column on a narrow one. Switching tabs or drilling into a region
		doesn't change that share, so the view still stays exactly where it was; only
		toggling the mobile panel between its two heights re-frames the map, which is the
		point of the toggle. -->
	<div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
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
	fixed panel (not a DaisyUI modal) at z-[1200] — above the modal layer (999), and so
	above everything on the page, the map and its side panel included — over a 30%-white
	wash so what it covers still reads through behind it.
	CombatArena fields the team the battle is being fought with against the line-up it
	was opened against, and handles all its own gating. Only the town rides along, to
	key and label the fight: which town a battle is over and which generation of its
	team it is against are the server's record, kept on the battle itself, so the fight
	that is reported is the fight that was opened.
	Keyed so each new challenge remounts a clean fight. -->
{#if fightOpen}
	<div class="fixed inset-0 z-[1200] flex items-center justify-center overflow-auto bg-white/30 p-4">
		<!-- Keyed on the town and the generation as well as the line-up: challenging a
			different town whose sitting team happens to field the same characters is
			still a different fight, and must remount rather than reuse the last one. -->
		{#key `${fightLocationId}:${fightTurnover}:${fightSpawns.map((spawn) => spawn.characterId).join(',')}`}
			<CombatArena
				ogTeam={fightSpawns}
				ogLocationId={fightLocationId}
				closable
				on:territory={(event) => onTerritory(event.detail)}
				on:close={onFightClosed}
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
