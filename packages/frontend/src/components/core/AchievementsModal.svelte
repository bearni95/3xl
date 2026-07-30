<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { achievementsModalOpen } from '$services/achievementsModal';
	import { spawnService } from '$services/spawn.service';
	import { claimAchievements, loadAchievements } from '$services/achievements.service';
	import { AuthStatus } from '$types/profile.type';
	import type { Achievement, AchievementClaim } from '$types/achievement.type';
	import type { FormulaContext } from '$utils/achievement/formula';
	import { renderAchievement } from '$utils/achievement/template';
	import { achievementMet } from '$utils/achievement/requirement';
	import { dailyAchievementIds } from '$utils/achievement/daily';
	import { catalanDayIso, nextCatalanMidnight, shiftDayIso } from '$utils/festes/catalan-day';
	import { achievementExpAward } from '$utils/progression/level';
	import { errorMessage } from '$utils/error/error-message';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import GameIcon from '$components/core/GameIcon.svelte';
	import Countdown from '$components/core/Countdown.svelte';

	// The badges the game has, on the same sheet the roster is drawn on — mounted
	// only while it is up, so the reads below happen on opening and nothing of them
	// outlives the close. The host raises it with `achievementsModalOpen`.
	function close(): void {
		achievementsModalOpen.set(false);
	}

	const status = authService.status;
	const profile = authService.profile;
	// The player's own cards. Already loaded if the roster has been open; asked for
	// again here because a badge's wording counts them and its requirement is decided
	// on them, and a formula reading an empty roster would quote a number that is
	// simply wrong.
	const spawns = spawnService.spawns;

	let achievements: Achievement[] = [];
	let claimable: string[] = [];
	let held = new Set<string>();
	let loading = false;
	let error = '';
	// Guards the one-time load so the reactive block below doesn't refire on a tick.
	let loadedForUser: string | null = null;

	let claiming = false;
	let claimError = '';
	// What the last claim did, by badge id — the server's answer, which is the only
	// one that counts. Cleared when the list reloads under it.
	let claimed = new Map<string, AchievementClaim>();

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
			// The badges, the pool, what is already held, and the cards their formulas
			// count — together, so nothing on screen is drawn twice.
			const [snapshot] = await Promise.all([
				loadAchievements(userId),
				spawnService.loadSpawns(userId)
			]);
			achievements = snapshot.achievements;
			claimable = snapshot.claimable;
			held = snapshot.held;
		} catch (err) {
			error = errorMessage(err);
		} finally {
			loading = false;
		}
	}

	/**
	 * Submit today's three. The request names nothing: which badges are today's,
	 * whether each has been earned and what each pays are the server's to decide (see
	 * `claim_achievements`), so this is the player saying "I have done them" and
	 * nothing more. The answer comes back per badge, and the profile is re-read after
	 * it because the experience landed on a row this browser cannot write.
	 */
	async function claim(): Promise<void> {
		if (claiming || !currentUserId) return;
		claiming = true;
		claimError = '';
		try {
			const rows = await claimAchievements();
			claimed = new Map(rows.map((row) => [row.achievementId, row]));
			if (rows.some((row) => row.granted)) {
				held = new Set([...held, ...rows.filter((row) => row.granted).map((r) => r.achievementId)]);
				await authService.refreshProfile();
			}
		} catch (err) {
			claimError = errorMessage(err);
		} finally {
			claiming = false;
		}
	}

	// What a formula reads: this player's level and this player's cards. The level is
	// derived from their stored experience, so it needs nothing fetched of its own.
	$: context = { level: $profile?.level ?? 0, cards: $spawns } satisfies FormulaContext;

	// Which day is being looked at, as a step from today. The three are a function of
	// the player and the day and nothing else, so any day's are one subtraction away —
	// there is no history to have kept and no future to have generated, which is the
	// whole reason walking through the days costs nothing.
	let dayOffset = 0;

	function stepDay(days: number): void {
		dayOffset += days;
	}

	$: viewedDay = shiftDayIso(catalanDayIso(), dayOffset);
	$: viewingToday = dayOffset === 0;

	// The day's three, by the same seed the RPC recomputes: who is looking and which
	// Catalan day it is. Nothing is stored — at midnight Europe/Madrid today's three
	// change, which is why the countdown beside them is worth showing.
	$: dayIds = currentUserId ? dailyAchievementIds(currentUserId, viewedDay, claimable) : [];
	$: byId = new Map(achievements.map((achievement) => [achievement.id, achievement]));

	/**
	 * How the day being viewed is named: the three days either side of now read as
	 * words, and anything further out as the date itself. Formatted in UTC because
	 * `viewedDay` is a calendar date rather than an instant — read in the device's own
	 * zone, a date west of Greenwich would print as the day before.
	 */
	const dayFormat = new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});

	$: dayLabel =
		dayOffset === 0
			? 'Today'
			: dayOffset === -1
				? 'Yesterday'
				: dayOffset === 1
					? 'Tomorrow'
					: dayFormat.format(new Date(`${viewedDay}T00:00:00Z`));

	/** One badge as a tile reads it: this player's wording, and where it stands. */
	function tile(achievement: Achievement, ctx: FormulaContext, holders: Set<string>) {
		return {
			achievement,
			...renderAchievement(achievement, ctx),
			held: holders.has(achievement.id),
			// A preview, not the verdict: the RPC walks the same rule against rows this
			// browser cannot write, and its answer is what the tile shows after a claim.
			met: achievementMet(achievement, ctx)
		};
	}

	// The three, dropped to the ones the file can actually draw — a rule synced for a
	// badge that was retired locally has nothing to show, and re-syncing takes it out
	// of the pool.
	$: dayTiles = dayIds
		.map((id) => byId.get(id))
		.filter((achievement): achievement is Achievement => !!achievement)
		.map((achievement) => tile(achievement, context, held));
	$: everyTile = achievements.map((achievement) => tile(achievement, context, held));

	// What one badge would pay right now, mirroring the RPC's arithmetic so the row
	// can say it before the claim does.
	$: award = achievementExpAward($profile?.level ?? 1);
	// Whether there is anything to submit: a badge of today's that is ready and not
	// already worn. The button stands whatever the answer, since the server is the one
	// that decides — it just says so. Counted off today's three however far the view has
	// wandered, since those are the only ones a claim can settle.
	$: todayTiles = viewingToday ? dayTiles : [];
	$: readyCount = todayTiles.filter((entry) => entry.met && !entry.held).length;
	// Epoch milliseconds, which is what the countdown reads.
	$: midnight = nextCatalanMidnight().getTime();
</script>

<FullScreenModal title="Achievements" closeLabel="Close achievements" on:close={close}>
	<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
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
		{:else}
			<!-- The day's three: the same three all day, the same three however often this
			     opens, and three others tomorrow. They are not written down anywhere — the
			     pick is a function of who is asking and which Catalan day it is, which is
			     also why the countdown is to midnight Europe/Madrid rather than to the
			     device's own, and why the arrows can walk to any day at all: another day's
			     three are the same subtraction with a different date in it.
			     Only today's can be claimed, whatever is on screen — `claim_achievements`
			     recomputes the day itself and settles that one.
			     A day other than today is drawn from the pool as it stands *now*, since the
			     pool is not history either: authoring a new badge changes what a past day
			     works out to, which is the price of keeping nothing. -->

			{#if claimable.length > 0}
				<section class="flex flex-none flex-col gap-3">
					<div class="flex flex-wrap items-center gap-3">
						<div class="join">
							<button
								class="btn join-item btn-sm"
								type="button"
								aria-label="The day before"
								title="The day before"
								on:click={() => stepDay(-1)}
							>
								‹
							</button>
							<span class="btn no-animation join-item pointer-events-none btn-sm font-semibold">
								{dayLabel}
							</span>
							<button
								class="btn join-item btn-sm"
								type="button"
								aria-label="The day after"
								title="The day after"
								on:click={() => stepDay(1)}
							>
								›
							</button>
						</div>
						{#if viewingToday}
							<span class="text-xs opacity-60">
								new badges in <Countdown until={midnight} />
							</span>
						{:else}
							<!-- One press back to the day that can be acted on, since the arrows are
							     free to have wandered a long way from it. -->
							<button class="btn btn-ghost btn-xs" type="button" on:click={() => (dayOffset = 0)}>
								Back to today
							</button>
							<span class="font-mono text-xs opacity-50">{viewedDay}</span>
						{/if}
						<button
							class="btn btn-primary btn-sm ml-auto"
							type="button"
							disabled={claiming || !viewingToday}
							title={viewingToday
								? 'Claim the badges you have earned today'
								: "Only today's badges can be claimed"}
							on:click={claim}
						>
							{#if claiming}
								<span class="loading loading-spinner loading-xs"></span>
							{/if}
							{readyCount > 0 ? `Claim ${readyCount}` : 'Claim'}
						</button>
					</div>

					{#if claimError}
						<div class="alert alert-error py-2 text-sm"><span>{claimError}</span></div>
					{/if}

					{#if dayTiles.length === 0}
						<p class="text-sm opacity-60">Nothing to show for this day.</p>
					{/if}

					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each dayTiles as entry (entry.achievement.id)}
							{@const outcome = viewingToday ? claimed.get(entry.achievement.id) : undefined}
							<!-- Earned reads in primary, ready to claim in success, and everything
							     else is a card standing on the page like any other. -->
							<div
								class={classNames('flex flex-col gap-2 rounded-box border-2 bg-base-200/50 p-3', {
									'border-primary': entry.held,
									'border-success': !entry.held && entry.met,
									'border-transparent': !entry.held && !entry.met
								})}
							>
								<div class="flex items-start gap-3">
									<GameIcon name={entry.achievement.icon} size="size-14" />
									<div class="flex min-w-0 flex-col gap-1">
										<span class="font-semibold">{entry.name}</span>
										<span class="text-sm opacity-70">{entry.description}</span>
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-2 text-xs">
									{#if entry.held}
										<span class="badge badge-primary badge-sm">Earned</span>
										{#if outcome?.granted}
											<span class="opacity-70">
												+{outcome.expAwarded.toLocaleString()} exp
											</span>
										{/if}
									{:else if entry.met}
										<span class="badge badge-success badge-sm">Ready</span>
										<span class="opacity-70">worth {award.toLocaleString()} exp</span>
									{:else}
										<span class="badge badge-ghost badge-sm">Not yet</span>
										<span class="opacity-70">worth {award.toLocaleString()} exp</span>
									{/if}
									{#if outcome && !outcome.granted && !outcome.held && !outcome.met}
										<span class="text-warning">the server says not yet</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Every badge the game has, in the order Supabase handed them over: the glyph
			     on the dark tile it needs (GameIcon), then the name and the line saying what
			     earns it, with this player's own numbers in them. -->
			<section class="flex flex-col gap-3">
				<h3 class="text-base font-semibold">All badges</h3>
				{#if everyTile.length === 0}
					<p class="text-sm opacity-60">There are no achievements yet.</p>
				{:else}
					<div class="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each everyTile as entry (entry.achievement.id)}
							<div
								class={classNames('flex items-start gap-3 rounded-box bg-base-200/50 p-3', {
									'opacity-60': !entry.held
								})}
							>
								<GameIcon name={entry.achievement.icon} size="size-14" />
								<div class="flex min-w-0 flex-col gap-1">
									<span class="font-semibold">{entry.name}</span>
									<span class="text-sm opacity-70">{entry.description}</span>
									{#if entry.held}
										<span class="badge badge-primary badge-sm w-fit">Earned</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>
</FullScreenModal>
