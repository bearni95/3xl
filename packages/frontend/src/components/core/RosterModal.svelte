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
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import {
		SPAWN_FILL_CLASSES,
		SPAWN_PANEL_CLASSES,
		SPAWN_SQUARE_GLYPHS
	} from '$components/core/spawn-colors';
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

	// Every spawn colour, for the colour filter's swatches (labels are the enum values).
	const COLOR_OPTIONS = Object.values(SpawnColor);

	// A colour is picked by pressing its swatch and unpicked by pressing it again —
	// which is the only way back to "all colours" now that there is no option saying so.
	function toggleColorFilter(color: SpawnColor): void {
		filterColor = filterColor === color ? ANY : color;
	}

	/** One colour's swatch in the filter: the colour itself as a rounded square, ringed
	 * while it is the one being filtered on. Nothing ringed means no colour filter, so
	 * the six unringed squares are what "all colours" looks like. */
	function colorSquareClasses(color: SpawnColor, active: SpawnColor | typeof ANY): string {
		return classNames(
			'aspect-square w-full rounded-md border border-black/30 transition',
			'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
			SPAWN_FILL_CLASSES[color],
			{
				'ring-2 ring-base-content ring-offset-1 ring-offset-base-200': active === color,
				'opacity-70 hover:opacity-100': active !== color
			}
		);
	}

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

	// The show whose glyph a statue stands on: the character's first, exactly as
	// `teamShowId` reads a team's, so a character carries the same badge here as on
	// the map. A character in no show leaves the floor bare.
	function showIdFor(characterId: string): number | null {
		return characterShows.get(characterId)?.[0]?.id ?? null;
	}
	function locationNameFor(id: string): string {
		if (id && id !== ULTRAMAR_ID) {
			// The layer parks the article after a comma to sort by; it goes back to the
			// front wherever the modal says a town — the team's region, a circle's tooltip
			// and (again, harmlessly) the statue's own panel.
			const name = municipalityNames?.get(id);
			if (name) return restoreCatalanArticle(name);
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

	// The slot each fielded card holds, by spawn id. Both questions the team asks of the
	// grid — which cells come first and which of them wears the border — are answered
	// from this, and ids are all either needs.
	$: teamSlotById = new Map<string, number>(
		$teamSlots.flatMap((id, slot) => (id ? [[id, slot] as [string, number]] : []))
	);

	/** The copy of this character holding the earliest team slot, or null if the player
	 * has fielded none of them. Earliest rather than first-claimed, so a character fielded
	 * twice sorts and stands as the higher of its two slots. */
	function fieldedCopy(
		copies: CharacterSpawn[],
		slots: Map<string, number>
	): CharacterSpawn | null {
		let held: CharacterSpawn | null = null;
		let heldSlot = TEAM_SIZE;
		for (const copy of copies) {
			const slot = slots.get(copy.id);
			if (slot !== undefined && slot < heldSlot) {
				held = copy;
				heldSlot = slot;
			}
		}
		return held;
	}

	// The team is the head of the grid rather than a view of its own: a character with a
	// fielded copy sorts to the front, in slot order, so the lead is the first cell and the
	// line-up reads left to right before the roster it was picked from. Everything else
	// keeps the order its first copy was claimed in — Array.sort is stable, so a rank every
	// unfielded character shares leaves them all where they were. Sorting happens before
	// the pager, which is what keeps the team on the first page: it must never be a page
	// turn away from the cards being read against it.
	$: characterGroups = ((slots: Map<string, number>) => {
		const groups = groupByCharacter(filteredSpawns);
		const ranks = new Map(
			groups.map((group) => {
				const held = fieldedCopy(group.copies, slots);
				return [group.characterId, held ? (slots.get(held.id) ?? TEAM_SIZE) : TEAM_SIZE];
			})
		);
		return groups.sort(
			(a, b) => (ranks.get(a.characterId) ?? TEAM_SIZE) - (ranks.get(b.characterId) ?? TEAM_SIZE)
		);
	})(teamSlotById);

	/** One colour of one character, and every copy the player owns in it — a circle in
	 * the row under the statue, with that count beside it. */
	interface ColorSwatch {
		color: SpawnColor;
		copies: CharacterSpawn[];
	}

	// A character's copies gathered by colour: one circle per colour rather than per
	// card, since four reds are one red four times over and the number beside the
	// circle is what says so. Insertion order, so the colours keep the order their
	// first copy was pulled in.
	function groupColors(copies: CharacterSpawn[]): ColorSwatch[] {
		const byColor = new Map<SpawnColor, CharacterSpawn[]>();
		for (const copy of copies) {
			const owned = byColor.get(copy.color);
			if (owned) owned.push(copy);
			else byColor.set(copy.color, [copy]);
		}
		return [...byColor].map(([color, owned]) => ({ color, copies: owned }));
	}

	// character id → the id of the copy the grid is showing for it. Only holds the ones
	// the player has clicked a circle for; every other character shows its first copy.
	// Keyed by character rather than by page, so a colour picked stays picked as the
	// filters and the pages move.
	let shownCopyByCharacter = new Map<string, string>();
	function showCopy(characterId: string, spawnId: string): void {
		shownCopyByCharacter = new Map(shownCopyByCharacter).set(characterId, spawnId);
	}

	/** One place a character has been claimed in, in one colour — an entry in the cell's
	 * place selector, which is the other way into the same copies the circles hold: the
	 * circles ask which colour, this asks which town. */
	interface PlaceOption {
		copy: CharacterSpawn;
		locationName: string;
	}

	// A character's copies as the places they were pulled in, one entry per town and
	// colour: two reds from the same town say the same thing, so they are one entry, and
	// it stands the first of them up. Insertion order again, so the list follows the
	// order the copies were claimed in. `names` is taken as an argument so the caller's
	// reactive statement has to name the layer these places are read from.
	function groupPlaces(
		copies: CharacterSpawn[],
		_names: Map<string, string> | null
	): PlaceOption[] {
		const byPlace = new Map<string, PlaceOption>();
		for (const copy of copies) {
			const key = `${copy.locationId}|${copy.color}`;
			if (byPlace.has(key)) continue;
			byPlace.set(key, { copy, locationName: locationNameFor(copy.locationId) });
		}
		return [...byPlace.values()];
	}

	// Clicking a colour stands the character up in it. Clicking the colour already shown
	// walks to the next copy of that colour instead, so all four of those reds stay
	// reachable one at a time — they are four cards, and it is the shown one the statue
	// fields or recycles.
	function showColorCopy(characterId: string, swatch: ColorSwatch, shown: CharacterSpawn): void {
		if (shown.color !== swatch.color) {
			showCopy(characterId, swatch.copies[0].id);
			return;
		}
		const at = swatch.copies.findIndex((copy) => copy.id === shown.id);
		showCopy(characterId, swatch.copies[(at + 1) % swatch.copies.length].id);
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
			spawnedAt: spawn.createdAt,
			showId: showIdFor(spawn.characterId)
		};
	}

	// The current page's characters, each with the copy it is showing and the statue of
	// that copy — a copy carries its own colour and its own claim place, so switching
	// circles restands the character in that colour, in the town that one was pulled in.
	// Absent a circle the player picked, a character standing at the head of the grid
	// stands as the copy that put it there, so the bordered cell is the fielded card and
	// not some other one of the same fighter; everything else falls back to its first copy,
	// which is also where a shown copy filtered out or recycled away lands, so the cell is
	// never left pointing at a card that isn't there. The place names, the show assignment
	// and the slots are threaded in so the grid re-derives as they load or the team changes
	// (a bare helper call would hide those deps).
	$: pagedStatues = ((
		names: Map<string, string> | null,
		shows: Map<string, { id: number; name: string }[]>,
		shown: Map<string, string>,
		slots: Map<string, number>
	) =>
		pagedGroups.map((group) => {
			const shownId = shown.get(group.characterId);
			const copy =
				group.copies.find((spawn) => spawn.id === shownId) ??
				fieldedCopy(group.copies, slots) ??
				group.copies[0];
			const places = groupPlaces(group.copies, names);
			// Which entry the place selector sits on. Two copies from one town in one
			// colour are a single entry, so a shown copy that was the second of them has
			// none of its own — the entry that stands for its town and colour is the one
			// the selector must read, or it would show blank for a card that is right there.
			const place =
				places.find(
					(entry) =>
						entry.copy.locationId === copy.locationId && entry.copy.color === copy.color
				) ?? places[0];
			return {
				group,
				copy,
				swatches: groupColors(group.copies),
				places,
				placeValue: place.copy.id,
				statue: toStatue(copy, names, shows),
				// Whether the copy on show is the one holding a slot — the cell's border, so
				// the mark follows the card rather than the character: switch a fielded
				// character to a copy that isn't on the team and the border goes with it.
				fielded: slots.has(copy.id)
			};
		}))(municipalityNames, characterShows, shownCopyByCharacter, teamSlotById);

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

	// The same move the cell's own button makes, and the only one it makes: field the
	// shown copy or take it out again. It is the statue's toggle without the recycle
	// branch, since the button is not drawn while recycling.
	function handleTeamButton(spawn: CharacterSpawn): void {
		if ($teamSaving) return;
		void teamService.toggle(spawn.id);
	}

	/** One colour's circle: the colour itself with the count of copies owned in it
	 * written inside, ringed while it is the one the statue is standing in and while any
	 * copy of it is selected for recycling. The panel classes are what carry the count's
	 * ink — black on yellow, white on the rest — since the number sits on the swatch
	 * itself. Only ever one ring colour is emitted: two would be two rules of the same
	 * weight, and the winner would be whichever Tailwind happened to write last rather
	 * than the one meant. */
	function swatchCircleClasses(
		swatch: ColorSwatch,
		shownColor: SpawnColor,
		inRecycleMode: boolean,
		selected: Set<string>
	): string {
		const isShown = swatch.color === shownColor;
		const isSelected = inRecycleMode && swatch.copies.some((copy) => selected.has(copy.id));
		return classNames(
			'flex size-5 flex-none items-center justify-center rounded-full border border-black/30',
			'text-[0.625rem] font-semibold leading-none tabular-nums transition',
			'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
			SPAWN_PANEL_CLASSES[swatch.color],
			{
				'ring-2 ring-offset-1 ring-offset-base-200': isShown || isSelected,
				'ring-warning': isSelected,
				'ring-base-content': isShown && !isSelected
			}
		);
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
				<!-- What the grid is read with: the pager, the column slider, and whether a
				     line-up is in flight. -->
				<div class="mb-3 flex flex-none flex-wrap items-center justify-end gap-3">
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
				<!-- The filters stand beside the cards they narrow rather than in a row over
				     them: a row of four controls and a tally spent the full width of the modal
				     to say what a column says in the space one card takes, and the height it
				     took was height the grid wanted for its rows. -->
				<div class="flex min-h-0 flex-1 gap-3">
					<!-- Every control ANDs with the others; the tally under them is the
					     filtered-vs-total count, and Clear puts them all back. The column scrolls
					     on its own so a short modal never costs the grid its width. -->
					<div
						class="flex w-48 flex-none flex-col gap-3 overflow-y-auto rounded-box bg-base-200 p-3"
					>
						<label class="flex flex-col gap-1 text-xs">
							<span class="opacity-60">Name</span>
							<input
								type="search"
								class="input input-sm input-bordered w-full"
								placeholder="Search by name"
								bind:value={filterName}
							/>
						</label>

						<!-- The colours are the swatches themselves rather than a list of their
						     names: there are exactly six, so they are one row of six, and a square
						     saying red is quicker to read than the word and needs no translating.
						     Not a <label>, since there is no one control here to label — a group of
						     six buttons, each pressed or not. -->
						<div class="flex flex-col gap-1 text-xs">
							<span class="opacity-60">Colour</span>
							<div class="grid grid-cols-6 gap-1" role="group" aria-label="Filter by colour">
								{#each COLOR_OPTIONS as color (color)}
									<button
										type="button"
										class={colorSquareClasses(color, filterColor)}
										title={color}
										aria-label="Filter by {color}"
										aria-pressed={filterColor === color}
										on:click={() => toggleColorFilter(color)}
									></button>
								{/each}
							</div>
						</div>

						<label class="flex flex-col gap-1 text-xs">
							<span class="opacity-60">Show</span>
							<select
								class="select select-sm select-bordered w-full"
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
								class="select select-sm select-bordered w-full"
								bind:value={filterRarity}
								disabled={rarityFilterOptions.length === 0}
							>
								<option value={ANY}>All rarities</option>
								{#each rarityFilterOptions as rarity (rarity)}
									<option value={rarity}>{wowRarityLabel(rarity) ?? `Tier ${rarity}`}</option>
								{/each}
							</select>
						</label>

						<span class="badge badge-lg badge-primary w-full" title="Cards shown / total claimed">
							{filteredSpawns.length} / {$spawns.length}
						</span>
						<button
							class="btn btn-ghost btn-sm w-full"
							disabled={!filtersActive}
							on:click={resetFilters}
						>
							Clear
						</button>
						<button
							class="btn btn-sm w-full"
							class:btn-outline={!recycleMode}
							class:btn-warning={recycleMode}
							on:click={() => (recycleMode ? cancelRecycle() : enterRecycleMode())}
						>
							{recycleMode ? 'Cancel' : 'Recycle'}
						</button>
					</div>

					<!-- The roster, and the team at the head of it: a statue per character — the
					     same one the map's panel stands the team up with — in a grid the slider
					     sets the width of (1/2/3 by viewport to start), with one circle per colour
					     it has been pulled in underneath, each carrying how many of that colour the
					     player owns. The fielded cards are the first cells, in slot order, ringed
					     in primary; the team has no view of its own any more, since a slot was only
					     ever one of these cards and standing it up twice cost the grid the room it
					     wanted. Each cell carries the button that fields or unfields the copy it is
					     showing, pinned to its top corner; tapping the statue itself does the same
					     thing, or selects the copy while recycling, and tapping a circle only
					     changes which copy is shown. Only the current page is mounted
					     — the filters narrow the roster, the pager walks what's left ROWS_PER_PAGE
					     rows at a time — and the box takes whatever the filter column leaves it. -->
					<div
						bind:this={gridScroller}
						class="relative min-h-0 min-w-0 flex-1 overflow-y-auto rounded-box bg-base-200 p-3"
					>
						<div class={classNames('grid gap-3', COLUMN_CLASSES[$columns] ?? 'grid-cols-3')}>
							{#each pagedStatues as { group, copy, swatches, places, placeValue, statue, fielded } (group.characterId)}
								<!-- The border is on the cell, not on the statue: it takes in the circles
								     and the place select too, so what it marks is this character's whole
								     entry. Every cell carries it and only a fielded one colours it in, so
								     joining the team never nudges the grid by two pixels. -->
								<div
									class={classNames('relative flex flex-col gap-2 rounded-box border-2 p-1.5', {
										'border-primary': fielded,
										'border-transparent': !fielded
									})}
								>
									<!-- The team button, pinned to the top of the cell rather than laid out in
									     it: it sits over the statue's top-right corner, in the same place in
									     every cell whatever the art below it does. A minus on a fielded card, a
									     plus on one that could still be fielded, and disabled once the team is
									     full — a plus that cannot add is a dead button, and the server would
									     refuse the card anyway. Not drawn at all while recycling, where a cell
									     is about what to trade in rather than who to field. -->
									{#if !recycleMode}
										<button
											type="button"
											class={classNames(
												'btn btn-circle btn-xs absolute right-1 top-1 z-10 text-base leading-none shadow',
												fielded ? 'btn-primary' : 'btn-neutral'
											)}
											disabled={$teamSaving || (!fielded && teamFilledCount >= TEAM_SIZE)}
											title={fielded
												? `Remove ${statue.label} from your team`
												: `Add ${statue.label} to your team`}
											aria-label={fielded
												? `Remove ${statue.label} from your team`
												: `Add ${statue.label} to your team`}
											on:click={() => handleTeamButton(copy)}
										>
											{fielded ? '−' : '+'}
										</button>
									{/if}
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
											spawnedAt={statue.spawnedAt}
											showId={statue.showId}
										/>
									</button>
									<!-- Every colour this character has been pulled in, each circle carrying
									     how many of that colour the player owns: a click stands them up in
									     that colour, and a click on the colour already standing walks to the
									     next copy of it. The circle being shown is the ringed one. Beside them,
									     the same copies asked for the other way round — by the town they were
									     claimed in, each saying its colour. -->
									<div class="flex flex-wrap items-center justify-center gap-1.5">
										{#each swatches as swatch (swatch.color)}
											<button
												type="button"
												class={swatchCircleClasses(
													swatch,
													copy.color,
													recycleMode,
													selectedForRecycle
												)}
												title="{swatch.copies.length} in {swatch.color}"
												aria-label="{statue.label} — {swatch.copies.length} in {swatch.color}"
												aria-pressed={swatch.color === copy.color}
												on:click={() => showColorCopy(group.characterId, swatch, copy)}
											>
												{swatch.copies.length}
											</button>
										{/each}

										<!-- The same copies asked for by town rather than by colour, and a native
										     select because a menu of our own would be clipped by the scroll box
										     this grid lives in. Each place says the colour it was pulled in with a
										     square, the one thing an option can carry that a stylesheet cannot
										     reach. -->
										<select
											class="select select-xs min-w-0 max-w-[9rem] flex-initial"
											aria-label="{statue.label} — where it was claimed"
											value={placeValue}
											on:change={(event) => showCopy(group.characterId, event.currentTarget.value)}
										>
											{#each places as place (place.copy.id)}
												<option value={place.copy.id}>
													{SPAWN_SQUARE_GLYPHS[place.copy.color]}
													{place.locationName}
												</option>
											{/each}
										</select>
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
				</div>
			{/if}
		</div>
	</div>
	<button type="button" class="modal-backdrop" aria-label="Close roster" on:click={close}></button>
</div>
