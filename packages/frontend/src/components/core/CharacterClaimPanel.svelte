<script lang="ts">
	import { onMount } from 'svelte';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { spawnService } from '$services/spawn.service';
	import { errorMessage } from '$utils/error/error-message';
	import { resolveCharacterFaceUrl } from '$utils/mugen/character-face';
	import { AuthStatus } from '$types/profile.type';
	import { SPAWN_STAT_MAX, type CharacterSpawn, type ClaimableShow } from '$types/character-spawn.type';
	import type { GeoRegion } from '$types/location.type';
	import type { ShowsCollection } from '$types/show.type';
	import { showPosterUrl } from '$utils/geo/municipality-show';
	import ShowClaimCard from '$components/core/ShowClaimCard.svelte';
	import RosterCard from '$components/core/RosterCard.svelte';
	import type { ClaimPull } from '$components/core/pack/scene/pull.type';
	import type { OpenerView } from '$components/core/pack/scene/opener-view.type';

	// The municipality the player has resolved from their browser location, from the
	// /claim page's "Claim your location" panel.
	export let region: GeoRegion | null = null;

	// All the state the (non-modal) pack-opener canvas needs, surfaced to the parent
	// so it can render the canvas in a sibling column to the right of this content.
	// Null while no pack is open. Bound by the parent (`bind:opener`); the parent
	// drives the canvas via the exported `openAnother`/`closeOpener` methods.
	export let opener: OpenerView | null = null;

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

	// Display context for the just-claimed card, resolved the same way the roster
	// page resolves a spawn (label + face from the local registry, show names from
	// Supabase). The card itself is the same RosterCard the roster grid uses; the
	// stat comes straight off the spawn (rolled at claim time).
	const charactersById = new Map(characters.map((character) => [character.id, character]));
	let characterShowNames = new Map<string, string[]>();
	// Per-character rarity tier from Supabase `character_templates`, so the revealed
	// card can show the claimed character's rarity. Empty until the shows load.
	let rarityByCharacter = new Map<string, number>();

	// The most recently claimed spawn, shown as a RosterCard so the player sees
	// exactly what they rolled. Its face and place name are captured at claim time.
	let lastSpawn: CharacterSpawn | null = null;
	let lastFaceUrl: string | null = null;
	let lastLocationName = '';

	// Pack-opener modal state. Rolling from a show opens the booster-pack canvas
	// (the show's poster is the pack cover) and reveals the character just claimed
	// from it. `openSession` bumps on every roll so the canvas remounts fresh.
	let openerShow: ClaimableShow | null = null;
	let openerPull: ClaimPull | null = null;
	let openerPosterUrl: string | null = null;
	let openSession = 0;

	onMount(() => {
		authService.init();
		void loadPosters();
	});

	// Load the saved-show collection (public JSON) to map each show to its poster.
	async function loadPosters() {
		try {
			const res = await fetch('/data/shows.json');
			if (!res.ok) return;
			const data = (await res.json()) as ShowsCollection;
			const map = new Map<number, string>();
			for (const entry of data.shows) {
				const url = showPosterUrl(entry);
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
			const [showList, showNames, rarities] = await Promise.all([
				spawnService.loadShows(),
				spawnService.loadCharacterShowNames(),
				// Warm the rarity cache so claimRandom can weight its roll by rarity.
				spawnService.loadRarities()
			]);
			shows = showList;
			characterShowNames = showNames;
			rarityByCharacter = rarities;
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
			const spawn = await spawnService.claimRandom(
				currentUserId,
				show.characterIds,
				show.id,
				locationId
			);
			// Capture what was rolled and resolve its portrait, so the RosterCard
			// below mirrors the roster grid exactly.
			lastLocationName = region?.municipality ?? '';
			const basePath = charactersById.get(spawn.characterId)?.basePath ?? null;
			const faceUrl = basePath
				? await resolveCharacterFaceUrl(spawn.characterId, basePath)
				: null;
			lastFaceUrl = faceUrl;
			lastSpawn = spawn;

			// Open (or refresh) the pack-opener canvas with what was just claimed:
			// the show's poster is the pack cover, the rolled character is the card.
			openerShow = show;
			openerPosterUrl = posterByShowId.get(show.id) ?? null;
			// ATK/DEF mirror the board: ATK is the rolled spawn stat, DEF its complement.
			openerPull = {
				spawn,
				label: labelFor(spawn.characterId),
				basePath,
				faceUrl,
				color: spawn.color,
				rarity: rarityByCharacter.get(spawn.characterId) ?? null,
				locationName: lastLocationName || null,
				atk: spawn.stat,
				def: SPAWN_STAT_MAX - spawn.stat
			};
			openSession += 1;
		} catch (error) {
			claimErrors = { ...claimErrors, [show.id]: errorMessage(error) };
		} finally {
			claimingId = null;
		}
	}

	// The opener view handed up to the parent, recomputed whenever a roll resolves
	// (openerPull/openerShow set) or the rolling/location state changes.
	$: opener =
		openerShow && openerPull
			? {
					coverUrl: openerPosterUrl,
					label: openerShow.name,
					pulls: [openerPull],
					openSession,
					openAnotherBusy: claimingId !== null,
					openAnotherDisabled: !locationId || claimingId !== null
				}
			: null;

	// Re-roll from the same show without leaving the opener — reveals a fresh card.
	// Exported so the parent's opener column can drive it.
	export function openAnother() {
		if (openerShow) void claimFromShow(openerShow);
	}

	export function closeOpener() {
		openerShow = null;
		openerPull = null;
	}

	function labelFor(id: string): string {
		return charactersById.get(id)?.label ?? id;
	}
	function showNamesFor(id: string): string[] {
		return characterShowNames.get(id) ?? [];
	}
	function claimedAtFor(createdAt: string): string {
		return new Date(createdAt).toLocaleString();
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
			<button class="btn btn-primary btn-sm" on:click={() => signInPanelOpen.set(true)}>Sign in</button>
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

			{#if lastSpawn}
				<div class="divider text-xs">Just claimed</div>
				<RosterCard
					label={labelFor(lastSpawn.characterId)}
					faceUrl={lastFaceUrl}
					showNames={showNamesFor(lastSpawn.characterId)}
					locationName={lastLocationName}
					claimedAt={claimedAtFor(lastSpawn.createdAt)}
					color={lastSpawn.color}
					stat={lastSpawn.stat}
				/>
			{/if}
		{/if}
	</div>
</div>
