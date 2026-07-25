<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { spawnService } from '$services/spawn.service';
	import { AuthStatus } from '$types/profile.type';
	import type { ClaimableShow } from '$types/character-spawn.type';
	import MugenStage from '$components/core/MugenStage.svelte';

	const status = authService.status;
	const profile = authService.profile;
	const spawns = spawnService.spawns;

	// Spawns store only a character id; labels + sprites come from the local registry.
	const charactersById = new Map(characters.map((character) => [character.id, character]));

	let shows: ClaimableShow[] = [];
	let loadingShows = false;
	let showsError = '';
	// Which show to roll from: a specific show id, or 'all' for the union of every show.
	let selection: number | 'all' = 'all';

	let claiming = false;
	let claimError = '';

	// Guards the one-time load so the reactive block doesn't refire on every store tick.
	let loadedForUser: string | null = null;

	onMount(() => authService.init());

	// Once a signed-in user is known, load the claimable shows and their spawns once.
	$: currentUserId = $status === AuthStatus.SignedIn && $profile ? String($profile.id) : null;
	$: if (currentUserId && currentUserId !== loadedForUser) {
		loadedForUser = currentUserId;
		load(currentUserId);
	}

	async function load(userId: string) {
		loadingShows = true;
		showsError = '';
		try {
			const [loadedShows] = await Promise.all([
				spawnService.loadShows(),
				spawnService.loadSpawns(userId)
			]);
			shows = loadedShows;
		} catch (error) {
			showsError = error instanceof Error ? error.message : String(error);
		} finally {
			loadingShows = false;
		}
	}

	// The character pool + show tag implied by the current selection.
	$: allCharacterIds = [...new Set(shows.flatMap((show) => show.characterIds))];
	$: selectedShow = selection === 'all' ? null : (shows.find((show) => show.id === selection) ?? null);
	$: pool = selectedShow ? selectedShow.characterIds : allCharacterIds;
	$: showTag = selectedShow ? selectedShow.id : null;

	async function claim() {
		if (!currentUserId) return;
		claiming = true;
		claimError = '';
		try {
			await spawnService.claimRandom(currentUserId, pool, showTag);
		} catch (error) {
			claimError = error instanceof Error ? error.message : String(error);
		} finally {
			claiming = false;
		}
	}

	function labelFor(id: string): string {
		return charactersById.get(id)?.label ?? id;
	}
	function basePathFor(id: string): string | null {
		return charactersById.get(id)?.basePath ?? null;
	}
	function showNameFor(id: number | null): string {
		if (id === null) return 'All shows';
		return shows.find((show) => show.id === id)?.name ?? `Show ${id}`;
	}
</script>

<div class="card w-full max-w-md bg-base-100 shadow-xl">
	<div class="card-body gap-4">
		<h1 class="card-title">Claim a character</h1>

		{#if !authService.configured}
			<div class="alert alert-warning text-sm">
				<span>Sign-in is unavailable — Supabase is not configured.</span>
			</div>
		{:else if $status === AuthStatus.Loading}
			<div class="flex justify-center py-6">
				<span class="loading loading-spinner loading-md"></span>
			</div>
		{:else if $status !== AuthStatus.SignedIn}
			<p class="text-sm opacity-70">
				Sign in to spawn a random character from your shows.
			</p>
			<a class="btn btn-primary btn-sm" href="/profile">Sign in</a>
		{:else}
			<p class="text-sm opacity-70">
				Roll a random character from one of your shows — the spawn is saved to your account.
			</p>

			{#if showsError}
				<div class="alert alert-error text-sm"><span>{showsError}</span></div>
			{:else if loadingShows}
				<div class="flex items-center gap-2 text-sm opacity-70">
					<span class="loading loading-spinner loading-xs"></span>
					Loading your shows…
				</div>
			{:else if shows.length === 0}
				<div class="alert alert-info text-sm">
					<span>No shows with characters have been synced yet. Check back later.</span>
				</div>
			{:else}
				<label class="form-control w-full">
					<div class="label">
						<span class="label-text">Show</span>
					</div>
					<select class="select select-bordered" bind:value={selection}>
						<option value="all">All shows ({allCharacterIds.length})</option>
						{#each shows as show (show.id)}
							<option value={show.id}>{show.name} ({show.characterIds.length})</option>
						{/each}
					</select>
				</label>

				<button
					class={classNames('btn btn-primary', { 'btn-disabled': claiming || pool.length === 0 })}
					on:click={claim}
				>
					{#if claiming}
						<span class="loading loading-spinner loading-sm"></span>
						Spawning…
					{:else}
						Spawn random character
					{/if}
				</button>

				{#if claimError}
					<div class="alert alert-error text-sm"><span>{claimError}</span></div>
				{/if}
			{/if}

			{#if $spawns.length > 0}
				{@const latest = $spawns[0]}
				{@const latestBasePath = basePathFor(latest.characterId)}
				<div class="flex flex-col items-center gap-2 rounded-box bg-base-200 p-4">
					<span class="text-xs uppercase tracking-wide opacity-60">Latest spawn</span>
					{#if latestBasePath}
						{#key latest.id}
							<MugenStage basePath={latestBasePath} width={260} height={200} scale={1.6} />
						{/key}
					{/if}
					<span class="text-lg font-bold">{labelFor(latest.characterId)}</span>
					<span class="badge badge-ghost">from {showNameFor(latest.showId)}</span>
				</div>

				<div class="flex flex-col gap-1">
					<span class="text-xs uppercase tracking-wide opacity-60">
						Your roster ({$spawns.length})
					</span>
					<div class="flex flex-wrap gap-2">
						{#each $spawns as spawn (spawn.id)}
							<span class="badge badge-outline">{labelFor(spawn.characterId)}</span>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
