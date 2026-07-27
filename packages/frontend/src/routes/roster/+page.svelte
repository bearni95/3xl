<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { spawnService } from '$services/spawn.service';
	import { teamService } from '$services/team.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { resolveCharacterFaceUrl } from '$utils/mugen/character-face';
	import { AuthStatus } from '$types/profile.type';
	import { ULTRAMAR, ULTRAMAR_ID } from '$types/location.type';
	import type { CombatColor } from '$types/character-definition.type';
	import { SPAWN_STAT_MAX, SPAWN_STAT_MIN, SpawnColor } from '$types/character-spawn.type';
	import { teammateColors } from '$utils/color/compare';
	import { wowRarityLabel } from '$utils/rarity/wow-rarity';
	import CardCanvas from '$components/core/card/CardCanvas.svelte';
	import { responsiveGridColumns } from '$components/core/card/CardScene';
	import type { CardModel } from '$components/core/card/card-model.type';
	import TeamPanel from '$components/core/TeamPanel.svelte';

	// Bounds for the grid-column slider. It defaults to the responsive value the
	// old DOM grid used (1/2/3 by viewport), which the player can then override.
	const MIN_COLUMNS = 1;
	const MAX_COLUMNS = 6;
	let columns = browser ? responsiveGridColumns(window.innerWidth) : 3;

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

	// Whether any filter is narrowing the roster (drives the Clear button).
	$: filtersActive =
		filterName.trim() !== '' ||
		filterColor !== ANY ||
		filterShow !== ANY ||
		filterRarity !== ANY ||
		filterMinStat !== SPAWN_STAT_MIN;

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
		rarities: Map<string, number>
	) => {
		const needle = name.trim().toLowerCase();
		return $spawns.filter((spawn) => {
			if (needle && !labelFor(spawn.characterId).toLowerCase().includes(needle)) return false;
			if (color !== ANY && spawn.color !== color) return false;
			if (show !== ANY && !(names.get(spawn.characterId) ?? []).includes(show)) return false;
			if (rarity !== ANY && (rarities.get(spawn.characterId) ?? null) !== rarity) return false;
			if (spawn.stat < minStat) return false;
			return true;
		});
	})(filterName, filterColor, filterShow, filterRarity, filterMinStat, characterShowNames, rarityByCharacter);

	// The filtered spawns as display CardModels for the shared card renderer — the
	// same shape the claim pack opener draws (label + sprite from the local registry,
	// face fallback, rolled colour/stat, rarity, claim place and year). The four combat
	// attributes mirror the board: ATK is the rolled stat, DEF its complement, SPD is
	// ATK − 1 and HP is DEF + 1 — the same derivation as the claim flow's buildPull. The
	// resolved maps are threaded in explicitly so the statement re-runs as faces,
	// place names and rarities load in (a bare helper call would hide those deps).
	$: cardModels = ((
		faces: Map<string, string | null>,
		_names: Map<string, string> | null,
		rarities: Map<string, number>
	): CardModel[] =>
		filteredSpawns.map((spawn) => ({
			label: labelFor(spawn.characterId),
			basePath: basePathFor(spawn.characterId),
			faceUrl: faces.get(spawn.characterId) ?? null,
			color: spawn.color,
			rarity: rarities.get(spawn.characterId) ?? null,
			locationName: locationNameFor(spawn.locationId),
			spawnedAt: spawn.createdAt,
			atk: spawn.stat,
			def: SPAWN_STAT_MAX - spawn.stat,
			spd: spawn.stat - 1,
			hp: SPAWN_STAT_MAX - spawn.stat + 1
		})))(characterFaces, municipalityNames, rarityByCharacter);

	// Tapping a card on the canvas toggles that spawn on the active team (add to the
	// first free slot, or remove it) — the canvas replaces the old per-card buttons.
	// The tapped index maps 1:1 to the *filtered* spawns the cards were built from.
	function handleCardTap(index: number): void {
		const spawn = filteredSpawns[index];
		if (spawn) toggleTeamMember(spawn.id);
	}

	// Every claimed spawn, offered as an individual team pick — each spawn is its own
	// entry (the same character claimed twice yields two options with their own rolled
	// colour, stat and place). Keyed by spawn id so the TeamPanel can resolve a team's
	// slots. `municipalityNames` is passed in explicitly so this reactive block re-runs
	// once the layer loads — a bare locationNameFor() call wouldn't track it.
	$: teamOptions = ((names: Map<string, string> | null) =>
		$spawns.map((spawn) => ({
			id: spawn.id,
			label: labelFor(spawn.characterId),
			basePath: basePathFor(spawn.characterId),
			color: spawn.color,
			stat: spawn.stat,
			location: names?.get(spawn.locationId) ?? ULTRAMAR.municipality,
			shows: showNamesFor(spawn.characterId)
		})))(municipalityNames);

	function onTeamCreate(): void {
		teamService.createTeam();
	}
	function onTeamRemove(event: CustomEvent<{ teamId: string }>): void {
		teamService.removeTeam(event.detail.teamId);
	}
	function onTeamRename(event: CustomEvent<{ teamId: string; name: string }>): void {
		teamService.renameTeam(event.detail.teamId, event.detail.name);
	}
	function onTeamActivate(event: CustomEvent<{ teamId: string }>): void {
		teamService.setActive(event.detail.teamId);
	}

	// spawn id → its rolled spawn colour, for the team colour rule.
	$: colorForSpawn = new Map(teamOptions.map((option) => [option.id, option.color]));

	// The currently-selected team and the spawn ids already on it, driving the tap
	// toggle and the colour rule below.
	$: activeTeam = $team.teams.find((entry) => entry.id === $team.activeTeamId) ?? null;
	$: activeMemberIds = new Set(
		(activeTeam?.memberIds ?? []).filter((id): id is string => Boolean(id))
	);

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
			</div>
		</div>
	{/if}

	<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
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
							You haven't claimed any characters yet. Head to the claim page to spawn your first one.
						</p>
						<a class="btn btn-primary btn-sm w-fit" href="/claim">Claim a character</a>
					</div>
				</div>
			{:else}
				<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
					<p class="text-xs opacity-60">
						Drag or scroll to move through your cards.
						{#if activeTeam}
							Tap a card to add or remove it from the active team.
						{:else}
							Select a team to start adding characters by tapping their card.
						{/if}
					</p>
					<label class="flex items-center gap-2 text-xs">
						<span class="whitespace-nowrap opacity-60">Columns</span>
						<input
							type="range"
							min={MIN_COLUMNS}
							max={MAX_COLUMNS}
							class="range range-primary range-xs w-40"
							bind:value={columns}
							aria-label="Grid columns"
						/>
						<span class="w-4 text-right tabular-nums opacity-70">{columns}</span>
					</label>
				</div>
				<!-- The roster is drawn on the shared card canvas — the same renderer the
				     claim pack opener uses — instead of a DOM grid. The columns always
				     fill the canvas width (default 1/2/3 by viewport, then the slider),
				     and the rows scroll vertically; tapping a card toggles its team
				     membership. -->
				<div
					class="relative h-[70vh] min-h-[32rem] overflow-hidden rounded-box bg-base-100 shadow-md"
				>
					<CardCanvas cards={cardModels} {columns} layout="grid" pannable onCardTap={handleCardTap} />
					{#if filteredSpawns.length === 0}
						<div class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
							<p class="text-sm opacity-60">No characters match these filters.</p>
							<button class="btn btn-outline btn-sm" on:click={resetFilters}>Clear filters</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if $status === AuthStatus.SignedIn}
			<aside class="w-full lg:w-80 lg:shrink-0">
				<TeamPanel
					teams={$team.teams}
					activeTeamId={$team.activeTeamId}
					options={teamOptions}
					on:create={onTeamCreate}
					on:remove={onTeamRemove}
					on:rename={onTeamRename}
					on:activate={onTeamActivate}
				/>
			</aside>
		{/if}
	</div>
</div>
