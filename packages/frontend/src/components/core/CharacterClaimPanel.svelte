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
	import type { ShowEntry, ShowsCollection } from '$types/show.type';
	import { showPosterUrlForSeed } from '$utils/geo/municipality-show';
	import { EXP_PER_SPAWN } from '$utils/progression/level';
	import type { ClaimPull } from '$components/core/pack/scene/pull.type';
	import type { OpenerView } from '$components/core/pack/scene/opener-view.type';

	// All the state the (non-modal) pack-opener canvas needs, surfaced to the parent
	// so it can render the canvas in a sibling column to the right of this content.
	// Null while no pack is open. Bound by the parent (`bind:opener`); the parent
	// drives the canvas via the exported `openAnother`/`closeOpener` methods.
	export let opener: OpenerView | null = null;

	const status = authService.status;
	const profile = authService.profile;

	let shows: ClaimableShow[] = [];
	let loadingShows = false;
	let showsError = '';

	// Saved show entry per show id, joined from shows.json (the admin enables each
	// show's posters there). Kept whole — not reduced to a single URL — so the pack
	// cover can be picked per location+year from the enabled set at open time.
	// Independent of auth, so loaded up front.
	let showEntryById = new Map<number, ShowEntry>();

	// The show currently being opened (locks out concurrent opens), plus the error
	// from the last open attempt, if any.
	let claimingId: number | null = null;
	let claimError = '';

	// Guards the one-time load so the reactive block doesn't refire on every store tick.
	let loadedForUser: string | null = null;

	// Registry + Supabase lookups used to assemble each revealed card (a ClaimPull):
	// the character's label + face resolve from the local @3xl/data registry, its
	// rarity tier from Supabase `character_templates`.
	const charactersById = new Map(characters.map((character) => [character.id, character]));
	// Per-character rarity tier from Supabase `character_templates`, so the revealed
	// card can show the claimed character's rarity. Empty until the shows load.
	let rarityByCharacter = new Map<string, number>();

	// The place the open pack is tied to, captured at claim time and shown on each
	// revealed card's location strip.
	let lastLocationName = '';

	// Pack-opener modal state. Selecting a show opens the booster-pack canvas (the
	// show's poster is the pack cover); the spawn is rolled against Supabase only
	// when the player slices the pack open (`runClaim`). `openSession` bumps on
	// every open so the canvas remounts with a fresh, unsliced pack.
	let openerShow: ClaimableShow | null = null;
	let openerPosterUrl: string | null = null;
	let openSession = 0;
	// The region the open pack is tied to — a municipality picked from today's
	// festes. Re-opens ("open another") reuse it, so the roll stays tied to the
	// place the pack was opened from.
	let openerRegion: GeoRegion | null = null;

	onMount(() => {
		authService.init();
		void loadPosters();
	});

	// Load the saved-show collection (public JSON) and index each entry by show id
	// so the pack cover can be resolved from its enabled posters at open time.
	async function loadPosters() {
		try {
			const res = await fetch('/data/shows.json');
			if (!res.ok) return;
			const data = (await res.json()) as ShowsCollection;
			const map = new Map<number, ShowEntry>();
			for (const entry of data.shows) {
				map.set(entry.show.id, entry);
			}
			showEntryById = map;
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
			const [showList, rarities] = await Promise.all([
				spawnService.loadShows(),
				// Warm the rarity cache so claimBooster can weight its rolls by rarity.
				spawnService.loadRarities()
			]);
			shows = showList;
			rarityByCharacter = rarities;
		} catch (error) {
			showsError = errorMessage(error);
		} finally {
			loadingShows = false;
		}
	}

	// Open a booster from one show for a place: show the pack on the canvas, tied to
	// that show and municipality. Nothing is spawned yet — the Supabase roll fires
	// only when the player slices the pack open (see `runClaim`). Bumping
	// `openSession` remounts the canvas with a fresh, unsliced pack. Blocked while a
	// previous open is still rolling.
	function openBooster(show: ClaimableShow, claimRegion: GeoRegion | null) {
		if (!currentUserId || !claimRegion?.id || claimingId !== null) return;
		openerShow = show;
		// Pick the pack cover from this show's enabled posters by hashing the place +
		// year, so each location/year combo gets its own (stable) cover. The year is
		// "now" — the same year the pack and the spawn are stamped with.
		const entry = showEntryById.get(show.id);
		const seed = `${claimRegion.municipality ?? ''}|${new Date().getFullYear()}`;
		openerPosterUrl = entry ? showPosterUrlForSeed(entry, seed) : null;
		openerRegion = claimRegion;
		claimError = '';
		openSession += 1;
	}

	// Roll the open booster against Supabase and resolve its cards. Handed to the
	// canvas, which invokes it when the pack is sliced open — so the spawn is
	// persisted at open time, not when the pack was selected. Persists the spawns
	// and awards experience. Returns the cards to reveal ([] on failure, which
	// reveals nothing).
	async function runClaim(): Promise<ClaimPull[]> {
		const show = openerShow;
		const claimRegion = openerRegion;
		const locId = claimRegion?.id ?? null;
		if (!currentUserId || !show || !locId) return [];
		claimingId = show.id;
		claimError = '';
		try {
			const spawns = await spawnService.claimBooster(
				currentUserId,
				show.characterIds,
				show.id,
				locId
			);
			// Award experience for the cards pulled and mirror the new total (and the
			// level it implies) into the profile card. Non-blocking — a failure here
			// must not sink a successful claim.
			void authService.addExp(spawns.length * EXP_PER_SPAWN).catch(() => undefined);

			// Capture the place and resolve each portrait so the revealed cards carry
			// the character's face and the town it was claimed in.
			lastLocationName = claimRegion?.municipality ?? '';
			return await Promise.all(spawns.map((spawn) => buildPull(spawn)));
		} catch (error) {
			claimError = errorMessage(error);
			return [];
		} finally {
			claimingId = null;
		}
	}

	// Open a booster for a specific show and place — used by the "festes majors
	// d'avui" list, which opens from the celebrating municipality. No-op until the
	// show pool has loaded (returns whether it fired).
	export function claimFromShowId(showId: number, claimRegion: GeoRegion): boolean {
		const show = shows.find((entry) => entry.id === showId);
		if (!show) return false;
		openBooster(show, claimRegion);
		return true;
	}

	// Assemble the display card for one claimed spawn: label + face from the local
	// registry, colour/stat off the spawn. The combat attributes mirror the board —
	// ATK is the rolled spawn stat, DEF its complement, SPD is ATK − 1 and HP is DEF + 1.
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
			spawnedAt: spawn.createdAt,
			atk: spawn.stat,
			def: SPAWN_STAT_MAX - spawn.stat,
			spd: spawn.stat - 1,
			hp: SPAWN_STAT_MAX - spawn.stat + 1
		};
	}

	// The opener view handed up to the parent, present whenever a pack is open. The
	// canvas rolls the booster via `runClaim` when the pack is sliced; recomputed
	// when the open show/place or the rolling state changes.
	$: opener = openerShow
		? {
				coverUrl: openerPosterUrl,
				label: openerShow.name,
				locationName: openerRegion?.municipality ?? null,
				claim: runClaim,
				openSession,
				openAnotherBusy: claimingId !== null,
				openAnotherDisabled: !openerRegion?.id || claimingId !== null
			}
		: null;

	// Re-open a fresh, unsliced pack from the same show and place without leaving
	// the opener. Exported so the parent's opener column can drive it.
	export function openAnother() {
		if (openerShow) openBooster(openerShow, openerRegion);
	}

	export function closeOpener() {
		openerShow = null;
	}

	function labelFor(id: string): string {
		return charactersById.get(id)?.label ?? id;
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
				Pick a town celebrating its festa major today, below, to open its booster — the
				spawn is saved to your account, tagged with that place.
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
			{/if}

			{#if claimError}
				<div class="alert alert-error text-sm"><span>{claimError}</span></div>
			{/if}
		{/if}
	</div>
</div>
