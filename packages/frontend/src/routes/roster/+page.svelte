<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { spawnService, RECYCLE_GROUP_SIZE } from '$services/spawn.service';
	import { teamService } from '$services/team.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { resolveCharacterFaceUrl } from '$utils/mugen/character-face';
	import { AuthStatus } from '$types/profile.type';
	import { ULTRAMAR, ULTRAMAR_ID } from '$types/location.type';
	import type { CombatColor } from '$types/character-definition.type';
	import {
		SPAWN_STAT_MAX,
		SPAWN_STAT_MIN,
		SpawnColor,
		type CharacterSpawn
	} from '$types/character-spawn.type';
	import { combatStatsFromStat } from '$utils/spawn/stat';
	import { teammateColors } from '$utils/color/compare';
	import { wowRarityLabel } from '$utils/rarity/wow-rarity';
	import CardCanvas from '$components/core/card/CardCanvas.svelte';
	import { responsiveGridColumns, type SlotSummary } from '$components/core/card/CardScene';
	import { SPAWN_COLOR_HEX } from '$utils/spawn/color';
	import type { CardModel } from '$utils/card/card-model.type';
	import localStorageWritableStore from '$utils/localStorageWritableStore';

	// Bounds for the grid-column slider. It defaults to the responsive value the
	// old DOM grid used (1/2/3 by viewport), which the player can then override.
	const MIN_COLUMNS = 1;
	const MAX_COLUMNS = 6;
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
	let filterMinStat = SPAWN_STAT_MIN;

	// Every spawn colour, for the colour dropdown (labels are the enum values).
	const COLOR_OPTIONS = Object.values(SpawnColor);
	// Selectable minimum stats (SPAWN_STAT_MIN reads as "any").
	const STAT_OPTIONS = Array.from(
		{ length: SPAWN_STAT_MAX - SPAWN_STAT_MIN + 1 },
		(_, i) => SPAWN_STAT_MIN + i
	);

	function resetFilters(): void {
		filterName = '';
		filterColor = ANY;
		filterShow = ANY;
		filterRarity = ANY;
		filterMinStat = SPAWN_STAT_MIN;
	}

	// --- Pagination ---
	// The canvas only ever builds one page of cards: at most ROWS_PER_PAGE rows at the
	// column count the slider is set to, so a large roster never instantiates a sprite
	// (and its sheet animation) per claimed card. Widening the columns therefore also
	// widens the page — the row budget is what's fixed.
	const ROWS_PER_PAGE = 10;
	let page = 0; // zero-based
	// The card canvas, so turning a page can scroll it back to the top.
	let cardCanvas: CardCanvas | undefined;

	// Whether any filter is narrowing the roster (drives the Clear button).
	$: filtersActive =
		filterName.trim() !== '' ||
		filterColor !== ANY ||
		filterShow !== ANY ||
		filterRarity !== ANY ||
		filterMinStat !== SPAWN_STAT_MIN;

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
	const team = teamService.store;

	// Spawns store only a character id + geojson ids; labels, sprites and place
	// names are resolved here from the local registry and municipality layer.
	const charactersById = new Map(characters.map((character) => [character.id, character]));

	// character id → names of the Supabase shows it belongs to.
	let characterShowNames = new Map<string, string[]>();
	let municipalityNames: Map<string, string> | null = null;
	// character id → rarity tier from Supabase `character_templates`, so each card
	// can show its rarity badge (the same source the claim cards read).
	let rarityByCharacter = new Map<string, number>();

	// character id → resolved active-face portrait URL (definition.face → manifest
	// default). Loaded lazily per distinct character as spawns arrive; the grid shows
	// these static portraits while the sidebar keeps the animated sprites.
	let characterFaces = new Map<string, string | null>();
	const faceRequested = new Set<string>();

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
			const [, showNamesByCharacter, rarities] = await Promise.all([
				spawnService.loadSpawns(userId),
				spawnService.loadCharacterShowNames(),
				spawnService.loadRarities()
			]);
			characterShowNames = showNamesByCharacter;
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

	// Fetch the active-face portrait for any distinct character not yet requested.
	async function loadFaces(ids: string[]): Promise<void> {
		const missing = ids.filter((id) => !faceRequested.has(id));
		if (missing.length === 0) return;
		for (const id of missing) faceRequested.add(id);
		await Promise.all(
			missing.map(async (id) => {
				const basePath = basePathFor(id);
				characterFaces.set(id, basePath ? await resolveCharacterFaceUrl(id, basePath) : null);
			})
		);
		characterFaces = characterFaces; // reassign so the grid re-renders
	}

	$: loadFaces([...new Set($spawns.map((spawn) => spawn.characterId))]);
	function showNamesFor(characterId: string): string[] {
		return characterShowNames.get(characterId) ?? [];
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
	$: showFilterOptions = ((names: Map<string, string[]>) =>
		[...new Set($spawns.flatMap((spawn) => names.get(spawn.characterId) ?? []))].sort((a, b) =>
			a.localeCompare(b)
		))(characterShowNames);

	// The distinct rarity tiers present across the roster, ascending — the options
	// for the rarity dropdown.
	$: rarityFilterOptions = ((rarities: Map<string, number>) =>
		[...new Set($spawns.map((spawn) => rarities.get(spawn.characterId)).filter((r): r is number => r != null))].sort(
			(a, b) => a - b
		))(rarityByCharacter);

	// The roster narrowed by the header filters. All predicates AND together; an
	// unset (ANY) filter is a pass. The filter maps are threaded in as deps so the
	// list re-runs as they load or a control changes. This — not `$spawns` — is what
	// the canvas renders and what a tap indexes into.
	$: filteredSpawns = ((
		name: string,
		color: SpawnColor | typeof ANY,
		show: string | typeof ANY,
		rarity: number | typeof ANY,
		minStat: number,
		names: Map<string, string[]>,
		rarities: Map<string, number>,
		teamColors: Set<string> | null
	) => {
		const needle = name.trim().toLowerCase();
		return $spawns.filter((spawn) => {
			if (needle && !labelFor(spawn.characterId).toLowerCase().includes(needle)) return false;
			if (color !== ANY && spawn.color !== color) return false;
			if (show !== ANY && !(names.get(spawn.characterId) ?? []).includes(show)) return false;
			if (rarity !== ANY && (rarities.get(spawn.characterId) ?? null) !== rarity) return false;
			if (spawn.stat < minStat) return false;
			if (teamColors && !teamColors.has(spawn.color)) return false;
			return true;
		});
	})(
		filterName,
		filterColor,
		filterShow,
		filterRarity,
		filterMinStat,
		characterShowNames,
		rarityByCharacter,
		teamColorFilter
	);

	// The filters and the pager work on the same list: filtering narrows it, the pager
	// walks it a page at a time. So any filter change re-pages from the start — the
	// narrowed roster always opens on its first page rather than on a page number that
	// meant something under the old filters.
	$: filterName, filterColor, filterShow, filterRarity, filterMinStat, (page = 0);

	// A page is ROWS_PER_PAGE rows at the current column count, so the slider resizes
	// the page as well as the cards.
	$: pageSize = Math.max(1, $columns) * ROWS_PER_PAGE;
	$: pageCount = Math.max(1, Math.ceil(filteredSpawns.length / pageSize));
	// Clamp whenever the page count shrinks (a wider column count, or cards recycled
	// away) so the view never sits past the last page.
	$: if (page > pageCount - 1) page = pageCount - 1;
	$: pageStart = page * pageSize;
	// The one page of spawns the canvas actually draws — everything below indexes into
	// this, not the full filtered list.
	$: pagedSpawns = filteredSpawns.slice(pageStart, pageStart + pageSize);

	function goToPage(next: number): void {
		page = Math.min(Math.max(0, next), pageCount - 1);
	}

	// A new page opens at its top; rebuilds otherwise keep the scroll offset.
	$: page, cardCanvas?.scrollToTop();

	// character id → how many copies of it the player owns, so a duplicated character
	// carries an ×N badge. Counted over the whole roster, not the filtered or paged
	// view: it says what you own, so it doesn't move as you filter or turn a page.
	$: copiesByCharacter = $spawns.reduce(
		(counts, spawn) => counts.set(spawn.characterId, (counts.get(spawn.characterId) ?? 0) + 1),
		new Map<string, number>()
	);

	// The current page's spawns as display CardModels for the shared card renderer — the
	// same shape the claim pack opener draws (label + sprite from the local registry,
	// face fallback, rolled colour/stat, rarity, show, claim place and year). The four
	// combat attributes mirror the board: ATK is the rolled stat, DEF its complement,
	// SPD is ATK − 1 and HP is DEF + 1 — the same derivation as the claim flow's
	// buildPull. The resolved maps are threaded in explicitly so the statement re-runs
	// as faces, place names, rarities and show names load in (a bare helper call would
	// hide those deps).
	// One spawn as a display card. The resolved maps come in as arguments rather than
	// being read off the component, so every caller has to name them and their
	// reactive statement tracks them.
	function toCardModel(
		spawn: CharacterSpawn,
		faces: Map<string, string | null>,
		rarities: Map<string, number>,
		copies: Map<string, number>
	): CardModel {
		return {
			label: labelFor(spawn.characterId),
			basePath: basePathFor(spawn.characterId),
			faceUrl: faces.get(spawn.characterId) ?? null,
			color: spawn.color,
			rarity: rarities.get(spawn.characterId) ?? null,
			showName: showNamesFor(spawn.characterId).join(', ') || null,
			locationName: locationNameFor(spawn.locationId),
			spawnedAt: spawn.createdAt,
			copies: copies.get(spawn.characterId) ?? 1,
			...combatStatsFromStat(spawn.stat)
		};
	}

	$: cardModels = ((
		faces: Map<string, string | null>,
		_names: Map<string, string> | null,
		rarities: Map<string, number>,
		_showNames: Map<string, string[]>,
		copies: Map<string, number>
	): CardModel[] => pagedSpawns.map((spawn) => toCardModel(spawn, faces, rarities, copies)))(
		characterFaces,
		municipalityNames,
		rarityByCharacter,
		characterShowNames,
		copiesByCharacter
	);

	// The active team as the canvas's leading row: one cell per slot, in slot order —
	// its card where the slot is filled, null (a card-sized empty frame) where it
	// isn't. Independent of the filters and the pager, since it is the team, not the
	// roster. Empty with no team selected, which draws no extra row at all.
	$: teamSlotCards = ((
		team: typeof activeTeam,
		spawnList: CharacterSpawn[],
		faces: Map<string, string | null>,
		_names: Map<string, string> | null,
		rarities: Map<string, number>,
		_showNames: Map<string, string[]>,
		copies: Map<string, number>
	): (CardModel | null)[] => {
		if (!team) return [];
		return team.memberIds.map((memberId) => {
			const spawn = memberId ? spawnList.find((entry) => entry.id === memberId) : null;
			return spawn ? toCardModel(spawn, faces, rarities, copies) : null;
		});
	})(
		activeTeam,
		$spawns,
		characterFaces,
		municipalityNames,
		rarityByCharacter,
		characterShowNames,
		copiesByCharacter
	);

	// Tapping a card on the canvas toggles that spawn on the active team (add to the
	// first free slot, or remove it) — the canvas replaces the old per-card buttons.
	// The tapped index maps 1:1 to the spawns *on the current page*, which is what the
	// cards were built from.
	function handleCardTap(index: number): void {
		const spawn = pagedSpawns[index];
		if (!spawn) return;
		if (recycleMode) {
			toggleRecycleSelection(spawn.id);
			return;
		}
		toggleTeamMember(spawn.id);
	}

	// The team's summary for the head of the canvas's team row: the colour it is led
	// by, that lead's show(s) and where it was claimed — the same three facts, read the
	// same way, as the side panel's summary (the lead is the first filled slot). Null
	// with no team selected; a team with no picks yet reads as em-dashes.
	$: teamSummary = ((
		team: typeof activeTeam,
		spawnList: CharacterSpawn[],
		_names: Map<string, string> | null,
		_showNames: Map<string, string[]>
	): SlotSummary | null => {
		if (!team) return null;
		const leadId = team.memberIds.find((id): id is string => Boolean(id)) ?? null;
		const lead = leadId ? (spawnList.find((entry) => entry.id === leadId) ?? null) : null;
		if (!lead) return { color: null, colorHex: null, showName: null, regionName: null };
		return {
			color: lead.color,
			colorHex: SPAWN_COLOR_HEX[lead.color] ?? null,
			showName: showNamesFor(lead.characterId).join(', ') || 'No show',
			regionName: locationNameFor(lead.locationId)
		};
	})(activeTeam, $spawns, municipalityNames, characterShowNames);

	// The Remove button under a slot in the canvas's team row — the same path as the
	// panel's ✕: empty that slot, then re-apply the colour rule the lead sets.
	function handleSlotRemove(index: number): void {
		if (!activeTeam) return;
		teamService.clearMember(activeTeam.id, index);
		enforceTeamColors(activeTeam.id);
	}

	// The indices (into the cards on the current page) of the spawns selected for
	// recycling, so the canvas can dim the rest. Recomputed as the selection, the
	// filters or the page change — a card selected while filtered out or on another
	// page stays counted but simply isn't shown until it comes back into view.
	$: recycleSelectedIndices = new Set(
		pagedSpawns.reduce<number[]>((indices, spawn, index) => {
			if (selectedForRecycle.has(spawn.id)) indices.push(index);
			return indices;
		}, [])
	);

	function onTeamCreate(): void {
		teamService.createTeam();
	}

	// spawn id → its rolled spawn colour, for the team colour rule.
	$: colorForSpawn = new Map($spawns.map((spawn) => [spawn.id, spawn.color]));

	// The currently-selected team and the spawn ids already on it, driving the tap
	// toggle and the colour rule below.
	$: activeTeam = $team.teams.find((entry) => entry.id === $team.activeTeamId) ?? null;
	$: activeMemberIds = new Set(
		(activeTeam?.memberIds ?? []).filter((id): id is string => Boolean(id))
	);

	// The colours the selected team can carry — its lead's own colour plus the ones
	// that share a colour with it (see teammateColors) — folded into the header
	// filters, so picking a team narrows the grid to the cards it could actually take.
	// It is the lead that sets the rule, so this is null (nothing narrowed) with no
	// team selected and with a team whose lead slot is still empty, where any card is
	// a legal first pick. Also null in recycle mode: there a tap recycles rather than
	// recruits, and hiding most of the roster would make recycling impossible.
	$: teamColorFilter = ((team: typeof activeTeam, colors: Map<string, SpawnColor>, recycling: boolean) => {
		const leadId = team?.memberIds[0] ?? null;
		const leadColor = leadId ? (colors.get(leadId) ?? null) : null;
		if (!leadColor || recycling) return null;
		return new Set<string>(teammateColors(leadColor as unknown as CombatColor));
	})(activeTeam, colorForSpawn, recycleMode);

	// Whether a spawn (not already on the active team) may be added right now: there
	// must be a free slot, and — for a non-lead slot — its colour must be one the
	// lead's colour allows (see teammateColors).
	function canAddToActiveTeam(spawnId: string): boolean {
		if (!activeTeam || activeMemberIds.has(spawnId)) return false;
		const emptyIndex = activeTeam.memberIds.indexOf(null);
		if (emptyIndex < 0) return false;
		if (emptyIndex === 0) return true;
		const leadId = activeTeam.memberIds[0];
		const leadColor = leadId ? (colorForSpawn.get(leadId) ?? null) : null;
		const allowed = leadColor
			? new Set<string>(teammateColors(leadColor as unknown as CombatColor))
			: null;
		const color = colorForSpawn.get(spawnId) ?? null;
		return Boolean(allowed && color && allowed.has(color));
	}

	// Toggle a spawn on the active team: remove it if present, otherwise add it to
	// the first free slot (respecting the colour rule via canAddToActiveTeam).
	function toggleTeamMember(spawnId: string): void {
		if (!activeTeam) return;
		const existingIndex = activeTeam.memberIds.indexOf(spawnId);
		if (existingIndex >= 0) {
			teamService.clearMember(activeTeam.id, existingIndex);
			enforceTeamColors(activeTeam.id);
			return;
		}
		if (!canAddToActiveTeam(spawnId)) return;
		const emptyIndex = activeTeam.memberIds.indexOf(null);
		teamService.setMember(activeTeam.id, emptyIndex, spawnId);
	}

	// Clear every non-lead slot whose colour isn't allowed by the lead's colour
	// (see teammateColors). A team with no lead allows no teammate colour at all.
	function enforceTeamColors(teamId: string): void {
		const team = teamService.get().teams.find((entry) => entry.id === teamId);
		if (!team) return;
		const leadId = team.memberIds[0];
		const leadColor = leadId ? (colorForSpawn.get(leadId) ?? null) : null;
		const allowed = leadColor
			? new Set<string>(teammateColors(leadColor as unknown as CombatColor))
			: null;
		team.memberIds.forEach((id, index) => {
			if (index === 0 || !id) return;
			const color = colorForSpawn.get(id) ?? null;
			if (!allowed || !color || !allowed.has(color)) {
				teamService.clearMember(teamId, index);
			}
		});
	}
</script>

<div class="flex min-h-screen flex-col gap-6 bg-base-200 p-8">
	{#if $status === AuthStatus.SignedIn && $spawns.length > 0}
		<!-- Filter toolbar: narrows the cards shown on the canvas. Every control ANDs
		     with the others; the count shows the filtered-vs-total tally. -->
		<div class="flex flex-wrap items-end gap-3 rounded-box bg-base-100 p-4 shadow-md">
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

			<label class="flex flex-col gap-1 text-xs">
				<span class="opacity-60">Min stat</span>
				<select class="select select-sm select-bordered w-32" bind:value={filterMinStat}>
					{#each STAT_OPTIONS as stat (stat)}
						<option value={stat}>{stat === SPAWN_STAT_MIN ? 'Any stat' : `≥ ${stat}`}</option>
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
				class="flex flex-wrap items-center gap-3 rounded-box bg-warning/10 p-4 text-sm shadow-md"
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
			<div class="alert alert-info py-2 text-sm"><span>{recycleNotice}</span></div>
		{/if}
	{/if}

	<div class="flex-1">
		{#if !authService.configured}
			<div class="alert alert-warning text-sm">
				<span>Sign-in is unavailable — Supabase is not configured.</span>
			</div>
		{:else if $status === AuthStatus.Loading}
			<div class="flex justify-center py-12">
				<span class="loading loading-spinner loading-md"></span>
			</div>
		{:else if $status !== AuthStatus.SignedIn}
			<div class="card max-w-md bg-base-100 shadow-xl">
				<div class="card-body gap-4">
					<p class="text-sm opacity-70">Sign in to see the characters you've claimed.</p>
					<button class="btn btn-primary btn-sm w-fit" on:click={() => signInPanelOpen.set(true)}>
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
			<div class="card max-w-md bg-base-100 shadow-xl">
				<div class="card-body gap-4">
					<p class="text-sm opacity-70">
						You haven't claimed any characters yet. Head to the map and open one of today's
						booster packs to spawn your first one.
					</p>
					<a class="btn btn-primary btn-sm w-fit" href="/">Open the map</a>
				</div>
			</div>
		{:else}
			<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
				<p class="text-xs opacity-60">
					Scroll to move through your cards.
					{#if recycleMode}
						Tap a card to select or deselect it for recycling.
					{:else if activeTeam}
						Tap a card to add or remove it from the active team.
					{:else}
						Select a team to start adding characters by tapping their card.
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
					<button class="btn btn-primary btn-sm" on:click={onTeamCreate}>+ New team</button>
				</div>
			</div>
			<!-- The roster is drawn on the shared card canvas — the same renderer the
			     claim pack opener uses — instead of a DOM grid. The columns always
			     fill the canvas width (default 1/2/3 by viewport, then the slider),
			     and the rows scroll vertically; tapping a card toggles its team
			     membership. Only the current page's cards are built — the filters
			     narrow the roster, the pager walks what's left ROWS_PER_PAGE rows at
			     a time. -->
			<div
				class="relative h-[70vh] min-h-[32rem] overflow-hidden rounded-box bg-base-100 shadow-md"
			>
				<CardCanvas
					bind:this={cardCanvas}
					cards={cardModels}
					slots={teamSlotCards}
					summary={teamSummary}
					onSlotRemove={handleSlotRemove}
					columns={$columns}
					layout="grid"
					pannable
					onCardTap={handleCardTap}
					selectionMode={recycleMode}
					selectedIndices={recycleSelectedIndices}
				/>
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
