<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import BoosterBox from './BoosterBox.svelte';
	import type { OpenerPack } from './scene/opener-view.type';
	import type { ClaimPull } from './scene/pull.type';

	// The booster window's packs, in the document rather than on a canvas, on three
	// states that are the same three taps they have always been:
	//   — every pack on offer at cell width, in two grids: the towns of festa today,
	//     printed on white card, then the rest of the window on black;
	//   — one pack stood up on its own, filling the height it is given, when it is
	//     picked;
	//   — the cards it held, as statues, when the stood-up pack is tapped again — the
	//     tap that fires the roll, so the spawn is still persisted at open time.
	// Nothing here holds a GPU context, so a whole day's packs and the cards they open
	// onto cost the page nothing beyond the images themselves.

	export let packs: OpenerPack[] = [];
	// How many packs a row holds, and how many columns the opened cards stand in.
	// Both are the host's call — a panel a third of the viewport wide asks for fewer
	// than a full-width page would.
	export let columns: number = 2;
	export let revealColumns: number = 2;
	// False shows the packs but opens none of them — the allowance is spent, so a pack
	// would only slice open onto nothing.
	export let interactive: boolean = true;
	// The pack standing on its own, by id, or null for the grid. Bindable, because a
	// host may stand one up itself (clicking a town's box on the map picks its pack) and must
	// follow along when the player picks another here.
	export let selected: string | null = null;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{
		select: OpenerPack;
		back: void;
		openComplete: number;
	}>();

	// The cards the standing pack revealed, or null while it is still sealed. Dropped
	// whenever a different pack comes forward, so a pack never opens onto the last
	// one's cards.
	let pulls: ClaimPull[] | null = null;
	// True while the roll is in flight — the pack is already tapped, and a second tap
	// must not fire a second claim.
	let opening = false;
	// The tap has landed and the box is taking its lid off (see BoosterBox, which breaks the top
	// into a grid of squares of its own card and dissolves them). It is not the same thing as the
	// roll being out: the dissolve is the box's own animation and holds through a roll that
	// answers inside it, which is why the cards wait on `unsealed` and not on `pulls` alone —
	// swapping them in the moment the server replied would cut the top off mid-crumble.
	let unsealing = false;
	// The lid is off: the box says so itself, once the last of it has gone.
	let unsealed = false;

	// Which pack the state above belongs to. `selected` is the host's to change too,
	// so the reset is driven off a change in it rather than off the picking.
	let shown: string | null = null;
	$: if (selected !== shown) {
		shown = selected;
		pulls = null;
		opening = false;
		unsealing = false;
		unsealed = false;
	}

	$: selectedPack = selected ? (packs.find((pack) => pack.id === selected) ?? null) : null;

	// The grid state shows the packs in two, the towns of festa today first. Each keeps the
	// order the panel handed them in, which is the calendar's — the split only lifts today
	// out of the middle of that list, it does not re-sort either half.
	$: todayPacks = packs.filter((pack) => pack.today);
	$: windowPacks = packs.filter((pack) => !pack.today);

	// Tailwind only emits the column classes it can see spelled out, so the counts a
	// host may ask for are written in full here.
	const COLUMN_CLASSES: Record<number, string> = {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-4'
	};
	const columnClass = (count: number): string =>
		COLUMN_CLASSES[Math.min(4, Math.max(1, Math.round(count)))];

	function pick(pack: OpenerPack): void {
		selected = pack.id;
		dispatch('select', pack);
	}

	function back(): void {
		selected = null;
		dispatch('back');
	}

	// Slice the standing pack open: roll its booster and stand up whatever it gives.
	// A refusal resolves to no cards at all — the host is the one that says why (it
	// holds the claim panel the refusal is reported on), so this only reports how many
	// came out, zero included.
	async function open(): Promise<void> {
		const pack = selectedPack;
		if (!pack || opening || pulls) return;
		const id = pack.id;
		opening = true;
		// The lid comes off on the tap and not on the answer: the tap is the box being opened, and
		// whatever the roll takes is time the opened box stands there.
		unsealing = true;
		unsealed = false;
		try {
			const cards = await pack.claim();
			// Another pack came forward while the roll was in flight — its cards are
			// not this one's to show.
			if (shown !== id) return;
			pulls = cards;
			dispatch('openComplete', cards.length);
		} finally {
			if (shown === id) {
				opening = false;
				// The roll threw rather than answering with cards: the lid goes back on, since a box
				// that opened onto nothing at all never opened. Why is the host's to say, as every
				// other refusal is.
				if (!pulls) {
					unsealing = false;
					unsealed = false;
				}
			}
		}
	}
</script>

<div class={classNames('flex min-h-0 flex-col gap-3', classes)}>
	{#if selectedPack}
		<!-- One pack, stood up: it takes the whole height it is given, and the tap that
			opens it is the pack itself. Once it is open the cards stand in its place. -->
		<div class="flex flex-none justify-end">
			<button type="button" class="btn btn-ghost btn-xs" on:click={back}>
				Tots els sobres
			</button>
		</div>

		<!-- The cards stand where the box stood, once there are cards *and* the box has finished
			taking its lid off: a roll that answers inside the dissolve waits for it, since what
			opens a pack is the top coming apart and half of that is not an opening. -->
		{#if pulls && unsealed}
			{#if pulls.length}
				<!-- The cards keep their own height and pack to the top of the box: rows left
					to take a share of whatever height is spare would stand five cards at two
					different sizes, and a row of statues has to read as one row. -->
				<div
					class={classNames(
						'grid min-h-0 flex-1 content-start gap-2 overflow-y-auto',
						columnClass(revealColumns)
					)}
				>
					{#each pulls as pull (pull.spawn.id)}
						<CharacterStatue
							label={pull.label}
							basePath={pull.basePath}
							color={pull.color}
							box={pull.spawn.box}
							locationName={pull.locationName}
							spawnedAt={pull.spawnedAt}
							showId={pull.spawn.showId}
						/>
					{/each}
				</div>
			{:else}
				<!-- The pack sliced open onto nothing. Why is the host's to say — every
					refusal lands on its claim panel — so this only keeps the box from
					reading as a pack that never opened. -->
				<div class="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
					<p class="max-w-xs text-sm opacity-60">El sobre s'ha obert buit.</p>
				</div>
			{/if}
		{:else}
			<!-- A container, so the box standing in it can be capped by this width as well as by
				this height. `max-w-full` cannot do that job: an absolute max on the box resolves
				against the button, and the button has already grown to whatever width the box asked
				for, so the pair overflow together — measured at a sidebar's width, a box given the
				full height came out 392px wide in a 230px panel. -->
			<div class="@container relative flex min-h-0 min-w-0 flex-1 justify-center">
				<button
					type="button"
					class={classNames('flex min-h-0 min-w-0 items-center justify-center', {
						'cursor-wait': opening,
						'cursor-pointer': !opening && interactive
					})}
					disabled={!interactive || opening}
					aria-label="Obre el sobre"
					on:click={open}
				>
					<!-- Stood up, the pack fills whichever of the two the box runs out of first: as
						tall as the space allows, unless the width allows less, in which case it is as
						tall as this width earns it at the box's own 30:37 (1.23333 of a width). The
						ratio is the box's, so this only says which measurement decides — and it has to
						be said as a height, since that is the one the box does not work out for itself.
						`items-center` on the button matters as much as the cap: a flex item is stretched
						to its line by default, and a stretched height beats a height read off the
						aspect, which is what left the box a tall thin slab of the panel's full height
						rather than a box.

						The tap tells it to take its lid off and it says when the lid is gone; nothing is
						dimmed while that is happening, a box coming apart being its own answer to having
						been tapped. Only a roll still out after the last of the top has gone falls back on
						the dimmed-and-spinning wait, which is what a box with its lid off and nothing yet
						to show is really doing. -->
					<BoosterBox
						coverUrl={selectedPack.coverUrl}
						logoUrl={selectedPack.logoUrl}
						showId={selectedPack.showId}
						locationName={selectedPack.locationName}
						light={selectedPack.today}
						opening={unsealing}
						classes={classNames('h-[min(100%,100cqw*1.23333)]', {
							'opacity-60': opening && unsealed
						})}
						on:opened={() => (unsealed = true)}
					/>
				</button>

				{#if opening && unsealed}
					<!-- The roll is slower than the box was: the top has gone and there is still
						nothing to put where it was, so the dissolve gives way to the plain wait it used
						to be. Not before then — a spinner over a box mid-crumble is two things saying
						the same thing, and only one of them is the box. -->
					<div class="absolute inset-0 flex items-center justify-center" aria-busy="true">
						<span class="loading loading-spinner loading-lg text-primary"></span>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<!-- Two grids, the towns of festa today above the rest of the window. The window runs
			three days back through four ahead, so most of what is on offer belongs to a festa
			that is over or has not started — the ones happening now were spread through that
			list in date order, which is a reason to look for them rather than a way of being
			shown them. They come out of the list rather than being repeated at the head of it:
			one booster is one box, and the same town offered twice is two tiles that open the
			same pack.

			The split is drawn by the boxes themselves — today's are printed on white card and
			the rest on black — so neither grid needs a heading to say which it is. One scroller
			holds both, so the panel scrolls as one list; each grid packs to its own top, a row
			given a share of the spare height being a row that draws its packs taller than the
			one below it. -->
		<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
			{#each [todayPacks, windowPacks] as group, index (index)}
				{#if group.length > 0}
					<div class={classNames('grid flex-none content-start gap-3', columnClass(columns))}>
						{#each group as pack (pack.id)}
							<button
								type="button"
								class="flex min-w-0 flex-col"
								disabled={!interactive}
								title={pack.label}
								on:click={() => pick(pack)}
							>
								<BoosterBox
									coverUrl={pack.coverUrl}
									logoUrl={pack.logoUrl}
									showId={pack.showId}
									locationName={pack.locationName}
									light={pack.today}
								/>
							</button>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
