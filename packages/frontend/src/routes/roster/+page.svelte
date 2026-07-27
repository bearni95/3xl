<script lang="ts">
	import { onMount } from 'svelte';
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
	import { SPAWN_STAT_MAX } from '$types/character-spawn.type';
	import { teammateColors } from '$utils/color/compare';
	import CardCanvas from '$components/core/card/CardCanvas.svelte';
	import type { CardModel } from '$components/core/card/card-model.type';
	import TeamPanel from '$components/core/TeamPanel.svelte';

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

	// Each claimed spawn as a display CardModel for the shared card renderer — the
	// same shape the claim pack opener draws (label + sprite from the local registry,
	// face fallback, rolled colour/stat, rarity, claim place and year). ATK is the
	// rolled stat and DEF its complement, mirroring the claim flow's buildPull. The
	// resolved maps are threaded in explicitly so the statement re-runs as faces,
	// place names and rarities load in (a bare helper call would hide those deps).
	$: cardModels = ((
		faces: Map<string, string | null>,
		_names: Map<string, string> | null,
		rarities: Map<string, number>
	): CardModel[] =>
		$spawns.map((spawn) => ({
			label: labelFor(spawn.characterId),
			basePath: basePathFor(spawn.characterId),
			faceUrl: faces.get(spawn.characterId) ?? null,
			color: spawn.color,
			rarity: rarities.get(spawn.characterId) ?? null,
			locationName: locationNameFor(spawn.locationId),
			spawnedAt: spawn.createdAt,
			atk: spawn.stat,
			def: SPAWN_STAT_MAX - spawn.stat
		})))(characterFaces, municipalityNames, rarityByCharacter);

	// Tapping a card on the canvas toggles that spawn on the active team (add to the
	// first free slot, or remove it) — the canvas replaces the old per-card buttons.
	// The tapped index maps 1:1 to the spawns the cards were built from.
	function handleCardTap(index: number): void {
		const spawn = $spawns[index];
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
	<div class="flex items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">Your roster</h1>
			<p class="text-sm opacity-70">Every character you've claimed.</p>
		</div>
		{#if $status === AuthStatus.SignedIn}
			<span class="badge badge-lg badge-primary">{$spawns.length}</span>
		{/if}
	</div>

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
				<p class="mb-3 text-xs opacity-60">
					Drag to pan, scroll or pinch to zoom.
					{#if activeTeam}
						Tap a card to add or remove it from the active team.
					{:else}
						Select a team to start adding characters by tapping their card.
					{/if}
				</p>
				<!-- The roster is drawn on the shared card canvas — the same renderer the
				     claim pack opener uses — instead of a DOM grid. Cards lay out in a
				     responsive grid (1/2/3 columns, like the old grid) inside a world you
				     pan and zoom like a map; tapping a card toggles its team membership. -->
				<div class="h-[70vh] min-h-[32rem] overflow-hidden rounded-box bg-base-100 shadow-md">
					<CardCanvas cards={cardModels} layout="grid" pannable onCardTap={handleCardTap} />
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
