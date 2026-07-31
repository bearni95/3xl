<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import TeamLineup, { LINEUP_ROW_SPAN } from '$components/core/TeamLineup.svelte';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';
	import { BoosterBoxGridScene } from './scene/BoosterBoxGridScene';
	import type { OpenerPack } from './scene/opener-view.type';
	import type { ClaimPull } from './scene/pull.type';
	import type { PlayerAvatar as Avatar } from '$types/player-avatar.type';

	// The booster window's boxes, drawn on a canvas instead of in the document — the same two
	// grids, the same boxes, the same gutters (see BoosterBoxGridScene, and BoosterBoxSprite for
	// one box). A box is picked out of the window and stood up by tapping it, and slicing it open
	// is the button under the canvas: a second tap on the same box is not a thing anybody can be
	// told apart from the first, and opening a pack is the one act here that cannot be undone.
	//
	// What it opens onto is *not* on the canvas. A card is a CharacterStatue, which is a document
	// thing with its own art, its own veil and its own tooltip, and there is no reason to have a
	// second one made of sprites: so the cards stand up in a layer of this component's own,
	// underneath a canvas that is transparent, and the box coming apart over them is what
	// uncovers them. The two are one picture in two mediums, stacked.
	//
	// The roll is fired from here rather than from the scene for the same reason: what the roll
	// gives is a document, so the thing that owns the document owns the call.

	export let packs: OpenerPack[] = [];
	// How many boxes a row holds. The host's call, as it is for the document grid — unlike how
	// the cards stand once a box is open, which is not: they come out of the box, so their row is
	// the box's to say (see REVEAL_ROW and `front`).
	export let columns: number = 4;
	// The box standing up, by pack id, or null for the window. Bindable, and bound to the same
	// thing the document grid's is: a click on a town's box out on the map picks a pack, and both
	// drawings of the window stand that one up rather than one of them showing the window it is
	// in. It is set from here too, so picking a box on this canvas is the same pick.
	export let selected: string | null = null;
	// False shows the window but opens nothing — the allowance is spent.
	export let interactive: boolean = true;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{
		select: OpenerPack;
		back: void;
		openComplete: number;
	}>();

	let host: HTMLDivElement;
	let scene: BoosterBoxGridScene | null = null;
	// Bumped when the canvas loses its GPU context for good, which remounts the host and builds
	// the scene again on a fresh one.
	let attempt = 0;

	// What the open gave, and whether the box has started to come apart over it. The cards are
	// stood up the moment the roll answers — behind a box that is still there crazed — so their
	// art is fetched and their pictures are up while the squares are still holding, and it is
	// they that decide when the box may go.
	let pulls: ClaimPull[] | null = null;
	let avatar: Avatar | null = null;
	let uncovering = false;
	// How wide the standing box's front is drawn — the face and the bevel face either side of it,
	// in canvas pixels, said by the scene and said again whenever the box is re-fitted. It is what
	// the cards are laid out in: they stand where the box's picture was, edge to edge with it,
	// rather than filling a canvas the box is only a part of. Null while no box is up.
	let front: number | null = null;
	// The box the button under the canvas would open: one that has finished standing up, on a
	// canvas that is still taking picks. Null the rest of the time, which is what greys the button
	// out — it keeps its room either way, since a control that appears when a box stands up would
	// resize the canvas under the box that had just settled in it.
	let openable: OpenerPack | null = null;

	// The box the rows are handed, which is wider than the front by exactly the 5% a row leaves
	// spare (see LINEUP_ROW_SPAN): the row centres itself in it, so what is drawn spans the front
	// and nothing else has to know how a row shares its width out. It was the mouth of the box
	// before — the hole the cards notionally came out of — which is a good deal narrower than the
	// picture they were standing under, so a card never lined up with the box it came from.
	$: rowWidth = front === null ? null : front / LINEUP_ROW_SPAN;

	// What the button says: the town whose pack is standing, when there is one to name — a button
	// under a canvas is not beside the thing it acts on, so it names it. A pack whose place has no
	// name, and the idle button, both fall back to the bare word.
	$: openLabel = openable?.locationName
		? $_('booster.openPack', { values: { town: openable.locationName } })
		: $_('booster.open');

	// Which cards have their picture up, held as a set of spawn ids rather than counted, so a
	// statue that says it twice cannot count as two and let the box go early.
	let statuesUp = new Set<string>();
	// Nothing waits for ever: a frame that neither loads nor errors would hold a crazed box
	// together for the rest of the session. The cap is not a guess at how long art takes, it is
	// the point at which something has plainly gone wrong.
	const STATUES_WAIT = 4000;
	let statuesTimer: ReturnType<typeof setTimeout> | null = null;

	// What a box opens onto stands in the very row the map's corner and the roster stand a side
	// in (see TeamLineup): three to a row, the middle one wider and lapped over the two beside
	// it. Three, and not the caller's to change — the cards are laid out across the box's front,
	// which is nothing like as wide as the canvas (see `front`), and five across that would be
	// five slivers. So a pull of five is two rows: three, then the two that are left
	// with the avatar the box dealt standing between them, in the cell the row keeps for the
	// one it is about. A face is not a card, and that is the one place in the row it can stand
	// without reading as one.
	const REVEAL_ROW = 3;
	$: revealTop = pulls ? pulls.slice(0, REVEAL_ROW) : [];
	$: revealRest = pulls ? pulls.slice(REVEAL_ROW) : [];

	/** One pull as the row draws a member: the card itself, minus everything only the claim
	 * cared about. */
	const toMember = (pull: ClaimPull) => ({
		label: pull.label,
		basePath: pull.basePath,
		color: pull.color,
		box: pull.spawn.box,
		locationName: pull.locationName,
		spawnedAt: pull.spawnedAt,
		showId: pull.spawn.showId
	});

	/** A row says which of its members has its picture up, counting from its own end; the
	 * row's own cards are what turn that back into the spawn the box is waiting on. */
	function rowStatueUp(row: ClaimPull[], index: number): void {
		const pull = row[index];
		if (pull) statueUp(pull.spawn.id);
	}

	// The window is assembled after mount (the claim panel loads the day's festes), so push
	// changes into the live scene rather than waiting for a remount.
	$: scene?.setPacks(packs, columns, interactive);

	// And the pick along with it, whoever made it. A pick this canvas made itself comes back
	// through here as the id it just set, which the scene answers by doing nothing.
	$: scene?.setSelected(selected);

	// Built off the host element rather than on mount, so the block below coming back after a
	// lost context builds a scene on the new canvas — `bind:this` is what says there is one.
	$: if (host && !scene) build();

	function build(): void {
		scene = new BoosterBoxGridScene(host, {
			packs,
			columns,
			interactive,
			selected,
			onSelect: (pack) => {
				selected = pack.id;
				dispatch('select', pack);
			},
			onBack: () => {
				selected = null;
				clearReveal();
				dispatch('back');
			},
			onOpen: (pack) => void open(pack),
			onOpenable: (pack) => (openable = pack),
			onFront: (width) => (front = width),
			onUncovering: () => (uncovering = true),
			onContextLost: () => {
				scene?.destroy();
				scene = null;
				openable = null;
				clearReveal();
				attempt += 1;
			}
		});
	}

	/**
	 * Roll the box that has just been tapped open and stand up what it gives. The cards go up
	 * behind the box straight away, at nothing opacity: a card taken out of the layout has no
	 * width, a sprite with no width never places its sheet, and a sheet never placed never loads
	 * — the box would be waiting for pictures its own waiting had stopped. Laid out and fetched
	 * as if they were being looked at, they are ready to be uncovered rather than to start
	 * arriving when the squares have gone.
	 */
	async function open(pack: OpenerPack): Promise<void> {
		forgetStatues();
		try {
			const opened = await pack.claim();
			pulls = opened.pulls;
			avatar = opened.avatar;
			dispatch('openComplete', opened.pulls.length);
			// An empty pull is ready at once — there is nothing to stand up, and the box comes
			// apart onto the panel that says so. Otherwise the cap starts with the cards: what it
			// guards against is a picture that never arrives, which cannot happen before there are
			// pictures to wait for.
			if (opened.pulls.length === 0) scene?.uncover();
			else
				statuesTimer = setTimeout(() => {
					statuesTimer = null;
					scene?.uncover();
				}, STATUES_WAIT);
		} catch {
			// The roll threw rather than answering with cards: the box is whole again, since a box
			// that opened onto nothing at all never opened. Why is the host's to say, as every
			// other refusal is.
			clearReveal();
			scene?.seal();
		}
	}

	/** One statue's picture is up; the box may go once they all are. */
	function statueUp(id: string): void {
		statuesUp = new Set(statuesUp).add(id);
		if (pulls && pulls.every((pull) => statuesUp.has(pull.spawn.id))) {
			forgetStatues();
			scene?.uncover();
		}
	}

	function forgetStatues(): void {
		if (statuesTimer) clearTimeout(statuesTimer);
		statuesTimer = null;
		statuesUp = new Set();
	}

	function clearReveal(): void {
		forgetStatues();
		pulls = null;
		avatar = null;
		uncovering = false;
	}

	onDestroy(() => {
		forgetStatues();
		scene?.destroy();
		scene = null;
	});
</script>

<!-- The canvas, and under it the word that opens what is standing on it. The two are one column:
	the canvas takes everything the button leaves, and the button's room is always taken, so a box
	standing up never changes the size of the canvas it settled into. -->
<div class={classNames('flex h-full w-full flex-col gap-3', classes)}>
	{#key attempt}
		<div bind:this={host} class="relative min-h-0 w-full flex-1 overflow-hidden">
			{#if pulls}
				<!-- What the box gave, under the box: a document layer the canvas is laid over (the scene
					pins the canvas above this one, and the canvas draws on nothing). It comes up over the
					second the squares take to dissolve rather than when they have gone, so the crumble
					hands the cards over as it goes instead of ending on a space that then fills itself in.

					Nothing here answers a pointer: the canvas is over it and takes every tap, and a tap is
					what puts the reveal away. -->
				<div
					class={classNames(
						'pointer-events-none absolute inset-0 z-0 flex items-center overflow-y-auto p-2 transition-opacity duration-1000',
						uncovering ? 'opacity-100' : 'opacity-0'
					)}
				>
					{#if pulls.length}
						<!-- Laid out across the box's front and not across the canvas: the cards stand where
							the picture was, edge to edge with it, centred where the box stands — which is the
							middle, always, the scene fitting a stood box to the canvas about its centre. So a
							row of three ends exactly where the poster over it ended, and the lid, being the
							full width of the box, is the one part that stands proud of them. What the box is
							handed is a little wider than that: a row draws 95% of its own width and centres
							itself in it (see LINEUP_ROW_SPAN), so the drawn ends land on the front's. The
							width is a measured length, so it comes through as a custom property; no class can
							carry a number only known at runtime. Until the scene has said one — which cannot
							happen before a box is standing — the layer's own width stands in. -->
						<!-- The cards are bare, and not behind a veil of their own: the box dissolving over
							them is the reveal, and a sprite veil under that would spend a character's one
							reveal on a sweep held behind something opaque. What each says instead is when its
							picture is up, which is what the box is waiting to hear — the row forwards it with
							the place in that row it was said of, and the row's own cards name the spawn. -->
						<div
							class={classNames(
								'mx-auto flex flex-col gap-2',
								rowWidth ? 'w-[var(--row-width)]' : 'w-full'
							)}
							style:--row-width={rowWidth ? `${rowWidth}px` : null}
						>
							<TeamLineup
								members={revealTop.map(toMember)}
								veiled={false}
								classes="justify-center"
								on:ready={(event) => rowStatueUp(revealTop, event.detail.index)}
							/>
							{#if revealRest.length || avatar}
								<!-- The second row, and the avatar in the middle of it. The same component
									either way: with a face to stand there it is handed one, and with none — a
									box that dealt no avatar — the two cards left simply take the front of the
									row, as any short side does. -->
								{#if avatar}
									<TeamLineup
										members={revealRest.map(toMember)}
										veiled={false}
										classes="justify-center"
										on:ready={(event) => rowStatueUp(revealRest, event.detail.index)}
									>
										<!-- The avatar the box dealt: the same component the player's own row
											wears, in the colour it was dealt in, because what is shown is the very
											thing that will be standing there once it is picked — not a picture of
											it. Unnamed, and no card's panel under it: a statue says which character
											it is because a card is a character, and an avatar is a face. -->
										<PlayerAvatar
											slot="middle"
											characterId={avatar.characterId}
											color={avatar.color}
											size="w-full"
											classes="w-full"
										/>
									</TeamLineup>
								{:else}
									<TeamLineup
										members={revealRest.map(toMember)}
										veiled={false}
										classes="justify-center"
										on:ready={(event) => rowStatueUp(revealRest, event.detail.index)}
									/>
								{/if}
							{/if}
						</div>
					{:else}
						<!-- The box sliced open onto nothing. Why is the page's to say — every refusal lands
							on its claim panel — so this only keeps the box from reading as one that never
							opened. -->
						<div class="flex w-full items-center justify-center p-6 text-center">
							<p class="max-w-xs text-sm opacity-60">El sobre s'ha obert buit.</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/key}

	<!-- The one irreversible act in this view, asked for by name. It says which town's pack it
		would open, so a button that is nowhere near the box it acts on still names it. Dead until
		a box has finished standing up: there is nothing to open from the window, from a box that is
		still on its way to the middle, or from one that has already come apart. -->
	<button
		type="button"
		class="btn btn-primary btn-block flex-none"
		disabled={!openable}
		on:click={() => scene?.open()}
	>
		{openLabel}
	</button>
</div>
