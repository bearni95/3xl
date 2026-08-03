<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import { characters } from '@3xl/data';
	import PlayerPanel from '$components/core/PlayerPanel.svelte';
	import TeamLineup from '$components/core/TeamLineup.svelte';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import RegionListRow from '$components/core/RegionListRow.svelte';
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
	// about somebody else and the one that needs no account to read. It is the map's
	// bottom-left corner lifted out and given an address: the side they field, and
	// under it the plate they are read by, the same two components in the same order,
	// so a player linked here sees exactly what the map would have shown of them.
	//
	// It is not a route into the game: there is nothing to press on it. The plate is
	// handed `interactive={false}` — the picture and the reading are the way into an
	// account only where the account is your own — and the statues are unselectable,
	// which is what they already are wherever a side is a picture of a side rather
	// than a roster.
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
		try {
			const response = await fetch('/data/geo/municipis.json');
			const collection = (await response.json()) as GeoJSON.FeatureCollection;
			if (id === loadedFor) municipalityNames = locationAdapter.municipalityNames(collection);
		} catch {
			municipalityNames = null;
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

<!-- The page is two things down one centred stack: the account, in the 400px column the
	map's corner reads a side at, and under it the collection, which wants every pixel the
	window has. So the outer column is the wide one and the account holds itself to its own
	width inside it — the reverse would have made the cards as narrow as the plate.
	The cap is 7xl rather than 5xl because the grid's widest tier is six across: six cards
	in 1024px is a narrower card than four in the same width, and a tier that made the
	cards smaller as the window got bigger would be a strange kind of growth.
	Top-aligned, not centred: a collection is as tall as it is, and a flex box that centres
	content taller than itself puts the top of it out of reach above the scroll. -->
<div class="flex min-h-screen w-full justify-center bg-base-300 p-4">
	<div class="flex w-full max-w-7xl flex-col items-center gap-6 py-4">
		{#if loading}
			<div class="flex items-center justify-center gap-3 py-12 text-base-content/70">
				<span class="loading loading-spinner loading-md"></span>
				{$_('common.loading')}
			</div>
		{:else if failed}
			<p class="py-12 text-center text-base-content/70">{$_('errors.generic')}</p>
		{:else if !configured}
			<!-- A local run with no Supabase behind it: there is nobody to look up, which is
				not the same sentence as "no such player" and must not be told as one. -->
			<p class="py-12 text-center text-base-content/70">{$_('profile.notConfigured')}</p>
		{:else if !player}
			<p class="py-12 text-center text-base-content/70">{$_('profile.public.notFound')}</p>
		{:else}
			<!-- The account, held to the width the corner reads it at. Everything in here is
				the map's own corner, in the map's own order. -->
			<div class="flex w-full max-w-[400px] flex-col gap-3">
				<!-- The side above the plate, as at the map's corner: three statues on nothing at
					all, each bringing its own ground, standing the way the corner stands them.
					Nothing is passed to it that the corner does not pass — it is unselectable and
					unheaded there too, being a picture of a side rather than a roster. -->
				{#if lineup.length > 0}
					<TeamLineup members={lineup} />
				{:else}
					<p class="py-6 text-center text-base-content/70">{$_('profile.public.noTeam')}</p>
				{/if}

				<PlayerPanel profile={player.profile} interactive={false} classes="w-full" />
			</div>

			<!-- How much of the map answers to them. It stands between the account and the
				collection because it is a fact about the account rather than about the cards
				— what the side above it has actually won — and it takes the account column's
				own width, so the two read as one block with the grid beginning under them.
				The plate's own surface (base-100 at four fifths), which is what every plate
				in this game is printed on.
				A number and what it counts, and nothing else: the towns themselves are on
				the map, which is one press away at the foot of the page. -->
			<div class="stats w-full max-w-[400px] bg-base-100/80 shadow">
				<div class="stat">
					<div class="stat-title">{$_('profile.public.townsHeld')}</div>
					<div class="stat-value">{player.towns.length}</div>
				</div>
			</div>

			<!-- And which towns they are, each drawn by the very row the column beside the map
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
				<div class="grid w-full grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4">
					{#each visibleTowns as town (town.key)}
						<RegionListRow row={town} onSelect={openTown} />
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
