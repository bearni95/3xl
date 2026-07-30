<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onMount } from 'svelte';
	import { authService } from '$services/auth.service';
	import { signInPanelOpen } from '$services/signInPanel';
	import { achievementsModalOpen } from '$services/achievementsModal';
	import { spawnService } from '$services/spawn.service';
	import { claimAchievements, loadAchievements } from '$services/achievements.service';
	import { AuthStatus } from '$types/profile.type';
	import type { Achievement, AchievementAward, AchievementClaim } from '$types/achievement.type';
	import type { FormulaContext } from '$utils/achievement/formula';
	import { renderAchievement } from '$utils/achievement/template';
	import { achievementMet } from '$utils/achievement/requirement';
	import { achievementProgress, progressPercent } from '$utils/achievement/progress';
	import { DAILY_ACHIEVEMENT_COUNT, dailyAchievementIds } from '$utils/achievement/daily';
	import { catalanDayIso, nextCatalanMidnight, shiftDayIso } from '$utils/festes/catalan-day';
	import { achievementExpAward } from '$utils/progression/level';
	import { errorMessage } from '$utils/error/error-message';
	import FullScreenModal from '$components/core/FullScreenModal.svelte';
	import GameIcon from '$components/core/GameIcon.svelte';
	import Countdown from '$components/core/Countdown.svelte';

	// The three badges set for a day, and the ones this player has completed, on the
	// same sheet the roster is drawn on — mounted only while it is up, so the reads
	// below happen on opening and nothing of them outlives the close. The host raises it
	// with `achievementsModalOpen`.
	//
	// There is deliberately no list of every badge the game has: a player is set three a
	// day, and a catalogue of everything beside them made the modal read as a list with
	// three of its rows marked rather than as today's three. What is on screen is what
	// the seed picked for the day being looked at, and what has been earned.
	function close(): void {
		achievementsModalOpen.set(false);
	}

	// Raised when a claim actually granted something, so the host can re-read what a
	// completion moved outside this modal: today's booster allowance.
	const dispatch = createEventDispatcher<{ claimed: void }>();

	const status = authService.status;
	const profile = authService.profile;
	// The player's own cards. Already loaded if the roster has been open; asked for
	// again here because a badge's wording counts them and its requirement is decided
	// on them, and a formula reading an empty roster would quote a number that is
	// simply wrong.
	const spawns = spawnService.spawns;

	let achievements: Achievement[] = [];
	let pool: string[] = [];
	// What Supabase says this player has completed, newest first, and the same thing as
	// a set of ids for the tiles that only ask whether a badge is worn.
	let awards: AchievementAward[] = [];
	let held = new Set<string>();
	// How many badges a day, as Supabase has it. The constant is only what stands until
	// that row has been read.
	let dailyCount = DAILY_ACHIEVEMENT_COUNT;
	// How many towns this player holds — the other half of what a badge can be about,
	// counted in Supabase rather than off the map's holder store, so a badge about
	// territory reads the same whether or not the map behind this has loaded.
	let towns = 0;
	// The level each day's badges are set against, by Catalan day. A target written on
	// `level` is read at the day's level rather than at the level the player is on now,
	// so a badge does not get harder while it is being worked on; opening this pins
	// today's, and it is `claim_achievements` that pinned it.
	let dayLevels = new Map<string, number>();
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
			// The badges, the pool, what is already completed, and the cards their formulas
			// count — together, so nothing on screen is drawn twice.
			await Promise.all([refresh(userId), spawnService.loadSpawns(userId)]);
		} catch (err) {
			error = errorMessage(err);
		} finally {
			loading = false;
		}
	}

	/**
	 * Re-read what Supabase holds, without the spinner. Called again after a claim
	 * lands: the completed list and the experience it paid are the database's, so the
	 * screen is brought up to what is there rather than patched with what was expected.
	 */
	async function refresh(userId: string): Promise<void> {
		const snapshot = await loadAchievements(userId);
		achievements = snapshot.achievements;
		pool = snapshot.pool;
		awards = snapshot.awards;
		held = snapshot.held;
		dailyCount = snapshot.dailyCount;
		towns = snapshot.towns;
		dayLevels = snapshot.dayLevels;
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
				// Both of these landed on rows this browser cannot write: the award ledger
				// and the experience total. Read them back rather than guessing them.
				await Promise.all([refresh(currentUserId), authService.refreshProfile()]);
				// A completion also raised today's booster allowance, on a third row this
				// browser cannot write (`booster_grants`). The panel behind this modal is
				// where that number is shown, so it is told to read it again rather than
				// carrying a cap that went up while it was covered.
				dispatch('claimed');
			}
		} catch (err) {
			claimError = errorMessage(err);
		} finally {
			claiming = false;
		}
	}

	// What the last claim did to today's booster allowance, as the server reported it:
	// one pack per badge completed, plus two for finishing the day's set. Read off the
	// rows rather than worked out here — the amounts are the RPC's, and a browser that
	// added them up would be a second place they were written.
	$: lastClaim = [...claimed.values()].find((row) => row.granted) ?? null;

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

	// The level the day being looked at was set at. A day the player never opened has no
	// pinned level — there was nobody there for it to be pinned for — so it is drawn at
	// the level they are on now, which is what it would be pinned at if they opened it.
	$: dayLevel = dayLevels.get(viewedDay) ?? $profile?.level ?? 0;

	// What a formula reads: the day's level, this player's cards, and the towns they
	// hold. The level is the pinned one rather than the live one, so a target written on
	// it says the same thing all day — the same level `claim_achievements` will read;
	// what the player *has* is live, or a badge could not be progressed on the day it
	// was set.
	$: context = { level: dayLevel, cards: $spawns, towns } satisfies FormulaContext;

	// The day's three, by the same seed the RPC recomputes: who is looking and which
	// Catalan day it is. Nothing is stored — at midnight Europe/Madrid today's three
	// change, which is why the countdown beside them is worth showing.
	$: dayIds = currentUserId
		? dailyAchievementIds(currentUserId, viewedDay, pool, dailyCount)
		: [];
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
			met: achievementMet(achievement, ctx),
			// A badge with no rule is set and shown like any other, and cannot be
			// completed by anybody until one is written for it.
			ruled: !!achievement.requirement?.trim(),
			// How far along it is, for the ones that are not there yet. A reading rather
			// than a rule — the server is told no percentage and computes none — and it
			// never reads 100 for a badge that is not earned.
			percent: progressPercent(achievementProgress(achievement, ctx))
		};
	}

	// The three, dropped to the ones the file can actually draw — a rule synced for a
	// badge that was retired locally has nothing to show, and re-syncing takes it out
	// of the pool.
	$: dayTiles = dayIds
		.map((id) => byId.get(id))
		.filter((achievement): achievement is Achievement => !!achievement)
		.map((achievement) => tile(achievement, context, held));
	/**
	 * The completed section: the award ledger as Supabase keeps it, newest first, each
	 * row paired with the badge it names. A row the file has nothing for is dropped —
	 * a badge retired locally has no glyph and no wording left to draw it with — which
	 * is why the total below is summed off the ledger rather than off these tiles: the
	 * experience was earned whether or not the badge can still be shown.
	 */
	$: completedTiles = awards
		.map((award) => ({ award, achievement: byId.get(award.achievementId) }))
		.filter(
			(entry): entry is { award: AchievementAward; achievement: Achievement } =>
				!!entry.achievement
		)
		.map((entry) => ({ award: entry.award, ...tile(entry.achievement, context, held) }));
	$: completedExp = awards.reduce((total, award) => total + award.expAwarded, 0);
	// What each earned badge actually paid, by badge — `player_achievements.exp_awarded`,
	// which is the experience as it landed rather than what the badge would be worth to
	// this player now. A badge earned three levels ago paid what it paid.
	$: awardedExp = new Map(awards.map((entry) => [entry.achievementId, entry.expAwarded]));

	/**
	 * When an award landed, in the device's own zone — unlike the day of the three
	 * above, this is an instant rather than a calendar date, so the reader's clock is
	 * exactly the right one to read it in.
	 */
	const awardedFormat = new Intl.DateTimeFormat(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	function awardedLabel(iso: string): string {
		const at = new Date(iso);
		return Number.isNaN(at.getTime()) ? '' : awardedFormat.format(at);
	}

	// What one badge would pay right now, mirroring the RPC's arithmetic so the row
	// can say it before the claim does.
	$: award = achievementExpAward($profile?.level ?? 1);
	// Whether there is anything to submit: a badge of today's that is ready and not
	// already worn, which is what the claim button is enabled by. Counted off today's
	// three however far the view has wandered, since those are the only ones a claim can
	// settle.
	//
	// It is this browser's reading that greys the button out, and the server's that
	// decides — so the button is a shortcut past a call that would have come back with
	// three refusals, not a second opinion on the rule. A claim that goes through is
	// still free to be turned down badge by badge.
	$: todayTiles = viewingToday ? dayTiles : [];
	$: readyCount = todayTiles.filter((entry) => entry.ruled && entry.met && !entry.held).length;
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
			     works out to, which is the price of keeping nothing.
			     The arrows and the day's name stand whatever the pool holds. Gating them on
			     there being something to draw meant that a game with no rules synced yet
			     showed no day controls at all, which reads as a missing feature rather than
			     as an empty pool — and the pool is a thing the admin fills, not the player. -->
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
						disabled={claiming || !viewingToday || readyCount === 0}
						title={!viewingToday
							? "Only today's badges can be claimed"
							: readyCount === 0
								? 'Nothing to claim — none of today’s badges is ready'
								: 'Claim the badges you have earned today'}
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

				<!-- What the claim added to today's booster allowance. The numbers are the
				     RPC's own, and the wording only says which of the two paid: a pack per
				     badge, and two more for finishing the day. -->
				{#if lastClaim && lastClaim.boostersGranted > 0}
					<div class="alert alert-success py-2 text-sm">
						<span>
							+{lastClaim.boostersGranted} booster
							{lastClaim.boostersGranted === 1 ? 'pack' : 'packs'} on today's allowance{lastClaim.setCompleted
								? ' — the whole day completed'
								: ''}.
						</span>
					</div>
				{/if}

				{#if pool.length === 0}
					<p class="text-sm opacity-60">
						No badges have reached the game yet — they are authored in the admin and synced.
					</p>
				{:else if dayTiles.length === 0}
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
								<!-- The experience, in the card's top corner: what an earned badge paid
								     — the ledger's own number, not what it would pay today — and what an
								     unearned one is worth. A badge nothing can earn is worth nothing to
								     say, so that corner stays empty for it. -->
								{#if entry.held}
									<span class="ml-auto shrink-0 text-xs text-primary">
										+{(awardedExp.get(entry.achievement.id) ?? outcome?.expAwarded ?? 0).toLocaleString()} exp
									</span>
								{:else if entry.ruled}
									<span class="ml-auto shrink-0 text-xs opacity-70">
										worth {award.toLocaleString()} exp
									</span>
								{/if}
							</div>
							<div class="flex flex-wrap items-center gap-2 text-xs">
								{#if entry.held}
									<span class="badge badge-primary badge-sm">Earned</span>
								{:else if !entry.ruled}
									<!-- Nothing says what earns it yet, so nothing can. -->
									<span class="badge badge-ghost badge-sm">Not available yet</span>
								{:else if entry.met}
									<span class="badge badge-success badge-sm">Ready</span>
								{:else}
									<!-- How far along, as the bar it is: a percentage of a rule that is
									     two amounts compared. The number stays beside it, since a bar
									     says "some" and the player is counting cards. -->
									<progress
										class="progress progress-primary h-2 min-w-24 flex-1"
										value={entry.percent}
										max="100"
									></progress>
									<span class="shrink-0 opacity-70">{entry.percent}%</span>
								{/if}
								{#if outcome && !outcome.granted && !outcome.held && !outcome.met}
									<span class="text-warning">the server says not yet</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- What the player has actually completed, read from Supabase's own ledger
			     rather than worked out here: `player_achievements` is the whole of what the
			     game knows about a completion — which badge, when it landed, and what it
			     paid — and the wording beside it is still the file's, rendered with this
			     player's numbers as they stand now (what they were on the day is not
			     something the row keeps). Newest first, as the query ordered them. -->
			<section class="flex flex-col gap-3">
				<div class="flex flex-wrap items-center gap-3">
					<h3 class="text-base font-semibold">Completed</h3>
					<span class="badge badge-primary badge-sm">{awards.length}</span>
					{#if completedExp > 0}
						<span class="text-xs opacity-60">
							{completedExp.toLocaleString()} exp earned from badges
						</span>
					{/if}
				</div>
				{#if completedTiles.length === 0}
					<p class="text-sm opacity-60">
						Nothing completed yet — claim one of today's when it is ready.
					</p>
				{:else}
					<div class="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each completedTiles as entry (entry.achievement.id)}
							<div
								class="flex items-start gap-3 rounded-box border-2 border-primary bg-base-200/50 p-3"
							>
								<GameIcon name={entry.achievement.icon} size="size-14" />
								<div class="flex min-w-0 flex-col gap-1">
									<span class="font-semibold">{entry.name}</span>
									<span class="text-sm opacity-70">{entry.description}</span>
									<span class="flex flex-wrap items-center gap-2 text-xs opacity-60">
										<span>{awardedLabel(entry.award.awardedAt)}</span>
										{#if entry.award.expAwarded > 0}
											<span>· +{entry.award.expAwarded.toLocaleString()} exp</span>
										{/if}
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}
	</div>
</FullScreenModal>
