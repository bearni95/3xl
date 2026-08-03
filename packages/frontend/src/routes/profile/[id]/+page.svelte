<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import { characters } from '@3xl/data';
	import PublicPlayerCard from '$components/core/PublicPlayerCard.svelte';
	import TeamLineup from '$components/core/TeamLineup.svelte';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import RegionListRow from '$components/core/RegionListRow.svelte';
	import WorldMap from '$components/core/WorldMap.svelte';
	import { boundsForFeatures, type LatLngBounds } from '$utils/geo/bounds';
	import type { MapOverlay } from '$types/map.type';
	import { REGION_PANEL_CLASSES } from '$components/core/spawn-colors';
	import { publicProfileService, type PublicPlayer } from '$services/publicProfile.service';
	import { isSupabaseConfigured } from '$services/supabase.client';
	import { spawnService } from '$services/spawn.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { showIdsByCharacter, teamShowId } from '$utils/spawn/team-show';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { SpawnBox, type ClaimableShow } from '$types/character-spawn.type';
	import { teamLineupMembers } from '$utils/spawn/team-lineup';

	// Any player's profile, for anybody at all — the one page in this game that is
	// about somebody else and the one that needs no account to read. It says what the
	// map's bottom-left corner says of a player: the side they field and the reading
	// they are known by. Not stacked as the corner stacks them, though — a corner is a
	// column and a page is not, so the two stand side by side and the reading is a card
	// built for this width (PublicPlayerCard) rather than the corner's plate.
	//
	// It is not a route into the game: there is nothing to press on it but a town. The
	// card is a reading and not a pair of buttons — the picture and the reading are the
	// way into an account only where the account is your own — and the statues are
	// unselectable, which is what they already are wherever a side is a picture of a
	// side rather than a roster.
	//
	// Everything on it comes from the two definer views made for it
	// (`player_profiles_public`, `player_teams_public`) and nothing else about the
	// account is reachable: not the address it signs in with, not the rest of the
	// collection the three fielded cards came out of. See publicProfile.service.

	// The account this page is about, out of the URL. A change of id is a different
	// player, so the load below is keyed on it and a visit to two profiles in a row
	// cannot leave one wearing the other's team.
	$: userId = $page.params.id ?? '';

	let player: PublicPlayer | null = null;
	// Every show with a renderable character cast in it, as the claim roll reads them —
	// kept whole because the towns need the shows' *names* and the statues need the
	// assignment, and both come out of this one load.
	let showList: ClaimableShow[] = [];
	// Character id → the shows it belongs to; the first is the one a statue flies, as
	// on the map. Empty until the assignment lands, which leaves a floor bare rather
	// than holding the side back.
	let showsByCharacter = new Map<string, number[]>();
	// geojson feature id → municipality name, so a card can name where it was claimed.
	// Null until the layer arrives, and null for good if it does not: a place that
	// cannot be named reads as Ultramar, which is where an unplaced card comes from.
	let municipalityNames: Map<string, string> | null = null;
	// The box every polygon on the map stands inside, taken off the same layer the names
	// come out of. Null until it lands, which is a page with no map behind it rather than
	// a map framed on nothing.
	let mapBounds: LatLngBounds | null = null;
	let loading = true;
	// Set when the read itself failed — the network, a refusal. A profile that simply
	// is not there is `player === null` with no error, which is a different sentence.
	let failed = false;

	// How many more cards the More button stands up, and how many are standing when the
	// page opens. A collection is the whole of what somebody holds and can run to
	// hundreds; a statue is a clip of its own and a stack of images per frame, so
	// mounting the lot at once is a page that arrives all at the same time as itself.
	// The cards are all here either way — this is what is *drawn*, not what was fetched,
	// so pressing More costs nothing but the mounting.
	const PAGE_SIZE = 12;
	// One count per list, because they are two lists: a reader who has walked a
	// collection to its end has said nothing about how many towns they want to see.
	// Both reset for each player loaded, so a second profile opens at its own first
	// page rather than however far down the previous one had been read.
	let shown = PAGE_SIZE;
	let shownTowns = PAGE_SIZE;

	const charactersById = new Map(characters.map((character) => [character.id, character]));

	// One load per player named in the URL. Mounted first so nothing is fetched while
	// the page is being rendered for the static fallback.
	let loadedFor: string | null = null;
	let mounted = false;
	// Asked on the client alone: the env this reads is resolved in the browser, and a
	// page rendered for the static fallback has no answer to give.
	let configured = true;
	onMount(() => {
		mounted = true;
		configured = isSupabaseConfigured();
		return () => {
			if (refitFrame) cancelAnimationFrame(refitFrame);
		};
	});
	$: if (mounted && userId && userId !== loadedFor) {
		loadedFor = userId;
		void load(userId);
	}

	async function load(id: string): Promise<void> {
		loading = true;
		failed = false;
		player = null;
		shown = PAGE_SIZE;
		shownTowns = PAGE_SIZE;
		try {
			const [loaded, shows] = await Promise.all([
				publicProfileService.load(id),
				// The same assignment the map reads a character's show out of, so a
				// statue carries the same badge here as it does at the map's corner.
				spawnService.loadShows()
			]);
			// The id may have changed while this was in flight — a link followed from
			// one profile to another — and the answer to a question nobody is asking
			// any more must not land on the page.
			if (id !== loadedFor) return;
			player = loaded;
			showList = shows;
			showsByCharacter = showIdsByCharacter(
				new Map(shows.map((show) => [show.id, show.characterIds]))
			);
		} catch {
			if (id !== loadedFor) return;
			failed = true;
		} finally {
			if (id === loadedFor) loading = false;
		}

		// The place names are the map's own layer and the heaviest thing here, so they
		// are fetched after the page can already be drawn and folded in when they land.
		// A statue says Ultramar until then, exactly as one does on a map whose layer is
		// still on its way.
		//
		// The same fetch gives the map behind the page its framing: the box every polygon
		// stands inside, which is what the background is fitted to. One walk of the layer
		// for both — the file is already here, and the map that draws it fetches it again
		// through Leaflet either way.
		try {
			const response = await fetch('/data/geo/municipis.json');
			const collection = (await response.json()) as GeoJSON.FeatureCollection;
			if (id !== loadedFor) return;
			municipalityNames = locationAdapter.municipalityNames(collection);
			// Every feature's own id, not the ids that came back with a name: a polygon
			// the layer has no name for is still a polygon the map draws, and the box has
			// to hold it. (`boundsForFeatures` is what there is; the union of the lot is
			// the union of every id it knows.)
			mapBounds = boundsForFeatures(
				collection,
				new Set(collection.features.map((feature) => String(feature.properties?.id ?? '')))
			);
		} catch {
			municipalityNames = null;
			mapBounds = null;
		}
	}

	// The side as the statues draw it — the same reading the map's corner makes of the
	// signed-in player's own team, off the same function.
	$: lineup = teamLineupMembers(player?.team ?? [], {
		characters: charactersById,
		showsByCharacter,
		municipalityNames
	});

	// And the whole collection, read exactly the same way: a card is a card, and the
	// three on the team are three of these. One entry per card held — two copies of a
	// character are two statues, since they are two cards with their own colours, their
	// own boxes and their own towns, and merging them would print a collection smaller
	// than it is.
	$: owned = teamLineupMembers(player?.collection ?? [], {
		characters: charactersById,
		showsByCharacter,
		municipalityNames
	});

	// The part of it standing right now, and how much of it is still sitting down —
	// which is what the More button says, so a reader knows whether they are three cards
	// from the end of this collection or three hundred. Both named off `shown` and
	// `owned` directly, so the grid grows the moment either moves — a card whose town
	// name has just landed re-reads without being re-pressed. Floored at zero: `shown`
	// runs past the end on the last press, and a button is only drawn while this is
	// positive anyway.
	$: visible = owned.slice(0, shown);
	$: remaining = Math.max(0, owned.length - shown);

	function showMore(): void {
		shown += PAGE_SIZE;
	}

	// Show id → its name, off the same assignment the statues take their glyph from, so
	// a town's row names the show its pin is badged with rather than a second reading of
	// it. Empty until that lands, which leaves a row's show unnamed for a moment.
	$: showNameById = new Map(showList.map((show) => [show.id, show.name]));

	// The towns they hold, as the column beside the map lists a place: the tile in the
	// colour of the side sitting there, the name, and the show that side flies.
	//
	// Every one of those three is read off the team frozen in the town's own holder row
	// — the side as it won that town, which is the side the map itself draws there, and
	// not the side its holder happens to field today. So a player who has since changed
	// their team sees these rows keep the colours they conquered in, which is what the
	// map says about those towns too.
	//
	// All three of the maps it reads are threaded in as arguments rather than closed
	// over, exactly as the map's own corner threads them (see +page.svelte's
	// playerTeamLineup): a `$:` re-runs on what the statement names, so a row re-letters
	// itself as the layer, the assignment and the show names land behind it.
	$: townRows = ((
		names: Map<string, string> | null,
		shows: Map<string, number[]>,
		showNames: Map<number, string>
	) =>
		(player?.towns ?? []).map((held) => {
			const lead = held.team[0] ?? null;
			const showId = teamShowId(
				held.team.map((member) => member.characterId),
				shows
			);
			return {
				// A municipality's node key in the region tree is its bare feature id, which
				// is what the map's `region` param takes — so this key is both what names
				// the row and what opens it (see openTown).
				key: held.locationId,
				// The layer parks the article after a comma to sort by; it goes back to the
				// front wherever a town is named. A town whose name has not arrived stands
				// on its feature id rather than on Ultramar: this is a real place on the
				// map, and the sentinel would be a different claim about it.
				label: names?.get(held.locationId)
					? restoreCatalanArticle(names.get(held.locationId) as string)
					: held.locationId,
				showName: showId === null ? null : (showNames.get(showId) ?? null),
				showId,
				tileClasses: lead ? REGION_PANEL_CLASSES[lead.color] : null
			};
		}))(municipalityNames, showsByCharacter, showNameById);

	$: visibleTowns = townRows.slice(0, shownTowns);
	$: remainingTowns = Math.max(0, townRows.length - shownTowns);

	function showMoreTowns(): void {
		shownTowns += PAGE_SIZE;
	}

	// --- The map behind the page --------------------------------------------------
	// The same four layers the map at the root draws, bottom-up — municipalities,
	// comarques, províncies, territoris — so the coarser a division, the higher and
	// thicker its line sits over the finer ones inside it. Every tier in white, exactly
	// as there.
	//
	// What is *not* here is the colour wash: on the map at the root each shape is filled
	// with the colour its pin flies, which is a reading of the whole game's state (who
	// holds what, which show a town seeds to) and a thing that page is *about*. This is a
	// background. So the shapes are drawn and not painted, which is the same map with
	// nothing said over it — and none of the four is interactive, since a background that
	// answered a click would be a second page under this one.
	//
	// A constant, not a derivation: nothing on this page recolours the map, and handing
	// the component a fresh array would repaint every layer for no change.
	const mapOverlays: MapOverlay[] = [
		{ url: '/data/geo/municipis.json', style: { color: '#fff', weight: 1, fill: false }, interactive: false },
		{ url: '/data/geo/comarques.json', style: { color: '#fff', weight: 1.5, fill: false }, interactive: false },
		{ url: '/data/geo/provincies.json', style: { color: '#fff', weight: 2, fill: false }, interactive: false },
		{ url: '/data/geo/territoris.json', style: { color: '#fff', weight: 3, fill: false }, interactive: false }
	];

	// What the map is framed on. Handed over as a *fresh array* each time it is set, which
	// is what makes a refit happen at all: the component frames on the identity of this
	// prop, so the same box in the same array would be the same request it has already
	// answered.
	let mapFocus: LatLngBounds | null = null;

	// Frame it whenever the box arrives and again whenever the window changes shape. A
	// fit is a zoom against the canvas, so the zoom that held every polygon in a wide
	// window holds rather less of them in a narrow one — the map has to be asked again,
	// and asking again is the whole of keeping the polygons inside the viewport.
	//
	// Coalesced to one frame: a drag of the window edge fires resize continuously, and the
	// fit is a projection over the whole layer.
	let refitFrame = 0;
	function refit(): void {
		if (refitFrame) cancelAnimationFrame(refitFrame);
		refitFrame = requestAnimationFrame(() => {
			refitFrame = 0;
			mapFocus = mapBounds ? [[...mapBounds[0]], [...mapBounds[1]]] : null;
		});
	}
	$: if (mapBounds) refit();

	/**
	 * Open a town on the map. The map is driven entirely by its `region` query param
	 * and a municipality's key is its bare feature id, so naming one here is the whole
	 * of it — the map opens framed on that town with its panel on it.
	 *
	 * This is the one press on the page that goes anywhere. A row of this list is a
	 * place, and a place in this game is a thing you look at on the map; the alternative
	 * was a list of rows that are buttons and do nothing.
	 */
	function openTown(key: string): void {
		void goto(`/?region=${encodeURIComponent(key)}`);
	}

	// What to call the page. A nameless account is worded here rather than stored, as
	// it is everywhere else a name is missing.
	$: title = player ? (player.profile.username ?? $_('profile.username.none')) : $_('profile.title');
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<!-- The window changing shape is the whole reason the map is asked to frame itself again
	(see refit): a fit is a zoom against a canvas, and the canvas is this. -->
<svelte:window on:resize={refit} />

<!-- The map this profile is a profile of somebody playing, behind everything on the page:
	the same component, the same satellite basemap and the same four layers of polygons the
	map at the root draws, framed on the box every one of those polygons stands inside so
	the whole country is on screen at any window size.
	`fixed`, so it is the viewport's background and not the document's — a collection is
	taller than the screen, and a map that scrolled away with it would be a picture at the
	top of a page rather than the ground the page stands on. Behind everything (`-z-10`
	against the content's own stacking) and deaf to the pointer: it is not a way into the
	game here, and a background that panned under the reading would be one. Leaflet's own
	panes are inside this box, so nothing on the page has to reckon with their z-indexes.
	Only once there is a box to frame on: a map handed no bounds would sit at its own
	default view, which is the middle of the Atlantic.
	`z-0` under a content layer at `z-10`, rather than a negative z under nothing: daisyUI
	paints the page's own base colour on the document, and anything behind that is behind
	a wall. -->
{#if mapFocus}
	<div class="pointer-events-none fixed inset-0 z-0">
		<WorldMap overlays={mapOverlays} focusBounds={mapFocus} classes="h-full w-full" />
		<!-- The veil the page is read through: white, half of it at the top and a fifth at the
			foot, so the imagery is knocked back hardest where the account and its plates stand
			and comes through strongest under the collection, which is all pictures anyway.
			Over the map and under the page, which is a place in the stack rather than a
			decision each of them makes: `z-10` clears every Leaflet pane, since app.css caps
			the whole map — panes, controls and all — under 10 (see the flattening block there),
			and the wrapper this is inside is itself a stacking context at `z-0` under the
			content's `z-10`. So it is only ever over this map, whatever Leaflet puts in it. -->
		<div
			class="absolute inset-0 z-10 bg-gradient-to-b from-white/50 to-white/20"
		></div>
	</div>
{/if}

<!-- The page is two things down one centred stack: the account, which is now a row of two
	across the whole of it, and under that the collection, which wants every pixel the window
	has. So there is one width on this page and everything on it takes the whole of it — the
	account used to hold itself to the 400px column the map's corner reads a side at, which
	is a corner's measurement and not a page's.
	The cap is 7xl rather than 5xl because the grid's widest tier is six across: six cards
	in 1024px is a narrower card than four in the same width, and a tier that made the
	cards smaller as the window got bigger would be a strange kind of growth.
	Top-aligned, not centred: a collection is as tall as it is, and a flex box that centres
	content taller than itself puts the top of it out of reach above the scroll.
	No background of its own any more: the map is behind it, and a fill here would be a lid
	on it. So this layer is `relative z-10` — over the map — and everything on it that is a
	reading rather than a picture stands on a plate of its own, exactly as the furniture
	over the map at the root does. A statue needs none: it brings its own ground. -->
<div class="relative z-10 flex min-h-screen w-full justify-center p-4">
	<div class="flex w-full max-w-7xl flex-col items-center gap-6 py-4">
		{#if loading}
			<div
				class="flex items-center gap-3 rounded-box bg-base-100/80 px-4 py-3 shadow-xl"
			>
				<span class="loading loading-spinner loading-md"></span>
				{$_('common.loading')}
			</div>
		{:else if failed}
			<p class="rounded-box bg-base-100/80 px-4 py-3 text-center shadow-xl">
				{$_('errors.generic')}
			</p>
		{:else if !configured}
			<!-- A local run with no Supabase behind it: there is nobody to look up, which is
				not the same sentence as "no such player" and must not be told as one. -->
			<p class="rounded-box bg-base-100/80 px-4 py-3 text-center shadow-xl">
				{$_('profile.notConfigured')}
			</p>
		{:else if !player}
			<p class="rounded-box bg-base-100/80 px-4 py-3 text-center shadow-xl">
				{$_('profile.public.notFound')}
			</p>
		{:else}
			<!-- The account, across the page rather than stacked in the column the map's corner
				reads it at. The corner had the side above the plate because a corner is a
				column and has nowhere else to put it; here there is a whole page's width, so
				they stand side by side — the side they field, the card they are read by, and
				the way out into the game. None of the three is held to a width of its own:
				each takes the third of the row it is given, and the row takes the page. That
				is why the card is PublicPlayerCard and not the map's plate — a portrait as
				wide as a third of this page is a picture of somebody, which is what a page
				about them should open with, and the plate is built the other way round on
				purpose.
				`items-start` so each cell is its own height: a lineup is as tall as a card is
				and this card is as tall as its picture plus two lines, and stretching either to
				match the other would print a plate with a foot of nothing under the reading. -->
			<div class="grid w-full grid-cols-3 items-start gap-3">
				<!-- The side, as at the map's corner: three statues on nothing at all, each
					bringing its own ground, standing the way the corner stands them. Nothing is
					passed to it that the corner does not pass — it is unselectable and unheaded
					there too, being a picture of a side rather than a roster. -->
				{#if lineup.length > 0}
					<TeamLineup members={lineup} />
				{:else}
					<p class="rounded-box bg-base-100/80 px-4 py-3 text-center shadow-xl">
						{$_('profile.public.noTeam')}
					</p>
				{/if}

				<PublicPlayerCard profile={player.profile} />

				<!-- The way into the game, which this page otherwise has none of: it is somebody
					else's account read from outside, and the only thing a reader of it can do is
					go and play their own. It goes to the root, the map, with nothing named after
					it — a town on the list below opens the map *on that town*, and this opens it
					where a player's own map opens. -->
				<a href="/" class="btn btn-primary btn-block">
					{$_('profile.public.play')}
				</a>
			</div>

			<!-- The towns they hold, each drawn by the very row the column beside the map
				lists a place with: the tile in the colour of the side sitting there, the name,
				and the show that side flies. The same component and not a second one that looks
				like it — a town is a town wherever it is listed, and two spellings of one row is
				how a map and a profile come to disagree about a place.
				Pressing one opens the map framed on it (see openTown), which is the only thing
				a place on this page can usefully be pressed for. `current` and `marked` are
				both off: this is not the column beside a map, so there is no open place among
				these to be found or to be pointed at.
				A grid rather than the column's stack, because there is width here that the
				column does not have. The counts divide the twelve a press adds — two, three,
				four — so a press always lands on whole rows, and it stops at four: a row is a
				name and a show, and it stops being one at a narrower width than that. -->
			{#if visibleTowns.length > 0}
				<!-- Each town on a plate of its own rather than the lot of them on one. A row
					draws no ground itself — it is a name and a tile, read off whatever it is
					listed on — so over satellite imagery it needs a surface either way; the
					question is only whether that surface is the list or the place. Here it is the
					place: these are towns held one at a time, each won on its own day by its own
					side, and one sheet under them prints them as a single block the way the
					column beside the map prints the level under an open region. So the grid keeps
					nothing but the columns and the gap, and the plate — base-100 at four fifths,
					what every plate in this game is printed on — moves inside the cell.
					The plate is the wrapper and not the row, because RegionListRow is the column's
					own component and a town is the same row wherever it is listed; giving it a
					ground here would be giving it one there. Its own rounding stays inside this
					one, `overflow-hidden` so the row's hover fill is cut to the plate's corners
					rather than squaring them off. -->
				<div class="grid w-full grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
					{#each visibleTowns as town (town.key)}
						<div class="overflow-hidden rounded-box bg-base-100/80 p-1 shadow-xl">
							<RegionListRow row={town} onSelect={openTown} />
						</div>
					{/each}
				</div>

				{#if remainingTowns > 0}
					<button type="button" class="btn btn-outline btn-sm" on:click={showMoreTowns}>
						{$_('profile.public.more', { values: { count: remainingTowns } })}
					</button>
				{/if}
			{/if}

			<!-- Everything they hold, one statue per card, newest first. A flat grid and
				nothing else: not the album's cells (which are characters, one apiece, owned or
				not) and not the roster's (which are filters and buttons over cards the player
				may still move). Nobody can act on any of this, so there is nothing to group
				it by and nothing to press — the collection is the whole statement, and its
				size is part of what it says.
				A statue takes its size from the cell it is in and brings the rest itself, so
				the grid is a column count and a gap and no more of a layout than that.
				Every count divides the twelve a press of More adds — two, three, four, six — so it
				always lands on a whole number of rows and the grid never ends on a part-row
				with a gap beside it, at any width. That is why the tiers stop at six rather
				than passing through five. -->
			{#if visible.length > 0}
				<div class="grid w-full grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
					{#each visible as card}
						<CharacterStatue
							label={card.label}
							basePath={card.basePath}
							color={card.color}
							box={card.box ?? SpawnBox.Black}
							locationName={card.locationName}
							spawnedAt={card.spawnedAt ?? null}
							showId={card.showId}
						/>
					{/each}
				</div>

				<!-- Another twelve, under the ones already standing, carrying how many are
					still to come — a collection is as long as it is, and a bare "more" leaves a
					reader pressing without knowing whether they are near the end of it. It goes
					away when there are none left rather than turning into a disabled button
					that says the collection is over: the end of a collection is the last card,
					and a row of nothing under it says so. -->
				{#if remaining > 0}
					<button type="button" class="btn btn-outline btn-sm" on:click={showMore}>
						{$_('profile.public.more', { values: { count: remaining } })}
					</button>
				{/if}
			{/if}
		{/if}
	</div>
</div>
