<script lang="ts">
	import { onMount } from 'svelte';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { spawnService } from '$services/spawn.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';
	import { AuthStatus } from '$types/profile.type';
	import RosterCard from '$components/core/RosterCard.svelte';

	const status = authService.status;
	const profile = authService.profile;
	const spawns = spawnService.spawns;

	// Spawns store only a character id + geojson ids; labels, sprites and place
	// names are resolved here from the local registry and municipality layer.
	const charactersById = new Map(characters.map((character) => [character.id, character]));

	// character id → names of the Supabase shows it belongs to.
	let characterShowNames = new Map<string, string[]>();
	let municipalityNames: Map<string, string> | null = null;

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
			const [, showNamesByCharacter] = await Promise.all([
				spawnService.loadSpawns(userId),
				spawnService.loadCharacterShowNames()
			]);
			characterShowNames = showNamesByCharacter;

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
		return characterShowNames.get(characterId) ?? [];
	}
	function locationNameFor(id: string): string {
		return municipalityNames?.get(id) ?? id;
	}
	function claimedAtFor(createdAt: string): string {
		return new Date(createdAt).toLocaleString();
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
				<a class="btn btn-primary btn-sm w-fit" href="/profile">Sign in</a>
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
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each $spawns as spawn (spawn.id)}
				<RosterCard
					label={labelFor(spawn.characterId)}
					basePath={basePathFor(spawn.characterId)}
					showNames={showNamesFor(spawn.characterId)}
					locationName={locationNameFor(spawn.locationId)}
					claimedAt={claimedAtFor(spawn.createdAt)}
				/>
			{/each}
		</div>
	{/if}
</div>
