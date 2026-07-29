<script lang="ts">
	import { onMount } from 'svelte';
	import { characters } from '@3xl/data';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { spawnService, type BoostersStatus } from '$services/spawn.service';
	import { errorMessage } from '$utils/error/error-message';
	import { resolveCharacterFaceUrl } from '$utils/mugen/character-face';
	import { AuthStatus } from '$types/profile.type';
	import type { CharacterSpawn, ClaimableShow } from '$types/character-spawn.type';
	import type { GeoRegion } from '$types/location.type';
	import type { MunicipalityShowsCollection, ShowEntry, ShowsCollection } from '$types/show.type';
	import { showPosterUrlForSeed } from '$utils/geo/municipality-show';
	import { showLogoUrl } from '$utils/show/show-logo';
	import { festesService } from '$services/festes.service';
	import type { RegionShow } from '$utils/geo/region-tree';
	import type { ClaimPull } from '$components/core/pack/scene/pull.type';
	import type { OpenerPack } from '$components/core/pack/scene/opener-view.type';
	import type { FestaLocationRow, FestaShowPair } from '$types/festivity.type';

	// The window's booster packs, assembled from the festes in range and surfaced to the
	// parent (`bind:packs`) so it can render the pack-grid canvas below this content.
	// Each carries its own poster cover and the roll it fires when sliced open.
	export let packs: OpenerPack[] = [];

	// The window's (festa, show) pairs — every town celebrating its festa major from
	// three days back through four days ahead (the same range `claim_booster` accepts),
	// each paired with the series the map assigns it. Loaded on mount; the pack grid
	// renders one booster per pair that has a show this player can claim.
	let festaPairs: FestaShowPair[] = [];

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
	// from the last open attempt, if any. `claimError` is bindable because a host that
	// only borrows this panel's packs (the map's booster tab renders the panel hidden,
	// for its packs alone) still has to be able to say why a pack opened to nothing —
	// every one of `claim_booster`'s refusals lands here, and a pack that reveals no
	// cards is otherwise indistinguishable from a bug.
	let claimingId: number | null = null;
	export let claimError = '';

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

	// The signed-in player's daily booster allowance, loaded from the server (which
	// also enforces it). Drives the "N packs left today" hint and blocks opening
	// once spent. Null until loaded / when signed out. Bindable for the same reason as
	// `claimError`: a host rendering only the packs still needs to show what's left.
	export let boosters: BoostersStatus | null = null;

	onMount(() => {
		authService.init();
		void loadPosters();
		void loadWindowFestes();
	});

	// Load the window's celebrating municipalities (from Supabase, via the festes
	// service) and the map's municipality→show assignment (a baked dataset), then pair
	// each town with its assigned show. Both are fetched once; failures leave the grid
	// empty.
	async function loadWindowFestes() {
		const [festesResult, showsResult] = await Promise.allSettled([
			festesService.loadFestesForWindow(),
			fetch('/data/municipality-shows.json').then(
				(response) => response.json() as Promise<MunicipalityShowsCollection>
			)
		]);

		let locations: FestaLocationRow[] = [];
		let showByMunicipality = new Map<string, RegionShow>();
		if (festesResult.status === 'fulfilled') locations = festesResult.value;
		if (showsResult.status === 'fulfilled') {
			showByMunicipality = new Map(
				showsResult.value.assignments.map((assignment) => [assignment.id, assignment.show])
			);
		}
		festaPairs = locations.map((festa) => ({ festa, show: showByMunicipality.get(festa.id) }));
	}

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
				// Rarity tiers label the revealed cards (the roll itself is server-side).
				spawnService.loadRarities()
			]);
			shows = showList;
			rarityByCharacter = rarities;
		} catch (error) {
			showsError = errorMessage(error);
		} finally {
			loadingShows = false;
		}
		void refreshBoostersStatus();
	}

	// The player's daily booster allowance (level = cap, and how many remain today),
	// enforced server-side and mirrored here so the UI can show it and block opening
	// once it's spent. Null until loaded / when signed out.
	async function refreshBoostersStatus() {
		try {
			boosters = await spawnService.boostersStatus();
		} catch {
			// Non-fatal — the server still enforces the limit on the actual claim.
			boosters = null;
		}
	}

	// The pack cover for a show at a place: picked from that show's enabled posters by
	// hashing the place + year, so each location/year combo gets its own (stable)
	// cover. The year is "now" — the same year the pack and the spawn are stamped with.
	function resolvePosterUrl(show: ClaimableShow, claimRegion: GeoRegion): string | null {
		const entry = showEntryById.get(show.id);
		const seed = `${claimRegion.municipality ?? ''}|${new Date().getFullYear()}`;
		return entry ? showPosterUrlForSeed(entry, seed) : null;
	}

	// The show's wordmark for the foot of the pack, out of the same collection the cover
	// comes from. Not seeded like the poster is: a place gets its own cover because there
	// are many posters and one of them may as well be this town's, whereas a show has one
	// name and says it the same way everywhere.
	function resolveLogoUrl(show: ClaimableShow): string | null {
		const entry = showEntryById.get(show.id);
		return entry ? showLogoUrl(entry) : null;
	}

	// Build the roll one grid pack fires when the player slices it open — a closure
	// bound to its show + place. The Supabase roll persists the spawn at open time
	// (not when the pack is picked) and returns the cards to reveal ([] on failure,
	// which reveals nothing). Every limit (daily allowance, festa major inside the
	// booster window) is enforced server-side by the claim_booster RPC. Opening a pack earns no
	// experience — that comes from winning fights only (see award_combat_exp).
	function makeClaim(show: ClaimableShow, claimRegion: GeoRegion): () => Promise<ClaimPull[]> {
		return async () => {
			if (!currentUserId || !claimRegion.id) return [];
			// Client-side echo of the server rule: no allowance left, reveal nothing.
			if (boosters && boosters.remaining <= 0) {
				claimError = `You've opened all ${boosters.level} of today's booster packs. More unlock at midnight.`;
				return [];
			}
			claimingId = show.id;
			claimError = '';
			try {
				const spawns = await spawnService.claimBooster(show.id, claimRegion.id);
				// Refresh the daily allowance: this pack counts against it.
				void refreshBoostersStatus();

				// Capture the place and resolve each portrait so the revealed cards carry
				// the character's face and the town it was claimed in.
				lastLocationName = claimRegion.municipality ?? '';
				return await Promise.all(spawns.map((spawn) => buildPull(spawn, show.name)));
			} catch (error) {
				claimError = errorMessage(error);
				return [];
			} finally {
				claimingId = null;
			}
		};
	}

	// Assemble the window's grid packs from the festes in range: one booster per
	// celebrating town whose assigned show this player can claim. Each pack carries its
	// poster cover and a roll bound to that show + place. Empty when signed out or
	// before the show pool loads. Kept as a pure function of its inputs so the reactive
	// block below re-runs when any of them change.
	function computePacks(
		festaPairs: FestaShowPair[],
		showPool: ClaimableShow[],
		_posters: Map<number, ShowEntry>,
		userId: string | null
	): OpenerPack[] {
		if (!userId) return [];
		const claimableById = new Map(showPool.map((show) => [show.id, show]));
		const out: OpenerPack[] = [];
		for (const { festa, show } of festaPairs) {
			if (!show) continue;
			const claimable = claimableById.get(show.id);
			if (!claimable) continue;
			const claimRegion: GeoRegion = {
				id: festa.id,
				municipality: festa.name,
				province: festa.prov ?? '',
				country: festa.territory ?? ''
			};
			out.push({
				id: festa.id,
				coverUrl: resolvePosterUrl(claimable, claimRegion),
				logoUrl: resolveLogoUrl(claimable),
				locationName: festa.name,
				label: claimable.name,
				claim: makeClaim(claimable, claimRegion)
			});
		}
		return out;
	}

	// Assemble the display card for one claimed spawn: label + face from the local
	// registry, colour off the spawn.
	async function buildPull(spawn: CharacterSpawn, showName: string | null): Promise<ClaimPull> {
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
			showName,
			locationName: lastLocationName || null,
			spawnedAt: spawn.createdAt
		};
	}

	// The window's grid packs, recomputed whenever the window's festes, the claimable
	// show pool, the enabled posters, or the signed-in user change. (All four are named
	// here so the reactive statement actually re-runs when any of them updates.)
	$: packs = computePacks(festaPairs, shows, showEntryById, currentUserId);

	function labelFor(id: string): string {
		return charactersById.get(id)?.label ?? id;
	}
</script>

<div class="card w-full bg-base-100 shadow-xl">
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
				Pick a town celebrating its festa major this week, below — from three days back
				through four days ahead — to open its booster. The spawn is saved to your account,
				tagged with that place.
			</p>

			{#if boosters}
				<div
					class="flex items-center justify-between gap-2 rounded-box bg-base-200 px-3 py-2 text-sm"
					title="Your daily booster allowance equals your level (up to 20). It resets at midnight."
				>
					<span class="opacity-70">Booster packs today</span>
					<span class="font-semibold tabular-nums" class:text-warning={boosters.remaining === 0}>
						{boosters.remaining} / {boosters.level} left
					</span>
				</div>
			{/if}

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
