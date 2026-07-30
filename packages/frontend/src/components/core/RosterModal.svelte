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
	import { SPAWN_FILL_CLASSES, SPAWN_SQUARE_GLYPHS } from '$components/core/spawn-colors';
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

	// The view is two grids side by side, and both counts are fixed: the roster's cards are
	// four across on the right, the filters and the line-up three across on the left. The
	// two stand in a seven-column frame, three columns and four, at the one gap the inner
	// grids use — so a cell of either grid is exactly one column of that frame wide and the
	// two read as one rhythm across the view rather than as two grids that happen to be
	// adjacent. There is no column setting any more: the counts are the layout, so there is
	// nothing left for a slider to say. (`roster:columns` is left behind in localStorage
	// unread; nothing writes it and nothing looks for it.)
	const CARD_COLUMNS = 4;

	// Whether a character's copies are gathered into one cell — one statue, with a select
	// naming which copy it stands as — or every card owned gets a cell of its own. Grouped is the
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
	// The grid only ever mounts one page of statues — ROWS_PER_PAGE rows of CARD_COLUMNS
	// — so a large roster never stands up a sprite (and its looping frames) per claimed
	// card.
	const ROWS_PER_PAGE = 10;
	let page = 0; // zero-based
	// The cards' own grid, which is the thing that scrolls — so turning a page can put it
	// back at the top. The filters and the line-up beside it do not move with it.
	let gridScroller: HTMLDivElement | undefined;

	// Whether any filter is narrowing the roster (drives the Clear button).
	$: filtersActive = filterName.trim() !== '' || filterColor !== ANY || filterShow !== ANY;

	// --- Recycle mode (trade cards back for extra daily claims) ---
	// While active, tapping a card selects it for recycling instead of toggling its
	// team membership. Every RECYCLE_GROUP_SIZE cards recycled grants one extra claim
	// for today. Selection is tracked by spawn id, so it survives filter changes.
	//
	// Nothing enters this mode: the button that did has been taken off the filter card, so
	// `recycleMode` is false for the life of the component and the bar, the branches in the
	// cells and `enterRecycleMode` are all unreachable. The mode is left standing rather
	// than torn out because only its way in was asked for — whatever offers recycling next
	// has this to switch on.
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
	// A fielded card is not in this list at all: the left grid is where the line-up stands,
	// and a card cannot be in both without being read as two cards. That holds whatever the
	// filters say, so the team is never something the roster's own controls can hide — it is
	// not in the roster's grid to hide.
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
			if (slots.has(spawn.id)) return false;
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
	// and lets the cell's select choose between their copies. The grouping happens
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
	 * statues of him. A cell of one copy needs nothing to choose with — the statue itself
	 * says the colour, the town and the rest. */
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

	// A character with a fielded copy sorts to the front, in slot order, so where the team
	// is in the grid at all it is the head of it: the lead is the first cell and the line-up
	// reads left to right before the roster it was picked from. That is the narrow grid's
	// case — with a party row there are no fielded cards left in the list for this to move,
	// and the sort is a no-op it costs nothing to leave standing. Everything else keeps the
	// order its first copy was claimed in — Array.sort is stable, so a rank every unfielded
	// character shares leaves them all where they were. Sorting happens before the pager,
	// which is what keeps the team on the first page: it must never be a page turn away
	// from the cards being read against it.
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

	// cell id → the id of the copy the grid is showing in it. Only holds the ones the player
	// has picked a town for; every other cell shows its first copy. Keyed by cell rather than
	// by page, so a copy picked stays picked as the filters and the pages move — and grouped,
	// a cell's id is the character's, so it stays picked across those too.
	let shownCopyByCell = new Map<string, string>();
	function showCopy(cellId: string, spawnId: string): void {
		shownCopyByCell = new Map(shownCopyByCell).set(cellId, spawnId);
	}

	/** One place a character has been claimed in, in one colour — an entry in the cell's
	 * place selector, which is how a cell's copies are chosen between: it asks which town,
	 * and the colour it was pulled in there comes with the answer. */
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

	// A page is ROWS_PER_PAGE rows at the current column count, so the slider resizes
	// the page as well as the cards.
	$: pageSize = CARD_COLUMNS * ROWS_PER_PAGE;
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
	// towns restands the character in the colour that copy was pulled in there with.
	// Absent a town the player picked, a character standing at the head of the grid
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
				places,
				placeValue: place.copy.id,
				statue: toStatue(copy, names, shows),
				// Whether the copy on show is the one holding a slot — the cell's border, so
				// the mark follows the card rather than the character: switch a fielded
				// character to a copy that isn't on the team and the border goes with it.
				fielded: slots.has(copy.id)
			};
		}))(municipalityNames, characterShows, shownCopyByCell, teamSlotById);

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
	// select that only chooses which copy it stands as — picking a town to look at the copy
	// pulled there must never field it. A tap while a line-up is in flight is dropped rather
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
					<!-- On, a character is one cell however many of them the player holds; off,
					     every card owned is a cell of its own — the one thing left that says how
					     much of the roster is on screen at once, now that the widths are fixed. -->
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
				<!-- The roster: a statue per character — the same one the map's panel stands the
				     team up with — each cell naming which of that character's copies is standing
				     in it. It is four cards
				     across, on the right of the two things it is read with: the filters and the
				     line-up, which are three across on the left. A card is in one of the two
				     grids and never both — the ones holding a slot are the left grid's and are
				     left out of the right, or the same three statues would stand twice over and
				     be read as six cards. Each roster cell carries the button that fields or
				     unfields the copy it is showing, pinned to its top corner; tapping the statue
				     itself does the same thing, or selects the copy while recycling, and picking a
				     town only changes which copy is shown. Only the current page is mounted —
				     the filters narrow the roster, the pager walks what's left ROWS_PER_PAGE rows
				     at a time — and that page scrolls in its own grid, the filters and the line-up
				     keeping their place beside it rather than travelling with it. -->
				<!-- Two grids, not one: three columns of the filters and the line-up on the left,
				     four of the roster on the right, standing in a seven-column frame at the gap both
				     of them use, so a cell of either is one column of that frame wide and the two
				     read across as a single rhythm.
				     The frame itself does not scroll and takes exactly the height the toolbar leaves
				     it: it is the cards that scroll, inside their own grid, so the filters and the
				     line-up stay where they are however far down the roster the player reads. That is
				     what each grid being a scroll box of its own buys — and it is also what lets them
				     be clamped at all, an element that scrolls having no minimum height of its own to
				     push the frame open with. content-start on both keeps their rows at their own
				     heights rather than stretched down the frame.
				     The panel is each card's own, not the grid's and not the frame's. One under the
				     whole frame had said the filters, the line-up and the cards were a single
				     surface; one under the right grid alone still said the cards were a sheet with
				     things on it. They are a set of cards, so each of them is a panel of base-200
				     and what shows between them is the page. Everything on the left stands on that
				     same page — the filter card being its own panel already, in the lighter stock,
				     and the line-up wanting nothing behind it. Dropping the grid's padding with its
				     background also puts the four columns back exactly on four of the frame's
				     seven, which the padding had been shaving a few pixels off. -->
				<div class="grid min-h-0 min-w-0 flex-1 grid-cols-7 gap-3">
					<!-- The filters and the line-up, three across: the filter card over all three of
					     those columns, and the line-up as one row of three under it, a column to a
					     slot. Every control ANDs with the others. Clear stands at the head of the
					     card: it is what undoes everything below it, and a list of shows long enough
					     to run on had pushed it out of sight at the very moment there was most to
					     undo. -->
					<div class="col-span-3 grid min-h-0 grid-cols-3 content-start gap-3 overflow-y-auto">
						<div class="col-span-3 flex flex-col gap-3 rounded-box bg-base-100 p-3">
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
						</div>

						<!-- The line-up under the filter card, a row of three with a cell per slot: the
						     card standing in it or the empty slot itself. A slot is a place on the team
						     whether or not there is a card in it, so the empty ones are drawn too —
						     three cells that say how big a team is and how much of one the player has,
						     which a row of only the cards fielded could never say. Every filled cell is
						     bordered in primary and carries a minus button, and taking a card back off
						     the team is the one thing this grid does. -->
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

					</div>

					<!-- The roster itself, four cards across, to the right of the two things it is read
					     with. Its own grid: the cards are one kind of cell and the filters and the
					     line-up another, and a single grid could not have given the one four columns and
					     the other three. The empty-roster line is a cell of it too, spanning the four,
					     rather than something laid over the box — an overlay would cover the very
					     controls a player has to reach to undo the filter that emptied it. -->
					<div
						bind:this={gridScroller}
						class="col-span-4 grid min-h-0 grid-cols-4 content-start gap-3 overflow-y-auto"
					>
						{#each pagedStatues as { group, copy, places, placeValue, statue, fielded } (group.id)}
							<!-- The border is on the cell, not on the statue: it takes in the strip over
							     it too, so what it marks is this character's whole entry. Every cell
							     carries it and only a fielded one colours it in, so joining the team
							     never nudges the grid by two pixels. Nothing in this grid
							     is fielded while the line-up stands in a grid of its own, so the coloured
							     border is what a card fielded from a one-grid roster would wear: it costs
							     nothing to leave standing, and it is the one thing that would have to be
							     found again if the two ever became one. -->
							<div
								class={classNames(
									'relative flex flex-col gap-2 rounded-box border-2 bg-base-200 p-1.5',
									{
										'border-primary': fielded,
										'border-transparent': !fielded
									}
								)}
							>
								<!-- The top of the cell, over the statue rather than laid out above it, so
								     the strip is in the same place in every cell whatever the art below it
								     does: which of this character's copies is standing on the left, the team
								     button at the right end.
								     The copies are asked for by the town they were claimed in — a native
								     select, since a menu of our own would be clipped by the scroll box this
								     grid lives in, and each option says its colour with a square, the one
								     thing an option can carry that a stylesheet cannot reach. Ungrouped there
								     is nothing to choose between: the cell is one card and the select would
								     hold the single town the statue's own panel already names.
								     The button is a minus on a fielded card, a plus on one that could still
								     be fielded, and disabled once the team is full — a plus that cannot add is
								     a dead button, and the server would refuse the card anyway. Not drawn at
								     all while recycling, where a cell is about what to trade in rather than
								     who to field. -->
								<div class="absolute inset-x-1 top-1 z-10 flex items-center gap-1">
									{#if $groupCopies}
										<select
											class="select select-xs min-w-0 max-w-[8rem] flex-initial shadow"
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
									{/if}
									{#if !recycleMode}
										<button
											type="button"
											class={classNames(
												'btn btn-circle btn-xs ml-auto text-base leading-none shadow',
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
								</div>
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
							</div>
						{/each}
					<!-- Said under the grid rather than laid over it: the filters are cells of that
					     grid now, and an overlay filling the box would cover the very controls the
					     player has to reach to get their cards back. Only where there are cards it
					     could be talking about: a player whose whole roster is on the team has an
					     empty grid with nothing hiding anything, the party row above holding every
					     card they own, and blaming the filters for that would be a lie. -->
					{#if filteredSpawns.length === 0 && $spawns.length > teamFilledCount}
						<div class="col-span-4 flex flex-col items-center justify-center gap-3 py-12 text-center">
							<p class="text-sm opacity-60">No characters match these filters.</p>
							<button class="btn btn-outline btn-sm" on:click={resetFilters}>Clear filters</button>
						</div>
					{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
