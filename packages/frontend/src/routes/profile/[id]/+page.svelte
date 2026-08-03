<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import { characters } from '@3xl/data';
	import PlayerPanel from '$components/core/PlayerPanel.svelte';
	import TeamLineup from '$components/core/TeamLineup.svelte';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import { publicProfileService, type PublicPlayer } from '$services/publicProfile.service';
	import { isSupabaseConfigured } from '$services/supabase.client';
	import { spawnService } from '$services/spawn.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { showIdsByCharacter } from '$utils/spawn/team-show';
	import { SpawnBox } from '$types/character-spawn.type';
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
	// Reset for each player loaded, so a second profile opens at its own first page
	// rather than however far down the previous one had been read.
	let shown = PAGE_SIZE;

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

	// The part of it standing right now, and whether there is any of it left to stand.
	// Both named off `shown` and `owned` directly, so the grid grows the moment either
	// moves — a card whose town name has just landed re-reads without being re-pressed.
	$: visible = owned.slice(0, shown);
	$: hasMore = shown < owned.length;

	function showMore(): void {
		shown += PAGE_SIZE;
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
	Top-aligned, not centred: a collection is as tall as it is, and a flex box that centres
	content taller than itself puts the top of it out of reach above the scroll. -->
<div class="flex min-h-screen w-full justify-center bg-base-300 p-4">
	<div class="flex w-full max-w-5xl flex-col items-center gap-6 py-4">
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

			<!-- Everything they hold, one statue per card, newest first. A flat grid and
				nothing else: not the album's cells (which are characters, one apiece, owned or
				not) and not the roster's (which are filters and buttons over cards the player
				may still move). Nobody can act on any of this, so there is nothing to group
				it by and nothing to press — the collection is the whole statement, and its
				size is part of what it says.
				A statue takes its size from the cell it is in and brings the rest itself, so
				the grid is a column count and a gap and no more of a layout than that. Two
				across on a phone, five at the top width, which is where the panel under a
				card is still wide enough to read the town off. -->
			{#if visible.length > 0}
				<div class="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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

				<!-- Another twelve, under the ones already standing. It goes away when there
					are none left rather than turning into a disabled button that says the
					collection is over: the end of a collection is the last card, and a row of
					nothing under it says so. -->
				{#if hasMore}
					<button type="button" class="btn btn-outline btn-sm" on:click={showMore}>
						{$_('profile.public.more')}
					</button>
				{/if}
			{/if}
		{/if}

		<!-- The way back into the game, at the foot of the column whatever the page found:
			this is the one screen a visitor can arrive at without ever having seen the map. -->
		<a href="/" class="btn btn-ghost btn-sm">{$_('profile.public.toMap')}</a>
	</div>
</div>
