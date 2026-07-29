<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import VeilBlock from '$components/core/VeilBlock.svelte';
	import BoosterBox, { PACK_STOCK } from './BoosterBox.svelte';
	import { SpawnBox } from '$types/character-spawn.type';
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

	// Which pack the state above belongs to. `selected` is the host's to change too,
	// so the reset is driven off a change in it rather than off the picking.
	let shown: string | null = null;
	$: if (selected !== shown) {
		shown = selected;
		pulls = null;
		opening = false;
		clearVeil();
	}

	// Opening a pack is the box turning into a grid of squares of its own card and that grid
	// blurring away onto what was inside it. The squares are the ones a character's art arrives
	// behind — VeilBlock's, on IdleSprite's clock (hold, then a sweep up the rows) — so the box
	// breaks into the same grid the cards do, at the size of a box rather than of a card, and
	// what it uncovers is a row of statues whose colours are still arriving behind grids of
	// their own. One grid at two scales, twice over.
	//
	// The three states are one thing rather than two flags because the order matters: up, then
	// leaving, then not drawn at all.
	let veil: 'up' | 'fading' | 'down' = 'down';
	// Whether the grid has finished blurring itself in, which it says for itself (see
	// VeilBlock). Nothing comes down before then: a roll answered within a frame or two of the
	// tap would otherwise turn the grid round halfway in, which reads as a flicker rather than
	// as a reveal.
	let veilShown = false;
	let veilTimer: ReturnType<typeof setTimeout> | null = null;
	// The reveal's own width, measured: the grid is handed its squares in pixels, having to
	// count rows and columns off them.
	let bodyWidth = 0;

	// How long the grid holds over the finished cards before it starts to go, and how long it
	// takes to leave. The second is VeilBlock's whole sweep — this stops drawing the grid at the
	// end of it, so a sweep that ran longer would be cut off mid-blur, and its blur and its
	// stagger are what add up to this. IdleSprite holds the same two numbers for the same
	// reason: a pack and a sprite are uncovered by one animation on one clock.
	const VEIL_HOLD = 300;
	const VEIL_FADE = 1000;
	// How big a square is, as a share of the reveal's width — the tenth a statue's own veil
	// takes of the card it covers. A pack stood up is about as wide as the space it stands in,
	// so a tenth of that space is a tenth of the box: the same grid, drawn at the size of the
	// thing it is breaking up.
	const VEIL_CELL = 0.1;

	// What the squares are painted: the tone the box's own lid is, the plane the player was
	// just looking down at. It is the step furthest off the stock, which is what a grid needs to
	// be read as squares at all — VeilBlock shades its cells in black, and black over black card
	// is one flat block with no grid in it (see PACK_STOCK, where the four tones of each stock
	// are set). A pack of a town de festa today is a white box and breaks into a white grid.
	$: veilFill = PACK_STOCK[selectedPack?.today ? SpawnBox.White : SpawnBox.Black].top;

	/** The grid is all there. If the roll is already back, the hold starts now. */
	function onVeilShown(): void {
		veilShown = true;
		uncover();
	}

	/** Blur the grid away and stop drawing it once the sweep up its rows is over, after a beat
	 * holding it over the finished cards. Whichever of the two lands last — the grid arriving or
	 * the roll answering — is what starts that beat. */
	function uncover(): void {
		if (veil !== 'up' || !veilShown || !pulls || veilTimer) return;
		veilTimer = setTimeout(() => {
			veil = 'fading';
			veilTimer = setTimeout(() => {
				veil = 'down';
				veilTimer = null;
			}, VEIL_FADE);
		}, VEIL_HOLD);
	}

	/** No grid and no clock — for a pack stood back down, another coming forward, or a roll
	 * that never answered. */
	function clearVeil(): void {
		if (veilTimer) clearTimeout(veilTimer);
		veilTimer = null;
		veil = 'down';
		veilShown = false;
	}

	onDestroy(clearVeil);

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
		// The grid goes up on the tap and not on the answer: the tap is the box coming apart,
		// and whatever the roll takes is time the grid spends standing there — which is why
		// there is no spinner over it any more. A box dimmed under a spinner said a tap had
		// landed; a box that has broken into squares of its own card says it and says what is
		// about to happen next.
		veil = 'up';
		veilShown = false;
		try {
			const cards = await pack.claim();
			// Another pack came forward while the roll was in flight — its cards are
			// not this one's to show.
			if (shown !== id) return;
			pulls = cards;
			dispatch('openComplete', cards.length);
			// The cards are up behind the grid and their art is already loading under it, so the
			// grid may start to leave — once it is all the way in.
			uncover();
		} finally {
			if (shown === id) {
				opening = false;
				// The roll threw rather than answering with cards, so there is nothing to uncover:
				// the grid comes back down onto the sealed box rather than standing over a pack
				// that never opened. Why is the host's to say, as every other refusal is.
				if (!pulls) clearVeil();
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

		<!-- The sealed box and the cards it opens onto share one box, and it is the grid that
			makes them share it: the grid has to outlast the box it breaks up, and it has to cover
			the whole of what it uncovers. A grid the size of the box alone would have the cards
			standing around it while it was still up, since a pack stood up fills one of the two
			measurements of this space and the cards fill both — so the reveal is measured off what
			is revealed, and the grid is the box's stock spread over it. -->
		<div
			class="relative flex min-h-0 min-w-0 flex-1 flex-col"
			bind:clientWidth={bodyWidth}
			aria-busy={opening}
		>
			{#if pulls}
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

							Nothing is done to the box while the roll is out: it is under the grid by then,
							and dimming a thing that cannot be seen only shows through the squares as they
							blur in. -->
						<BoosterBox
							coverUrl={selectedPack.coverUrl}
							logoUrl={selectedPack.logoUrl}
							showId={selectedPack.showId}
							locationName={selectedPack.locationName}
							light={selectedPack.today}
							classes="h-[min(100%,100cqw*1.23333)]"
						/>
					</button>
				</div>
			{/if}

			{#if veil !== 'down' && bodyWidth > 0}
				<!-- The grid, last in the box so it covers whichever of the two is standing there.
					It spans the whole of this space — the room the cards are about to take — and its
					squares are a tenth of its width, so the box comes apart into the same grid a
					character's art arrives behind and the two reveals are one animation seen at two
					sizes. What it looks like is VeilBlock's; this only says where it is, what it is
					printed on and when to leave. -->
				<VeilBlock
					left="0px"
					bottom="0px"
					width="100%"
					height="100%"
					cell={bodyWidth * VEIL_CELL}
					fill={veilFill}
					fading={veil === 'fading'}
					on:shown={onVeilShown}
				/>
			{/if}
		</div>
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
