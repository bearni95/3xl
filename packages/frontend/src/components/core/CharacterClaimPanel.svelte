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

	// The most recently claimed booster, shown as RosterCards so the player sees
	// exactly what they rolled. Faces and place name are captured at claim time.
	let lastPulls: ClaimPull[] = [];
	let lastLocationName = '';

	// Pack-opener modal state. Rolling from a show opens the booster-pack canvas
	// (the show's poster is the pack cover) and reveals the characters just claimed
	// from it. `openSession` bumps on every roll so the canvas remounts fresh.
	let openerShow: ClaimableShow | null = null;
	let openerPulls: ClaimPull[] = [];
	let openerPosterUrl: string | null = null;
	let openSession = 0;
	// The region the open pack was claimed from — the GPS reading, or a municipality
	// picked from today's festes. Re-opens ("open another") reuse it, so the pack
	// stays tied to the place it was opened from rather than the GPS panel.
	let openerRegion: GeoRegion | null = null;

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
				// Warm the rarity cache so claimBooster can weight its rolls by rarity.
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

	// Open a booster from one show's assigned pool and persist its cards, each
	// tagged with that show. Only one open runs at a time (the other cards lock out).
	async function claimFromShow(show: ClaimableShow, claimRegion: GeoRegion | null = region) {
		const locId = claimRegion?.id ?? null;
		if (!currentUserId || !locId || claimingId !== null) return;
		claimingId = show.id;
		claimErrors = { ...claimErrors, [show.id]: '' };
		try {
			const spawns = await spawnService.claimBooster(
				currentUserId,
				show.characterIds,
				show.id,
				locId
			);
			// Capture what was rolled and resolve each portrait, so the RosterCards
			// below mirror the roster grid exactly.
			lastLocationName = claimRegion?.municipality ?? '';
			const pulls = await Promise.all(spawns.map((spawn) => buildPull(spawn)));
			lastPulls = pulls;

			// Open (or refresh) the pack-opener canvas with what was just claimed:
			// the show's poster is the pack cover, the rolled characters are the cards.
			openerShow = show;
			openerPosterUrl = posterByShowId.get(show.id) ?? null;
			openerPulls = pulls;
			openerRegion = claimRegion;
			openSession += 1;
		} catch (error) {
			claimErrors = { ...claimErrors, [show.id]: errorMessage(error) };
		} finally {
			claimingId = null;
		}
	}

	// Open a booster for a specific show and place — used by the "festes majors
	// d'avui" list, which claims from the celebrating municipality rather than the
	// GPS reading. No-op until the show pool has loaded (returns whether it fired).
	export function claimFromShowId(showId: number, claimRegion: GeoRegion): boolean {
		const show = shows.find((entry) => entry.id === showId);
		if (!show) return false;
		void claimFromShow(show, claimRegion);
		return true;
	}

	// Assemble the display card for one claimed spawn: label + face from the local
	// registry, colour/stat off the spawn. ATK/DEF mirror the board — ATK is the
	// rolled spawn stat, DEF its complement.
	async function buildPull(spawn: CharacterSpawn): Promise<ClaimPull> {
		const basePath = charactersById.get(spawn.characterId)?.basePath ?? null;
		const faceUrl = basePath
			? await resolveCharacterFaceUrl(spawn.characterId, basePath)
			: null;
		return {
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
	}

	// The opener view handed up to the parent, recomputed whenever a roll resolves
	// (openerPull/openerShow set) or the rolling/location state changes.
	$: opener =
		openerShow && openerPulls.length > 0
			? {
					coverUrl: openerPosterUrl,
					label: openerShow.name,
					pulls: openerPulls,
					openSession,
					openAnotherBusy: claimingId !== null,
					openAnotherDisabled: !openerRegion?.id || claimingId !== null
				}
			: null;

	// Re-open from the same show and place without leaving the opener — reveals a
	// fresh booster. Exported so the parent's opener column can drive it.
	export function openAnother() {
		if (openerShow) void claimFromShow(openerShow, openerRegion);
	}

	export function closeOpener() {
		openerShow = null;
		openerPulls = [];
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

			{#if lastPulls.length > 0}
				<div class="divider text-xs">Just claimed</div>
				<div class="grid grid-cols-2 gap-3">
					{#each lastPulls as pull (pull.spawn.id)}
						<RosterCard
							label={labelFor(pull.spawn.characterId)}
							faceUrl={pull.faceUrl}
							showNames={showNamesFor(pull.spawn.characterId)}
							locationName={lastLocationName}
							claimedAt={claimedAtFor(pull.spawn.createdAt)}
							color={pull.spawn.color}
							stat={pull.spawn.stat}
						/>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
