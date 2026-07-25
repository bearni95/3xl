<script lang="ts">
	import { onMount } from 'svelte';
	import { authService } from '$services/auth.service';
	import { spawnService } from '$services/spawn.service';
	import { errorMessage } from '$utils/error/error-message';
	import { AuthStatus } from '$types/profile.type';
	import type { ClaimableShow } from '$types/character-spawn.type';
	import type { GeoRegion } from '$types/location.type';
	import type { ShowEntry, ShowsCollection } from '$types/show.type';
	import ShowClaimCard from '$components/core/ShowClaimCard.svelte';

	// The municipality the player has resolved from their browser location, from the
	// /claim page's "Claim your location" panel.
	export let region: GeoRegion | null = null;

	const status = authService.status;
	const profile = authService.profile;

	// A location must be claimed before a character can be spawned.
	$: locationId = region?.id ?? null;

	let shows: ClaimableShow[] = [];
	let loadingShows = false;
	let showsError = '';

	// Assigned main poster URL per show id, joined from shows.json (the admin picks
	// each show's main poster there). Independent of auth, so loaded up front.
	let posterByShowId = new Map<number, string>();

	// The show currently being rolled (its card spins; the others lock out), plus
	// per-show roll errors keyed by show id.
	let claimingId: number | null = null;
	let claimErrors: Record<number, string> = {};

	// Guards the one-time load so the reactive block doesn't refire on every store tick.
	let loadedForUser: string | null = null;

	onMount(() => {
		authService.init();
		void loadPosters();
	});

	// A saved show's assigned main poster URL, falling back to its default TMDB
	// poster, then null (the card shows a placeholder).
	function mainPosterUrl(entry: ShowEntry): string | null {
		const filePath = entry.mainImages?.poster;
		if (filePath) {
			const image = entry.images.posters.find((candidate) => candidate.filePath === filePath);
			if (image) return image.thumbnailUrl;
		}
		return entry.show.posterUrl ?? null;
	}

	// Load the saved-show collection (public JSON) to map each show to its poster.
	async function loadPosters() {
		try {
			const res = await fetch('/data/shows.json');
			if (!res.ok) return;
			const data = (await res.json()) as ShowsCollection;
			const map = new Map<number, string>();
			for (const entry of data.shows) {
				const url = mainPosterUrl(entry);
				if (url) map.set(entry.show.id, url);
			}
			posterByShowId = map;
		} catch {
			// Posters are optional — cards fall back to a placeholder.
		}
	}

	// Once a signed-in user is known, load the claimable shows once.
	$: currentUserId = $status === AuthStatus.SignedIn && $profile ? String($profile.id) : null;
	$: if (currentUserId && currentUserId !== loadedForUser) {
		loadedForUser = currentUserId;
		load();
	}

	async function load() {
		loadingShows = true;
		showsError = '';
		try {
			shows = await spawnService.loadShows();
		} catch (error) {
			showsError = errorMessage(error);
		} finally {
			loadingShows = false;
		}
	}

	// Roll a random character from one show's assigned pool and persist it, tagged
	// with that show. Only one roll runs at a time (the other cards lock out).
	async function claimFromShow(show: ClaimableShow) {
		if (!currentUserId || !locationId || claimingId !== null) return;
		claimingId = show.id;
		claimErrors = { ...claimErrors, [show.id]: '' };
		try {
			await spawnService.claimRandom(currentUserId, show.characterIds, show.id, locationId);
		} catch (error) {
			claimErrors = { ...claimErrors, [show.id]: errorMessage(error) };
		} finally {
			claimingId = null;
		}
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
				{#if !locationId}
					<div class="alert alert-info text-sm">
						<span>Claim your location above before spawning a character.</span>
					</div>
				{/if}

				<!-- One claim panel per show, keyed by its assigned main poster. Rolling
				     a character draws only from that show's assigned pool. -->
				<div class="grid grid-cols-2 gap-3">
					{#each shows as show (show.id)}
						<ShowClaimCard
							{show}
							posterUrl={posterByShowId.get(show.id) ?? null}
							claiming={claimingId === show.id}
							disabled={!locationId || claimingId !== null}
							error={claimErrors[show.id] ?? ''}
							on:claim={() => claimFromShow(show)}
						/>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
