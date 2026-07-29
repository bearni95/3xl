<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { rosterModalOpen } from '$services/rosterModal';
	import { spawnService, RECYCLE_GROUP_SIZE } from '$services/spawn.service';
	import { teamService, TEAM_SIZE } from '$services/team.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { AuthStatus } from '$types/profile.type';
	import { ULTRAMAR, ULTRAMAR_ID } from '$types/location.type';
	import { SpawnColor, type CharacterSpawn } from '$types/character-spawn.type';
	import { wowRarityLabel } from '$utils/rarity/wow-rarity';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import { SPAWN_FILL_CLASSES } from '$components/core/spawn-colors';
	import localStorageWritableStore from '$utils/localStorageWritableStore';

	// The roster is a modal now, so it is only ever mounted while it is open — the
	// host raises it with `rosterModalOpen`, and everything below (the spawn load,
	// the face fetches, the card canvas's WebGL context) starts with the mount and
	// goes with the close.
	function close(): void {
		rosterModalOpen.set(false);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') close();
	}

	// Bounds for the grid-column slider. It defaults to the responsive value the
	// grid picks for the viewport (1/2/3), which the player can then override.
	const MIN_COLUMNS = 1;
	const MAX_COLUMNS = 6;

	/** The column count a viewport of this width opens on, before the slider. */
	function responsiveGridColumns(viewportWidth: number): number {
		if (viewportWidth >= 1280) return 3;
		if (viewportWidth >= 640) return 2;
		return 1;
	}

	// The slider's count as a grid, one literal class per setting: Tailwind only
	// emits a class it can see spelled out, so `grid-cols-${n}` would emit nothing.
	const COLUMN_CLASSES: Record<number, string> = {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-4',
		5: 'grid-cols-5',
		6: 'grid-cols-6'
	};

	// Persisted as a player preference: reloads from localStorage on refresh, else
	// falls back to the responsive default. The store auto-writes on every change.
	const columns = localStorageWritableStore<number>(
		'roster:columns',
		browser ? responsiveGridColumns(window.innerWidth) : 3
	);

	// --- Card filters (the header toolbar) ---
	// Sentinel every "no filter" dropdown uses, so an unset filter is distinct from
	// any real value (a colour, a show name, a rarity tier).
	const ANY = '' as const;
	let filterName = ''; // free-text match against the character label
	let filterColor: SpawnColor | typeof ANY = ANY;
	let filterShow: string | typeof ANY = ANY;
	let filterRarity: number | typeof ANY = ANY;

	// Every spawn colour, for the colour dropdown (labels are the enum values).
	const COLOR_OPTIONS = Object.values(SpawnColor);
	function resetFilters(): void {
		filterName = '';
		filterColor = ANY;
		filterShow = ANY;
		filterRarity = ANY;
	}

	// --- Pagination ---
	// The grid only ever mounts one page of statues: at most ROWS_PER_PAGE rows at the
	// column count the slider is set to, so a large roster never stands up a sprite
	// (and its looping frames) per claimed card. Widening the columns therefore also
	// widens the page — the row budget is what's fixed.
	const ROWS_PER_PAGE = 10;
	let page = 0; // zero-based
	// The grid's scroll box, so turning a page can put it back at the top.
	let gridScroller: HTMLDivElement | undefined;

	// Whether any filter is narrowing the roster (drives the Clear button).
	$: filtersActive =
		filterName.trim() !== '' ||
		filterColor !== ANY ||
		filterShow !== ANY ||
		filterRarity !== ANY;

	// --- Recycle mode (trade cards back for extra daily claims) ---
	// While active, tapping a card selects it for recycling instead of toggling its
	// team membership. Every RECYCLE_GROUP_SIZE cards recycled grants one extra claim
	// for today. Selection is tracked by spawn id, so it survives filter changes.
	let recycleMode = false;
	let selectedForRecycle = new Set<string>();
	let recycling = false;
	let recycleNotice = '';

	function enterRecycleMode(): void {
		recycleMode = true;
		selectedForRecycle = new Set();
		recycleNotice = '';
	}
	function cancelRecycle(): void {
		recycleMode = false;
		selectedForRecycle = new Set();
	}
	function toggleRecycleSelection(spawnId: string): void {
		const next = new Set(selectedForRecycle);
		if (next.has(spawnId)) next.delete(spawnId);
		else next.add(spawnId);
		selectedForRecycle = next;
	}

	// How many cards are selected and how many extra claims that earns (one per full
	// group of RECYCLE_GROUP_SIZE) — drives the recycle bar's tally and confirm gate.
	$: recycleSelectedCount = selectedForRecycle.size;
	$: recycleGrant = Math.floor(recycleSelectedCount / RECYCLE_GROUP_SIZE);

	// Supabase/PostgREST errors are plain objects with a `message`, not Error
	// instances, so a bare String(err) reads as "[object Object]". Pull the real
	// message out (and fall back to the generic fields a DB error carries).
	function recycleErrorMessage(err: unknown): string {
		if (err instanceof Error) return err.message;
		if (err && typeof err === 'object') {
			const record = err as Record<string, unknown>;
			const detail = record.message ?? record.hint ?? record.details;
			if (typeof detail === 'string' && detail) return detail;
		}
		return 'Could not recycle those cards. Please try again.';
	}

	async function confirmRecycle(): Promise<void> {
		if (recycleGrant < 1 || recycling) return;
		recycling = true;
		recycleNotice = '';
		try {
			const { recycled, granted } = await spawnService.recycleSpawns([...selectedForRecycle]);
			recycleNotice = `Recycled ${recycled} card${recycled === 1 ? '' : 's'} for ${granted} extra claim${granted === 1 ? '' : 's'} today.`;
			recycleMode = false;
			selectedForRecycle = new Set();
		} catch (err) {
			recycleNotice = recycleErrorMessage(err);
		} finally {
			recycling = false;
		}
	}

	const status = authService.status;
	const profile = authService.profile;
	const spawns = spawnService.spawns;
	// The player's one team, read off their own cards (each fielded card holds a
	// slot). There is nothing to create and nothing to choose between: the slots are
	// simply there, and tapping a card fills or empties one.
	const teamSlots = teamService.slots;
	const teamSpawns = teamService.spawns;
	const teamSaving = teamService.saving;
	const teamError = teamService.error;
	const teamColorFilter = teamService.allowedColors;

	// Spawns store only a character id + geojson ids; labels, sprites and place
	// names are resolved here from the local registry and municipality layer.
	const charactersById = new Map(characters.map((character) => [character.id, character]));

	// character id → the Supabase shows it belongs to, by id and name: the name is what
	// the show filter lists, the id what puts that show's glyph on a statue's floor.
	let characterShows = new Map<string, { id: number; name: string }[]>();
	let municipalityNames: Map<string, string> | null = null;
	// character id → rarity tier from Supabase `character_templates`, so the rarity
	// filter has its tiers (the same source the claim cards read).
	let rarityByCharacter = new Map<string, number>();

	let loading = false;
	let error = '';
	// Guards the one-time load so the reactive block doesn't refire on every tick.
	let loadedForUser: string | null = null;

	onMount(() => authService.init());

	$: currentUserId = $status === AuthStatus.SignedIn && $profile ? String($profile.id) : null;
	$: if (currentUserId && currentUserId !== loadedForUser) {
		loadedForUser = currentUserId;
		load(currentUserId);
	}

	async function load(userId: string) {
		loading = true;
		error = '';
		try {
			const [, showsByCharacter, rarities] = await Promise.all([
				spawnService.loadSpawns(userId),
				spawnService.loadCharacterShows(),
				spawnService.loadRarities()
			]);
			characterShows = showsByCharacter;
			rarityByCharacter = rarities;

			// Place names are optional — a missing layer just falls back to the id.
			try {
				const response = await fetch('/data/geo/municipis.json');
				const municipalities = (await response.json()) as GeoJSON.FeatureCollection;
				municipalityNames = locationAdapter.municipalityNames(municipalities);
			} catch {
				municipalityNames = null;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	function labelFor(id: string): string {
		return charactersById.get(id)?.label ?? id;
	}
	function basePathFor(id: string): string | null {
		return charactersById.get(id)?.basePath ?? null;
	}

	function showNamesFor(characterId: string): string[] {
		return (characterShows.get(characterId) ?? []).map((show) => show.name);
	}
	// The show whose glyph a statue stands on: the character's first, exactly as
	// `teamShowId` reads a team's, so a character carries the same badge here as on
	// the map. A character in no show leaves the floor bare.
	function showIdFor(characterId: string): number | null {
		return characterShows.get(characterId)?.[0]?.id ?? null;
	}
	function locationNameFor(id: string): string {
		if (id && id !== ULTRAMAR_ID) {
			const name = municipalityNames?.get(id);
			if (name) return name;
		}
		// The Ultramar sentinel and any missing/unresolved location read as Ultramar.
		return ULTRAMAR.municipality;
	}

	// The distinct show names present across the roster, sorted — the options for the
	// show dropdown. Rebuilds as spawns and their show mapping load in.
	$: showFilterOptions = ((shows: Map<string, { id: number; name: string }[]>) =>
		[
			...new Set(
				$spawns.flatMap((spawn) => (shows.get(spawn.characterId) ?? []).map((show) => show.name))
			)
		].sort((a, b) => a.localeCompare(b)))(characterShows);

	// The distinct rarity tiers present across the roster, ascending — the options
	// for the rarity dropdown.
	$: rarityFilterOptions = ((rarities: Map<string, number>) =>
		[...new Set($spawns.map((spawn) => rarities.get(spawn.characterId)).filter((r): r is number => r != null))].sort(
			(a, b) => a - b
		))(rarityByCharacter);

	// The roster narrowed by the header filters. All predicates AND together; an
	// unset (ANY) filter is a pass. The filter maps are threaded in as deps so the
	// list re-runs as they load or a control changes. This — not `$spawns` — is what
	// the grid renders.
	$: filteredSpawns = ((
		name: string,
		color: SpawnColor | typeof ANY,
		show: string | typeof ANY,
		rarity: number | typeof ANY,
		shows: Map<string, { id: number; name: string }[]>,
		rarities: Map<string, number>,
		teamColors: Set<string> | null
	) => {
		const needle = name.trim().toLowerCase();
		return $spawns.filter((spawn) => {
			if (needle && !labelFor(spawn.characterId).toLowerCase().includes(needle)) return false;
			if (color !== ANY && spawn.color !== color) return false;
			if (
				show !== ANY &&
				!(shows.get(spawn.characterId) ?? []).some((entry) => entry.name === show)
			)
				return false;
			if (rarity !== ANY && (rarities.get(spawn.characterId) ?? null) !== rarity) return false;
			if (teamColors && !teamColors.has(spawn.color)) return false;
			return true;
		});
	})(
		filterName,
		filterColor,
		filterShow,
		filterRarity,
		characterShows,
		rarityByCharacter,
		pickableColors
	);

	// The filters and the pager work on the same list: filtering narrows it, the pager
	// walks it a page at a time. So any filter change re-pages from the start — the
	// narrowed roster always opens on its first page rather than on a page number that
	// meant something under the old filters.
	$: filterName, filterColor, filterShow, filterRarity, (page = 0);

	// --- One cell per character, not per card ---------------------------------------
	// A character claimed six times is one character, so the grid stands them up once
	// and puts their copies underneath as a row of colour circles. The grouping happens
	// before the pager, so a page is ten rows of *characters* — a player with a hundred
	// reds of the same fighter no longer walks ten pages of the same statue.
	function groupByCharacter(
		spawns: CharacterSpawn[]
	): { characterId: string; copies: CharacterSpawn[] }[] {
		const groups = new Map<string, CharacterSpawn[]>();
		for (const spawn of spawns) {
			const copies = groups.get(spawn.characterId);
			if (copies) copies.push(spawn);
			else groups.set(spawn.characterId, [spawn]);
		}
		// Insertion order, so the characters keep the order their first copy was in.
		return [...groups].map(([characterId, copies]) => ({ characterId, copies }));
	}

	$: characterGroups = groupByCharacter(filteredSpawns);

	// character id → the id of the copy the grid is showing for it. Only holds the ones
	// the player has clicked a circle for; every other character shows its first copy.
	// Keyed by character rather than by page, so a colour picked stays picked as the
	// filters and the pages move.
	let shownCopyByCharacter = new Map<string, string>();
	function showCopy(characterId: string, spawnId: string): void {
		shownCopyByCharacter = new Map(shownCopyByCharacter).set(characterId, spawnId);
	}

	// A page is ROWS_PER_PAGE rows at the current column count, so the slider resizes
	// the page as well as the cards.
	$: pageSize = Math.max(1, $columns) * ROWS_PER_PAGE;
	$: pageCount = Math.max(1, Math.ceil(characterGroups.length / pageSize));
	// Clamp whenever the page count shrinks (a wider column count, or cards recycled
	// away) so the view never sits past the last page.
	$: if (page > pageCount - 1) page = pageCount - 1;
	$: pageStart = page * pageSize;
	// The one page of characters the grid actually stands up — not the full list.
	$: pagedGroups = characterGroups.slice(pageStart, pageStart + pageSize);

	function goToPage(next: number): void {
		page = Math.min(Math.max(0, next), pageCount - 1);
	}

	// A new page opens at its top; anything else keeps the scroll offset.
	$: page, gridScroller?.scrollTo({ top: 0 });

	/** One spawn as the statue that stands for it: who they are, the art that stands
	 * them up, the colour they bend, where they were claimed and whose glyph is
	 * painted on the floor. The resolved maps come in as arguments rather than being
	 * read off the component, so every caller has to name them and their reactive
	 * statement tracks them. */
	function toStatue(
		spawn: CharacterSpawn,
		_names: Map<string, string> | null,
		_shows: Map<string, { id: number; name: string }[]>
	) {
		return {
			label: labelFor(spawn.characterId),
			basePath: basePathFor(spawn.characterId),
			color: spawn.color,
			locationName: locationNameFor(spawn.locationId),
			showId: showIdFor(spawn.characterId)
		};
	}

	// The current page's characters, each with the copy it is showing and the statue of
	// that copy — a copy carries its own colour and its own claim place, so switching
	// circles restands the character in that colour, in the town that one was pulled in.
	// A shown copy that has since been filtered out or recycled away falls back to the
	// group's first, so the cell is never left pointing at a card that isn't there. The
	// place names and the show assignment are threaded in so the grid re-derives as they
	// load (a bare helper call would hide those deps).
	$: pagedStatues = ((
		names: Map<string, string> | null,
		shows: Map<string, { id: number; name: string }[]>,
		shown: Map<string, string>
	) =>
		pagedGroups.map((group) => {
			const shownId = shown.get(group.characterId);
			const copy = group.copies.find((spawn) => spawn.id === shownId) ?? group.copies[0];
			return { group, copy, statue: toStatue(copy, names, shows) };
		}))(municipalityNames, characterShows, shownCopyByCharacter);

	// The team as the band above the grid: one cell per slot, in slot order — its
	// statue where the slot is filled, null (an empty frame) where it isn't. Independent
	// of the filters and the pager, since it is the team, not the roster, and always
	// drawn: there is one team and it is always the one being built.
	$: teamSlotStatues = ((
		slots: (CharacterSpawn | null)[],
		names: Map<string, string> | null,
		shows: Map<string, { id: number; name: string }[]>
	) => slots.map((spawn) => (spawn ? toStatue(spawn, names, shows) : null)))(
		$teamSpawns,
		municipalityNames,
		characterShows
	);

	// Tapping a statue puts the copy it is showing on the team or takes it off (into the
	// first free slot, or out of the one it holds). It is the statue that acts and the
	// circles that only choose which copy it stands as — a click meant to look at the
	// blue one must never field it. A tap while a line-up is in flight is dropped rather
	// than queued: the team is the server's, and two saves racing would be two answers
	// to the same question.
	function handleCardTap(spawn: CharacterSpawn): void {
		if (recycleMode) {
			toggleRecycleSelection(spawn.id);
			return;
		}
		if ($teamSaving) return;
		void teamService.toggle(spawn.id);
	}

	/** One copy's circle: its colour, ringed while it is the copy being shown and while
	 * it is selected for recycling. Only ever one ring colour is emitted — two would be
	 * two rules of the same weight, and the winner would be whichever Tailwind happened
	 * to write last rather than the one meant. */
	function copyCircleClasses(
		copy: CharacterSpawn,
		shownId: string,
		inRecycleMode: boolean,
		selected: Set<string>
	): string {
		const isShown = copy.id === shownId;
		const isSelected = inRecycleMode && selected.has(copy.id);
		return classNames(
			'size-4 flex-none rounded-full border border-black/30 transition',
			SPAWN_FILL_CLASSES[copy.color],
			{
				'ring-2 ring-offset-1 ring-offset-base-200': isShown || isSelected,
				'ring-warning': isSelected,
				'ring-base-content': isShown && !isSelected
			}
		);
	}

	// The team's summary, at the head of the band: the colour it is led by, that lead's
	// show(s) and where it was claimed. A team with no picks yet reads as em-dashes
	// rather than as nothing, since the band is always there.
	$: teamSummary = ((
		lead: CharacterSpawn | null,
		_names: Map<string, string> | null,
		_shows: Map<string, { id: number; name: string }[]>
	): { color: SpawnColor | null; showName: string | null; regionName: string | null } => {
		if (!lead) return { color: null, showName: null, regionName: null };
		return {
			color: lead.color,
			showName: showNamesFor(lead.characterId).join(', ') || 'No show',
			regionName: locationNameFor(lead.locationId)
		};
	})($teamSpawns[0] ?? null, municipalityNames, characterShows);

	// The Remove button under a filled slot — the same path as a tap on a fielded card:
	// empty that slot. Emptying the lead's empties the team, since every other slot was
	// only allowed there by the lead's colour.
	function handleSlotRemove(index: number): void {
		if ($teamSaving) return;
		void teamService.clear(index);
	}

	// How many slots are filled, for the line above the grid.
	$: teamFilledCount = $teamSlots.filter(Boolean).length;

	// The colours the team can still take — its lead's own plus the ones that share a
	// colour with it — folded into the header filters, so the grid shows the cards the
	// team could actually take. It is the lead that sets the rule, so nothing is
	// narrowed while the lead slot is empty, where any card is a legal first pick.
	// Nothing is narrowed in recycle mode either: there a tap recycles rather than
	// recruits, and hiding most of the roster would make recycling impossible.
	$: pickableColors = recycleMode ? null : $teamColorFilter;

</script>

<svelte:window on:keydown={onKeydown} />

<!-- The roster, raised over the map. z-[1300] puts it above both the map's pinned
	panel (z-[900]) and the combat arena (z-[1200]) — the arena is one of the
	places that sends the player here, so it has to open on top of it. The box is a
	fixed-height flex column: the toolbar and the recycle bar take what they need and
	the card canvas gets the rest, which is what its WebGL scene is sized from. -->
<div class="modal modal-open z-[1300]" role="dialog" aria-modal="true">
	<div class="modal-box flex h-[90vh] w-11/12 max-w-7xl flex-col gap-4 overflow-hidden">
		<div class="flex flex-none items-center gap-3">
			<h2 class="text-lg font-bold">Roster</h2>
			<button
				type="button"
				class="btn btn-circle btn-ghost btn-sm ml-auto"
				aria-label="Close roster"
				on:click={close}
			>
				✕
			</button>
		</div>

		{#if $status === AuthStatus.SignedIn && $spawns.length > 0}
			<!-- Filter toolbar: narrows the cards shown on the canvas. Every control ANDs
			     with the others; the count shows the filtered-vs-total tally. -->
			<div class="flex flex-none flex-wrap items-end gap-3 rounded-box bg-base-200 p-4">
				<label class="flex flex-col gap-1 text-xs">
					<span class="opacity-60">Name</span>
					<input
						type="search"
						class="input input-sm input-bordered w-44"
						placeholder="Search by name"
						bind:value={filterName}
					/>
				</label>

				<label class="flex flex-col gap-1 text-xs">
					<span class="opacity-60">Colour</span>
					<select class="select select-sm select-bordered w-36 capitalize" bind:value={filterColor}>
						<option value={ANY}>All colours</option>
						{#each COLOR_OPTIONS as color (color)}
							<option value={color}>{color}</option>
						{/each}
					</select>
				</label>

				<label class="flex flex-col gap-1 text-xs">
					<span class="opacity-60">Show</span>
					<select
						class="select select-sm select-bordered w-44"
						bind:value={filterShow}
						disabled={showFilterOptions.length === 0}
					>
						<option value={ANY}>All shows</option>
						{#each showFilterOptions as show (show)}
							<option value={show}>{show}</option>
						{/each}
					</select>
				</label>

				<label class="flex flex-col gap-1 text-xs">
					<span class="opacity-60">Rarity</span>
					<select
						class="select select-sm select-bordered w-36"
						bind:value={filterRarity}
						disabled={rarityFilterOptions.length === 0}
					>
						<option value={ANY}>All rarities</option>
						{#each rarityFilterOptions as rarity (rarity)}
							<option value={rarity}>{wowRarityLabel(rarity) ?? `Tier ${rarity}`}</option>
						{/each}
					</select>
				</label>

					<div class="ml-auto flex items-center gap-3">
					<span class="badge badge-lg badge-primary" title="Cards shown / total claimed">
						{filteredSpawns.length} / {$spawns.length}
					</span>
					<button
						class="btn btn-ghost btn-sm"
						disabled={!filtersActive}
						on:click={resetFilters}
					>
						Clear
					</button>
					<button
						class="btn btn-sm"
						class:btn-outline={!recycleMode}
						class:btn-warning={recycleMode}
						on:click={() => (recycleMode ? cancelRecycle() : enterRecycleMode())}
					>
						{recycleMode ? 'Cancel' : 'Recycle'}
					</button>
				</div>
			</div>

			{#if recycleMode}
				<!-- Recycle bar: tap cards to select them, then trade each full group of
				     RECYCLE_GROUP_SIZE back for one extra daily claim. -->
				<div
					class="flex flex-none flex-wrap items-center gap-3 rounded-box bg-warning/10 p-4 text-sm"
				>
					<span class="font-medium">
						Tap cards to select them. Every {RECYCLE_GROUP_SIZE} recycled grants one extra claim today.
					</span>
					<span class="badge badge-warning" title="Cards selected → extra claims earned">
						{recycleSelectedCount} selected → {recycleGrant} claim{recycleGrant === 1 ? '' : 's'}
					</span>
					<div class="ml-auto flex items-center gap-3">
						<button class="btn btn-ghost btn-sm" on:click={cancelRecycle} disabled={recycling}>
							Cancel
						</button>
						<button
							class="btn btn-warning btn-sm"
							disabled={recycleGrant < 1 || recycling}
							on:click={confirmRecycle}
						>
							{#if recycling}
								<span class="loading loading-spinner loading-xs"></span>
							{/if}
							Recycle {recycleSelectedCount} card{recycleSelectedCount === 1 ? '' : 's'}
						</button>
					</div>
				</div>
			{/if}

			{#if recycleNotice}
				<div class="alert alert-info flex-none py-2 text-sm"><span>{recycleNotice}</span></div>
			{/if}

			{#if $teamError}
				<!-- The team is the server's, so a refused line-up is said in the server's own
				     words — the card sprang back to where it was, and this is why. -->
				<div class="alert alert-error flex-none py-2 text-sm"><span>{$teamError}</span></div>
			{/if}
		{/if}

		<div class="flex min-h-0 flex-1 flex-col">
			{#if !authService.configured}
				<div class="alert alert-warning text-sm">
					<span>Sign-in is unavailable — Supabase is not configured.</span>
				</div>
			{:else if $status === AuthStatus.Loading}
				<div class="flex justify-center py-12">
					<span class="loading loading-spinner loading-md"></span>
				</div>
			{:else if $status !== AuthStatus.SignedIn}
				<div class="card max-w-md bg-base-200">
					<div class="card-body gap-4">
						<p class="text-sm opacity-70">Sign in to see the characters you've claimed.</p>
						<!-- The sign-in card is in the map's own panel, behind this modal, so the
						     prompt hands the screen back to it rather than stacking another one. -->
						<button
							class="btn btn-primary btn-sm w-fit"
							on:click={() => {
								close();
								signInPanelOpen.set(true);
							}}
						>
							Sign in
						</button>
					</div>
				</div>
			{:else if error}
				<div class="alert alert-error text-sm"><span>{error}</span></div>
			{:else if loading}
				<div class="flex items-center gap-2 text-sm opacity-70">
					<span class="loading loading-spinner loading-xs"></span>
					Loading your roster…
				</div>
			{:else if $spawns.length === 0}
				<div class="card max-w-md bg-base-200">
					<div class="card-body gap-4">
						<p class="text-sm opacity-70">
							You haven't claimed any characters yet. Head to the map and open one of today's
							booster packs to spawn your first one.
						</p>
						<button class="btn btn-primary btn-sm w-fit" on:click={close}>Open the map</button>
					</div>
				</div>
			{:else}
				<div class="mb-3 flex flex-none flex-wrap items-center justify-between gap-3">
					<p class="text-xs opacity-60">
						Tap a colour under a character to stand them up in that copy.
						{#if recycleMode}
							Tap the character to select or deselect that copy for recycling.
						{:else if teamFilledCount === 0}
							Tap the character to lead your team — the rest of it fights in its colours.
						{:else}
							Tap the character to add or remove that copy from your team ({teamFilledCount}/{TEAM_SIZE}).
						{/if}
					</p>
					<div class="flex flex-wrap items-center gap-3">
						{#if pageCount > 1}
							<div class="join">
								<button
									class="btn join-item btn-sm"
									disabled={page === 0}
									on:click={() => goToPage(page - 1)}
									aria-label="Previous page"
								>
									‹
								</button>
								<span class="btn no-animation join-item pointer-events-none btn-sm font-normal">
									Page {page + 1} / {pageCount}
								</span>
								<button
									class="btn join-item btn-sm"
									disabled={page >= pageCount - 1}
									on:click={() => goToPage(page + 1)}
									aria-label="Next page"
								>
									›
								</button>
							</div>
						{/if}
						<label class="flex items-center gap-2 text-xs">
							<span class="whitespace-nowrap opacity-60">Columns</span>
							<input
								type="range"
								min={MIN_COLUMNS}
								max={MAX_COLUMNS}
								class="range range-primary range-xs w-40"
								bind:value={$columns}
								aria-label="Grid columns"
							/>
							<span class="w-4 text-right tabular-nums opacity-70">{$columns}</span>
						</label>
						{#if $teamSaving}
							<span class="flex items-center gap-2 text-xs opacity-60">
								<span class="loading loading-spinner loading-xs"></span>
								Saving team…
							</span>
						{/if}
					</div>
				</div>
				<!-- The team the player is building, above the roster it is picked from:
				     what it is led by on the left, then one cell per slot — a statue where
				     the slot is filled, with the button that empties it, and an empty frame
				     where it isn't. It stands outside the scroll box, since it is what the
				     grid below is being read against. -->
				<div class="mb-3 flex flex-none gap-4 rounded-box bg-base-200 p-3">
					<dl class="flex w-32 flex-none flex-col justify-center gap-2 text-xs">
						<div>
							<dt class="opacity-50">COLOUR</dt>
							<dd class="flex items-center gap-1.5 capitalize">
								{#if teamSummary.color}
									<span
										class={classNames(
											'inline-block size-2.5 rounded-full',
											SPAWN_FILL_CLASSES[teamSummary.color]
										)}
									></span>
								{/if}
								{teamSummary.color ?? '—'}
							</dd>
						</div>
						<div>
							<dt class="opacity-50">SHOW</dt>
							<dd class="truncate" title={teamSummary.showName ?? ''}>
								{teamSummary.showName ?? '—'}
							</dd>
						</div>
						<div>
							<dt class="opacity-50">REGION</dt>
							<dd class="truncate" title={teamSummary.regionName ?? ''}>
								{teamSummary.regionName ?? '—'}
							</dd>
						</div>
					</dl>
					<!-- The slots are a fixed narrow width rather than a share of the modal:
					     a statue is three quarters as wide as it is tall, so letting three of
					     them span a 7xl box would stand them half the screen high and leave
					     the roster underneath a slit. The band is a reminder of who is
					     fielded — the grid is what the screen is for. -->
					<div class="flex gap-2">
						{#each teamSlotStatues as statue, index (index)}
							<div class="flex w-24 flex-none flex-col gap-1 sm:w-28">
								{#if statue}
									<CharacterStatue
										label={statue.label}
										basePath={statue.basePath}
										color={statue.color}
										locationName={statue.locationName}
										showId={statue.showId}
									/>
									<button
										class="btn btn-ghost btn-xs"
										disabled={$teamSaving}
										on:click={() => handleSlotRemove(index)}
									>
										Remove
									</button>
								{:else}
									<div
										class="aspect-[3/4] w-full rounded-box border-2 border-dashed border-base-content/20"
									></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- The roster itself: a statue per character — the same one the map's panel
				     stands the team up with — in a grid the slider sets the width of (1/2/3
				     by viewport to start), with that character's copies under it as a row of
				     colour circles. Tapping the statue toggles the shown copy's team
				     membership, or selects it while recycling; tapping a circle only changes
				     which copy is shown. Only the current page is mounted — the filters
				     narrow the roster, the pager walks what's left ROWS_PER_PAGE rows at a
				     time — and the box takes whatever the modal's fixed height leaves it. -->
				<div
					bind:this={gridScroller}
					class="relative min-h-0 flex-1 overflow-y-auto rounded-box bg-base-200 p-3"
				>
					<div class={classNames('grid gap-3', COLUMN_CLASSES[$columns] ?? 'grid-cols-3')}>
						{#each pagedStatues as { group, copy, statue } (group.characterId)}
							<div class="flex flex-col gap-2">
								<button
									type="button"
									class={classNames(
										'rounded-box transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
										{
											'opacity-30': recycleMode && !selectedForRecycle.has(copy.id),
											'ring-2 ring-warning': recycleMode && selectedForRecycle.has(copy.id)
										}
									)}
									on:click={() => handleCardTap(copy)}
								>
									<CharacterStatue
										label={statue.label}
										basePath={statue.basePath}
										color={statue.color}
										locationName={statue.locationName}
										showId={statue.showId}
									/>
								</button>
								<!-- Every copy of this character the player holds, in the colour it was
								     rolled in: a click stands the character up in that one. Two copies of
								     the same colour are two circles, since they are two cards — the one
								     being shown is the ringed one. -->
								<div class="flex flex-wrap justify-center gap-1.5">
									{#each group.copies as option (option.id)}
										<button
											type="button"
											class={copyCircleClasses(
												option,
												copy.id,
												recycleMode,
												selectedForRecycle
											)}
											title={locationNameFor(option.locationId)}
											aria-label="{statue.label} — {option.color}"
											aria-pressed={option.id === copy.id}
											on:click={() => showCopy(group.characterId, option.id)}
										></button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
					{#if filteredSpawns.length === 0}
						<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
							<p class="text-sm opacity-60">No characters match these filters.</p>
							<button class="btn btn-outline btn-sm" on:click={resetFilters}>Clear filters</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<button type="button" class="modal-backdrop" aria-label="Close roster" on:click={close}></button>
</div>
