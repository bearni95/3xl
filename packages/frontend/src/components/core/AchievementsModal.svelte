<script lang="ts">
	import { onMount } from 'svelte';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { achievementsModalOpen } from '$services/achievementsModal';
	import { spawnService } from '$services/spawn.service';
	import { loadAchievements } from '$services/achievements.service';
	import { AuthStatus } from '$types/profile.type';
	import type { Achievement } from '$types/achievement.type';
	import type { FormulaContext } from '$utils/achievement/formula';
	import { renderAchievement } from '$utils/achievement/template';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import GameIcon from '$components/core/GameIcon.svelte';

	// The badges the game has, on the same sheet the roster is drawn on — mounted
	// only while it is up, so the read below happens on opening and nothing of it
	// outlives the close. The host raises it with `achievementsModalOpen`.
	function close(): void {
		achievementsModalOpen.set(false);
	}

	const status = authService.status;
	const profile = authService.profile;
	// The player's own cards. Already loaded if the roster has been open; asked for
	// again here because a badge's wording can count them, and a formula reading an
	// empty roster would quote a number that is simply wrong.
	const spawns = spawnService.spawns;

	let achievements: Achievement[] = [];
	let loading = false;
	let error = '';
	// Guards the one-time load so the reactive block below doesn't refire on a tick.
	let loadedForUser: string | null = null;

	onMount(() => authService.init());

	$: currentUserId = $status === AuthStatus.SignedIn && $profile ? String($profile.id) : null;
	$: if (currentUserId && currentUserId !== loadedForUser) {
		loadedForUser = currentUserId;
		load(currentUserId);
	}

	async function load(userId: string): Promise<void> {
		loading = true;
		error = '';
		try {
			// The badges and the cards their formulas count, together — the list is
			// Supabase's, the wording the authored file's (see achievements.service).
			const [entries] = await Promise.all([loadAchievements(), spawnService.loadSpawns(userId)]);
			achievements = entries;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// What a formula reads: this player's level and this player's cards. The level is
	// derived from their stored experience, so it needs nothing fetched of its own.
	$: context = { level: $profile?.level ?? 0, cards: $spawns } satisfies FormulaContext;

	// Each badge as this player reads it: a name and a line with their own numbers in
	// place of the braces the author wrote. A badge with no variables renders as its
	// authored text, so every entry goes through the same call.
	$: rendered = achievements.map((achievement) => ({
		achievement,
		...renderAchievement(achievement, context)
	}));
</script>

<FullScreenModal title="Achievements" closeLabel="Close achievements" on:close={close}>
	<div class="flex min-h-0 flex-1 flex-col">
		{#if !authService.configured}
			<div class="alert alert-warning text-sm">
				<span>Sign-in is unavailable — Supabase is not configured.</span>
			</div>
		{:else if $status === AuthStatus.Loading}
			<div class="flex justify-center py-12">
				<span class="loading loading-spinner loading-md"></span>
			</div>
		{:else if $status !== AuthStatus.SignedIn}
			<div class="card max-w-md bg-base-200">
				<div class="card-body gap-4">
					<p class="text-sm opacity-70">Sign in to see the badges you can earn.</p>
					<!-- The sign-in card is in the map's own panel, behind this modal, so the
					     prompt hands the screen back to it rather than stacking another one. -->
					<button
						class="btn btn-primary btn-sm w-fit"
						on:click={() => {
							close();
							signInPanelOpen.set(true);
						}}
					>
						Sign in
					</button>
				</div>
			</div>
		{:else if error}
			<div class="alert alert-error text-sm"><span>{error}</span></div>
		{:else if loading}
			<div class="flex items-center gap-2 text-sm opacity-70">
				<span class="loading loading-spinner loading-xs"></span>
				Loading achievements…
			</div>
		{:else if rendered.length === 0}
			<p class="text-sm opacity-60">There are no achievements yet.</p>
		{:else}
			<!-- One tile per badge, in the order Supabase handed them over: the glyph on
			     the dark tile it needs (GameIcon), then the name and the line saying what
			     earns it. The grid is what scrolls, so the title bar stays put however many
			     badges there are. -->
			<div
				class="grid min-h-0 grid-cols-1 content-start gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
			>
				{#each rendered as { achievement, name, description } (achievement.id)}
					<div class="flex items-start gap-3 rounded-box bg-base-200 p-3">
						<GameIcon name={achievement.icon} size="size-14" />
						<div class="flex min-w-0 flex-col gap-1">
							<span class="font-semibold">{name}</span>
							<span class="text-sm opacity-70">{description}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</FullScreenModal>
