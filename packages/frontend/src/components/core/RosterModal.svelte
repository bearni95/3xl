<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { rosterModalOpen } from '$services/rosterModal';
	import { spawnService, RECYCLE_GROUP_SIZE } from '$services/spawn.service';
	import { teamService, TEAM_SIZE } from '$services/team.service';
	import { showLogos, loadShowLogos } from '$services/shows.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { AuthStatus } from '$types/profile.type';
	import { ULTRAMAR, ULTRAMAR_ID } from '$types/location.type';
	import { SpawnColor, type CharacterSpawn } from '$types/character-spawn.type';
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

	// Bounds for the grid-column slider, and the count the grid opens on: seven, for
	// every viewport, now that the roster is the whole view rather than a box inside it
	// — the width is there to be spent, and the filter card takes two of the seven. The
	// slider is still what narrows it, and a player who has already moved it keeps their
	// own number.
	const MIN_COLUMNS = 1;
	const MAX_COLUMNS = 7;
	const DEFAULT_COLUMNS = 7;

	// The slider's count as a grid, one literal class per setting: Tailwind only
	// emits a class it can see spelled out, so `grid-cols-${n}` would emit nothing.
	const COLUMN_CLASSES: Record<number, string> = {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-4',
		5: 'grid-cols-5',
		6: 'grid-cols-6',
		7: 'grid-cols-7'
	};

	// The filter panel is the grid's first cell and takes two columns of it — except at
	// one column, where a two-column span would open an implicit second column and take
	// the grid's width with it. Spelled out for the same reason the column classes are.
	const FILTER_SPAN_CLASSES: Record<number, string> = {
		1: 'col-span-1',
		2: 'col-span-2'
	};

	// The narrowest grid whose first row can hold the filters and the whole line-up: two
	// columns for the filter card and one per slot. Below it the party row is not drawn at
	// all — a row that could not finish the line-up would push part of it onto a second
	// row and stop being one — and the cards follow the filters as they did before.
	const PARTY_ROW_MIN_COLUMNS = 2 + TEAM_SIZE;

	// Persisted as a player preference: reloads from localStorage on refresh, else opens
	// on DEFAULT_COLUMNS. The store auto-writes on every change.
	const columns = localStorageWritableStore<number>('roster:columns', DEFAULT_COLUMNS);

	// Whether a character's copies are gathered into one cell — a statue with a circle
	// per colour under it — or every card owned gets a cell of its own. Grouped is the
	// default and what the grid has been; ungrouped is the roster read as what it
	// literally is, one entry per card. A player preference like the column count, so it
	// survives a reload rather than being re-picked every time the roster is opened.
	const groupCopies = localStorageWritableStore<boolean>('roster:group-copies', true);

	// --- Card filters (the header toolbar) ---
	// Sentinel every "no filter" dropdown uses, so an unset filter is distinct from
	// any real value (a colour, a show name).
	const ANY = '' as const;
	let filterName = ''; // free-text match against the character label
	let filterColor: SpawnColor | typeof ANY = ANY;
	// By TMDB id rather than by name, since what the filter shows is the show's own
	// logo and that is fetched by id (see shows.service).
	let filterShow: number | typeof ANY = ANY;

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
				'ring-2 ring-base-content ring-offset-1 ring-offset-base-100': active === color,
				'opacity-70 hover:opacity-100': active !== color
			}
		);
	}

	// Same gesture as a colour swatch: press a show to filter to it, press it again to
	// let go. That is where the "All shows" option went.
	function toggleShowFilter(showId: number): void {
		filterShow = filterShow === showId ? ANY : showId;
	}

	/** One show's chip in the filter, ringed while it is the one being filtered on. The
	 * band under it is the statue's — a show's lettering is drawn to sit on something
	 * dark, and the panel it sits on there is what makes it readable here too. */
	function showChipClasses(showId: number, active: number | typeof ANY): string {
		return classNames(
			'flex h-8 items-center justify-center overflow-hidden rounded-md bg-black/40 px-1 transition',
			'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
			{
				'ring-2 ring-base-content ring-offset-1 ring-offset-base-100': active === showId,
				'opacity-70 hover:opacity-100': active !== showId
			}
		);
	}

	function resetFilters(): void {
		filterName = '';
		filterColor = ANY;
		filterShow = ANY;
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
	$: filtersActive = filterName.trim() !== '' || filterColor !== ANY || filterShow !== ANY;

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
	// The same line-up as the cards themselves, a null per empty slot — what the first
	// row of the grid stands up, one cell per slot whether or not it is filled.
	const teamCards = teamService.spawns;
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

	let loading = false;
	let error = '';
	// Guards the one-time load so the reactive block doesn't refire on every tick.
	let loadedForUser: string | null = null;

	onMount(() => authService.init());
	// The show logos the filter's chips are drawn from. Every statue in the grid asks for
	// the same collection, and the service shares the one fetch between them — asked for
	// here as well so the filter has its artwork whether or not a statue is standing.
	onMount(() => void loadShowLogos());

	$: currentUserId = $status === AuthStatus.SignedIn && $profile ? String($profile.id) : null;
	$: if (currentUserId && currentUserId !== loadedForUser) {
		loadedForUser = currentUserId;
		load(currentUserId);
	}

	async function load(userId: string) {
		loading = true;
		error = '';
		try {
			const [, showsByCharacter] = await Promise.all([
				spawnService.loadSpawns(userId),
				spawnService.loadCharacterShows()
			]);
			characterShows = showsByCharacter;

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
	// show filter, by id and name — the id is what the chip draws a logo from and what
	// the predicate matches, the name what sorts them and what a show with no logo
	// enabled falls back to saying. Rebuilds as spawns and their show mapping load in.
	$: showFilterOptions = ((shows: Map<string, { id: number; name: string }[]>) => {
		const byId = new Map<number, string>();
		for (const spawn of $spawns) {
			for (const show of shows.get(spawn.characterId) ?? []) byId.set(show.id, show.name);
		}
		return [...byId]
			.map(([id, name]) => ({ id, name }))
			.sort((a, b) => a.name.localeCompare(b.name));
	})(characterShows);

	// The slot each fielded card holds, by spawn id. Every question the team asks of the
	// grid — which cards no filter may hide, which cells come first, which of them wears
	// the border — is answered from this, and ids are all any of them needs.
	$: teamSlotById = new Map<string, number>(
		$teamSlots.flatMap((id, slot) => (id ? [[id, slot] as [string, number]] : []))
	);

	// The roster narrowed by the header filters. All predicates AND together; an
	// unset (ANY) filter is a pass. The filter maps are threaded in as deps so the
	// list re-runs as they load or a control changes. This — not `$spawns` — is what
	// the grid renders.
	//
	// A fielded card is exempt from every one of them. The team is what the roster is
	// being read against, so it stays on screen while the player searches for the fourth
	// name to put beside it: a colour filter that hid the line-up would take away the
	// thing the search is for. It keeps its place in the list rather than being appended,
	// since the sort that puts the team at the head of the grid runs later anyway.
	$: filteredSpawns = ((
		name: string,
		color: SpawnColor | typeof ANY,
		show: number | typeof ANY,
		shows: Map<string, { id: number; name: string }[]>,
		teamColors: Set<string> | null,
		slots: Map<string, number>
	) => {
		const needle = name.trim().toLowerCase();
		return $spawns.filter((spawn) => {
			if (slots.has(spawn.id)) return true;
			if (needle && !labelFor(spawn.characterId).toLowerCase().includes(needle)) return false;
			if (color !== ANY && spawn.color !== color) return false;
			if (show !== ANY && !(shows.get(spawn.characterId) ?? []).some((entry) => entry.id === show))
				return false;
			if (teamColors && !teamColors.has(spawn.color)) return false;
			return true;
		});
	})(filterName, filterColor, filterShow, characterShows, pickableColors, teamSlotById);

	// The filters and the pager work on the same list: filtering narrows it, the pager
	// walks it a page at a time. So any filter change re-pages from the start — the
	// narrowed roster always opens on its first page rather than on a page number that
	// meant something under the old filters.
	// Turning grouping on or off changes what a cell is, so the pager starts over with it
	// for the same reason a filter change does.
	$: filterName, filterColor, filterShow, $groupCopies, (page = 0);

	// --- What a cell is --------------------------------------------------------------
	/** One cell of the grid: the character it stands up and the cards behind it. Grouped,
	 * that is every copy the player owns of them; ungrouped, exactly one. The id is what
	 * keys the cell, and it is not the character's — two cells of the same fighter are two
	 * cards, and an `{#each}` key that could not tell them apart would draw one of them. */
	interface CharacterCell {
		id: string;
		characterId: string;
		copies: CharacterSpawn[];
	}

	// A character claimed six times is one character, so the grid stands them up once
	// and puts their copies underneath as a row of colour circles. The grouping happens
	// before the pager, so a page is ten rows of *characters* — a player with a hundred
	// reds of the same fighter no longer walks ten pages of the same statue.
	function groupByCharacter(spawns: CharacterSpawn[]): CharacterCell[] {
		const groups = new Map<string, CharacterSpawn[]>();
		for (const spawn of spawns) {
			const copies = groups.get(spawn.characterId);
			if (copies) copies.push(spawn);
			else groups.set(spawn.characterId, [spawn]);
		}
		// Insertion order, so the characters keep the order their first copy was in.
		return [...groups].map(([characterId, copies]) => ({
			id: characterId,
			characterId,
			copies
		}));
	}

	/** The other reading: one cell per card owned, so six reds of the same fighter are six
	 * statues of him. A cell of one copy needs nothing else — the circle under it says
	 * that one colour, and the statue itself says the rest. */
	function oneCellPerCopy(spawns: CharacterSpawn[]): CharacterCell[] {
		return spawns.map((spawn) => ({
			id: spawn.id,
			characterId: spawn.characterId,
			copies: [spawn]
		}));
	}

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
	// The ranks are keyed by cell rather than by character: ungrouped, two cells can be the
	// same fighter and only one of them holds the slot.
	$: characterGroups = ((slots: Map<string, number>, grouped: boolean) => {
		const groups = grouped ? groupByCharacter(filteredSpawns) : oneCellPerCopy(filteredSpawns);
		const ranks = new Map(
			groups.map((group) => {
				const held = fieldedCopy(group.copies, slots);
				return [group.id, held ? (slots.get(held.id) ?? TEAM_SIZE) : TEAM_SIZE];
			})
		);
		return groups.sort((a, b) => (ranks.get(a.id) ?? TEAM_SIZE) - (ranks.get(b.id) ?? TEAM_SIZE));
	})(teamSlotById, $groupCopies);

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

	// cell id → the id of the copy the grid is showing in it. Only holds the ones the
	// player has clicked a circle for; every other cell shows its first copy. Keyed by
	// cell rather than by page, so a colour picked stays picked as the filters and the
	// pages move — and grouped, a cell's id is the character's, so it stays picked across
	// those too.
	let shownCopyByCell = new Map<string, string>();
	function showCopy(cellId: string, spawnId: string): void {
		shownCopyByCell = new Map(shownCopyByCell).set(cellId, spawnId);
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
	function showColorCopy(cellId: string, swatch: ColorSwatch, shown: CharacterSpawn): void {
		if (shown.color !== swatch.color) {
			showCopy(cellId, swatch.copies[0].id);
			return;
		}
		const at = swatch.copies.findIndex((copy) => copy.id === shown.id);
		showCopy(cellId, swatch.copies[(at + 1) % swatch.copies.length].id);
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
			// The stock the card was printed on, which is the ink the statue is drawn in.
			box: spawn.box,
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
			const shownId = shown.get(group.id);
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
		}))(municipalityNames, characterShows, shownCopyByCell, teamSlotById);

	// Whether the first row is the line-up's. It is the column count that decides, and
	// nothing else: the row is the filter card plus one cell per slot, so a grid too narrow
	// to hold all of that at once does not open one.
	$: partyRow = $columns >= PARTY_ROW_MIN_COLUMNS;

	// The line-up as that row: one cell per slot in slot order, carrying the card standing
	// in it and the statue of that card, or nothing at all where the slot is empty. The
	// place names and the show assignment are threaded in for the same reason the grid's
	// are — the statues re-derive as those load rather than standing on stale captions.
	$: partyCells = ((
		names: Map<string, string> | null,
		shows: Map<string, { id: number; name: string }[]>,
		cards: (CharacterSpawn | null)[]
	) =>
		cards.map((spawn, slot) => ({
			slot,
			spawn,
			statue: spawn ? toStatue(spawn, names, shows) : null
		})))(municipalityNames, characterShows, $teamCards);

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

<!-- The roster is the whole view rather than a box over the map: it takes the viewport
	and slides up from the bottom edge to do it, and slides back down on the way out.
	Nothing behind it is dimmed and there is no backdrop to click, because there is
	nothing of the map left showing to click at — Escape and the ✕ are how it closes.
	The slide is a Svelte transition rather than a stylesheet's, since the component is
	only ever mounted while it is open (a CSS transition has nothing to animate from on a
	fresh mount) and the parent's {#if} is what lets the way out play at all.
	z-[1300] still puts it above both the map's pinned panel (z-[900]) and the combat
	arena (z-[1200]) — the arena is one of the places that sends the player here, so it
	has to open on top of it. The page is a full-height flex column: the toolbar and the
	recycle bar take what they need and the grid gets the rest, which is what its scroll
	box is sized from. -->
<div
	class="fixed inset-0 z-[1300]"
	role="dialog"
	aria-modal="true"
	transition:fly={{ y: '100%', duration: 250, opacity: 1 }}
>
	<div class="flex h-full w-full flex-col gap-4 overflow-hidden bg-base-100 p-6">
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
				<!-- What the grid is read with: the pager, the column slider, the grouping
				     toggle, and whether a line-up is in flight. -->
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
					<!-- On, a character is one cell however many of them the player holds; off,
					     every card owned is a cell of its own. Beside the slider because the two
					     answer the same question — how much of the roster is on screen at once. -->
					<label class="flex items-center gap-2 text-xs">
						<span class="whitespace-nowrap opacity-60">Group copies</span>
						<input
							type="checkbox"
							class="toggle toggle-primary toggle-sm"
							bind:checked={$groupCopies}
							aria-label="Group a character's copies into one cell"
						/>
					</label>
					{#if $teamSaving}
						<span class="flex items-center gap-2 text-xs opacity-60">
							<span class="loading loading-spinner loading-xs"></span>
							Saving team…
						</span>
					{/if}
				</div>
				<!-- The roster, and the team at the head of it: a statue per character — the
				     same one the map's panel stands the team up with — in a grid the slider
				     sets the width of (seven to start), with one circle per colour
				     it has been pulled in underneath, each carrying how many of that colour the
				     player owns. The first row is the filters and the line-up and nothing else,
				     wherever the grid is wide enough for both (see PARTY_ROW_MIN_COLUMNS), with a
				     cell for every slot whether or not it is filled; the cards start on the row
				     under it. Narrower than that there is no party row and the cards follow the
				     filter card straight away. The fielded ones are still the first of them, in
				     slot order and ringed in primary, so a line-up is both the row at the top and
				     the cards it was picked out of. Each cell carries the button that fields or unfields the copy it is
				     showing, pinned to its top corner; tapping the statue itself does the same
				     thing, or selects the copy while recycling, and tapping a circle only
				     changes which copy is shown. Only the current page is mounted
				     — the filters narrow the roster, the pager walks what's left ROWS_PER_PAGE
				     rows at a time — and the box takes the full width of the modal, the filters
				     being a cell of the grid rather than a column beside it. -->
				<div
					bind:this={gridScroller}
					class="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-box bg-base-200 p-3"
				>
					<div class={classNames('grid gap-3', COLUMN_CLASSES[$columns] ?? 'grid-cols-7')}>
						<!-- The filters are the grid's first cell, two columns wide, and scroll away
						     with the cards they narrow rather than standing beside them. Every control
						     ANDs with the others. Clear stands at the head of the cell: it is what
						     undoes everything below it, and a list of shows or tiers long enough to run
						     on had pushed it out of sight at the very moment there was most to undo. -->
						<div
							class={classNames(
								'flex flex-col gap-3 rounded-box bg-base-100 p-3',
								FILTER_SPAN_CLASSES[Math.min($columns, 2)] ?? 'col-span-2'
							)}
						>
							<button class="btn btn-ghost btn-sm w-full" disabled={!filtersActive} on:click={resetFilters}>
								Clear
							</button>

							<label class="flex flex-col gap-1 text-xs">
								<span class="opacity-60">Name</span>
								<input
									type="search"
									class="input input-sm input-bordered w-full"
									placeholder="Search by name"
									bind:value={filterName}
								/>
							</label>

							<!-- The colours and the shows side by side, a column of the card each: the
							     colours are a block six squares can be laid out inside rather than a row
							     needing the full width, and the shows are a list that runs as long as the
							     roster's shows do — so what one saves in width the other spends in height,
							     and they cost the card the taller of the two rather than the sum. -->
							<div class="grid grid-cols-2 items-start gap-3">
								<!-- The colours are the swatches themselves rather than a list of their
								     names: there are exactly six, so they are two rows of three, and a
								     square saying red is quicker to read than the word and needs no
								     translating. Not a <label>, since there is no one control here to
								     label — a group of six buttons, each pressed or not. -->
								<div class="flex flex-col gap-1 text-xs">
									<span class="opacity-60">Colour</span>
									<div class="grid grid-cols-3 gap-1" role="group" aria-label="Filter by colour">
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

								<!-- The shows say themselves the way the statues do: their own lettering,
								     not their names set in ours. One to a row, the full width of the column:
								     a wordmark is wide, and two side by side left each of them a smudge. A
								     show whose logo is not enabled yet falls back to its name, so it is
								     still there to filter by — and the whole group only stands while the
								     roster holds cards from more than nothing, which leaves the colours the
								     first of the pair's two columns and nothing in the second. -->
								{#if showFilterOptions.length > 0}
									<div class="flex flex-col gap-1 text-xs">
										<span class="opacity-60">Show</span>
										<div class="flex flex-col gap-1" role="group" aria-label="Filter by show">
											{#each showFilterOptions as show (show.id)}
												<button
													type="button"
													class={showChipClasses(show.id, filterShow)}
													title={show.name}
													aria-label="Filter by {show.name}"
													aria-pressed={filterShow === show.id}
													on:click={() => toggleShowFilter(show.id)}
												>
													{#if $showLogos.get(show.id)}
														<img
															src={$showLogos.get(show.id)?.url}
															alt={show.name}
															class="max-h-full max-w-full object-contain"
														/>
													{:else}
														<span class="truncate text-[0.625rem] text-white/80">{show.name}</span>
													{/if}
												</button>
											{/each}
										</div>
									</div>
								{/if}
							</div>

							<button
								class="btn btn-sm w-full"
								class:btn-outline={!recycleMode}
								class:btn-warning={recycleMode}
								on:click={() => (recycleMode ? cancelRecycle() : enterRecycleMode())}
							>
								{recycleMode ? 'Cancel' : 'Recycle'}
							</button>
						</div>

						<!-- The line-up finishes the first row: one cell per slot beside the filters,
						     the card standing in it or the empty slot itself. A slot is a place on the
						     team whether or not it is filled, so the empty ones are drawn too — three
						     cells that say how big a team is and how much of one the player has. Every
						     cell is bordered in primary like a fielded card in the grid below, since
						     that is what each of these is, and carries the same minus button, which is
						     the one thing the row does: take a card back off the team. -->
						{#if partyRow}
							{#each partyCells as { slot, spawn, statue } (slot)}
								{#if spawn && statue}
									<div class="relative flex flex-col gap-2 rounded-box border-2 border-primary p-1.5">
										{#if !recycleMode}
											<button
												type="button"
												class="btn btn-circle btn-primary btn-xs absolute right-1 top-1 z-10 text-base leading-none shadow"
												disabled={$teamSaving}
												title="Remove {statue.label} from your team"
												aria-label="Remove {statue.label} from your team"
												on:click={() => handleTeamButton(spawn)}
											>
												−
											</button>
										{/if}
										<CharacterStatue
											label={statue.label}
											basePath={statue.basePath}
											color={statue.color}
											locationName={statue.locationName}
											spawnedAt={statue.spawnedAt}
											showId={statue.showId}
										/>
									</div>
								{:else}
									<div
										class="flex items-center justify-center rounded-box border-2 border-dashed border-base-content/20 p-1.5 text-center text-xs opacity-50"
									>
										Empty slot
									</div>
								{/if}
							{/each}
						{/if}

						{#each pagedStatues as { group, copy, swatches, places, placeValue, statue, fielded }, index (group.id)}
							<!-- The border is on the cell, not on the statue: it takes in the circles
							     and the place select too, so what it marks is this character's whole
							     entry. Every cell carries it and only a fielded one colours it in, so
							     joining the team never nudges the grid by two pixels.
							     The first card starts a row of its own while the party row stands, which
							     is what keeps that row to the filters and the line-up: at seven columns
							     the two cells the line-up leaves over would otherwise be filled by the
							     first two cards of the roster. -->
							<div
								class={classNames('relative flex flex-col gap-2 rounded-box border-2 p-1.5', {
									'border-primary': fielded,
									'border-transparent': !fielded,
									'col-start-1': partyRow && index === 0
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
										box={statue.box}
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
								     claimed in, each saying its colour.
								     Both are ways of choosing between a character's copies, so ungrouped
								     there is nothing for them to choose: the cell is one card, the circle
								     would read 1 in the colour the statue is already standing in and the
								     select would hold the one town its panel already names. -->
								{#if $groupCopies}
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
												on:click={() => showColorCopy(group.id, swatch, copy)}
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
											on:change={(event) => showCopy(group.id, event.currentTarget.value)}
										>
											{#each places as place (place.copy.id)}
												<option value={place.copy.id}>
													{SPAWN_SQUARE_GLYPHS[place.copy.color]}
													{place.locationName}
												</option>
											{/each}
										</select>
									</div>
								{/if}
							</div>
						{/each}
					</div>
					<!-- Said under the grid rather than laid over it: the filters are cells of that
					     grid now, and an overlay filling the box would cover the very controls the
					     player has to reach to get their cards back. -->
					{#if filteredSpawns.length === 0}
						<div class="flex flex-col items-center justify-center gap-3 py-12 text-center">
							<p class="text-sm opacity-60">No characters match these filters.</p>
							<button class="btn btn-outline btn-sm" on:click={resetFilters}>Clear filters</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
