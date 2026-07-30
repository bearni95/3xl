<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';
	import { BoosterBoxGridScene } from './scene/BoosterBoxGridScene';
	import type { OpenerPack } from './scene/opener-view.type';
	import type { ClaimPull } from './scene/pull.type';
	import type { PlayerAvatar as Avatar } from '$types/player-avatar.type';

	// The booster window's boxes, drawn on a canvas instead of in the document — the same two
	// grids, the same boxes, the same gutters (see BoosterBoxGridScene, and BoosterBoxSprite for
	// one box) — and the same three taps: a box is picked out of the window, stood up, and sliced
	// open.
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
	// the box's to say (see REVEAL_COLUMNS and `opening`).
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
	let avatarIsNew = false;
	let uncovering = false;
	// How wide the box that is standing has its mouth: the back end of its tilted top, in canvas
	// pixels, said by the scene and said again whenever the box is re-fitted. It is what the cards
	// are laid out in — they came out of that opening — so they stand centred in it rather than
	// filling a canvas the box is only a part of. Null while no box is up.
	let opening: number | null = null;

	// Which cards have their picture up, held as a set of spawn ids rather than counted, so a
	// statue that says it twice cannot count as two and let the box go early.
	let statuesUp = new Set<string>();
	// Nothing waits for ever: a frame that neither loads nor errors would hold a crazed box
	// together for the rest of the session. The cap is not a guess at how long art takes, it is
	// the point at which something has plainly gone wrong.
	const STATUES_WAIT = 4000;
	let statuesTimer: ReturnType<typeof setTimeout> | null = null;

	// How many cards a row of the reveal holds. Three, and not the caller's to change: what a box
	// opens onto is laid out in the mouth of the box, which is nothing like as wide as the canvas
	// (see `opening`), and five across that would be five slivers.
	const REVEAL_COLUMNS = 'grid-cols-3';

	// A cell of the reveal, ringed in the primary when the card is one the collection did not
	// hold. A border either way and never none, so a row with one repeat in it does not sit a
	// hair out of line with the rest.
	const cellClasses = (isNew: boolean): string =>
		classNames('flex rounded-md border-2', isNew ? 'border-primary' : 'border-transparent');

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
			onOpening: (width) => (opening = width),
			onUncovering: () => (uncovering = true),
			onContextLost: () => {
				scene?.destroy();
				scene = null;
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
			avatarIsNew = opened.avatarIsNew;
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
		avatarIsNew = false;
		uncovering = false;
	}

	onDestroy(() => {
		forgetStatues();
		scene?.destroy();
		scene = null;
	});
</script>

{#key attempt}
	<div bind:this={host} class={classNames('relative h-full w-full overflow-hidden', classes)}>
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
					<!-- Laid out in the mouth of the box and not across the canvas: as wide as the back
						end of the box's tilted top, centred where the box stands — which is the middle,
						always, the scene fitting a stood box to the canvas about its centre. The width
						is a measured length, so it comes through as a custom property; no class can
						carry a number only known at runtime. Until the scene has said one — which
						cannot happen before a box is standing — the layer's own width stands in. -->
					<div
						class={classNames(
							'mx-auto grid gap-2',
							REVEAL_COLUMNS,
							opening ? 'w-[var(--opening)]' : 'w-full'
						)}
						style:--opening={opening ? `${opening}px` : null}
					>
						{#each pulls as pull (pull.spawn.id)}
							<div class={cellClasses(pull.isNew)}>
								<!-- Bare, and not behind a veil of its own: the box dissolving over it is the
									reveal, and a sprite veil under that would spend a character's one reveal on a
									sweep held behind something opaque. What it says instead is when its picture
									is up, which is what the box is waiting to hear. -->
								<CharacterStatue
									label={pull.label}
									basePath={pull.basePath}
									color={pull.color}
									box={pull.spawn.box}
									locationName={pull.locationName}
									spawnedAt={pull.spawnedAt}
									showId={pull.spawn.showId}
									veiled={false}
									classes="w-full min-w-0"
									on:ready={() => statueUp(pull.spawn.id)}
								/>
							</div>
						{/each}

						{#if avatar}
							<div class={cellClasses(avatarIsNew)}>
								<!-- The avatar the box dealt, in the cell after the last card: the same
									component the player's own row wears, in the colour it was dealt in, because
									what is shown is the very thing that will be standing there once it is
									picked. -->
								<PlayerAvatar
									characterId={avatar.characterId}
									color={avatar.color}
									size="w-full"
									classes="w-full"
								/>
							</div>
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
