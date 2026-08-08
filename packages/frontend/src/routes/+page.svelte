<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { _ } from 'svelte-i18n';
	import { blur } from 'svelte/transition';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { characters } from '@3xl/data';
	import SignInButton from '$components/core/SignInButton.svelte';
	import PlayerPanel from '$components/core/PlayerPanel.svelte';
	import WorldMap from '$components/core/WorldMap.svelte';
	import MapBreadcrumbs from '$components/core/MapBreadcrumbs.svelte';
	import RegionCurrentBadge from '$components/core/RegionCurrentBadge.svelte';
	import RegionLocationList from '$components/core/RegionLocationList.svelte';
	import RegionSubdivisions from '$components/core/RegionSubdivisions.svelte';
	import SocialLinks from '$components/core/SocialLinks.svelte';
	import SplashScreen from '$components/core/SplashScreen.svelte';
	import TownPin from '$components/core/TownPin.svelte';
	import TownChallenge from '$components/core/TownChallenge.svelte';
	import CharacterClaimPanel from '$components/core/CharacterClaimPanel.svelte';
	import TeamLineup from '$components/core/TeamLineup.svelte';
	import CombatArena from '$components/core/CombatArena.svelte';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import RosterModal from '$components/core/RosterModal.svelte';
	import CollectionModal from '$components/core/CollectionModal.svelte';
	import LeaderboardModal from '$components/core/LeaderboardModal.svelte';
	import FaqModal from '$components/core/FaqModal.svelte';
	import CreditsModal from '$components/core/CreditsModal.svelte';
	import BoosterModal from '$components/core/BoosterModal.svelte';
	import { rosterModalOpen } from '$services/rosterModal';
	import { collectionModalOpen } from '$services/collectionModal';
	import { settingsModalOpen } from '$services/settingsModal';
	import { openSignIn } from '$services/signInModal';
	import { avatarPickerOpen } from '$services/avatarPicker';
	import { leaderboardModalOpen } from '$services/leaderboardModal';
	import { faqModalOpen, openFaq } from '$services/faqModal';
	import { creditsModalOpen, openCredits } from '$services/creditsModal';
	import { boosterModalOpen } from '$services/boosterModal';
	import { fullScreenModalOpen } from '$services/fullScreenModal';
	import type { OpenerPack } from '$components/core/pack/scene/opener-view.type';
	import { preloadPackArt } from '$components/core/pack/scene/preload-pack-art';
	import { spawnService } from '$services/spawn.service';
	import { musicService } from '$services/music.service';
	import { authService } from '$services/auth.service';
	import { territoryService } from '$services/territory.service';
	import { battleService } from '$services/battle.service';
	import { territoryAdapter } from '$adapters/classes/territory.adapter';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { ULTRAMAR, ULTRAMAR_ID } from '$types/location.type';
	import {
		challengeAvailableAt,
		challengeCoolingDown,
		type MunicipalityChallenge,
		type MunicipalityHolder,
		type MunicipalitySiege
	} from '$types/territory.type';
	import type { TerritoryResult } from '$types/combat.type';
	import type { OpenBattle } from '$types/battle.type';
	import { AuthStatus, type Profile } from '$types/profile.type';
	import { TEAM_SIZE, teamService } from '$services/team.service';
	import {
		buildMunicipalityTeam,
		ogTeamSpawns,
		type TeamMemberRoll
	} from '$utils/spawn/municipality-team';
	import { REGION_COLOR_CSS } from '$utils/color/region-color';
	import { coordinateSeed, seededShowId, seededShowPool } from '$utils/geo/municipality-show';
	import { teamShowId, showIdsByCharacter, holderShowIds } from '$utils/spawn/team-show';
	import { teamLineupMembers } from '$utils/spawn/team-lineup';
	import { showPosterUrl, showPosterUrlForSeed } from '$utils/geo/municipality-show';
	import { showLogoUrl } from '$utils/show/show-logo';
	import { forShow } from '$utils/show/show-icon';
	import { showGlyphs } from '$services/shows.service';
	import { SpawnColor, type CharacterSpawn } from '$types/character-spawn.type';
	import { ArtificialColor, type RegionColor } from '$types/region-color.type';
	import { REGION_PANEL_CLASSES } from '$components/core/spawn-colors';
	import {
		buildRegionTree,
		buildFillIndex,
		buildRegionNodes,
		flattenRegionNodes,
		everyTownPlurality,
		nodePath,
		regionLevelNodes,
		municipalityIdsForKey,
		type FillLevel,
		type RegionNode,
		type RegionShow,
		type RegionType
	} from '$utils/geo/region-tree';
	import { buildRegionSieges, type RegionSiege } from '$utils/geo/region-siege';
	import { boundsForFeatures, boundsByFeatureId, type LatLngBounds } from '$utils/geo/bounds';
	import { nearestUnclaimedBox } from '$utils/geo/nearest-box';
	import {
		centroidsByFeatureId,
		combineCentroids,
		interiorPoint,
		type Centroid,
		type LatLng,
		type RegionShape
	} from '$utils/geo/center';
	import { buildShowStandings } from '$utils/geo/show-standings';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import foldText from '$utils/string/fold-text';
	import { boosterWindow } from '$utils/festes/booster-window';
	import type {
		MapBoosterBox,
		MapChallenge,
		MapMarker,
		MapOverlay,
		TownPlateCard
	} from '$types/map.type';
	import type { ShowEntry, ShowsCollection } from '$types/show.type';
	import { festesService, catalanTodayIso } from '$services/festes.service';
	import type { FestaWindowRow } from '$types/festivity.type';
	import { boxForFesta, claimedBoxKey, festaYear } from '$utils/spawn/claimed-box';

	/** svelte-i18n's message formatter, read off the store whose value it is. */
	type Translate = typeof _ extends Readable<infer T> ? T : never;

	// The municipality polygons, feeding the region tree and the map framing — and,
	// through each polygon's own GPS seed, the show every town flies (see
	// `buildTownShows`).
	let municipalities: GeoJSON.FeatureCollection | null = null;
	// Held until the fetches settle so the map renders against the loaded data.
	let ready = false;
	// The municipalities the map stands a booster box on, read from Supabase — the
	// `festivities` fetch, in the two reads the boxes are printed from: every town the
	// booster window reaches (three days back through four ahead), and today's alone. A
	// town in both is de festa now and gets the white card; a town only in the window has
	// a day that is past or still coming and gets the black one, exactly as the Booster
	// tab prints that town's box. Each town's `id` matches a municipality feature id, so
	// it resolves to a polygon on the map.
	let windowFestes: FestaWindowRow[] = [];
	let todayFesteIds = new Set<string>();
	// Every box this reader has already taken, as (town, year, stock) keys. The claim
	// panel below loads them; this page reads the same store, so the boxes on the map and
	// the boxes on the sheet are spent together.
	const claimedBoxes = spawnService.claimedBoxes;
	// Every booster pack in the window (three days back through four ahead), computed by
	// a hidden CharacterClaimPanel, which turns those festes + the player's shows into
	// openable packs. Kept here so clicking a box opens that town's pack at once,
	// with no extra loading. Empty when signed out or before the show pool loads.
	let claimPacks: OpenerPack[] = [];
	// The municipality whose festa pack the side panel's Booster tab shows, or
	// null when no box has been clicked yet.
	let packTownId: string | null = null;
	// Live map zoom, kept in sync by WorldMap and shown in the top-left panel.
	let currentZoom = 8;
	// The tier of pins WorldMap is currently drawing (0 = coarsest), reported back
	// as the map zooms. Drives the effective breakdown the sidebar and polygons show.
	let activeLevel = 0;
	// The map centre WorldMap reports, used to tell which region the view is
	// focused on so the sidebar and polygons follow what's zoomed into.
	let currentCenter: [number, number] = [41.8, 1.7];
	// The top view, as a value the `region` param can hold. The view above every territory
	// is the one step of the drill path with no node behind it, so there is no key for it —
	// and without one, picking it could only be said by clearing the param, which does not
	// mean the same thing: an empty param is nothing picked, and nothing picked follows the
	// zoom (see effectiveSelected), so asking for the whole of the Països Catalans while
	// zoomed into a comarca left the crumbs and the table exactly where they were. It is a
	// selection like any other now, and a linkable one. No territory slugifies to this, so
	// it can never be mistaken for a region in the tree.
	const TOP_VIEW_KEY = 'paisos-catalans';
	// What that view is called. Not in the catalogue: it is the name of the place this whole
	// map is of, which is the same word in the one language the game is written in. It is
	// said in two places — the head of the crumb bar and the band across the top of the page —
	// and they are the same step, so it is written once.
	const TOP_VIEW_LABEL = 'Països Catalans';

	// What the URL says is open.
	$: regionParam = $page.url.searchParams.get('region');

	// Whether the player asked for the top view itself, as against not having asked for
	// anything. Both leave `selected` null — there is no node to name — but only the second
	// hands the view over to the zoom.
	$: topPicked = regionParam === TOP_VIEW_KEY;

	// The single open region, driven entirely by the `region` query param, by its
	// node key — the only region the map paints with its poster, and the head of
	// the one open drill path. A node's key matches the fill index: a territory is
	// its own id, deeper tiers append theirs, a municipality is its own id. Null
	// means no region of the tree is open, which is the top view either way.
	$: selected = topPicked ? null : regionParam;

	// How many times a region has been picked. Nothing reads it for its value: it is what
	// makes a pick a movement rather than a change of state, since the region asked for may
	// well be the region already open — the picked town's own crumb asks for exactly that
	// (see `pressable`), and so does clicking the pin the map is already framed on. The URL
	// does not change on either, so nothing downstream of it would, and the framing below
	// takes this instead so that a pick always re-frames.
	let picks = 0;

	// Point the URL at a region (or clear it), which reactively re-derives every
	// piece of open/expanded/selected state below. Pushed as history so the back
	// button walks the drill path; focus and scroll are preserved across the nav.
	// Nothing is brought forward with it any more: the region is drawn on the map's own
	// Location plate, which is folded or unfolded because the player left it that way, and
	// a pin click is not a reason to overrule that — the map frames the region either way,
	// and a picked town says so on its own plate.
	function open(key: string | null) {
		picks += 1;
		const params = new URLSearchParams($page.url.searchParams);
		if (key) params.set('region', key);
		else params.delete('region');
		const query = params.toString();
		goto(query ? `?${query}` : location.pathname, { keepFocus: true, noScroll: true });
	}

	onMount(async () => {
		// Load the polygons (for the region tree, the framing and every town's own
		// seed) and the saved shows (for the name and poster a seeded show is drawn
		// with) in parallel; both are optional, so settle each independently and always
		// flip `ready` so the map renders regardless.
		const [municipisResult, savedShowsResult] = await Promise.allSettled([
			fetch('/data/geo/municipis.json').then((response) => response.json()),
			fetch('/data/shows.json').then((response) => response.json() as Promise<ShowsCollection>)
		]);

		if (municipisResult.status === 'fulfilled') {
			// The region tree simply stays empty if the polygons fail to load.
			municipalities = municipisResult.value;
		}
		if (savedShowsResult.status === 'fulfilled') {
			// Every authored show, so both a seeded and a ruling show id resolve to a name
			// and a poster. Failing to load it leaves every town unshown — a pin falls back
			// to its plain fill rather than to a wrong show.
			savedShowById = new Map(
				(savedShowsResult.value.shows ?? []).map((entry) => [
					entry.show.id,
					{ id: entry.show.id, name: entry.show.name, posterUrl: showPosterUrl(entry) }
				])
			);
			// The same entries kept whole, and not reduced to one poster: a booster box's
			// cover is picked out of the author-enabled set per town and year, and its
			// wordmark comes out of the same entry (see `festaBoxes`), so the box on the
			// map is printed from what the Booster tab prints its own from.
			showEntryById = new Map(
				(savedShowsResult.value.shows ?? []).map((entry) => [entry.show.id, entry])
			);
		}
		ready = true;

		// The show → renderable-character assignment, read once from Supabase. It is what
		// says which shows the game has anything to deal at all, so it is both the pool
		// every town's show is seeded out of (see `buildTownShows`) and the roster a town's
		// house team is rolled from. Read-only: nothing is written back. Read first of the
		// Supabase loads for that reason — the pins are lettered off it — and if it is
		// unconfigured or unreadable the map simply stands with no show on any town.
		try {
			const claimable = await spawnService.loadShows();
			showCharacterIds = new Map(claimable.map((show) => [show.id, show.characterIds]));
		} catch {
			showCharacterIds = new Map();
		}

		// The festa-major towns the boxes stand on, loaded after the map is ready so a
		// slow (or unconfigured) Supabase never blocks the map: the boxes simply pop in
		// once they arrive. The window read is what puts a box on the map at all and the
		// today read only says which card it is printed on, so each is settled on its own
		// — a failed today read leaves every box black rather than taking the whole layer
		// down with it, the same way the booster grid falls back to its dark card.
		const [windowResult, todayResult] = await Promise.allSettled([
			festesService.loadFestesForWindow(),
			festesService.loadTodayFestes()
		]);
		if (windowResult.status === 'fulfilled') windowFestes = windowResult.value;
		if (todayResult.status === 'fulfilled') {
			todayFesteIds = new Set(todayResult.value.map((festa) => festa.id));
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
	// sitting team harder to shift. Those wins are paced by a cooldown rather than
	// rationed by the day: finishing a fight over a town shuts that town to that
	// player for an hour, timed from the end of the fight, and they may walk straight
	// back in once it runs out.

	// Every occupied town, this player's banked wins, and the towns currently closed to
	// them — the one they are fighting over, plus every one still cooling down — keyed
	// by municipality id. Reassigned wholesale (never mutated) so the reactive
	// statements below re-run.
	let holders = new Map<string, MunicipalityHolder>();
	let sieges = new Map<string, MunicipalitySiege>();
	let challenges = new Map<string, MunicipalityChallenge>();

	// The signed-in player, so a town they already hold isn't offered as a target.
	const profile = authService.profile;

	// Whether the corner at the foot of the map is showing the way in or the account itself
	// (see SignInButton, and the column below). Asked of the session's own state rather than
	// of `profile` being empty, because those are not the same question while the session is
	// still being restored: a visit with an account on disk has no profile for a moment, and
	// a door drawn in that moment is a door taken away again.
	const authStatus = authService.status;
	$: signedOut = $authStatus === AuthStatus.SignedOut;

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

	// The running cooldowns on their own — re-read whenever a fight opens, a fight
	// settles, or one of them runs out, so the Challenge button opens and closes the
	// town without a reload.
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

	// The arena is gone. Re-read the cooldowns, because the fight that just closed is
	// what set this town's: reported, it starts the hour; taken by somebody else while
	// it was open, it sets none at all (the slot is voided server-side). That applies
	// to a fight walked away from as much as to a reported one — which is a fight
	// `on:territory` never hears about.
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

	// The panel had three tabbed views and has none: it is the account, and the two views it
	// used to hold beside it — every show's standing across the map, and the window's booster
	// packs — are full-view modals on the sheet the roster and the badges already use (see
	// LeaderboardModal and BoosterModal). Both were tables and pictures being read in a 450px
	// column, and both could only be up by putting the other away; a pack in particular is
	// picked, stood up and sliced open, which is worth the viewport rather than a third of it.
	//
	// So the panel is the two buttons that raise them plus the account section under them, and
	// everything about *where the map is looking* had already left this column before them:
	// the path down to it is the bar across the top, the picked town says what it has to say
	// on its own pin, the side the player fields stands at the foot of the map, and who is
	// playing is a plate at its top-right. What is left in this column is the way in (signing
	// in) and the ways out of it.

	// How many municipalities each show flies, and its share of them all. Tallied
	// over `showsById`, which is already the seeded assignment with every held
	// town's ruling show written over it — so a conquest moves a town from one
	// show's tally to another's the moment the holders reload.
	$: showStandings = buildShowStandings(showsById);

	// Sieges and the running cooldowns are both RLS-scoped to the reader, so the
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

	// What the open region's shape is washed at: the thinnest wash on the map, and the floor
	// the pulse over it breathes from and back to (see buildPulse). Named because two places
	// need the same number and one of them is an animation, which cannot ask the other.
	const PICKED_WASH = 0.2;

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
	type RegionColors = Record<RegionType, Map<string, RegionColor>>;

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
	// How a feature of `tier` names itself: a municipality by its feature id, any
	// grouping by its NAME (see RegionColors). The one place that spelling is written,
	// so the colour lookup and the selection test below ask the same question of a shape.
	function featureKey(tier: RegionType, feature: GeoJSON.Feature | undefined): string | null {
		const props = feature?.properties;
		if (!props) return null;
		return tier === 'Municipality' ? String(props.id ?? '') : String(props.name ?? '');
	}

	function featureColor(
		tier: RegionType,
		feature: GeoJSON.Feature | undefined,
		colors: RegionColors
	): RegionColor | null {
		const props = feature?.properties;
		if (!props) return null;
		const key = featureKey(tier, feature)!;
		const own = colors[tier].get(key);
		if (own) return own;
		if (tier === 'Province' && props.territory) {
			return colors.Territory.get(String(props.territory)) ?? null;
		}
		return null;
	}

	// The opened region as a shape names itself — its tier plus the key its polygons
	// carry (see featureKey) — which is what lets a paint ask "is this the one that was
	// picked?" without knowing anything about the tree. Null with nothing picked, and
	// null for a key no node answers to.
	function selectedFeature(
		chosen: string | null,
		nodes: RegionNode[]
	): { tier: RegionType; key: string } | null {
		if (!chosen) return null;
		const node = findNode(nodes, chosen);
		if (!node) return null;
		return { tier: node.type, key: node.type === 'Municipality' ? node.key : node.name };
	}

	$: pickedFeature = selectedFeature(selected, regionNodes);

	// Whether the picked shape goes on wearing its wash at a zoom that is no longer drawing its
	// tier — which is a question with a side to it, because a wash is paint over everything
	// beneath it.
	//
	// Zoomed OUT past the picked shape (its tier finer than the one imaged), there is nothing
	// under it to bury: only the imaged tier fills, and every tier finer than that is drawn at
	// no strength at all. So a town picked at the town tier keeps its shape, its coat and its
	// breath through comarques, províncies and the whole country, which is the one shape on the
	// map that was asked for by name staying findable at every zoom.
	//
	// Zoomed IN past it (a comarca picked while the map draws its towns), it is dropped, and
	// that is not a limitation: the shape covers the whole of the breakdown the zoom went in to
	// read, and a coat of paint over it — let alone one swelling to 80% every four seconds —
	// would be the picked region hiding its own parts. Where the reader is stands in the crumb
	// bar and in the column; it does not have to be painted over the towns as well.
	function keptWash(tier: RegionType, imaged: number): boolean {
		return tierRank[tier] > imaged;
	}

	// The picked shape, breathing. With no marks left on the map, a wash is all a region has
	// to say what it is — and every region on the imaged tier is wearing one, so the shape
	// that was actually asked for looked like its neighbours with a thinner coat of the same
	// paint. That coat swells and falls back instead, in the region's own colour throughout:
	// a colour on this map is a claim, so a shape that changed colour to say it was picked
	// would be saying the place had changed hands, while how much of that colour there is
	// means nothing on its own — which is what leaves it free to mean this (see
	// `--animate-region-pulse`).
	//
	// Only where there is a wash to pulse, which is the paint's own answer and not a second one:
	// the picked shape wears its coat on its own tier and goes on wearing it once the zoom has
	// left that tier behind, and loses it where the map has gone inside it (see keptWash). So a
	// picked town breathes at every zoom out to the whole country, and a comarca picked while
	// the map is drawing municipalities has nothing painted to breathe.
	// And never the town a fight is staged on — that one is being looked at rather than
	// chosen, and its 80% wash is the whole of what the spotlight is.
	function buildPulse(
		picked: { tier: RegionType; key: string } | null,
		colors: RegionColors,
		imaged: number,
		spotlit: string | null
	): { url: string; key: string; opacity: number } | null {
		if (!picked || spotlit) return null;
		if (tierRank[picked.tier] !== imaged && !keptWash(picked.tier, imaged)) return null;
		const url = tierLayerUrls.get(tierRank[picked.tier]);
		// The same fallback the paint takes: where a territory holds a single province, the
		// province polygon IS the territory and answers to the territory's colour (see
		// featureColor). A shape with no colour has no wash at all, and so nothing to breathe.
		const color =
			colors[picked.tier].get(picked.key) ??
			(picked.tier === 'Province' ? colors.Territory.get(picked.key) : undefined);
		if (!url || !color) return null;
		// Where the breath starts and returns to is the wash the paint gave it, named rather
		// than written out again: the two would otherwise have to be kept in step by hand, and
		// a pulse that came to rest at a strength the shape is not painted at would jump the
		// moment it stopped.
		return { url, key: picked.key, opacity: PICKED_WASH };
	}

	$: pulse = buildPulse(pickedFeature, regionColors, hiddenRank, spotlitId);

	// One tier's paint: a solid white line of this tier's weight, plus — on the tier
	// the map is imaging — a wash of the region's own colour across the shape.
	// Only that one tier washes: the layers stack coarsest-on-top, so a territory
	// filling too would bury every division under it, and the imaged tier is exactly
	// the one whose pins are on screen, so the polygons say in colour what the pins
	// over them already say.
	//
	// The wash sits at half strength, and the opened region's own shape is taken down
	// to 20%: a colour is a region's team, and every region on screen flying its colour
	// at the same strength left the one being looked at indistinguishable from its
	// neighbours. It is the thinnest wash on the map rather than the heaviest, so the
	// satellite reads through the one shape being looked at and what is under it can be
	// seen. Picking a comarca therefore changes nothing while the map is drawing
	// municipalities: the shape has no coat on at that zoom, and is not given one (see
	// keptWash).
	//
	// The picked shape is also the one shape that washes off its own tier: it keeps its coat
	// through every zoom OUT from the tier it belongs to, so the place the reader asked for is
	// still a shape on the terrain when the map has folded up to the whole country. Nothing is
	// buried by that — the tiers finer than the imaged one are drawn at no strength at all —
	// and the map draws it over the imaged tier's own wash rather than under it (see the pulse
	// in WorldMap), a fifth of an alpha beneath a half being a shape saying nothing.
	//
	// The spotlit town is the one exception to both halves of that, and for one reason: it is
	// the only shape on the map (see `spotlitId`). It washes whatever tier the map thinks it
	// is imaging, since the map has been taken to it and there is nothing else left drawn to
	// bury; and it washes at 80% rather than at the 20% a picked shape reads the satellite
	// through, since it stands on black and is the whole of what is being looked at.
	function tierStyle(
		tier: RegionType,
		weight: number,
		colors: RegionColors,
		imaged: number,
		picked: { tier: RegionType; key: string } | null,
		spotlit: string | null
	) {
		return (feature?: GeoJSON.Feature) => {
			const color = featureColor(tier, feature, colors);
			const key = featureKey(tier, feature);
			const isSpotlit = spotlit != null && tier === 'Municipality' && key === spotlit;
			const isPicked = picked?.tier === tier && picked.key === key;
			const washes =
				color != null && (isSpotlit || tierRank[tier] === imaged || (isPicked && keptWash(tier, imaged)));
			return {
				color: lineColor,
				weight,
				// The town shapes always fill, because they are what takes the map's clicks (see
				// the overlays below) and a path is only hit where it is painted: `fill: false`
				// renders `fill="none"`, and no pointer ever reaches the inside of that. So a town
				// that is not washing fills at nothing instead, which draws exactly what no fill
				// drew and is still there to be clicked. Every coarser tier keeps the old answer —
				// it has no click to catch, and a fill it does not need would bury the tiers under it.
				fill: washes || tier === 'Municipality',
				fillColor: washes ? REGION_COLOR_CSS[color!] : lineColor,
				fillOpacity: washes ? (isSpotlit ? 0.8 : isPicked ? PICKED_WASH : 0.5) : 0
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
	// washes each of its shapes in the colour that region's pin flies. So a region is
	// coloured on the map exactly as it is on its pin, and never twice.
	// Every other tier is line-only, so the satellite basemap keeps reading through
	// them, and `hiddenLineUrls` still drops the lines of the tiers finer than the
	// imaged one.
	//
	// The land itself is clickable, and a click on it does what the pin standing over that
	// spot does (see openFeature): pointing at a region and pressing its plate are the same
	// gesture, and the plate is a couple of hundred pixels of the several thousand the region
	// covers. The TOWN layer is the one that catches it, and it is the only interactive layer
	// on the map, for two reasons: the towns tessellate the whole of the Països Catalans, so
	// every point on land is inside exactly one of their shapes; and the layers stack
	// coarsest-on-top, so a territory that captured pointer events would swallow every click
	// meant for anything inside it. What the click is resolved to is not the town, though — it
	// is whichever pin is drawn over it, so a press on the same field opens Catalunya at the top
	// view and the village at the bottom one.
	//
	// Rebuilt (a fresh array) whenever a region changes colour, the map images another
	// tier, or another region is opened — that is what repaints the layers, which are
	// fetched only once.
	$: overlays = [
		{
			url: '/data/geo/municipis.json',
			style: tierStyle('Municipality', 1, regionColors, hiddenRank, pickedFeature, spotlitId),
			onClick: openFeature
		},
		{
			url: '/data/geo/comarques.json',
			style: tierStyle('Comarca', 1.5, regionColors, hiddenRank, pickedFeature, spotlitId),
			interactive: false
		},
		{
			url: '/data/geo/provincies.json',
			style: tierStyle('Province', 2, regionColors, hiddenRank, pickedFeature, spotlitId),
			interactive: false
		},
		{
			url: territoryLines,
			style: tierStyle('Territory', 3, regionColors, hiddenRank, pickedFeature, spotlitId),
			interactive: false
		}
	] satisfies MapOverlay[];

	// --- Which show a town flies -------------------------------------------------
	// A town starts on the show its own geometry seeds it with, but once a player takes it
	// the town flies the ruling team's show instead: the pins, the sidebar, the
	// festa booster boxes and every coarser region's plurality tally all read from
	// the single map below, so a conquest re-labels the town everywhere the map names
	// a show at once — and re-stocks its boxes with it, the pack being a booster of
	// whatever show the town flies today.

	// Every authored show by id (name + poster), read from /data/shows.json — the one
	// source a show's lettering comes from, seeded or ruling, so an overridden town's
	// pin draws exactly like an untaken one. Empty until the fetch lands.
	let savedShowById = new Map<number, RegionShow>();

	// The same collection kept whole, by show id: what a booster box is printed from
	// (its cover picked out of the enabled posters per town and year, its wordmark out
	// of the enabled logos), which one poster url cannot answer. Read only by the
	// festa boxes; empty until the fetch lands, which leaves them plain-fronted.
	let showEntryById = new Map<number, ShowEntry>();

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
		for (const [locationId, showId] of holderShowIds(occupied.values(), byCharacter)) {
			const show = saved.get(showId);
			if (show) ruling.set(locationId, show);
		}
		return ruling;
	}

	$: rulingShowById = buildRulingShows(holders, showsByCharacter, savedShowById);

	// Municipality id → the GPS seed its show and its team are both drawn from.
	// Hashing it walks every vertex of the polygon, so it is done once off the
	// geometry and kept: everything below re-derives as shows are assigned and towns
	// change hands without touching the shapes again. It is also the list of every
	// town on the map, which is what the shows and the colours are painted over.
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

	// The shows a town can be seeded with: every one that has a cast, in id order —
	// the same set the album lists and the only set a booster can be rolled from, so
	// a show the admin assigns its first character to is on the map from the next
	// visit, and one whose last character goes is off it. Nothing here is authored:
	// which shows the map flies is a consequence of which shows have fighters.
	$: seedableShowIds = seededShowPool(showCharacterIds);

	// Municipality id → the show its own seed picks out of that pool, for every town
	// on the map: what a town flies until somebody takes it. A town whose seeded show
	// is not in the saved collection is left out rather than lettered wrong — as is
	// every town, before the pool lands.
	//
	// Handed to the panel that deals the boosters as well as used here: which show a
	// town's packs are printed from is this same question, and for a town nobody
	// holds it is the one thing `claim_booster` takes on trust from the browser (see
	// its "Which show this town's boxes deal"), so there is one place it is decided.
	function buildSeededShows(
		seeds: ReadonlyMap<string, number>,
		pool: readonly number[],
		saved: ReadonlyMap<number, RegionShow>
	): Map<string, RegionShow> {
		const shows = new Map<string, RegionShow>();
		for (const [id, seed] of seeds) {
			const showId = seededShowId(seed, pool);
			const show = showId == null ? undefined : saved.get(showId);
			if (show) shows.set(id, show);
		}
		return shows;
	}

	$: seededShowById = buildSeededShows(municipalitySeeds, seedableShowIds, savedShowById);

	// Municipality id → the show it flies today: the seeded one, overridden by the
	// ruling team's wherever a player holds the town. This feeds the region tree, so
	// the override rides all the way up — a comarca or province tallies its plurality
	// over the shows its towns actually fly today.
	function buildTownShows(
		seeded: ReadonlyMap<string, RegionShow>,
		ruling: ReadonlyMap<string, RegionShow>
	): Map<string, RegionShow> {
		const shows = new Map<string, RegionShow>(seeded);
		for (const [id, show] of ruling) shows.set(id, show);
		return shows;
	}

	$: showsById = buildTownShows(seededShowById, rulingShowById);

	// --- Which colour a town flies -----------------------------------------------
	// Not the same compounding as the show above: a colour on this map is a claim,
	// so only a town somebody actually holds carries one — its holder's team's LEAD's
	// colour, exactly as a held town's show is its ruling lead's show. A town still
	// on the team its own seed rolled is nobody's, and flies the map's own grey (see
	// `types/region-color.type`) whatever colour that seeded lead happens to have
	// bent. So the map before the first conquest is grey entire, and any colour on it
	// is somebody's doing.
	//
	// Fed into the region tree beside the shows, so a comarca, a province and a
	// territory each take the plurality colour of the towns beneath them just as they
	// take their plurality show — which now reads as how much of a region has been
	// taken, and by whom — and a conquest re-colours every tier above it.

	// Municipality id → the colour it flies. Grey for every town on the map, and the
	// lead colour of whoever holds it wherever one does — which is why this asks the
	// seeds for its towns rather than the shows they fly: grey is a fact about
	// occupancy and not about a roster, so a town whose show has not landed yet is
	// still an unheld town and still says so.
	//
	// A holder with an empty team keeps its grey rather than falling to no colour at
	// all: the row would be one the RPC could not have written, and a town on the map
	// with nothing painted on it would read as a hole in the map instead.
	function buildTownColors(
		seeds: ReadonlyMap<string, number>,
		occupied: ReadonlyMap<string, MunicipalityHolder>
	): Map<string, RegionColor> {
		const colors = new Map<string, RegionColor>();
		for (const id of seeds.keys()) colors.set(id, ArtificialColor.Gray);
		for (const holder of occupied.values()) {
			const lead = holder.team[0];
			if (lead) colors.set(holder.locationId, lead.color);
		}
		return colors;
	}

	$: colorsById = buildTownColors(municipalitySeeds, holders);

	// The red → yellow → green → blue region hierarchy (territory → province →
	// comarca → municipality) mirrored from the map's divisions, for the tree.
	$: regionTree = buildRegionTree(municipalities, showsById, colorsById);

	// The nested region nodes. Nothing lists them tier by tier any more — the way down
	// is the pins and the way back up is the breadcrumbs, which carry the full drill
	// path — but every region on the map is read off this: its colour, its show, and
	// what the crumbs and the search are built from.
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

	// The effective open region the breadcrumbs and polygons reflect: the focused pin's
	// parent (null at the top view). So zooming into an area unfolds the breadcrumbs and
	// the border detail into it and zooming out walks them back up — following the
	// pointer, without touching the URL selection.
	$: effectiveSelected = focusPath.length >= 2 ? focusPath[focusPath.length - 2].key : null;

	// The region the map is open on: an explicit click (the URL `region` param) wins, so a
	// pick drills straight into what was clicked; with nothing clicked it follows the
	// zoom-driven focus instead. Asking for the top view is a click too, and it names no
	// region, which is the whole of the Països Catalans.
	$: openRegion = topPicked ? null : (selected ?? effectiveSelected);

	// The drill path down to (and including) the open region was worked out here — the URL
	// path when a region is clicked, else the zoom focus path minus its frontier pin — for the
	// bar of crumbs that stood over the map. There is no such bar: the one path this page
	// letters is the cut ABOVE the open region, in the column beside the map (see `abovePath`),
	// and that one is walked off the node rather than off the view.

	// Which of the map column's two tabs is up: the terrain, or the list of the places the open
	// region divides into (see RegionLocationList). The map is the default and stays the default
	// — this game is a map, and a reader who has not asked for a list is looking at the country.
	// Held here rather than in either panel because neither of them is the tabs' parent: the
	// tab row, the terrain and the list are three children of the same column.
	// Nothing moves it but a press. Typing in the field beside the map fills this list rather
	// than the column the field is in, so a search made on the map tab is answered on a tab the
	// reader is not looking at — deliberately, since a page that switched tabs under someone
	// mid-keystroke is a page that moves while it is being used.
	let mapTab: 'map' | 'places' = 'map';

	// The show the level is being read through: picked on the shares row in the column beside the
	// map (RegionSubdivisions) and applied to the list over it (RegionLocationList), which is why
	// it is held on the page rather than in either. Null is the whole level, and it is put back to
	// null by the column itself whenever the map opens somewhere else — a filter belongs to the
	// list it was picked over.
	let activeShow: number | null = null;

	// Free-text search across every location in the whole tree (all tiers), matched
	// against each region's displayed name (case- and accent-insensitive). While the
	// box holds text its matches stand in the list of places over the map, in place of the level
	// and drawn as the level is (see RegionLocationList); an empty box has nothing to say.
	let searchQuery = '';
	// Whether the field is out. Held here rather than inside the column because what is typed in
	// it is matched here, and the two are the one control.
	let searchOpen = false;
	$: normalizedQuery = foldText(searchQuery.trim());
	$: allRegions = flattenRegionNodes(regionNodes);
	$: searchResults = normalizedQuery
		? allRegions
				.filter((entry) => foldText(restoreCatalanArticle(entry.name)).includes(normalizedQuery))
				.slice(0, 100)
		: [];

	// Ending the search: the query goes, and with it the matches it was filling the column with,
	// and the field folds back to the glyph it came out of. The head of that column is
	// untouched, since the search was never about the open region.
	function closeSearch() {
		searchQuery = '';
		searchOpen = false;
	}

	// Picking a place out of the column: the drill, exactly as a pin or a crumb does it — and
	// then the end of the search, since the question has been answered by landing somewhere and
	// a column still listing matches would be listing them about a place that is no longer the
	// one being asked about. Nothing to end when nothing was being searched for, which is what a
	// press on the level itself is.
	function openFromColumn(key: string) {
		closeSearch();
		open(key);
	}

	// The crumbs: a root crumb back to the top view, then one per ancestor down to the region
	// the bar is about. The last crumb is that region and renders as plain text; the rest link
	// back up to their tier.
	//
	// Every crumb carries what the town panel is given for the town it is open on, because
	// the bar letters a step the same way that panel letters its town: the show the place
	// flies, and the tile colour it is drawn in. Both are read off the node, so both are
	// whatever the map itself says — the ruling team's show on a held town, the seeded
	// plurality otherwise (see the ruling-show map), and above the municipality the
	// plurality of the towns underneath. A place cannot fly one show on the map and another
	// in the bar naming it.
	//
	// The root crumb is the whole of the Països Catalans, which is the one step of the path
	// with no region of its own: nothing in the tree stands for the lot of them, so its show
	// and colour are tallied here (see everyTownPlurality) rather than read off a node. It is
	// the same tally every tier under it gets, one tier further up, so the top view names
	// what most of the map is flying — and the step a player walks back to is lettered like
	// every other step rather than dropping to a bare word at the head of the row.
	//
	// It carries a key like every other step too (see TOP_VIEW_KEY), so clicking it opens the
	// top view instead of merely forgetting whatever was open.
	// Below the root the bar is a ladder of the four tiers and not just the steps walked into:
	// every tier has a position in the row whether or not the view has reached it, and whether
	// or not the place being looked at has that tier at all — the drill path skips a tier where
	// there is none (Andorra and l'Alguer have no comarca; a territory with one province lists
	// its comarques directly), and it stops wherever the map has got to. A position with no
	// step in it is drawn as an outlined square and pressed to take the map to the zoom that
	// tier is read at (see zoomToTier). So the row keeps its length and its rhythm as the map
	// drills — a place's name is always in the same position, whichever place it is — and every
	// tier is a press away rather than only the ones already opened.
	//
	// The word beside each tier is what the square is labelled by, and what comes back when one
	// is pressed: the bar names the tiers of this map in the map's own language, and one word
	// serves as both the label and the key it is worked back out of.
	const TIER_LADDER: [RegionType, string][] = [
		['Territory', 'territori'],
		['Province', 'província'],
		['Comarca', 'comarca'],
		['Municipality', 'municipi']
	];
	const tierByWord = new Map<string, RegionType>(
		TIER_LADDER.map(([tier, word]) => [word, tier])
	);

	$: mapPlurality = everyTownPlurality(regionNodes);

	/**
	 * A path of nodes as the bar reads it: the root step, then the ladder of the four tiers
	 * with each position filled by whatever step of the path stands at it.
	 *
	 * Written as a function because there were two paths lettered this way — the one the map was
	 * looking down, on the bar over the terrain, and the cut above it that heads the column
	 * beside it (see `aboveCrumbs`) — and two bars built from two copies of this would be two
	 * bars that could come to letter the same place differently. Only the second is left, and it
	 * is still written as a function: what the ladder is is a way of lettering a path, and that
	 * is worth saying once whether one path or two go through it. The plurality is passed in
	 * rather than read off the closure so that a statement calling this names it and re-runs
	 * when it changes.
	 */
	function crumbLadder(path: RegionNode[], plurality: ReturnType<typeof everyTownPlurality>) {
		return [
			{
				label: TOP_VIEW_LABEL,
				key: TOP_VIEW_KEY as string | null,
				showName: plurality.show?.name ?? null,
				showId: plurality.show?.id ?? null,
				tileClasses: plurality.color ? pinColorClasses[plurality.color] : null
			},
			...TIER_LADDER.map(([tier, word]) => {
				const node = path.find((step) => step.type === tier);
				if (!node) {
					return { label: '', key: null as string | null, empty: true, tier: word };
				}
				return {
					label: restoreCatalanArticle(node.name),
					key: node.key as string | null,
					showName: node.show?.name ?? null,
					showId: node.show?.id ?? null,
					tileClasses: node.color ? pinColorClasses[node.color] : null,
					// The bottom of the ladder is the one step still worth pressing. Every tier above
					// it either has a step above it to walk back to or an empty square below it to
					// zoom into; a town has neither — it is the last rung, so a bar that named one
					// would have nothing that takes the map back down to it. It is pressed for what
					// every other crumb is pressed for — frame the place it names — which for this
					// tier is the municipality zoom. Nothing reaches it while the only bar left is
					// the one over the column beside the map, which letters the cut ABOVE the open
					// region and so never ends on a town; it is kept for the bar that does.
					pressable: tier === 'Municipality'
				};
			})
		];
	}


	// The open location's own node and its plurality ("most seen") show. Surfaced on the
	// corner's Location plate when the open region is a leaf municipality (the table there
	// lists child rows, so a leaf has nothing to list and shows the town's own show
	// instead), and used to pick the roster the town's OG team rolls from.
	$: openNode = openRegion ? findNode(regionNodes, openRegion) : null;
	$: openShow = openNode?.show ?? null;

	// The radio follows the map. Which show the place on screen flies is a statement this
	// page already makes everywhere — on the pin, in the crumb, on the band at the top —
	// and a station is a show, so the one thing left to do with it is play it: while the
	// radio is on, the dial goes to whatever the map is open on, and the reader who drills
	// from a territory into a comarca into a town hears each of them in turn. Crossfaded,
	// and only while it is on, and never written down as their choice of station — see
	// musicService.follow, which is where all three of those are decided.
	//
	// The whole map is a place like any other here, so the top view tunes to the plurality
	// of every town on it — the same show its own crumb is lettered with (see crumbLadder).
	// A show is passed and not a node because that is the whole of what a station is: two
	// different places flying the same show are not a reason to touch the dial.
	$: musicService.follow(openShow?.id ?? mapPlurality.show?.id ?? null);

	/** One region as the bar letters it — the spelling the page's band and the list share. */
	function crumbRow(node: RegionNode) {
		return {
			key: node.key,
			label: restoreCatalanArticle(node.name),
			showName: node.show?.name ?? null,
			showId: node.show?.id ?? null,
			tileClasses: node.color ? pinColorClasses[node.color] : null
		};
	}

	// The place the whole page is about: the region the map is open on, at any tier. It stands
	// on the band across the top of the page, above the three columns and before all else, so
	// where you are is the first thing read rather than something to be found among the places
	// inside it — and a town, which is one of its own sisters, is both stood up there and left
	// where it falls in the list, marked there (see subdivisionNodes).
	//
	// With the box that place has waiting where the window has one for it, off the same
	// `festaBoxById` a row of the list and a pin on the terrain are handed: the band is a row
	// like the rest of them, and a box is part of what a row says. Only a
	// municipality is ever found in there — a festa's id is a municipality feature id — so the
	// tiers above take nothing, and neither does the top view, whose key is no node's.
	//
	// The top view is a place like any other here: it is where the map is when nothing is
	// open, it is a selection with a key of its own (see TOP_VIEW_KEY), and the bar already
	// letters it with the plurality of every town on the map. So the band is never empty,
	// whatever the map is looking at.
	$: subdivisionCurrent = openNode
		? { ...crumbRow(openNode), box: festaBoxById.get(openNode.key) ?? null }
		: {
				key: TOP_VIEW_KEY,
				label: TOP_VIEW_LABEL,
				showName: mapPlurality.show?.name ?? null,
				showId: mapPlurality.show?.id ?? null,
				tileClasses: mapPlurality.color ? pinColorClasses[mapPlurality.color] : null
			};

	// What the column lists under it: the level one tier down — the territories at the top
	// view, and a town's own sisters once the bar has got all the way down (see
	// regionLevelNodes). It follows `openRegion` and not the URL selection alone, so the column
	// walks with the zoom exactly as the crumbs above the map do.
	//
	// The head itself is kept in rather than dropped, which only ever means a town: no coarser
	// region is among its own subdivisions, so nothing above the municipality is affected. The
	// level was handed over with the open town taken out of it, on the ground that the head had
	// already named it — but a town is read here against its sisters, and a list of every town
	// in the comarca but the one you are standing in is a list with a hole where the reader is.
	// It is listed where it falls and marked where it falls (see RegionLocationList).
	//
	// Taken out here rather than in the component because this is the list the shares below
	// are counted over: what the row says is a share of is exactly what is listed under it,
	// and two places deciding what "listed" means is how those two come to disagree — which is
	// why the open town, now that it is listed, is counted in them too.
	$: subdivisionNodes = regionLevelNodes(regionNodes, openRegion);

	// The path the column beside the map is headed by: the way down to the place the open
	// region sits *inside*, which is the cut above it and never the open region itself. The
	// head row of that column has already named where the map is — a bar under it saying the
	// same place again is the column saying Catalunya over a list Catalunya heads — so what
	// the bar is for is the one thing the head cannot say, which is where that place is. Its
	// last step is therefore the parent: the comarca over a town, the province over a comarca,
	// and the Països Catalans over a territory, there being nothing above a territory but the
	// whole of them.
	//
	// Empty at the top view, which is the one place with nothing above it at all: the column is
	// headed by the Països Catalans and there is no superior cut to name. The bar is left off
	// rather than drawn saying the same thing twice (see the `path` slot).
	$: abovePath = openNode ? nodePath(regionNodes, openNode.key).slice(0, -1) : null;

	// And that path lettered as the bar over the map letters its own (see crumbLadder), so a
	// place is the same tile, name and show wherever it is named. A path of no regions is the
	// root crumb by itself, which is exactly what a territory's superior cut is.
	$: aboveCrumbs = abovePath ? crumbLadder(abovePath, mapPlurality) : null;

	// Lettered exactly as a crumb is, off the same node fields and into the same shape,
	// because it is drawn by the same component: a place on this map is its tile, its name
	// and the show it flies, whether it is being named as a step of the path or as one of
	// the places the open region is made of.
	//
	// Plus, where the window has one for it, the box that place has waiting — the same
	// `MapBoosterBox` the map is standing on that town at this moment and the same one its
	// pin is handed (see festaBoxById), so the column and the terrain print one box per town
	// rather than two drawn from the same festa. Only a municipality can be found in there:
	// a festa's id is a municipality feature id, and only a municipality's key is its bare
	// id, so a row naming a comarca or a province looks nothing up. A town of the window
	// whose polygon the map has no centre for has no box anywhere, here included.
	$: subdivisions = subdivisionNodes.map((node) => ({
		...crumbRow(node),
		box: festaBoxById.get(node.key) ?? null
	}));

	// And the matches lettered exactly the same way, because they are drawn by exactly the same
	// row: a place turned up by a search is the same place it would have been if the drill had
	// reached it, and a search that answered in a different hand would be a second way of
	// saying a town. The tier rides along, since that is what the list groups them under
	// (see RegionLocationList's searchGroups) — and it comes off the flattened entry rather than
	// being looked back up, as the colour does.
	$: searchRows = searchResults.map((entry) => ({
		key: entry.key,
		type: entry.type,
		label: restoreCatalanArticle(entry.name),
		showName: entry.show?.name ?? null,
		showId: entry.show?.id ?? null,
		tileClasses: entry.color ? pinColorClasses[entry.color] : null,
		box: festaBoxById.get(entry.key) ?? null
	}));

	// How those places divide between the shows they fly: the same tally the leaderboard is,
	// run over the listed level instead of over every town on the map (see
	// buildShowStandings) — biggest share first, and over the places that fly anything at all,
	// so a region with no show is not counted against the shows that have one.
	$: subdivisionShares = buildShowStandings(
		new Map(
			subdivisionNodes
				.filter((node) => node.show)
				.map((node) => [node.key, node.show!] as [string, RegionShow])
		)
	).map((standing) => ({ id: standing.id, name: standing.name, share: standing.share }));

	// The pin the map is drawing on the place at the head, where that place is a town — the
	// mark itself and
	// not a copy of it: it comes out of `buildMarkers`, the very function the map's pins are
	// built by, called on the one node with everything that function is given for the whole
	// tier. So the side standing on the town, its occupant, its standing and the control under
	// it are decided in exactly one place, and the column beside the map cannot come to say
	// something the mark on the map does not.
	//
	// Towns only, because a pin's team, holder and standing are a town's alone (see
	// buildMarkers) and a coarser region's mark is its plate by itself, which is the crumb row
	// already standing on the band at the top of the page. And a town with no show has no pin —
	// buildMarkers skips it — so the column says nothing extra about it either.
	$: townPin =
		openNode?.type === 'Municipality'
			? (buildMarkers(
					[openNode],
					regionGeometry,
					null,
					statuedTown,
					pinTeam,
					townChallenge,
					regionSieges,
					holders,
					$showGlyphs,
					festaBoxById,
					openNode.key
				)[0] ?? null)
			: null;

	// (What the town has waiting is on the pin itself now, like everything else it carries —
	// see `box` in buildMarkers.)

	// The standing on the picked town, lifted off that very pin and stood under the side holding
	// it (see RegionSubdivisions' `standing` slot): how far it has been taken and the control
	// that acts on it, which is what a reader wants near the top of the column rather than a
	// block further down it. Off the pin and not off
	// `townChallenge`, so the column and the map cannot come to say two things about one town
	// — the pin is where that decision is already made (see buildMarkers).
	$: townStanding = townPin?.challenge ?? null;

	// And so the pin below is drawn without it: the same mark, less the block that has gone to
	// the head. Handed over as the marker it is rather than switched off with a flag, because
	// what has changed is what this copy of the pin is being told about the town, not what a
	// pin draws.
	$: townDetailPin = townPin ? { ...townPin, challenge: null } : null;

	// --- The open municipality's deterministic "house team" ---------------------
	// A leaf region (a municipality) has no children to drill into; instead of an
	// empty table the Location plate previews the town's team: three cards rolled
	// deterministically from the town's own seed, drawn from its top show's roster.
	// It's a read-only, client-side mirror of the claim roll (a card is never written
	// to Supabase from here) — only the show→character assignment is read below.

	// The registry, indexed by id, so a rolled team member resolves to a label + sprite.
	const charactersById = new Map(characters.map((character) => [character.id, character]));

	// show id → its renderable character ids, read once from Supabase (the same
	// `show_characters` assignment the claim panel reads). Empty when Supabase is
	// unconfigured or unreadable — the team preview simply stays hidden then.
	let showCharacterIds = new Map<number, string[]>();

	// The open leaf municipality's feature (matched by id), and the GPS seed that
	// assigns its show — the same seed we reuse to roll its team, so a town's show and
	// its team are both stable functions of its shape. Null unless a municipality with
	// no sub-regions is open, which is what having no children in the tree says: only
	// the bottom tier is a place a team stands on.
	$: municipalityFeature =
		openRegion && municipalities && openNode?.children.length === 0
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

	// Nor one still cooling down from their last fight over it. The server is what
	// enforces it (`start_battle`); this only closes the button so the fight isn't
	// opened onto a refusal, and it reads the deadline the server set rather than
	// timing anything itself. A challenge the server has handed back — the town was
	// taken by somebody else while the fight was open — carries no deadline and is not
	// in the loaded set at all, so the town reads as open.
	$: challengedOpenTown = !!openRegion && challengeCoolingDown(challenges.get(openRegion));

	// (A player already in a fight is not offered another one, and a cooling-down town
	// says when it reopens instead — both read in the town panel over the map, off
	// `$openBattle` and the challenge's own deadline; see buildTownChallenge.)

	// (The town's team was drawn here as cards on the shared card canvas — portraits,
	// show row and all. It is statues in the town panel over the map now, which take a
	// frames folder and nothing else, so the faces and show names that fed those cards
	// are no longer loaded at all.)

	// --- The player's own team (the statues at the map's bottom-left corner) ------
	// Stood up in the document as three statues over the map, on nothing at all (see the
	// lineup at the corner): the side this player would field, so what they are challenging
	// with is read against the town they are looking at without leaving the map for the
	// roster — and without the panel's Profile tab having to be forward for it to be on
	// screen at all, which is what being a section of that tab cost it.
	// The team is the slots on the player's own cards, so it is only renderable once
	// those have loaded; empty slots are left out, and a team with none shows nothing.
	const teamSpawns = teamService.fielded;

	// The signed-in player's id, or null — what their spawns are loaded for.
	$: currentUserId = $profile ? String($profile.id) : null;

	// One load per signed-in player, exactly as the roster and the arena do it. A
	// failure leaves the plate unmounted rather than breaking the map.
	let spawnsLoadedFor: string | null = null;
	// Whether that load has come back — settled either way, since a read that failed
	// has told us as much about this player's cards as it ever will. The statues do not
	// need it (a team with none draws nothing), but the button standing in their place
	// does: a corner saying there is no side yet for the length of a round trip, and
	// then filling with three cards, is saying something that was never true.
	let spawnsSettled = false;
	$: if (currentUserId && currentUserId !== spawnsLoadedFor) {
		spawnsLoadedFor = currentUserId;
		spawnsSettled = false;
		void spawnService
			.loadSpawns(currentUserId)
			.catch(() => {})
			.finally(() => (spawnsSettled = true));
	}

	// The cards the player fields come in slot order — the leader first, as on the
	// board. They ARE the team: a card holds a team slot or it doesn't, so this is the
	// same line-up on every device the account is signed in on.
	//
	// The plate draws them from their frames folder alone: no portrait to load, and no
	// show name to resolve, since it paints the show's glyph rather than naming it.

	// geojson feature id → municipality name, so each card can name where it was
	// claimed. Null until the layer the map is drawn from has loaded.
	$: municipalityNames = municipalities ? locationAdapter.municipalityNames(municipalities) : null;

	// The player's team as the plate draws it — not a card: who they are, the art that
	// stands them up, the colour they bend, where they were claimed and the show they
	// come from, whose glyph goes on the floor they stand on. The show is the
	// character's own first show, as `teamShowId` reads it for a town's pin, so a
	// character carries the same badge here as the map gives the show. Both maps are
	// threaded in so the statement re-derives as the assignment and the place names land.
	//
	// The reading itself is `teamLineupMembers`, in @3xl/shared, because this is not the
	// only place a side is stood up any more: a player's public profile page draws the
	// same three statues off the same three facts, having loaded them by another route
	// entirely (see publicProfile.service). One function, so the two can never disagree
	// about what a card looks like.
	$: playerTeamLineup = ((shows: Map<string, number[]>, names: Map<string, string> | null) =>
		teamLineupMembers($teamSpawns, {
			characters: charactersById,
			showsByCharacter: shows,
			municipalityNames: names
		}))(showsByCharacter, municipalityNames);

	// Whether the furniture column is standing the player's block at all — the side, the way
	// in, and the account plate under them. It is the very condition that block is drawn on,
	// named here because a second row in that column has to know it: the author's marks close
	// the column, and which of the two is the one pushed to the foot depends on whether the
	// block above it is there to push (see the third column's `mt-auto`).
	$: playerBlockShown =
		ready && (playerTeamLineup.length > 0 || !!$profile || signedOut) && !$fullScreenModalOpen;

	// The open combat modal: the challenged town's sitting team (as synthetic spawns)
	// plus everything the fight has to be reported against — the town's id and the
	// turnover generation it was on — all frozen at click time. Null when the modal is
	// closed. The player's own team is the other side, fielded by CombatArena —
	// combat happens right here over the map, never navigating away.
	let fightSpawns: CharacterSpawn[] = [];
	let fightLocationId: string | null = null;
	let fightTurnover = 0;
	let fightOpen = false;
	// True while the arena is handing a finished fight to the server. Bound out of it,
	// because it is the one thing the sheet holding it cannot know for itself and the one
	// moment the sheet must not let go of it: the report is what ends the battle.
	let fightReporting = false;

	// --- The town a fight is staged on, alone on the map ---------------------------
	// The arena is the one full view that is ABOUT a place: the roster, the badges, the
	// leaderboard and the boosters are pages laid over the map, and a fight is an event on a
	// town the map is still showing (which is why that sheet paints no page of its own). So
	// while it is up, the map is the one town — brought to the middle of the canvas at the
	// zoom it stands whole at, washed at 80% instead of the 20% a picked town reads the
	// satellite through, and everything else covered in black with no border left anywhere
	// (see `spotlight` in WorldMap, tierStyle and hiddenLineUrls).
	//
	// It is keyed off the fight and not off `$fullScreenModalOpen`: every other sheet leaves
	// the map exactly as the reader left it, and blacking out the map under the roster would
	// be covering the terrain that sheet is laid on for no reason.
	//
	// The town is the fight's own and never the open region: a battle resumed on the next
	// visit puts the reader back in front of a fight without the map having opened anything
	// (see resumeBattle), and it is that town the arena is about.
	let spotlitId: string | null = null;
	let spotlightExit: ReturnType<typeof setTimeout> | null = null;

	// How long the arena takes to leave — FullScreenModal's own slide-out (`fly`, 250ms).
	// Written here as well because a page cannot ask a sheet how long it takes to go; keep
	// the two in step, and both in step with the blur above.
	const SHEET_EXIT = 250;

	/**
	 * Raise the spotlight with the fight, and lower it once the arena has finished leaving.
	 *
	 * The delay on the way out is the coordination, not a pause: the map's furniture comes
	 * back into focus on the sheet's UNMOUNT, which is after its slide-out has played (see
	 * `$fullScreenModalOpen` and CHROME_BLUR), so a spotlight lowered the moment Close was
	 * pressed would have the black clearing and the town letting go of its wash while the
	 * arena was still on its way down — the two halves of one gesture playing a quarter of a
	 * second apart. Held for that quarter second, everything the map does happens at once:
	 * the sheet goes, and behind it the black fades out, the wash comes back to where it was
	 * and the pins sharpen, over the same 250ms.
	 *
	 * On the way in there is nothing to hold: raising the sheet and raising the spotlight are
	 * the same tick.
	 */
	function holdSpotlight(open: boolean, townId: string | null): void {
		if (spotlightExit) {
			clearTimeout(spotlightExit);
			spotlightExit = null;
		}
		if (open) {
			spotlitId = townId;
			return;
		}
		if (spotlitId == null) return;
		spotlightExit = setTimeout(() => {
			spotlitId = null;
			spotlightExit = null;
		}, SHEET_EXIT);
	}

	$: holdSpotlight(fightOpen, fightLocationId);

	// That town as the shape the map draws it with — the polygon the framing fits and the
	// mask is cut around. Null until the geometry has landed, which leaves the map as it is
	// rather than blacking it out around nothing.
	$: spotlight =
		spotlitId && municipalities
			? (municipalities.features.find((feature) => String(feature.properties?.id) === spotlitId)
					?.geometry ?? null)
			: null;

	// True while the day's challenge is being claimed off the server, so a double
	// click can't fire two `start_battle` calls (the second of which the server
	// would refuse anyway).
	let challengeStarting = false;

	// Whether there is a team to fight with at all. `start_battle` fields the team off
	// the player's own cards and refuses to open a battle unless all TEAM_SIZE slots
	// are held, so offering the button would only be offering a fight the server will
	// not have. Signed out there is no team to read and no battle to open: the arena's
	// own sign-in gate is still the way in, so the button stays live.
	$: canFieldTeam = !currentUserId || $teamSpawns.length === TEAM_SIZE;

	// --- The menu ----------------------------------------------------------------
	// There is none. The player's own views were one column dropped from a burger at the far
	// end of the breadcrumb bar, and before that a full-height drawer at the map's right edge,
	// and before that a sibling of the map taking a flat 450px of the row. What emptied it was
	// each view finding the thing it is about: the roster is the side standing in the map's own
	// corner, the account is the cog at the end of the plate under it, the standings are the
	// shares row at the head of the column beside the map, a town's pack is the box drawn on
	// that town, the search is a cell of that same shares row, and the radio runs wherever it
	// is turned on. A menu of what is left over is a menu of nothing, so the bar over the
	// terrain says the game's name and no more.
	//
	// The sheets themselves are untouched and all still mounted at the foot of this file: each
	// is raised by its own store, so anything that wants one asks for it by name (see
	// rosterModal, collectionModal, settingsModal, legalModal).

	// Fight this town: claim its challenge, then snapshot whichever team currently sits
	// on it — the holder's if a player has taken it, the seeded roll otherwise — into
	// synthetic spawns and open the combat modal. The town only changes hands
	// server-side, once the fight is reported and enough wins have been banked.
	//
	// The challenge is claimed *before* the arena opens, and by the server. Walking out
	// of a fight that is going badly still hands back no retry: the battle it opened is
	// the one fight this player may be in until it is reported, and only reporting it
	// starts the hour before this town can be fought again. A refusal (the town still
	// cooling down, another tab having opened a battle first) leaves the arena closed
	// and re-reads the cooldowns, which closes the button too.
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
		if (challengeStarting || !canFieldTeam) return;
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
				// Opens the battle and claims the town's challenge in one transaction,
				// freezing the team being fought and proving the one doing the fighting —
				// so the fight survives the town changing hands, cannot be walked away from
				// for a fresh one, and is never opened with a line-up the report would
				// later be refused for.
				const challengeSlot = await battleService.start(townId, turnover, rivals);
				if (challengeSlot) territoryService.noteChallenge(challengeSlot);
			} catch (error) {
				// Refused: a team that is not the caller's, a town still cooling down, a
				// battle already open, or the town is the player's own. Re-read both so the
				// button tells the truth — and say which it was, since a challenge that
				// simply does nothing is the one thing the button must never look like.
				console.error('Challenge refused', error);
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

	// Per-municipality chain of region tiers, read by buildMarkers/focusBounds to
	// find the municipalities under a region and frame or pin it.
	$: fillIndex = buildFillIndex(regionTree);

	// The outermost outline of the lot — the one line overlay the tier rule never hides
	// (rank 0), and so the one that has to be named where every line is to go (see the
	// spotlight below).
	const territoryLines = '/data/geo/territoris.json';

	// The line overlays that subdivide a region, each with its own tier rank. The
	// territory outline (rank 0) is never hidden, so it isn't listed.
	const lineTiers: [string, number][] = [
		['/data/geo/provincies.json', tierRank.Province],
		['/data/geo/comarques.json', tierRank.Comarca],
		['/data/geo/municipis.json', tierRank.Municipality]
	];

	// Which layer a tier's shapes are drawn in, by that tier's rank — read off the two lists
	// above rather than written out again, so the pulse below can never be sent looking for
	// the picked shape in a layer it is not in.
	const tierLayerUrls = new Map<number, string>([
		[tierRank.Territory, territoryLines],
		...lineTiers.map(([url, rank]) => [rank, url] as [number, string])
	]);

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
	//
	// A spotlit town takes every line off the map instead, its own included (see `spotlitId`).
	// The black already covers every border outside it, and the one border left inside it is
	// the town's own — a white line drawn along the edge of the only shape there is, which is
	// a second statement of what the black is already saying. What is left is the wash on
	// nothing.
	$: hiddenLineUrls = new Set(
		spotlitId
			? [territoryLines, ...lineTiers.map(([url]) => url)]
			: lineTiers.filter(([, rank]) => rank > hiddenRank).map(([url]) => url)
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

	// The picked region when it is a town, and null for anything coarser: only a
	// municipality's key names one, so a comarca or a province lands the same as nothing
	// picked. Read off the clicked selection rather than the zoom's focus, for the reason
	// the statues are (see statuedTown) — the focus is measured from the pins, and pins
	// that moved with it would be deciding what they are drawn from.
	$: pickedTown =
		selected && findNode(regionNodes, selected)?.type === 'Municipality' ? selected : null;

	// (The map used to mark one town at a time on a narrow view — a phone is the width of one
	// plate and a bit, and a comarca's towns drawn on it were plates elbowing one another out
	// of the way. Nothing marks a town now, on any screen, so there is no crowding left to
	// answer and no rule about it.)

	// The deepest drill level in the tree (territory = level 0), so the pin stack
	// can span every level down to the municipalities.
	$: maxLevel = treeDepth(regionNodes) - 1;

	// A region key's union bounding box, the point its pin stands on, and the
	// municipality ids beneath it.
	type RegionGeometry = {
		boxes: Map<string, LatLngBounds>;
		centers: Map<string, LatLng>;
		muniIds: Map<string, string[]>;
	};

	// One pass over the polygons for each municipality's own box and centroid, then
	// aggregated up every municipality's fill chain so each region key carries the
	// union box, its municipality ids, and a centre taken from the shapes themselves
	// (see interiorPoint) rather than from the box — a box centre sits off the region
	// for anything that isn't a rectangle, which is most of them. Precomputed so
	// buildMarkers is O(regions), not O(regions × polygons) — the municipality level
	// alone is thousands of pins.
	function buildRegionGeometry(
		polygons: GeoJSON.FeatureCollection | null,
		index: Map<string, FillLevel[]>
	): RegionGeometry {
		const boxes = new Map<string, LatLngBounds>();
		const centers = new Map<string, LatLng>();
		const muniIds = new Map<string, string[]>();
		if (!polygons) return { boxes, centers, muniIds };

		const munBoxes = boundsByFeatureId(polygons);
		const munCentroids = centroidsByFeatureId(polygons);
		// Each municipality's shape beside its box, so the centre of a region can be
		// checked against the land it is meant to stand on without re-scanning the layer.
		const munShapes = new Map<string, RegionShape>();
		for (const feature of polygons.features) {
			const id = String(feature.properties?.id ?? '');
			const box = munBoxes.get(id);
			if (id && box && feature.geometry) munShapes.set(id, { geometry: feature.geometry, box });
		}

		// A grouping's centroid is the area-weighted mean of its municipalities' — the
		// centroid of the dissolved shape, accumulated as the chains are walked.
		const weights = new Map<string, Centroid[]>();
		for (const [id, levels] of index) {
			const box = munBoxes.get(id);
			const centroid = munCentroids.get(id);
			for (const level of levels) {
				let ids = muniIds.get(level.key);
				if (!ids) muniIds.set(level.key, (ids = []));
				ids.push(id);
				if (centroid) {
					let parts = weights.get(level.key);
					if (!parts) weights.set(level.key, (parts = []));
					parts.push(centroid);
				}
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

		for (const [key, ids] of muniIds) {
			const shapes: RegionShape[] = [];
			for (const id of ids) {
				const shape = munShapes.get(id);
				if (shape) shapes.push(shape);
			}
			const centroid = combineCentroids(weights.get(key) ?? []);
			const point = interiorPoint(shapes, centroid);
			// A region whose polygons never loaded has no shape to stand on and keeps the
			// box centre it has always had.
			const box = boxes.get(key);
			if (point) centers.set(key, point);
			else if (box) centers.set(key, [(box[0][0] + box[1][0]) / 2, (box[0][1] + box[1][1]) / 2]);
		}

		return { boxes, centers, muniIds };
	}

	$: regionGeometry = buildRegionGeometry(municipalities, fillIndex);

	// The box every municipality the booster window's festes reach has waiting, by town.
	//
	// Nothing of this is stood on the map any more: the boxes were marks like the pins, and
	// the map carries no marks. They are looked up by town now — the open town's own box, in
	// the column beside the map, under the plate that names it (see townPinBox). The set is
	// still built whole rather than for the one town, because which show a town's box is
	// printed from is a question about every town at once (see below).
	//
	// It is the box that town has
	// waiting in the Booster tab, not a marker standing for one: the same component off
	// the same four things — the assigned show's cover, picked out of the enabled posters
	// by town and year exactly as the pack picks it, that show's wordmark, the town's own
	// name, and the card, white for a town de festa today and black for the rest of the
	// window. Clicking it loads that town's festa booster pack into the side panel and
	// flips the panel to its Booster tab, so the pack replaces the tables.
	//
	// Printed from what the map already holds (the show each town flies — its seeded
	// one as overridden by whoever holds the town — and the authored show
	// collection) rather than from the panel's packs, which are a signed-in player's
	// claimable set: a town de festa is de festa for a visitor too, and the box is what
	// says so. A town the player has no claimable pack for is the one case a click has
	// anything to answer for, and the panel already says it. A festa town whose polygon
	// isn't on the map has no point to stand on and is skipped. Named deps
	// (`windowFestes`, `todayFesteIds`, `showsById`, `showEntryById`, `regionGeometry`,
	// `selected`, `$showGlyphs`) so the boxes reprint when any of them lands — `showsById` among them,
	// so a town that changes hands re-covers its box with the conqueror's show without a
	// reload.
	$: festaBoxes = (() => {
		const centers = regionGeometry.centers;
		const today = todayFesteIds;
		const townShows = showsById;
		const entries = showEntryById;
		// Which of these boxes this reader has already opened, so a box that is spent is
		// drawn spent. The set is the claim panel's own read (the service's store), empty
		// while signed out, which leaves every box on the map looking as it always did.
		const spent = $claimedBoxes;
		// Which town is being looked at, read off the clicked selection for the same reason
		// the statues are (see statuedTown): a zoom focus is not a choice of town. Only a
		// municipality's key is a festa's id, so a key naming a coarser region marks nothing.
		const picked = selected;
		const year = new Date().getFullYear();
		const result: MapBoosterBox[] = [];
		for (const festa of windowFestes) {
			const center = centers.get(festa.id);
			if (!center) continue;
			// The show the town flies — its conqueror's, or the build's seed while nobody
			// holds it — and out of its authored entry the two pictures the box carries.
			// The cover is seeded with the same string the pack's is (place|year), so a
			// town's box on the map and in the panel are the same copy of the same show
			// rather than two draws from its enabled posters.
			const show = townShows.get(festa.id) ?? null;
			const entry = show ? (entries.get(show.id) ?? null) : null;
			result.push({
				id: festa.id,
				position: center,
				coverUrl: entry ? showPosterUrlForSeed(entry, `${festa.name}|${year}`) : null,
				logoUrl: entry ? showLogoUrl(entry) : null,
				showId: show?.id ?? null,
				// The mark the disc is stamped with, since a disc is this box with one mark on
				// it instead of four. Drawn here rather than in the map, which has no reason to
				// know what a show looks like.
				iconSvg: forShow($showGlyphs, show?.id),
				locationName: festa.name,
				light: today.has(festa.id),
				// The same key the sheet's boxes are marked with, off the same festa: this
				// town's box, for the year of the festa it is printed for, on the stock that
				// festa gives it.
				claimed: spent.has(
					claimedBoxKey(festa.id, festaYear(festa.date), boxForFesta(festa.date, todayIso))
				),
				// The whole box on the picked town alone; every other town of the window is
				// its disc, at every zoom that marks towns. The map carries days of festes at
				// once, and a cover on each of them is a wall of covers with no country left
				// under it — the same reason only the picked town stands its side up.
				selected: festa.id === picked,
				onClick: () => openPack(festa.id),
				// A disc is a dot on a town the reader has not picked, so a click on it opens
				// that town on the map exactly as its pin would, rather than raising the pack
				// of a town they were only pointing at — and opening it is what unfolds the
				// disc into the box, whose click is the pack's.
				onDiscClick: () => open(festa.id)
			});
		}
		return result;
	})();

	// The same crop, asked by town — which is how everything that wants one asks: a pin is
	// built for a place and wants that place's box, not a list to search. The list itself is
	// still what they are built as, since which cover a box is printed with is settled over
	// every town at once.
	$: festaBoxById = new Map(festaBoxes.map((box) => [box.id, box]));

	// --- The radar ------------------------------------------------------------------------
	// Where the search starts from: the open place's own centre, or the middle of the view
	// when nothing is open. Both are "here" — a reader with a town open is standing on that
	// town, and one who has only panned there is standing wherever they panned to — and the
	// distinction matters, since the centre of a view framed on a town is not quite the town.
	// A coarser region works as a starting point too, being the middle of what is on screen.
	$: radarFrom = (selected ? regionGeometry.centers.get(selected) : null) ?? currentCenter;

	// The box the radar would take the reader to right now: the nearest one they have not
	// opened, on a town other than the one they are already on. Null when the window holds
	// nothing left for them, which is what disables the press rather than a press that
	// silently does nothing. Recomputed as the view moves, so the answer is always about
	// where the map is now.
	$: radarTarget = nearestUnclaimedBox(radarFrom, festaBoxes, selected);

	// The radar's press: open that town exactly as its pin, its crumb or its table row would,
	// which frames the map onto its polygons and stands its box up in the column beside it.
	// Nothing is claimed and nothing is raised — the reader asked where to go, not for the
	// pack.
	function findNearestBox(): void {
		if (radarTarget) open(radarTarget.id);
	}

	// Show a town's pack: open the town on the map, remember which town, and raise the booster
	// modal, which mounts the opener with that pack already stood up.
	//
	// A box is clicked where the town is, so the click is a click on the town as much as
	// on its pack: `open` points the URL at the municipality exactly as a pin, a crumb or
	// a table row does, which frames the map onto its polygons — so the map is left framed on
	// the place the pack belongs to, waiting behind the pack and there again when it closes.
	function openPack(id: string): void {
		clearPackFeedback();
		// The click is a click on the town either way, so the map goes there either way.
		open(id);
		// What a visitor gets instead of the pack. A pack is claimed against an account —
		// the roll, the allowance and the cards are all the server's, keyed to whoever is
		// asking — so opening the box for somebody with no account would stand a pack up
		// only to have it say sign in. The box is the offer; the door is what has to be
		// answered first. (`signedOut` and not an empty profile: see buildTownChallenge.)
		if (signedOut) {
			openSignIn();
			return;
		}
		packTownId = id;
		packRaisedOnTown = true;
		boosterModalOpen.set(true);
	}

	// The menu had a row that raised the same sheet on the whole window's grid instead, and it
	// has not: a pack belongs to a town, and the way to one is the box the map stands on that
	// town. The window is still all there behind whichever box was clicked — the sheet is
	// handed every pack in it and walks back out to the grid (see BoosterModal's `back`) — it
	// is only no longer a thing that can be asked for from a menu.

	// How the sheet that is up was raised. Held rather than read off the pick, because the pick
	// moves while the sheet is up — a box is stood back down, another is picked out of the grid
	// — and what the sheet was raised for does not. It is what lets a sheet raised on one box
	// give itself over to that box (see BoosterModal's `single`). Only a box raises one now, so
	// it is set and never unset; it is kept as the thing the modal is told rather than folded
	// into a `true` written at the call site, since what it says is why the sheet is up.
	let packRaisedOnTown = false;

	// --- Which packs the booster modal shows --------------------------------------
	// Every festa major in the booster window — three days back through four days
	// ahead of today, today included. A festa major is not a single evening, and the
	// window is what `claim_booster` accepts too, so every pack it lays out is a
	// pack that can actually be opened; nothing here is a preview. The claim panel
	// mounted at the foot of the page assembles them (`claimPacks`).

	// And their art is fetched the moment they exist, which is while the map is being looked
	// at rather than when a box is clicked: the canvas that draws them builds every box before
	// it shows any, so a sheet raised on a cold window stands there empty for as long as the
	// whole window's posters take (see preloadPackArt). Nothing waits on this and nothing is
	// told when it finishes — it is a head start, and the canvas asks for the same pictures
	// whether or not it finds them waiting. `claimPacks` is named directly so a window that
	// lands late, or changes, is warmed too.
	$: void preloadPackArt(claimPacks);

	// Today in Catalan time, the same day boundary the server measures the window from —
	// and what each town's festa is read against to say which of its two boxes the map is
	// standing on it (see `festaBoxes`).
	const todayIso = catalanTodayIso();
	const packWindow = boosterWindow(todayIso);

	// The window written out, both ends of it. The dates stay Catalan whatever the
	// sentence around them is set in — a festa major is dated by the Catalan calendar
	// the map is about, not by the reader's locale — and are formatted at midday UTC so
	// neither can slip onto its neighbour, with a CSS-capitalised first letter since
	// Catalan month names come out lowercase.
	const packDateFormat = new Intl.DateTimeFormat('ca-ES', {
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	});
	const formatPackDate = (iso: string): string => packDateFormat.format(new Date(`${iso}T12:00:00Z`));
	// Re-derived rather than fixed at load, so the sentence follows the language while the
	// two dates it is built from never move.
	$: packWindowLabel = $_('booster.window', {
		values: { from: formatPackDate(packWindow.from), to: formatPackDate(packWindow.to) }
	});

	// Why the last roll was refused (empty when it wasn't), as the hidden claim panel
	// reports it back. The server is what enforces every rule — each refusal in
	// `claim_booster` (signed out, town de festa outside the window, its box already
	// taken, a show with no claimable characters) surfaces here, and the pack reveals no
	// cards. Shown on the booster sheet, because a pack that opens onto nothing has to
	// say why.
	let claimError = '';

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
		// Nothing to re-read here: the claim panel re-reads the boxes this player has
		// taken the moment one is opened, and the count on the bar is derived from the
		// packs it hands out.
	}

	// The pack a map box click stands up, picked out of the window's full set. Null when
	// no box has been clicked, the player is signed out, or the town has no claimable show
	// yet — the last of which is the only case the modal has anything to say about, since
	// a town clicked on the map is a town the player expected a pack from. The grid
	// itself works off the same id, so this is read only to tell that case apart.
	$: packForTown = packTownId
		? (claimPacks.find((pack) => pack.id === packTownId) ?? null)
		: null;

	// A box was clicked on a town the window holds no pack for — what the modal prints in
	// place of the grid.
	$: townHasNoPack = !!packTownId && !packForTown;

	// A pin frame's fill per region colour: the same six swatches the cards, the
	// avatar rings and the combat buttons paint with, each with the ink that reads
	// on it — yellow is the one light enough to want black — plus the grey a place
	// nobody holds is painted in, which is no card's colour and is spelled at the
	// same 500 weight as the rest so an unheld tile sits at the same depth as a held
	// one. The literals live with the rest of the palette (see spawn-colors), because
	// this map is no longer the only surface tiling a region: a player's public profile
	// page lists the towns they hold with the very rows of the column beside this map,
	// and a second copy of the six is how two of them come to disagree.
	const pinColorClasses = REGION_PANEL_CLASSES;

	// The side sitting on each town, by municipality id: whoever holds it, else the
	// team its seed rolls — the very fallback the panel draws for the open town, asked
	// here of every town at once so a pin can show who is standing on it. The roll is
	// stable per municipality, so a town nobody has taken always fields the same three.
	//
	// A town whose show has no roster loaded yet (the assignment comes from Supabase)
	// simply has no team, and its pin falls back to the show's glyph rather than
	// showing an empty frame.
	function buildTownTeams(
		seeds: ReadonlyMap<string, number>,
		shows: ReadonlyMap<string, RegionShow>,
		pools: ReadonlyMap<number, string[]>,
		occupied: ReadonlyMap<string, MunicipalityHolder>
	): Map<string, TeamMemberRoll[]> {
		const teams = new Map<string, TeamMemberRoll[]>();
		for (const [id, show] of shows) {
			const seed = seeds.get(id);
			if (seed == null) continue;
			const team = buildMunicipalityTeam(seed, pools.get(show.id) ?? [], TEAM_SIZE);
			if (team.length > 0) teams.set(id, team);
		}
		for (const holder of occupied.values()) {
			if (holder.team.length > 0) teams.set(holder.locationId, territoryAdapter.toTeamRolls(holder.team));
		}
		return teams;
	}

	$: townTeams = buildTownTeams(municipalitySeeds, showsById, showCharacterIds, holders);

	// The one town that stands its side up on its pin: the selected municipality, and only
	// while it has a side to stand. Every other pin keeps the show's glyph.
	//
	// A team on the map is three cards' worth of picture, and every town wearing one at
	// once is a terrain of cards with no map left under it. On the town being looked at it
	// is the point — who is holding this, standing where they are holding it — so the map
	// says it exactly there and nowhere else, with what can be *done* about it (see
	// townChallenge) at the foot of the same pin. Nothing about a picked town is said in
	// the map's corner, and nothing is drawn between the two.
	//
	// Read off the clicked selection rather than `openRegion`, and not only because a
	// zoom focus is not a choice of town: `openRegion` falls back to the focus, the focus
	// is measured from the pins, and pins that moved with it would be deciding what they
	// are drawn from. The two agree on a municipality in any case — the focus opens the
	// tier ABOVE its pins, so only a click ever names one. A key naming a coarser region
	// simply isn't in `townTeams` and lands the same as no selection.
	$: statuedTown = selected && townTeams.has(selected) ? selected : null;

	// The side holding that town, in the shape the statues take: who they are, the colour
	// they bend, where the card itself is from and what show it flies. Built here rather
	// than in the pin because which three they are is the town's question and not the
	// mark's, and handed to the marker as plain data (see buildMarkers).
	type PinTeam = NonNullable<MapMarker['team']>;

	function buildPinTeam(
		town: string | null,
		teams: ReadonlyMap<string, TeamMemberRoll[]>,
		nodes: RegionNode[],
		placeNames: Map<string, string> | null,
		memberShows: ReadonlyMap<string, number[]>
	): PinTeam {
		if (!town) return [];
		const standingIn = restoreCatalanArticle(findNode(nodes, town)?.name ?? '');
		return (teams.get(town) ?? []).map((member) => ({
			label: charactersById.get(member.characterId)?.label ?? member.characterId,
			basePath: charactersById.get(member.characterId)?.basePath ?? null,
			color: member.color,
			// Where the card itself is from, not where it is standing (see memberPlace): a
			// claimed card carries its own town about with it.
			locationName: memberPlace(member, standingIn, placeNames),
			// The character's own show, not the town's: a held town fields the occupier's
			// cards, and marking their floor with the town's show would be a lie — the same
			// rule the sidebar's cards follow.
			showId: memberShows.get(member.characterId)?.[0] ?? null
		}));
	}

	$: pinTeam = buildPinTeam(
		statuedTown,
		townTeams,
		regionNodes,
		municipalityNames,
		showsByCharacter
	);

	// What the picked town's pin says under the side standing on it: how far this player has
	// got towards taking the place, and the one control that acts on it — the siege counter
	// and the challenge button, which used to sit in the sidebar's Location tab and then on a
	// plate at the map's corner. They belong on the pin: what is being fought is standing
	// right there, and reading the odds off one side of the screen while looking at the town
	// on the other made two things of one.
	//
	// Rebuilt off `statuedTown` for the same reason the statues are: the zoom focus is
	// measured from the pins, so nothing the pins are drawn from may be measured back off it.
	//
	// Null hides the bar entirely: no town selected, or one this player already holds —
	// there is nothing to take from yourself, which is exactly when the sidebar says
	// "Yours" instead.
	//
	// The wording is chosen here because the choice of control is: which of the three
	// things a pin can say is the same decision as which state the town is in, and that
	// is this page's to make. So the formatter is threaded in as an argument rather than
	// read off the closure — the statement below has to name it to re-derive when the
	// language changes, and a call this function made on its own would not be seen.
	// (svelte-i18n exports no name for the formatter's type, so it is read off the store
	// it is the value of, which cannot drift from it.)
	function buildTownChallenge(
		town: string | null,
		occupied: ReadonlyMap<string, MunicipalityHolder>,
		banked: ReadonlyMap<string, MunicipalitySiege>,
		cooling: ReadonlyMap<string, MunicipalityChallenge>,
		player: Profile | null,
		battle: OpenBattle | null,
		starting: boolean,
		canField: boolean,
		visitor: boolean,
		t: Translate
	): MapChallenge | null {
		if (!town) return null;
		const holder = occupied.get(town) ?? null;
		if (holder && player && holder.userId === String(player.id)) return null;

		const progress = territoryService.progressFor(town, occupied, banked);
		const siege = { wins: progress.wins, required: progress.required };

		// Nobody signed in: the control is the way in rather than the way to a fight. It
		// said "your team needs three cards you have claimed" and was dead, which is a
		// true sentence answering a question a visitor has not been let near yet — the
		// thing standing between them and this town is not their team, it is not having
		// an account. So the button is live and it opens the door (see SignInModal).
		//
		// Asked of the session's own state and not of an empty profile: a visit with an
		// account on disk has no profile for a moment, and a control that offered to sign
		// them in in that moment would be offering it to somebody already signed in.
		if (visitor) {
			return {
				siege,
				button: {
					label: t('map.challenge.start'),
					title: t('combat.signInTitle'),
					disabled: false,
					onClick: openSignIn
				},
				unlocksAt: null
			};
		}

		// A fight already in progress takes the control over, whichever town is picked:
		// there is only ever one battle, and this is the way back into it rather than
		// the way into another.
		if (battle) {
			return {
				siege,
				button: {
					label: t('map.challenge.resume'),
					title: t('map.challenge.resumeTitle'),
					disabled: false,
					onClick: resumeBattle
				},
				unlocksAt: null
			};
		}

		// A town just fought is shut for an hour, and the control gives way to the time
		// left on it — the deadline the server set when it took the report, not a
		// duration counted here. When it runs out the cooldowns are re-read, which
		// brings the button back. The server enforces it either way (`start_battle`).
		const coolingUntil = challengeAvailableAt(cooling.get(town));
		if (coolingUntil !== null) {
			return {
				siege,
				button: null,
				unlocksAt: coolingUntil,
				onUnlock: () => void reloadChallenges()
			};
		}

		return {
			siege,
			button: {
				label: t('map.challenge.start'),
				title: canField
					? t('map.challenge.startTitle')
					: t('map.challenge.noTeam', { values: { size: TEAM_SIZE } }),
				disabled: starting || !canField,
				onClick: () => void challenge()
			},
			unlocksAt: null
		};
	}

	$: townChallenge = buildTownChallenge(
		statuedTown,
		holders,
		sieges,
		challenges,
		$profile,
		$openBattle,
		challengeStarting,
		canFieldTeam,
		signedOut,
		$_
	);

	// The same counter for every region there is, not just the picked town — because every
	// pin now carries its bar. A siege is a municipality thing, so a grouping's is the sum of
	// the towns under it: what taking the whole comarca would cost and how far its towns have
	// got, which is why a parent's bar always agrees with the bars found by drilling into it.
	//
	// One post-order pass over the whole tree per change of the holder/siege sets, rather
	// than a lookup per pin per tier — every tier's pins are drawn from this one map.
	$: regionSieges = buildRegionSieges(regionNodes, holders, sieges);

	// One pin per region that has a show, dropped at the centre of the region's
	// bounding box, captioned with the show and tooltipped with the region name;
	// clicking a pin opens that region. Pins clear of the selection are flagged
	// `dimmed` so the map fades them rather than dropping them.
	//
	// The SELECTED town's pin shows the side sitting on it — the three characters
	// themselves, each on their own colour. Every other pin carries the show's glyph:
	// the same icon the panel's
	// tables badge a show with, not its poster, because a poster is a tall photographic
	// rectangle that reads as a picture dropped on the map while the flat monochrome
	// glyph reads as a marking of the territory. A show with no glyph drawn yet keeps
	// its pin and shows by name alone, exactly as it does in those tables, and the frame
	// behind the glyph is filled with the region's colour, so such a pin says both what
	// a region flies and in which colour it flies it.
	/**
	 * Where a statue on a pin says it is from: the card's OWN claim town, never the
	 * one it happens to be standing on. A holder's team is three cards claimed
	 * wherever their player pulled them, and a card belongs to its place — a town it
	 * was marched to and won does not rewrite that.
	 *
	 * A seeded roll carries no claim (it was never pulled anywhere — it IS the town's
	 * house team), and neither does a holder row frozen before the RPC copied the
	 * claim across; both say the town they stand on. So does a real claim whose name
	 * hasn't loaded yet, which keeps a statue from flashing "Ultramar" at a town it
	 * knows perfectly well while the layer arrives.
	 */
	function memberPlace(
		member: TeamMemberRoll,
		standingIn: string,
		names: Map<string, string> | null
	): string {
		if (!member.locationId) return standingIn;
		if (member.locationId === ULTRAMAR_ID) return ULTRAMAR.municipality;
		const name = names?.get(member.locationId);
		return name ? restoreCatalanArticle(name) : standingIn;
	}

	// Every pin at one tier — built, and one of them drawn (see `hidden` below). What a pin
	// said is what the column beside the map now says, and says of the whole level rather
	// than of the part of it a given zoom happens to fit; the exception is the place that
	// has been picked, which is worth a mark where it stands. The rest are still built
	// because everything else about the map is measured through them — which region the view
	// is focused on, what a click on the land opens, how a framing is fitted — so a pin is a
	// model of a place on screen whether or not there is a plate on the terrain for it.
	//
	// What a pin carries is what it is handed, which is how one function serves both the
	// mark on the map and the pin the column stands up (see townPin): the column asks with
	// the sieges and the holders and the side, and gets the whole plate with everything
	// under it; the map asks with none of them, and gets the plate alone — the show's mark,
	// the place's name and the show's name. Neither is a stripped-down version of the other,
	// and neither had to be told which it was.
	//
	// The dressings, for whoever is asking with them: the
	// picked town gets the side holding it standing under its plate, and the way to fight
	// them on it — who is holding this, standing on the very place they are holding, and
	// what to do about it. All of it is added to that pin and takes nothing away from it,
	// so the mark on the town is the same mark whichever town is picked. The statues and
	// the control are handed in already built (see pinTeam and townChallenge), since which
	// three they are and what may be done about them are the page's questions and not the
	// pin's.
	//
	// The siege bar is on every MUNICIPALITY pin, picked or not: how far a place has been
	// taken is something the place says about itself, and reading it on one town at a time
	// made the standing look like a property of being selected. So the bar comes off
	// `sieges`, which has a counter for every region (see regionSieges), and the picked
	// town's bar is the same bar with a control under it.
	//
	// And on a municipality alone, because a town is the only thing anybody takes. A comarca
	// or a province is not held by a player — what it has is towns under it, some of them
	// taken and some not — so a bar across a comarca's pin was a progress towards nothing,
	// read at a tier where nothing can be fought for. The coarser tiers say what they are and
	// what they fly, and the standing appears when the map has got down to a place that has
	// one.
	//
	// Who holds the town is on every municipality pin for the same reason and with the same
	// bounds: being occupied is a fact about the place, not about its being picked, and a
	// place only a town can be. It is read off `holders` — the occupant's live name and worn
	// avatar, joined on in Supabase — so a town nobody has taken yet says nothing about a
	// holder, its seeded house team being no player's.
	function buildMarkers(
		nodes: RegionNode[],
		geometry: RegionGeometry,
		relevant: Set<string> | null,
		statuedTown: string | null,
		statues: PinTeam,
		challengeBar: MapChallenge | null,
		sieges: ReadonlyMap<string, RegionSiege>,
		occupied: ReadonlyMap<string, MunicipalityHolder>,
		glyphs: ReadonlyMap<number, string>,
		offers: ReadonlyMap<string, MapBoosterBox>,
		pinned: string | null
	): MapMarker[] {
		const pins: MapMarker[] = [];
		for (const node of nodes) {
			if (!node.show) continue;
			const box = geometry.boxes.get(node.key);
			const center = geometry.centers.get(node.key);
			if (!box || !center) continue;
			pins.push({
				id: node.key,
				// On the region's own shape, not in the middle of the box around it.
				position: center,
				bounds: box,
				// The whole side, but on the picked town alone — every other pin, and every
				// tier above the towns, is its plate by itself. Only a municipality's key is
				// a municipality id, so the coarser tiers never match.
				team: node.key === statuedTown ? statues : [],
				// The picked town's bar, control and all, where the page has built one — what
				// is being fought is standing right there. Every other TOWN, and the picked one
				// on a day there is nothing to be done about it (a town already this player's,
				// which is when buildTownChallenge hands back nothing), gets the standing by
				// itself: a bar with no button under it. A pin above the towns gets neither.
				challenge:
					node.type === 'Municipality'
						? ((node.key === statuedTown ? challengeBar : null) ?? siegeBar(node, sieges))
						: null,
				// Whoever is sitting on this town, on the plate that names it. Only a
				// municipality's key is a municipality id, so the coarser tiers never match
				// and are never asked.
				holder: node.type === 'Municipality' ? pinHolder(node.key, occupied) : null,
				// What the town has waiting, where the booster window reaches it — the same
				// lookup by the same key, and for the same reason it is the town tier alone: a
				// festa is a day in a town, and no coarser region has one.
				box: offers.get(node.key) ?? null,
				iconSvg: forShow(glyphs, node.show.id),
				frameClasses: node.color ? pinColorClasses[node.color] : null,
				title: node.show.name,
				subtitle: restoreCatalanArticle(node.name),
				featureIds: geometry.muniIds.get(node.key) ?? [],
				dimmed: relevant ? !relevant.has(node.key) : false,
				// Built like any other and drawn for one place only: the region that has been
				// picked, which is what a caller building that one pin on its own asks for (see
				// buildPickedMarker) and what a caller building a whole tier never does — a level
				// of the stack is the model of the breakdown and puts no plate on the terrain at
				// all, since the one mark drawn has to outlive the level it is a member of.
				// Every other pin is left off the map — the pin is still the tier's,
				// still measured for where the view is looking, still what a click on the land
				// is resolved through and still what lights its region when its polygons are
				// pointed at; there is simply no plate standing on the terrain for it, because
				// what a plate said is read in the column beside the map now, of the whole level
				// at once. The one exception is the place being looked at, which is worth saying
				// where it is standing as well as in the column: the shape breathing under it
				// says which shape, and the plate on it says which place.
				//
				// Said here, on the mark itself, rather than by keeping only one marker: the
				// tiers ARE the map's model of what is on screen (see buildMarkerLevels), and a
				// map with pins missing would have gaps in its focus, its click resolution and
				// its framing. This is the one flag that separates being modelled from being
				// drawn, and it is what it was built for.
				hidden: node.key !== pinned,
				onClick: () => open(node.key)
			});
		}
		return pins;
	}

	/**
	 * What a town's pin says about its occupant: what to call them and the avatar they
	 * are wearing. Null for a town nobody has taken — there is no player to name, and a
	 * seeded house team is not somebody's.
	 *
	 * Both are the holder's *current* ones, joined onto the holder row in Supabase
	 * rather than frozen onto the town when it was won (see municipality_holders.sql),
	 * so renaming yourself or changing your face changes every town you hold. The
	 * avatar's two halves travel together because an avatar is the pair; both null is
	 * the initial-letter avatar, which the pin draws off the name.
	 */
	function pinHolder(
		key: string,
		occupied: ReadonlyMap<string, MunicipalityHolder>
	): MapMarker['holder'] {
		const holder = occupied.get(key);
		if (!holder) return null;
		return {
			name: holder.holderName,
			characterId: holder.avatarCharacterId,
			color: holder.avatarColor
		};
	}

	/**
	 * The card the arena prints over its board: the town being fought for, on the very plate
	 * its pin carries on the map (see TownPlate). The same glyph, the same colour, the same
	 * two lines, whoever is sitting on it and how far it has been taken — so what stands over
	 * the fight is the mark that was pressed to start it, rather than a second wording of one
	 * town assembled for the arena.
	 *
	 * Built from the same readings the pins are (`pinHolder`, `siegeBar`), and off the town's
	 * own node, so the card cannot say something the map is not saying. The standing comes
	 * from `siegeBar`, which is the bar with nothing under it: a fight already under way has
	 * no challenge left to offer, and the button is what would have offered it.
	 *
	 * Nothing for a fight over no town — the classic match against a mirror of the player's
	 * own team — and nothing for a key that is not a municipality's, towns being the only
	 * thing anybody holds.
	 */
	function buildFightPlate(
		key: string | null,
		nodes: RegionNode[],
		sieges: ReadonlyMap<string, RegionSiege>,
		occupied: ReadonlyMap<string, MunicipalityHolder>,
		glyphs: ReadonlyMap<number, string>
	): TownPlateCard | null {
		if (!key) return null;
		const node = findNode(nodes, key);
		if (!node || node.type !== 'Municipality' || !node.show) return null;
		return {
			iconSvg: forShow(glyphs, node.show.id),
			frameClasses: node.color ? pinColorClasses[node.color] : null,
			title: node.show.name,
			subtitle: restoreCatalanArticle(node.name),
			holder: pinHolder(key, occupied),
			challenge: siegeBar(node, sieges)
		};
	}

	$: fightPlate = buildFightPlate(fightLocationId, regionNodes, regionSieges, holders, $showGlyphs);

	// A pin's siege standing on its own: the counter this region carries, and nothing to
	// press. Null where there is no counter to draw — a region with no towns under it, and
	// so nothing to take, which a bar of nought out of nought would say worse than not
	// drawing one.
	function siegeBar(
		node: RegionNode,
		sieges: ReadonlyMap<string, RegionSiege>
	): MapChallenge | null {
		const counter = sieges.get(node.key);
		if (!counter || counter.required <= 0) return null;
		return { siege: { wins: counter.wins, required: counter.required }, button: null, unlocksAt: null };
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
		relevant: Set<string> | null,
		statuedTown: string | null,
		statues: PinTeam,
		challengeBar: MapChallenge | null,
		sieges: ReadonlyMap<string, RegionSiege>,
		occupied: ReadonlyMap<string, MunicipalityHolder>,
		glyphs: ReadonlyMap<number, string>,
		offers: ReadonlyMap<string, MapBoosterBox>,
		pinned: string | null
	): MapMarker[][] {
		const levels: MapMarker[][] = [];
		for (let d = 0; d <= depth; d++) {
			levels.push(
				buildMarkers(
					frontierAtDepth(d, nodes),
					geometry,
					relevant,
					statuedTown,
					statues,
					challengeBar,
					sieges,
					occupied,
					glyphs,
					offers,
					pinned
				)
			);
		}
		return levels;
	}

	// Nothing about a siege and nothing about an occupant: the map's own pins are told the
	// plate's three facts and no more, so the one that is drawn carries the show's mark, the
	// place's name and the show's name and stops there. Whose the place is, how far it has
	// been taken and what may be done about it are read in the column beside the map, where
	// there is room for them and where they stand for the place that was picked rather than
	// for whatever the zoom has drifted over. Empty maps rather than a flag, because what a
	// pin says has always been what it was given.
	const NO_SIEGES: ReadonlyMap<string, RegionSiege> = new Map();
	const NO_HOLDERS: ReadonlyMap<string, MunicipalityHolder> = new Map();

	$: markerLevels = buildMarkerLevels(
		maxLevel,
		regionNodes,
		regionGeometry,
		relevantKeys,
		null,
		[],
		null,
		NO_SIEGES,
		NO_HOLDERS,
		$showGlyphs,
		festaBoxById,
		null
	);

	// The picked place's own pin, built exactly as the tier's are and handed to the map beside
	// them (see WorldMap's `pickedMarker`), which is what keeps it standing at every zoom.
	//
	// Not one of the stack's own any more, and not because the stack could not carry it: it
	// carried it, in the one level the place is a member of, and lost it the moment the wheel
	// folded that level up — the mark the reader asked for by name being the first thing the
	// zoom took away. So the levels are the model of the breakdown, whole and every pin of them
	// left off the terrain (`pinned` is null above), and the one mark drawn is this, over
	// whichever level is on screen. It is the same function building both: this one is asked
	// with the place named as the pinned one, so it comes back the one pin the map draws.
	//
	// Nothing about a siege or an occupant here either, for the reason the levels have none:
	// the plate on the terrain says the show's mark, the place's name and the show's name, and
	// the column beside the map says the rest.
	function buildPickedMarker(
		key: string | null,
		nodes: RegionNode[],
		geometry: RegionGeometry,
		relevant: Set<string> | null,
		glyphs: ReadonlyMap<number, string>,
		offers: ReadonlyMap<string, MapBoosterBox>
	): MapMarker | null {
		if (!key) return null;
		const node = findNode(nodes, key);
		if (!node) return null;
		return (
			buildMarkers(
				[node],
				geometry,
				relevant,
				null,
				[],
				null,
				NO_SIEGES,
				NO_HOLDERS,
				glyphs,
				offers,
				key
			)[0] ?? null
		);
	}

	$: pickedMarker = buildPickedMarker(
		selected,
		regionNodes,
		regionGeometry,
		relevantKeys,
		$showGlyphs,
		festaBoxById
	);

	// Every town's feature id → the pin standing over that town on the tier the map is
	// drawing right now. A pin carries the municipality ids of everything under it
	// (`featureIds`), so this is the same lookup the map builds to light a whole region when
	// one of its towns is pointed at, read off the level the map says it has settled on
	// (`activeLevel`, mirrored here as effectiveDepth).
	//
	// Every pin is hidden now (see buildMarkers), which changes nothing here and is the point:
	// a pin is the model of a place on screen whether or not a plate is drawn for it, so the
	// land goes on opening exactly what the plate would have opened.
	$: pinByFeatureId = ((pins: MapMarker[]) => {
		const byFeature = new Map<string, MapMarker>();
		for (const pin of pins) {
			for (const id of pin.featureIds ?? []) byFeature.set(id, pin);
		}
		return byFeature;
	})(markerLevels[effectiveDepth] ?? []);

	// What a click on the land does: whatever the pin over it does. Not a handler of its own
	// that happens to agree with the pin's — the pin's very own, called off the marker, so the
	// two can never be taught different things about what opening a region means.
	//
	// A shape whose pin is not on the map answers nothing: at a tier the town is not pinned at,
	// the pin over it is its comarca's or its territory's, and that is the one that is called.
	function openFeature(feature?: GeoJSON.Feature) {
		const id = featureKey('Municipality', feature);
		if (!id) return;
		pinByFeatureId.get(id)?.onClick?.();
	}

	// The bounding box the map fits when a region is selected: the union of every
	// municipality polygon under the selected key. A fresh array each time (even
	// re-selecting the same region) so the map re-frames on every pick. Null while
	// nothing is selected, leaving the map where it is.
	//
	// The top view frames every town there is, because a crumb click frames what the crumb
	// names and that crumb names the lot of them. Without this the panel would have said the
	// territories while the map stayed down in the comarca the player was leaving.
	// A pick is named as a dependency rather than only the region it picked, because the two
	// are not the same statement: picking the region already open leaves the URL exactly as it
	// was, so `selected` never dirties and the box would never be rebuilt — which is a press
	// that does nothing on the one crumb whose whole job is to bring the map back to the place
	// it names, and on the pin of a town already open.
	function boundsToFrame(
		pick: number,
		features: GeoJSON.FeatureCollection | null,
		top: boolean,
		key: string | null,
		index: Parameters<typeof municipalityIdsForKey>[0]
	): LatLngBounds | null {
		void pick;
		if (!features) return null;
		if (top) return boundsForFeatures(features, new Set(index.keys()));
		if (key) return boundsForFeatures(features, municipalityIdsForKey(index, key));
		return null;
	}

	$: focusBounds = boundsToFrame(picks, municipalities, topPicked, selected, fillIndex);

	// The box the map is zoomed to fit without being moved to — what an empty position on the
	// breadcrumb ladder asks for. Set on the press and never cleared: a fresh array is what the
	// map re-zooms on, so the same tier pressed twice is two arrays and two zooms.
	let zoomBounds: LatLngBounds | null = null;

	// The whole ladder of regions the map centre stands in, root down to the town — the finest
	// pins are the ones that reach every branch, so the path to the one nearest the centre is
	// the path this view is inside. A bar's own crumbs stop where its path stops; this goes all
	// the way down, because a tier the bar has not reached is exactly the one an empty position
	// asks to be taken to.
	$: centrePath = focusedPath(maxLevel, markerLevels, currentCenter, regionNodes);

	// The whole map as one box: the coarsest rung of that ladder, and what a tier asked for
	// with nothing under the centre falls back to.
	$: wholeMapBounds = municipalities
		? boundsForFeatures(municipalities, new Set(fillIndex.keys()))
		: null;

	// The same ladder as boxes, coarsest first — the whole map, then every region the centre
	// stands in down to its town. The map turns each into the zoom it stands whole at and rests
	// the wheel on those and nothing between them, so a spin walks the tiers and stops where
	// the bar's own positions are pressed for (see zoomToTier, which fits the same boxes).
	$: zoomStops = ladderBoxes(centrePath, regionGeometry, wholeMapBounds);

	function ladderBoxes(
		path: RegionNode[],
		geometry: RegionGeometry,
		all: LatLngBounds | null
	): LatLngBounds[] {
		const boxes: LatLngBounds[] = all ? [all] : [];
		for (const node of path) {
			const box = geometry.boxes.get(node.key);
			if (box) boxes.push(box);
		}
		return boxes;
	}

	// Take the map to the zoom a tier is read at, leaving the centre where it is: press the
	// comarca position and the bar's comarca position is the one that fills.
	//
	// So the box to fit is that tier's OWN region under the centre, not the region above it.
	// The two are a tier apart and it is the same tier twice over, which is why: what the bar
	// names is the region the view is INSIDE, and what the map pins is that region's parts (see
	// levelIndexForView) — so the view that fills the comarca position is the one framed on a
	// comarca, which is pinning its towns. Fitting the province instead is the view that *pins*
	// comarques, and its deepest crumb is the province — a position short of the one pressed,
	// which is a bar asking to be pressed twice.
	//
	// It is a test of a region's size and not of where it sits, which is why nothing here has
	// to move the view: the same centre at that zoom is inside the same region.
	//
	// A tier the place under the centre does not have resolves to the box of the nearest tier
	// above it, which is the truth about it: at Andorra there is no comarca between the
	// territory and the towns, so its comarca position is the territory's own zoom.
	function zoomToTier(word: string) {
		const tier = tierByWord.get(word);
		if (!tier) return;
		const down = centrePath.filter((node) => tierRank[node.type] <= tierRank[tier]);
		const container = down[down.length - 1] ?? null;
		// Nothing under the centre at that tier or above it means there is no path under the
		// centre at all — the polygons are still loading, or the view is out at sea. The whole
		// map is the box then, which is where a bar with nothing in it belongs.
		const bounds = container ? (regionGeometry.boxes.get(container.key) ?? null) : wholeMapBounds;
		if (!bounds) return;
		// The bar only follows the zoom while nothing is picked (see openRegion), so a tier
		// asked for while a region is open hands the view back to the zoom first — otherwise
		// the map would move under a bar frozen on the click that is being left behind.
		if (regionParam) open(null);
		zoomBounds = [
			[bounds[0][0], bounds[0][1]],
			[bounds[1][0], bounds[1][1]]
		];
	}

	// Selecting a region doesn't recolour its polygons — a shape's colour says which
	// region it belongs to, not which one is open — it only brings the shape's own wash
	// forward (see tierStyle), on top of the framing (focusBounds) and the pins, which
	// still fade outside it.

	// --- The map's furniture, while a full view is up ------------------------------
	// A sheet raised over the map covers the viewport, and everything the map draws over its
	// terrain — the breadcrumb bar, the corner the side and the account stand in, and every pin
	// and box out there — is furniture nobody is reading for as long as one is. So it goes out
	// of focus while a sheet is up and comes back when it leaves: the map is still the ground
	// the sheet is laid on (the sheets are graded rather than opaque, see FullScreenModal), and
	// a bar of crumbs read sharply through one is chrome competing with the thing it was covered
	// by. The terrain and the polygons are untouched — what blurs is what stands on them.
	//
	// Which sheet is up is nobody's business here: FullScreenModal says so from its own mount
	// (see `$services/fullScreenModal`), so the map answers a sixth sheet as it answers these
	// five. The count drops after the sheet's slide-out has played, so the furniture sharpens
	// behind a view that has already gone rather than under one still on its way down.
	//
	// The plates are Svelte's DOM, so they blur as Svelte transitions, out and back in; the pins
	// are Leaflet's and cannot be (unmounting them is a rebuild of every statue on the map), so
	// WorldMap blurs their panes to the same 8px over the same 250ms instead. Keep the three in
	// step — this is one gesture, not three.
	//
	// And the blur is the whole of it: no sheet moves the map itself. The arena leaned it back
	// for the length of a fight, which left the terrain undrawn behind it — a CSS transform on
	// the Leaflet container costs the map its imagery (see WorldMap's container comment) — so
	// what a full view moves is what stands on the map, never the map.
	const CHROME_BLUR = { amount: 8, duration: 250 };

	// The same gesture said in classes instead of a transition, for the chrome that may not leave
	// the document while it plays.
	//
	// A Svelte transition ends in an unmount, and two pieces of this page's chrome stand IN FLOW
	// ABOVE THE MAP — the band across the top of the page and the row of tabs over the terrain.
	// Unmounting either shortens the column the map is measured into, which is a resize, and a
	// resize is the one thing the map cannot be handed for free: WorldMap watches its own box and
	// answers a change with `invalidateSize` + `syncView` + a full rebuild of the pins and the
	// boxes (see its ResizeObserver). So a sheet going up would have re-framed the terrain, and
	// coming down would have re-framed it back — twice per modal, for two rows of furniture that
	// were only ever meant to go quiet.
	//
	// Everything else keeps `transition:blur`, because unmounting it costs the map nothing: the
	// list of places and the account block are grid items in named tracks (`md:col-start-*`,
	// `row-start-*`), which stay exactly where they are with no child in them, and the radar is
	// absolutely positioned inside the map's own pane. Only these two are load-bearing.
	//
	// Same 8px and same 250ms as CHROME_BLUR, and the opacity goes with it because Svelte's blur
	// fades as well — this has to be the same gesture to the eye or the furniture would leave in
	// two different ways. `pointer-events-none` and `inert` are what an unmount was giving for
	// free: a veiled row is still a row, and neither the pointer nor the tab key should reach one
	// standing behind a sheet.
	const CHROME_VEIL = 'transition-[filter,opacity] duration-[250ms]';
	const CHROME_VEILED = 'pointer-events-none opacity-0 blur-[8px]';

	// Nothing about the map has to be measured any more. The furniture that used to be positioned
	// over the terrain — the badge and its marks along the top, the side and the account at the
	// foot — is in flow now: the game's name and the two questions on the page's top row, the side
	// and the account in the third column, the list of places a tab over the terrain. One square
	// went back onto the map afterwards (the radar, top-right), and it changes none of this: a
	// button in a corner is not a band across an edge, so there is still nothing to measure.
	// Three pieces of state went with the move:
	//
	// - `topChromeHeight` / `chromeInsets`. The map was told how tall the band across its top
	//   edge was so it would deal its pins clear of the bar drawn over them. There is no bar over
	//   them: the map has the whole of its own box back, and a measurement of something that is
	//   no longer there is a number that can only go stale.
	// - The column-as-panel on a phone, with `phone`, `columnOpen` and the burger that pulled it.
	//   Below `md` the page is one column and the three parts stand one after the other, so the
	//   list of places is simply the next thing down — and a burger that opens what is already
	//   open is a press with nothing to do.
</script>

<!-- The page is a band and a grid under it: the place the map is open on across the top, and the
	three columns this game is made of below.

	The page never scrolls (`h-screen`, `overflow-hidden`) and the band takes only the height of
	its one row (`flex-none`), so what the grid divides is whatever is left — which is why it is a
	flex column with `min-h-0 flex-1` on the grid rather than the grid being the page. -->
<div class="flex h-screen flex-col overflow-hidden">
	<!-- The page's first row, and it is the whole of what stands over the three columns: the
		game's name at the near end, where the map is and the radio playing for it filling the
		middle, and what the game gets asked at the far end.

		The middle of it was the head of the middle column, over everything else that column had to
		say about the open place — which is a row about all three columns filed under one of them.
		The two ends were the head of the *third* column, which is where they had landed after
		coming off a band laid over the map's top edge; a name and two questions are about the game
		and not about the furniture, so a column of furniture was only ever the nearest shelf. Both
		ends are here now because this row is the one thing on the page that belongs to none of the
		three columns and to all of them.

		The whole width, and its own rule under it: what separates a row from what is under it
		belongs to neither, and the rule stands at both widths because the fold below it changes
		the columns' axis and not this band's.

		`items-stretch` is what makes the four the same height: the marks at the far end are
		squares and the middle is a two-line row, and stretching means the name's plate and the
		squares take whatever height that row comes to rather than a number written here that would
		have to be kept in step with it. The padding is the band's rather than each child's, so the
		four are spaced by one `gap-2` and inset by one `px-2`.

		Veiled with the rest of the map's furniture while a full view is up — a sheet is a place of
		its own and the band names the one it was raised from — but veiled and NOT unmounted, which
		is the one thing about this row that is not a matter of taste: it stands in flow above the
		map, so taking it out of the document would lengthen the column the map is measured into
		and re-frame the terrain on every sheet, both ways. See CHROME_VEIL, which is the same 8px
		over the same 250ms said in classes. -->
	<div
		inert={$fullScreenModalOpen || undefined}
		class={classNames(
			'flex flex-none items-stretch gap-2 border-b-2 border-primary bg-base-100 px-2 py-2',
			CHROME_VEIL,
			$fullScreenModalOpen && CHROME_VEILED
		)}
	>
		<!-- What it says and what size it is set at are two different things: the word is "6xl"
			and the type is `2xl`, one flat size at every viewport rather than a ramp.
			`items-center` centres it in whatever height the row hands this plate (see above);
			`leading-none` so what is centred is the type's own height and not a line box built for
			a paragraph. `font-display` is Bungee, the app's one departure from Genos, and it is the
			token and not the family that is named here (see the `@theme` block in css/app.css).

			The plate is the theme's primary at full strength. It was a bar in a row of bars with a
			path of crumbs beside it, drawn at full strength precisely where that path was drawn at
			80% — a path is a thing being looked through to the map under it; a name is not. What
			stands beside it now is the place the map is open on, which is not a thing to see
			through either, so the two plates read as one statement: this game, and where in it you
			are.

			The same badge is the tab's mark (see static/favicon.ico and the link in app.html), and
			it is drawn differently there on purpose: an icon is a square with room round the word,
			because that is the box a browser gives it. This is a plate in a row of plates — as
			tall as the row makes it, as wide as the word makes it. Neither shape should be made to
			answer for the other.

			It was the tab a column of views dropped from — the player's cards and the album, a row
			each, up while the pointer was on it — and, on a phone, the handle that pulled the list
			of places down over the map. It is neither now: the views are sheets raised from the
			marks at the far end of this row, and the list of places is a tab over the terrain (see
			RegionLocationList). So the plate is only the plate — nothing hangs off it and nothing
			is asked about the pointer — and it is a `<div>` at every width. -->
		<div
			class="flex flex-none items-center gap-3 rounded-lg bg-primary px-3 py-1.5 text-white shadow-xl"
		>
			<!-- The word twice: the same lettering in the panel's surface colour, offset 3px down
				and right, and the word itself over it. A shadow drawn as a copy rather than as a
				`text-shadow`, because a shadow the thickness of this face wants to be the face — one
				solid displaced impression of it, with no blur and no spread, which is what a second
				copy of the glyphs is and what a shadow utility, spelling a colour and a radius, is
				not.
				Both copies are positioned, so the one later in the document paints over the other
				without a z-index: an absolute box would otherwise sit above in-flow type whatever
				order it is written in, and sending it under with a negative z-index would send it
				under the plate's own fill as well, there being no stacking context between them. The
				copy in flow is the one that gives the box its size; `aria-hidden` on the other, since
				a reader hearing "6xl 6xl" is being told about a shadow. -->
			<span class="relative font-display text-2xl leading-none">
				<span class="absolute left-[3px] top-[3px] text-base-100" aria-hidden="true">6xl</span>
				<span class="relative">6xl</span>
			</span>
		</div>

		<!-- Where the map is, and the radio playing for it. It takes the middle because it is the
			one thing on this row that changes: the name at the near end and the questions at the
			far end are the same words all game, and the row reads as a frame round the place you
			are standing in. `min-w-0` so a long town name truncates inside it rather than pushing
			the far end off the edge. -->
		<RegionCurrentBadge
			classes="min-w-0 flex-1"
			row={subdivisionCurrent}
			on:select={(event) => openFromColumn(event.detail.key)}
		/>

		<!-- What the game gets asked, first of the far end, at every width — a question is as
			worth answering on a desktop as on a phone. No `ml-auto` pushing the end over any more:
			the middle of this row is `flex-1` and takes every pixel the four of them do not, so
			these two are held against the far edge by the thing between them rather than by a
			margin.
			A square in the name plate's own fill, drawn to the row's height (`self-stretch
			aspect-square`), with a white game-icons glyph that needs no colour of its own on the
			primary. -->
		<button
			type="button"
			class="flex aspect-square flex-none cursor-pointer items-center justify-center self-stretch rounded-lg bg-primary shadow-xl"
			aria-label={$_('faq.open')}
			on:click={openFaq}
		>
			<img src="/assets/icons/sbed/help.svg" class="size-6" alt="" />
		</button>

		<!-- Who drew the fighters, last on the row. It stands beside the questions because it
			answers one of the same kind — where all this came from — and because the people who
			made these sprites are named on the game's own top row rather than three screens in. A
			palette for a glyph: what the sheet holds is a table of artists. Same square, same fill,
			same white artwork as the mark beside it. -->
		<button
			type="button"
			class="flex aspect-square flex-none cursor-pointer items-center justify-center self-stretch rounded-lg bg-primary shadow-xl"
			aria-label={$_('credits.open')}
			on:click={openCredits}
		>
			<img src="/assets/icons/delapouite/palette.svg" class="size-6" alt="" />
		</button>
	</div>

	<!-- The three columns, and the three are the three things this game is made of:
		the terrain, the list of places, and the furniture. In that order, left to right, each an
		equal third of what the band above has left.

		The third of them used to be drawn ON the first — the badge, the radar and the marks along
		the map's top edge, the side and the account at its foot, all absolutely positioned over the
		canvas with the pointer switched off between them and the map told (in pixels) which band of
		itself was spoken for. It is a column now: in flow, positioned relatively, sized by the grid
		like its neighbours. That is what takes the `pointer-events-none`/`-auto` pairs and the
		measured `chromeInsets` out of this page in one go — none of them were about what the
		furniture says, only about it standing somewhere it did not belong. Its head has since left
		the column too: the name and the two questions are the page's top row, and the radar is the
		one square that went back onto the terrain, `z-[900]` and all, because a control that moves
		the map is the map's (see the map column above).

		Below `md` the three fold into one column and stand one after the other, top to bottom in the
		same order: the map, the places, the furniture — a third of the HEIGHT each, where from `md` up
		they take a third of the width each. So the phone's arrangement is the desktop's turned on its
		side, in the strict sense: the same three boxes, the same three shares, the axis swapped. The
		page itself never scrolls at either width (see the wrapper above); each of the three scrolls
		inside its own third, which is why every one of them carries `min-h-0`.

		`grid-rows-3` and not three `33vh`s: `minmax(0, 1fr)` of a box given a height IS a third of it,
		and it is a third that stays exact — three hand-written 33vh rows come to 99 and leave a strip
		of nothing under the last of them. And they are a third of what the band above has left rather
		than of the viewport, which is the whole reason the height is handed down by a flex parent and
		not written here.

		`divide-y-2 divide-primary` is the line between one third and the next. Written on the grid
		rather than as a border on each box because a separator belongs to the pair it separates and
		not to either side of it: the rule is `> :not(:last-child)`, so it draws between whatever
		children are actually mounted and never under the last of them — and the list of places
		unmounts whenever a full view is up (see below), so a border hung on the map's own bottom edge
		would be a line with nothing under it. Off from `md` up, where the three stand side by side
		and what separates them is the grid. -->
	<div
		class="grid min-h-0 flex-1 grid-cols-1 grid-rows-3 divide-y-2 divide-primary md:grid-cols-3 md:grid-rows-1 md:divide-y-0"
	>
		<!-- The map: the first row of the phone's column, the first column of the desktop's row.
			Nothing else sizes it — raising a view over it leaves its box alone, so the map is never
			re-framed by anything but a pan, a zoom or a region being opened. `relative` is kept for
			the spotlight and anything else Leaflet positions inside it; no chrome of this page's is
			positioned against it any more.
			Placed by name at both widths (`row-start-1` / `md:col-start-1`) rather than left to the
			order things are mounted in: the list of places beside it comes and goes with the full-view
			sheets, and a grid that filled the gap would walk the map into the hole.

			Two things stand in this column now, and only one of them at a time: the terrain, and the
			list of the places the open region divides into (see RegionLocationList, and mapTab). The
			list was the scrolling half of the column beside this one and is a tab over the terrain
			because it is *about* the terrain — the level the map is looking at, named — where the
			column beside it says the one place it is open on. Everything else that column holds stays
			where it is: the head row, the side on the town, the standing, the path, the shares and the
			field, and the author's marks at its foot. -->
		<div
			class="relative row-start-1 flex min-h-0 min-w-0 flex-col md:col-start-1 md:row-start-1"
		>
			{#if ready}
				<!-- The two tabs, over both of them. `role="tablist"` and DaisyUI's `tab` classes, as
					the credits sheet does it (see CreditsModal): which of the two is up is local state
					rather than an `aria-controls` target.
					Veiled with the rest of the map's furniture while a full view is up — a strip of tabs
					read sharply beside a sheet is chrome competing with the thing it was covered by — and
					veiled rather than unmounted for the same reason the band at the top of the page is:
					this row is `flex-none` above a `flex-1` map, so removing it hands the map a taller box
					and a re-frame it never asked for (see CHROME_VEIL). The panels below it do not move
					either way: unmounting the terrain to raise the roster would be a fresh Leaflet on the
					way back. -->
				<div
					inert={$fullScreenModalOpen || undefined}
					role="tablist"
					class={classNames(
						'tabs-boxed tabs flex-none justify-start',
						CHROME_VEIL,
						$fullScreenModalOpen && CHROME_VEILED
					)}
				>
					<button
						type="button"
						role="tab"
						aria-selected={mapTab === 'map'}
						class={classNames('tab whitespace-nowrap', { 'tab-active': mapTab === 'map' })}
						on:click={() => (mapTab = 'map')}
					>
						{$_('map.tabs.map')}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={mapTab === 'places'}
						class={classNames('tab whitespace-nowrap', { 'tab-active': mapTab === 'places' })}
						on:click={() => (mapTab = 'places')}
					>
						{$_('map.tabs.places')}
					</button>
				</div>

				<!-- The panel the two tabs share, and the map is never taken out of it: the list is laid
					over the terrain rather than swapped with it, so the map's box is the same box at every
					moment and Leaflet is never told the column resized. An `{:else}` here would be a fresh
					map on every trip back to the first tab — a new WebGL-less canvas, a new set of tiles,
					and the reader's pan and zoom lost to a tab press. So both are absolutely placed inside
					this box, the map always and the list only while it is picked, and the list carries the
					page's own surface so the terrain does not read through it. -->
				<div class="relative min-h-0 flex-1">
					<div class="absolute inset-0 flex flex-col">
						<WorldMap
							center={[41.8, 1.7]}
							zoom={8}
							minZoom={7}
							{overlays}
							{markerLevels}
							{pickedMarker}
							{hiddenLineUrls}
							{pulse}
							{focusBounds}
							{zoomBounds}
							{zoomStops}
							{spotlight}
							markersBlurred={$fullScreenModalOpen}
							bind:currentZoom
							bind:activeLevel
							bind:currentCenter
							classes="min-h-0 flex-1"
						/>

						<!-- The radar, and it is the one thing on this page drawn ON the terrain. The map
							carries days of festes at once and no marks to find them by, so the boxes waiting
							out there are found by panning across the country looking for one — which is a
							search, and this is the button that does it: press it and the map opens the
							nearest town whose box is still unopened (see findNearestBox). It stands at every
							width, because a box is as hard to come across on a desktop as on a phone.
							It has been at the far end of a bar over the map, then a mark in the furniture
							column beside it, and it is back on the terrain because it is the only mark this
							game has that acts on the terrain: the name, the questions and the credits are
							about the game, and they are the row above. A control that moves the map belongs
							in the map's own corner, and the top-right is the corner nothing else is using.
							So the `z-[900]` is back with it — and only with it. It clears Leaflet's own panes
							(overlays 400-600, controls 800) without reaching the arena's 1200. Nothing else
							about the old band comes back: no measured inset handed to the map, no
							`pointer-events-none` over the gaps, because this is one square in one corner and
							not a strip across an edge.
							Only while the map is the tab that is up: the list of places is painted over this
							same box (see below) and would otherwise be painted under a radar with nothing on
							it to point at. And it leaves under a full view like the rest of the chrome, on
							the same 8px over the same 250ms — this one CAN be unmounted, unlike the two rows
							above it, because it is absolutely placed inside the map's pane and taking it out
							changes nobody's box (see CHROME_VEIL).
							A size of its own, where the three marks it used to stand among are drawn to a
							row's height (`self-stretch aspect-square`): there is no row here to be as tall
							as. `size-10` is what that row came to, so the square is the same square.
							Disabled when there is nothing left to point at — every box in the window opened,
							or none loaded yet — because a radar that answers "here" or answers nothing is a
							press with no destination. -->
						{#if mapTab === 'map' && !$fullScreenModalOpen}
							<button
								transition:blur={CHROME_BLUR}
								type="button"
								class="absolute right-3 top-3 z-[900] flex size-10 cursor-pointer items-center justify-center rounded-lg bg-primary shadow-xl disabled:cursor-default disabled:opacity-40"
								aria-label={$_('map.radar.nearest')}
								disabled={!radarTarget}
								on:click={findNearestBox}
							>
								<img src="/assets/icons/lorc/radar-sweep.svg" class="size-6" alt="" />
							</button>
						{/if}

						<!-- The side standing on the open town, at the foot of the terrain. It was the first
							thing in the column beside this map (RegionSubdivisions' `detail` slot) and it is
							laid over the map itself now: the three of them are a picture of who is holding the
							place, and a picture belongs on the place. Absolutely placed like the radar above
							it — inside the map's own pane, so it is stood over the terrain without the terrain
							being re-framed by it — and centred on the bottom edge, the one edge nothing else
							is using.
							`named={false}` still: the town's name is the band at the top of the page, and the
							plate under the statues is only drawn where somebody holds the place (see TownPin).
							Only a town has one at all, and only while the map is the tab that is up: the list
							of places is painted over this same box and a side standing on a list is a side
							standing on nothing. It leaves under a full view with the rest of the chrome, on
							the same 8px over the same 250ms.
							`pointer-events-none` on the strip and back on for the pin itself, so the map is
							still pannable everywhere the three of them are not — an absolutely placed band
							across an edge would otherwise be a strip of terrain nobody can drag.
							A width of the map's rather than the column's: it takes what the pane gives it up
							to the 500px the pin on the terrain is drawn at, so the statues here are the size
							they are on a mark. -->
						{#if townDetailPin && mapTab === 'map' && !$fullScreenModalOpen}
							<div
								transition:blur={CHROME_BLUR}
								class="pointer-events-none absolute inset-x-3 bottom-3 z-[900] flex justify-center"
							>
								<TownPin
									marker={townDetailPin}
									named={false}
									alwaysReveal
									classes="pointer-events-auto w-full max-w-[500px]"
								/>
							</div>
						{/if}
					</div>

					<!-- The level the map is open on, listed. Handed the same rows the shares beside it are
						tallied over, the same matches the field beside it turns up, and the show that row
						has picked — the press is over there with the division it is read off, the hiding is
						here with the rows it hides. Picking one is the map's own gesture: `openFromColumn`,
						exactly as a pin or a crumb. -->
					{#if mapTab === 'places'}
						<div class="absolute inset-0 flex flex-col bg-base-100">
							<RegionLocationList
								classes="min-h-0 flex-1"
								rows={subdivisions}
								current={subdivisionCurrent}
								{searchRows}
								{searchQuery}
								{activeShow}
								on:select={(event) => openFromColumn(event.detail.key)}
							/>
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex min-h-0 flex-1 items-center justify-center">
					<span class="loading loading-spinner loading-lg"></span>
				</div>
			{/if}
		</div>

		<!-- The open region, the second column: a third of the row, and everything the place the map
			is looking at has to say for itself — its name and the show it flies, the side standing on
			it, how far it has been taken and the fight to be had for it, the cut it sits inside, what
			the level under it is made of and the way to look for a place that is not on it.
			What the level under it *is* — the list of those places — stood at the foot of this column
			for a long time and is a tab over the terrain now (see the map column above): a list of
			places is about the map, and this column is about one place. What is left still scrolls on
			its own, since a town brings a side, a standing and a path with it.
			Gone while a full view is up, and back when that view goes: this column is the map's
			furniture like the marks beside it and the pins on it, and a list of towns read sharply
			beside a sheet is chrome competing with the thing it was covered by. It blurs away
			exactly as they do, on the same 8px over the same 250ms (see CHROME_BLUR), and then leaves
			the grid — the column it stood in stays where it is, because every column here is placed
			by name (`md:col-start-*`) rather than by the order things happen to be mounted in, so a
			sheet going up cannot slide the furniture over into the gap. Leaflet is told nothing about
			it: the map watches its own container and re-projects when it changes size (see WorldMap's
			ResizeObserver). The column is unmounted rather than merely blurred because a strip of
			nothing at the side of a full view is the sheet standing on the map, which is what it is. -->
		{#if !$fullScreenModalOpen}
			<!-- What is said about the open place scrolls, and the row of social marks at the foot does
				not: it is the one thing here that is not about that place, and a row that has to be
				reached past everything said about a town is a row nobody finds. So what this hands the
				column is a height rather than a scrollbar: everything between the top of the aside and
				the marks at its foot. -->
			<!-- A box of the grid at every width, and the same box: the middle third of the phone's
				column, the middle column of the desktop's row. It was two arrangements of this one
				element for a while — a 400px side of the row on a desktop, and on a phone a fixed panel
				over the whole viewport, parked a screen-width off the right edge and slid in by a
				burger at the far end of the map's top bar. The page is a grid now and the grid folds,
				so the phone gets this where the fold puts it rather than as a second way of asking for
				it; the burger, the ✕ that pushed the panel back off, the `inert` that kept a keyboard
				out of it while it was parked and the transform it slid on all went with the arrangement
				they belonged to.
				`min-h-0` at both widths, and it is what makes the third a third: what is inside scrolls
				(see RegionSubdivisions), and a flex column that may not shrink below its content is a
				box that simply grows past the track it was given. -->
			<aside
				transition:blur={CHROME_BLUR}
				class="row-start-2 flex min-h-0 min-w-0 flex-col bg-base-100 md:col-start-2 md:row-start-1"
			>
				<!-- `rows` is still handed over though nothing here lists them: the count alone decides
					whether there is a rule in the column, and the shares row is tallied over exactly
					those rows by this page. `current` likewise names no place here any more — the band
					at the top of the page does that (see RegionCurrentBadge) — and is read for whether
					there is one at all and for putting a picked show back when the map moves.
					`activeShow` is bound because the press that picks a show is on that shares row and
					the rows it hides are in the tab over the map — this page is the one thing the two
					have in common. -->
				<RegionSubdivisions
					classes="min-h-0 flex-1"
					rows={subdivisions}
					current={subdivisionCurrent}
					shares={subdivisionShares}
					bind:activeShow
					bind:searchQuery
					bind:searchOpen
				>
					<!-- The town's own pin, first thing in the column: the side holding it, whose it is,
						how far it has been taken, the way to fight for it and the pack it has waiting — the
						same mark the map is drawing on that town at this very moment, from the same data
						(see townPin). Only a town has one.
						Unnamed, because the band across the top of the page is already the town's name: it
						says the place, its tile and the show it flies, and the plate saying all three again
						stood between the side on the town and how far it has been taken, reading as a stray
						row in the middle of the one thing. What the plate is here for is the rest of it
						(see TownPlate's `named`). -->
					<!-- Under the side standing on the town: how far it has been taken and the way to
						fight for it, the two of them stacked as TownChallenge already stacks them. No width
						said here — the row is the column's own width, which is what makes the bar a band
						across the column rather than a block hung off the end of something. -->
					<svelte:fragment slot="standing">
						{#if townStanding}
							<TownChallenge
								siege={townStanding.siege}
								button={townStanding.button}
								unlocksAt={townStanding.unlocksAt}
								onUnlock={townStanding.onUnlock}
							/>
						{/if}
					</svelte:fragment>

					<!-- The side standing on the town opened this column for a long time, and is over the
						map now — at the foot of the terrain, which is the place it is a picture of (see the
						map column above). What is left here is what the column was always saying about the
						town in words: how far it has been taken, the cut it sits inside, and what the level
						under it is made of. -->

					<!-- Where the place at the head of this column is, said as the path down to what it
						sits inside: the same bar that stands over the map, given the cut above the open
						region rather than the path down to it (see abovePath). The head has already named
						the place, so the badge on this bar is its parent — the Països Catalans over
						Catalunya, and never Catalunya over itself. Nothing at all at the top view, which
						is the one place with nothing above it.
						Folded outright and not merely when the room runs out: this bar is a heading over a
						list of places, and a row of five crumbs standing over a column of places is a
						second column of places — so it is the dots and the one badge, at every width. The
						rest of the path is where the dots always put it, in the column they drop. Pressed
						for what the bar over the map is pressed for: a step opens its region, an empty
						rung takes the map to that tier's zoom. -->
					<svelte:fragment slot="path">
						{#if aboveCrumbs}
							<MapBreadcrumbs crumbs={aboveCrumbs} onSelect={open} onZoom={zoomToTier} folded />
						{/if}
					</svelte:fragment>
				</RegionSubdivisions>

				<!-- (Where the author is used to close this column, and closes the furniture column
					now — under the player, which is the other row on this page that names somebody
					rather than somewhere. See the third column below.) -->
			</aside>
		{/if}

		<!-- The furniture: the last third of the phone's column, the third column of the desktop's
			row. It held two blocks for a while — the game's badge and its marks at the head, the side
			and the account at the foot — which was the shape it had had while it was drawn over the
			map. Only the second of them is what this column is actually about: who is playing, and
			the three they field. The first has gone to the page's top row, where a game's name and
			the questions put to it belong (see the band above).
			`mt-auto` is still on the block, and still for the reason `bottom-3` was there before a
			column: the account sits at the foot of one, and a column has to be told to push its last
			block down. Nothing stands above it now, so it starts there and grows upwards.
			It scrolls inside its own third at both widths, the way the list of places does: three
			statues and a plate are taller than a third of a phone, and taller than some viewports
			outright.
			Inside `{#if ready}` like the map it came off: the side standing here is rolled against
			the town names the polygons carry, and a statue drawn before those land says Ultramar at
			a town whose name is still on its way (see claimPlaceName). -->
		<div
			class="row-start-3 flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto p-3 md:col-start-3 md:row-start-1"
		>
			{#if ready}
				<!-- The head of this column is gone entire, and with it the block that held it. It was
					the game's badge, the radar, and the two marks that answer for the game — a band laid
					over the map's top edge before that, absolutely positioned, its height measured off the
					DOM and handed to the map so the pins would be dealt clear of it, its pointer events off
					everywhere the plates did not cover, and a z-index picked to clear Leaflet's panes.
					Standing it in a column took all of that away, and then the column turned out to be the
					wrong shelf too: the name and the two questions are about the game rather than about
					this player, so they are the page's own top row now, and the radar is the one of the
					four that acts on the terrain, so it is back on the terrain (see both above). The music
					player passed through here as well, in the left corner and then as a card of the bar,
					before the radio became the row that names the open place.
					What is left in this column is what it was always for: who is playing, and the side
					they field. -->
				<!-- The foot of the furniture column: the side this player fields, and under it who is
					playing and the way into their account. Signed out, the middle of that block is the way
					in instead (see SignInButton): the sign-in was in a burger menu once, which put the only
					thing a visitor can do behind the mark they would have had to think to press, while the
					slot that would have said who they are stood empty. It is one slot with two states now
					— the account, or how to have one.
					The two belong together — a side and the account fielding it are one statement, and it
					is the statement every town on the map is read against: the three being challenged are
					drawn on the town's own pin in the column of places, the three doing the challenging
					stand here with their player under them, so a fight the Challenge button opens is both
					sides of it read on the one screen. The account's plate was at the map's top-right,
					opposite the town panel, which put the player at one corner and the side they field at
					another with nothing but the reader to say which of them was whose.
					`mt-auto` is what keeps it at the foot: this used to be positioned against the map's
					bottom edge, and a column has to be told to push its last block down. It grows upwards
					from there, so what arrives in it — the plate, as an account signs in — lifts the
					statues rather than walking the account off the end of the column.
					The block takes the column's whole width, statues and account row alike: they are one
					statement in one place, and a row narrower than the side above it would read as a second
					thing that happens to be nearby. It was a flat 400px while it stood on the map, which is
					a width a corner has to choose for itself; a column of the grid is given one.
					Nothing is drawn at all when there is none of it to draw — which now only happens while
					the session is still being read, since a visitor it comes back empty for is a visitor
					who gets the door.
					And nothing while a full view is up either: it blurs out from under the sheet and back
					in when it goes, the same gesture the row above it and the pins make (see CHROME_BLUR).
					The statues are rebuilt on the way back, which is what they already are every time the
					map re-frames itself — a character that has been through its veil once never plays it
					again (see IdleSprite), so what comes back is the picture and not the reveal. -->
				{#if playerBlockShown}
					<div transition:blur={CHROME_BLUR} class="mt-auto flex flex-col gap-2">
						<!-- The three statues and nothing else: no plate under them, no heading over them,
							so what stands here is the side itself rather than a panel about it. It can stand
							bare where the map's other furniture cannot because a statue brings its own ground
							and its own panel — every word on it is already read off the card's own colour,
							never off the terrain behind it.
							The row is given its box by the column rather than positioning itself: it is
							`w-full` of whatever holds it, and a width handed to it in the same breath would be
							two width utilities on one element with nothing but stylesheet order to settle
							which of them wins.
							Only drawn once there is a side to draw — an account with no card in a team slot
							leaves the column to its plate alone — and only inside `ready`, so a statue never
							says Ultramar at a town whose name is still on its way (see claimPlaceName). -->
						{#if playerTeamLineup.length > 0}
							<!-- And it is the way into the team, pressed as a whole: the three cards standing
								here *are* the side the roster is for editing, so the reader who wants to
								change them presses the thing they want to change rather than going looking
								for it in the menu. The press is on the row and not on a card, because a
								statue in this corner is a picture of who is fielded and not a control — the
								roster is where a member is taken off (see TeamLineup's `selectable`, which
								stays false here). One target over the lot, so there is no dead strip between
								the cards either.
								Named for a screen reader, since what is inside the button is three cards'
								worth of names and colours and none of them says what pressing it does. -->
							<button
								type="button"
								class="w-full cursor-pointer rounded-box focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
								aria-label={$_('roster.open')}
								on:click={() => rosterModalOpen.set(true)}
							>
								<TeamLineup members={playerTeamLineup} />
							</button>
						{:else if $profile && spawnsSettled}
							<!-- A player with no side fielded yet, in the slot the three statues take:
								the same press, said in a word instead of drawn as three cards. The row
								above is the way into the roster because it *is* the side being edited,
								and a corner that simply had nothing there left that way in to the
								statues alone — so an account with an empty team had no door to the one
								screen that fills it. Shaped like the sign-in below it rather than like
								the lineup above it, since what stands here is a button and not a
								picture of anything, and the corner already reads as a column of
								full-width rows. -->
							<button
								type="button"
								class="btn btn-primary w-full shadow-xl"
								on:click={() => rosterModalOpen.set(true)}
							>
								{$_('roster.open')}
							</button>
						{/if}

						<!-- The way in, standing where the account's plate stands once there is an account.
							One button and the whole width of the column, which is what every row of this
							corner is now the radio has left it. The form it opens — a gate of two boxes,
							the documents under them and the provider button — stood here for a while,
							and could not have been read at half of 400px in any case; it is a sheet of
							its own now, and this corner asks for it in a word (see SignInModal). -->
						{#if signedOut}
							<SignInButton />
						{/if}

						<!-- Who is playing, under the side they field: the last row of this corner, and the
							whole of it again.
							It shared this row with the radio for a while, as two halves of the column's one
							width — both of them being things this player had switched on, as against the map
							at the other corner. The radio has gone to the band across the top of the page,
							where the place it is playing for is already named and already carries the show's
							tile (see RegionCurrentBadge): the radio follows the map now, so a card of its own
							was saying, in a second corner, what that row says by standing there. What shares
							the row instead is the one press that belongs to this plate: the cog.
							No `pointer-events-auto` on it: that was needed while it stood in the column under
							the bar, which turns its own events off so the map stays pannable through the gaps
							between its plates. This corner is not that column.
							The plate is the way into the account as well as the reading of it: the picture
							opens the picker and the rest of it opens the settings sheet, which is the sheet
							this plate summarises. -->
						{#if $profile}
							<div class="flex items-stretch gap-2">
								<PlayerPanel
									profile={$profile}
									on:editavatar={() => avatarPickerOpen.set(true)}
									on:open={() => settingsModalOpen.set(true)}
									classes="min-w-0 flex-1"
								/>

								<!-- The settings, as a mark at the end of the row that summarises them. It was a
									row of the menu at the other corner of the map, which is where a player had to
									go looking for the sheet about the account they were already looking at; the
									menu keeps what is not the account's — the album, and the documents.
									A square, since it is a glyph and nothing else, and one drawn to the plate's
									own height: `self-stretch` takes the height the plate sets for the row and
									`aspect-square` reads the width off it, so the two stay one row however the
									plate is measured. Same surface as the plate, because it is the same corner's
									furniture and not a control laid over it. -->
								<button
									type="button"
									class="flex aspect-square flex-none cursor-pointer items-center justify-center rounded-lg bg-base-100/80 shadow-xl hover:bg-base-100"
									aria-label={$_('settings.title')}
									on:click={() => settingsModalOpen.set(true)}
								>
									<img src="/assets/icons/lorc/cog.svg" class="size-6" alt="" />
								</button>
							</div>
						{/if}
					</div>
				{/if}
			{/if}

			<!-- Where the author is, and it closes this column: the one row on the page that names
				something outside the game. It was the foot of the column beside this one, under
				everything the open place had to say for itself — which put a row about whoever made
				this under a list of towns, where it read as one more thing about the place. It sits
				under the player instead, because these two rows are the only ones here that name a
				person: who is playing, and who drew what they are playing with.
				The column's free space is pushed above exactly one row, and which row that is
				depends on what is standing: the block above already takes it with `mt-auto` where
				there is a block, so this row simply follows it to the foot — two `mt-auto`s in one
				flex column split the space between them and would leave the account floating in the
				middle. Where there is no block (the session is still being read), the marks take
				the push themselves and close the column alone rather than sitting at its top.
				`flex-none` because a third of a phone's height is not much: without it this row is
				the first thing the column takes back when the side above it wants room, and the
				marks squash instead of the column scrolling.
				Outside `{#if ready}`, since nothing about it waits on the polygons, and gone under a
				full view with the rest of the chrome — it left with the whole column it used to
				stand in, so leaving with this one is it keeping the manners it already had. -->
			{#if !$fullScreenModalOpen}
				<SocialLinks classes={classNames('flex-none', { 'mt-auto': !playerBlockShown })} />
			{/if}
		</div>
	</div>
</div>

<!-- The menu stood here for a while, as a full-height drawer docked to the map's right edge:
	a block of outlined buttons with the radio under it, summoned by the same burger. It is the
	column dropped from that burger now (see the `end` slot above), which is where the game's
	badge was already dropping two of these same views. -->

<!-- Hidden, but mounted: the claim panel, kept alive only
	to compute the window's booster packs (bind:packs) so a map box click can open the town's
	pack instantly. Its own UI is never shown here — but the reason a roll was refused is
	bound out of it, since without that a `claim_booster` refusal reads as a pack that opens
	onto nothing at all. What the window still holds is counted off the packs themselves. -->
<div class="hidden" aria-hidden="true">
	<CharacterClaimPanel {seededShowById} bind:packs={claimPacks} bind:claimError />
</div>

<!-- Challenge → the board's combat arena, on the same full-view sheet the roster, the
	badges, the leaderboard and the boosters are drawn on, so a fight for a town plays out
	without ever navigating away. This is the only place combat is mounted — there is no
	standalone combat route any more. It used to be a fixed panel of its own over a 30%-white
	wash, which was a second kind of full-view surface for no reason other than that combat
	came later: FullScreenModal is the one this game has, and it brings the slide up from the
	bottom edge, the title bar, the ✕ and Escape with it.
	CombatArena fields the team the battle is being fought with against the line-up it
	was opened against, and handles all its own gating. Only the town rides along, to
	key and label the fight: which town a battle is over and which generation of its
	team it is against are the server's record, kept on the battle itself, so the fight
	that is reported is the fight that was opened.
	This sheet paints no page (`transparent`, as the booster window does): a fight is not a page
	laid over the map like the roster or the leaderboard — it is an event on a town the map is
	still showing — so it is staged on the map, the terrain live under it with its pins blurred
	off it and the board standing on top. Nothing here needs the page: the canvas is opaque and
	carries its own border, and every word the arena says is on a card with its own base-100
	(the result panel, the sign-in and no-team cards).
	The sheet's own way out is held shut while a finished fight is on its way to the server:
	reporting is what ends the battle, so a player let out before it lands would walk away
	from a fight the server still has open. That is the one thing the sheet cannot know for
	itself, hence the binding.
	Keyed so each new challenge remounts a clean fight. -->
{#if fightOpen}
	<!-- Bare: no title bar and no padding, so the sheet is the viewport and the board has all
		of it. A row naming it "Combat" says nothing the board does not, and a margin round the
		board is scale taken off it — the canvas is fitted to the box it is given, so every pixel
		the sheet keeps for itself is a smaller fight. The arena carries its own way out — the
		Close under the result, which is the one that waits on the fight reaching the server —
		and Escape is bound to the sheet either way, `closeDisabled` and all. The title stays as
		the sheet's name to a screen reader.
		Nothing between the sheet and the arena, either: the arena fills it and centres the
		canvas itself, and the canvas is capped to the viewport on both axes, so there is
		nothing to scroll and no box to scroll it in. -->
	<FullScreenModal
		title="Combat"
		bare
		transparent
		closeLabel="Close combat"
		closeDisabled={fightReporting}
		on:close={onFightClosed}
	>
		<!-- Keyed on the town and the generation as well as the line-up: challenging a
			different town whose sitting team happens to field the same characters is
			still a different fight, and must remount rather than reuse the last one. -->
		{#key `${fightLocationId}:${fightTurnover}:${fightSpawns.map((spawn) => spawn.characterId).join(',')}`}
			<CombatArena
				ogTeam={fightSpawns}
				ogLocationId={fightLocationId}
				location={fightPlate}
				bind:reporting={fightReporting}
				on:territory={(event) => onTerritory(event.detail)}
				on:close={onFightClosed}
			/>
		{/key}
	</FullScreenModal>
{/if}

<!-- The roster, over the map. Mounted only while it is open — it builds a card canvas
	of its own, and every mount is a fresh WebGL context the browser hands out a limited
	number of. Opened from the Roster button on the row above the panel's card grid, beside
	Profile, and from the arena's "no active team" card, both through `rosterModalOpen`. -->
{#if $rosterModalOpen}
	<RosterModal />
{/if}

<!-- The album, on the same sheet and over the map like the roster. Mounted only while it is
	open, which is what keeps a cast of forty-odd sprites off every other page: the show
	mapping, the player's cards and the statues all arrive with the opening. Opened from the
	book in the views the game's badge dropped when it was a tab, through
	`collectionModalOpen`. -->
{#if $collectionModalOpen}
	<CollectionModal />
{/if}

<!-- Every show's standing across the map, on the same sheet. The tally is the map's own —
	counted over every municipality's current show, seeded or ruling — so it is handed in
	rather than read again here, and it is as fresh as the map behind it. It was a tab of the
	old side panel, three columns of table in a 450px column, then a button in the menu.
	Nothing raises it at the moment: the row that did has gone from the menu, and the store is
	left standing so that whatever raises it next has something to set. -->
{#if $leaderboardModalOpen}
	<LeaderboardModal rows={showStandings} />
{/if}

<!-- What the game gets asked, on the same sheet as the rest of them. Raised by the question
	mark at the far end of the page's top row, first of the two there. Mounted only while it is open, like
	its neighbours here, so a list nobody has asked for is not standing behind the map. Its
	content is the catalogue's — see FaqModal. -->
{#if $faqModalOpen}
	<FaqModal />
{/if}

<!-- Who made what the game is drawn out of, on the same sheet as the rest of them. Raised by
	the palette at the far end of the page's top row, beside the question mark. Mounted only while it
	is open, like its neighbours here. Its list is the character registry — see CreditsModal. -->
{#if $creditsModalOpen}
	<CreditsModal />
{/if}

<!-- The window's booster packs, on the same sheet, and the one view here that is not just a
	reading: a pack is picked, stood up and sliced open, and the cards it held stand up in its
	place. That is what took it out of the panel — it was doing all of it in a 450px column,
	two covers to a row.
	Everything it works from stays on this page: the packs the hidden claim panel assembles,
	the town a map box click narrowed it to (bound, so picking a cover in there and clicking a
	box out here move the one selection), the day's allowance and whatever the last roll said.
	Mounted only while it is open, so the opener is built on opening and goes with the close.
	Two ways in — the panel's Booster button, which lands on the grid of the whole window, and
	a click on the box standing on a festa town, which opens straight onto that town's pack. -->
{#if $boosterModalOpen}
	<BoosterModal
		packs={claimPacks}
		bind:selected={packTownId}
		windowLabel={packWindowLabel}
		{claimError}
		{lastRevealed}
		{townHasNoPack}
		single={packRaisedOnTown}
		on:select={clearPackFeedback}
		on:back={clearPackFeedback}
		on:openComplete={(event) => onPackOpened(event.detail)}
	/>
{/if}

<!-- Draws nothing: it clears the splash the shell put up, 500ms after this page mounts.
	Here rather than in the layout because the splash is the front door's and no other
	route's — the shell has already taken it down anywhere else — so both halves of it
	stand in the same place. -->
<SplashScreen />
