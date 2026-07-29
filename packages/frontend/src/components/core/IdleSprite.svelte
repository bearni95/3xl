<script context="module" lang="ts">
	// Every frame the browser has drawn at least once this session, by url — shared by all
	// the sprites on the page and never emptied.
	//
	// A veil is for waiting, and art that has been drawn before is back on screen within
	// the frame, so a sprite that finds all of its own art in here has nothing to wait for
	// and goes up bare. That is what keeps the map quiet: a pin is built from scratch on
	// every zoom and pan (see WorldMap's rebuildMarkers, which unmounts the lot and mounts
	// them again), and a fresh mount cannot tell on its own that it is the same three
	// characters back again — without this, every zoom swept the squares over a picture
	// that was already in hand.
	const drawnFrames = new Set<string>();
</script>

<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy } from 'svelte';
	import VeilBlock from '$components/core/VeilBlock.svelte';
	import {
		loadIdleClip,
		placeIdleClip,
		type IdleClipFrame
	} from '$utils/mugen/idle-clip';
	import { loadRenderScale } from '$utils/mugen/character-render-scale';
	import { DEFAULT_RENDER_SCALE } from '$types/character-definition.type';

	// One character's looping idle animation, drawn in the document: an <img> per
	// frame, stacked in the box and swapped on the clip's own timings, filling whatever
	// it is given (see `placeIdleClip`). It costs no WebGL context — which is what makes
	// it the right thing for the small surfaces where a whole canvas would be more than
	// the picture is worth.

	// The character's frames folder (e.g. `/assets/<id>/frames`); null draws nothing.
	// There is no portrait to fall back on: this is the animation or it is nothing. A
	// still face standing in for a clip that merely failed to load (a dev reload
	// cancelling the fetch, say) reads as a different character rather than as a
	// missing one, and leaves the strip looking half-broken instead of empty.
	export let basePath: string | null = null;
	// What the picture is of, for anyone not looking at it.
	export let label: string = '';
	// Mirror the character horizontally — the normal look for the player's own cards.
	export let flipped: boolean = true;
	// Where the character's feet stand, as a fraction of the box's height up from its
	// bottom edge. 0 (the default) is the bottom itself; a surface that draws a ground
	// plane raises it to the point on that plane the character stands at.
	export let baseline: number = 0;
	// What the loading veil's squares are painted, as a background class — the character's
	// own colour where the surface has one. Passed straight through: a sprite has no palette
	// and no business deriving one, but it is the thing that knows there is a veil at all,
	// and a caller cannot hand a colour to something it never mounts. Defaults to VeilBlock's
	// own white.
	export let veilFill: string | undefined = undefined;
	export let classes: string = '';

	// The box the clip is placed in, measured rather than assumed: the caller sizes it
	// however it likes and the fit follows.
	let boxWidth = 0;
	let boxHeight = 0;

	let frames: IdleClipFrame[] | null = null;
	let frameIndex = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;
	// How much bigger than its own pixels this character's sheet is drawn, from its
	// definition (see loadRenderScale). Loaded with the clip and for the same reason —
	// both are facts about the character's art, and the caller hands over the frames
	// folder that identifies it, not the character.
	let renderScale = DEFAULT_RENDER_SCALE;

	// The veil: a rectangle the size the sheet is about to be, tiled with grey squares that
	// blur themselves into place, held over the picture until the picture is actually there
	// (see the markup). It is drawn from the moment the geometry is known, goes once every
	// frame has loaded, and the three states are one thing rather than two flags because the
	// order matters — up, then leaving, then not drawn at all.
	//
	// It holds a moment after the frames are ready before it starts to go, so the
	// uncovering is a deliberate reveal of a finished picture rather than a race with
	// the last frame's first paint. It is skipped outright for art that has been drawn
	// before (see `drawnFrames` above), there being nothing then to cover.
	const VEIL_HOLD = 300;
	// How long it takes to leave, from the first square blurring to the last. VeilBlock
	// spends it on the sweep up the rows and this stops drawing the veil at the end of it,
	// so a change here is a change there (its blur and its stagger add up to this). A second:
	// the sweep is the picture arriving and is meant to be watched, where the hold above is
	// only the beat between the art being ready and the sweep starting.
	const VEIL_FADE = 1000;
	// How big the veil's squares are, as a share of this box's width. The box is what a
	// character is drawn against, so the grid is a share of the picture and comes out the
	// same on a card as on a pin — and the veil is handed it in pixels, having to count
	// rows and columns off it.
	const VEIL_CELL = 0.1;

	let veil: 'up' | 'fading' | 'down' = 'up';
	let veilTimer: ReturnType<typeof setTimeout> | null = null;
	// Whether the veil has finished blurring itself in, which it says for itself (see
	// VeilBlock). The hold does not begin before then: art already in the browser's cache
	// is ready within a frame or two of the veil going up, and a veil turned round halfway
	// in reads as a flicker rather than as a reveal.
	let veilShown = false;

	// How many of the clip's frames the browser has finished with. Every frame is in
	// the document at once, so the picture is up only when all of them are: the loop
	// reaches its last frame within a cycle of starting, and one still decoding by then
	// would pop into a picture the veil had already uncovered. A frame that errored
	// counts as done too — art that is never going to arrive must not hold the veil
	// over the frames that did.
	let loadedFrames = 0;

	// The character whose clip is loaded (or loading). A change swaps the clip; a
	// repeat of the same path is not a reload, since the clips are cached anyway.
	let loadedPath: string | null | undefined = undefined;
	$: if (basePath !== loadedPath) {
		loadedPath = basePath;
		void load(basePath);
	}

	/** A frame has arrived: it counts towards the picture being up, and it is remembered for
	 * the next surface that draws this character, which will not need a veil at all. A frame
	 * that errored counts but is not remembered — it never drew. */
	function frameDrawn(url: string): void {
		drawnFrames.add(url);
		loadedFrames += 1;
	}

	/** The veil is all there. If the picture was ready before it was, the hold starts now. */
	function onVeilShown(): void {
		veilShown = true;
		if (ready) uncover();
	}

	/** Hold the veil over the finished picture, then send it away and stop drawing it once
	 * the sweep up its rows is over. Not before it is all the way in — whichever of the two
	 * happens last, the picture being ready or the veil arriving, is what starts the hold. */
	function uncover(): void {
		if (veil !== 'up' || !veilShown || veilTimer) return;
		veilTimer = setTimeout(() => {
			veil = 'fading';
			veilTimer = setTimeout(() => {
				veil = 'down';
				veilTimer = null;
			}, VEIL_FADE);
		}, VEIL_HOLD);
	}

	/** Put it back up, for a character whose picture is not there yet. The new veil blurs
	 * itself in from nothing exactly as the first one did, so it is not shown yet either. */
	function cover(): void {
		if (veilTimer) clearTimeout(veilTimer);
		veilTimer = null;
		veil = 'up';
		veilShown = false;
		loadedFrames = 0;
	}

	async function load(path: string | null): Promise<void> {
		stop();
		cover();
		frames = null;
		frameIndex = 0;
		renderScale = DEFAULT_RENDER_SCALE;
		const [clip, scale] = await Promise.all([loadIdleClip(path), loadRenderScale(path)]);
		// A different character may have come forward while this one was loading.
		if (path !== loadedPath) return;
		renderScale = scale;
		frames = clip;
		// Nothing to cover if this character has been drawn before: the veil never goes up at
		// all, rather than going up and being swept off again over a picture that was there
		// the whole time.
		if (clip?.every((frame) => drawnFrames.has(frame.url))) veil = 'down';
		schedule();
	}

	/** Show the next frame when this one is due. A single-frame clip is a still. */
	function schedule(): void {
		stop();
		const clip = frames;
		if (!clip || clip.length < 2) return;
		timer = setTimeout(() => {
			frameIndex = (frameIndex + 1) % clip.length;
			schedule();
		}, clip[frameIndex].duration);
	}

	function stop(): void {
		if (timer) clearTimeout(timer);
		timer = null;
	}

	onDestroy(() => {
		stop();
		if (veilTimer) clearTimeout(veilTimer);
	});

	// The sheet and its frames in the measured space. Recomputed as the box resizes,
	// which is all a resize costs — nothing reloads and the animation keeps its place.
	$: placement =
		frames && boxWidth > 0 && boxHeight > 0
			? placeIdleClip(
					frames,
					{ width: boxWidth, height: boxHeight },
					{ flipped, baseline: boxHeight * baseline, renderScale }
				)
			: null;

	// Where the veil stands: over the sheet's own width, on the baseline, and as tall as the
	// room above it — the whole of what a character can be drawn in here, the fit being
	// measured from that same room (see placeIdleClip). So it is as wide as the picture is
	// going to be and as tall as any picture could be: the width is the one thing already
	// known about a character before its art arrives, since the sheet is the cycle's box and
	// comes off the manifest, while the height it will actually stand to is not worth
	// announcing ahead of it.
	$: veilBox = {
		left: placement?.sheet.left ?? 0,
		bottom: boxHeight * baseline,
		width: placement?.sheet.width ?? 0,
		height: boxHeight * (1 - baseline)
	};

	// The picture is up: the geometry is settled and every frame the sheet holds has
	// loaded. Only then does the veil begin to come down — a placement on its own says
	// where the character will be, not that it is there yet.
	$: ready = placement !== null && loadedFrames >= placement.frames.length;
	$: if (ready) uncover();

	// Whether the character may be drawn at all. Not while the veil is still coming in: its
	// squares are half transparent on the way, so a frame that arrived during the entrance
	// showed through the thing being drawn to cover it. Either the veil is all the way in or
	// there is no veil — art drawn before goes straight up (see `drawnFrames`).
	//
	// The frames are in the document either way and load throughout, so nothing waits on
	// this: it is what may be seen that is held back, not what may be fetched.
	$: sprited = veil === 'down' || veilShown;

	// Each frame is positioned from its four measured numbers, which come through as
	// custom properties: a placement is measured geometry, not styling, and no class can
	// carry a number only known at runtime. Pixel art, so the upscaled frames are kept
	// crisp rather than smoothed, matching the nearest-neighbour sampling the canvases
	// draw them with.
	$: frameClasses = classNames(
		'pointer-events-none absolute bottom-[var(--sprite-bottom)] left-[var(--sprite-left)]',
		'h-[var(--sprite-height)] w-[var(--sprite-width)] max-w-none [image-rendering:pixelated]',
		{ '-scale-x-100': flipped }
	);

</script>

<div
	class={classNames('relative h-full w-full', classes)}
	bind:clientWidth={boxWidth}
	bind:clientHeight={boxHeight}
	role="img"
	aria-label={label}
>
	{#if placement}
		<!-- Every frame is in the document at once and all but the current one is
			hidden, so the browser has them all decoded before the clip first reaches
			them and no frame of the loop ever arrives late. Until the veil is all the
			way in, the current one is hidden too: they are here to be fetched, not yet
			to be looked at. -->
		{#each placement.frames as frame, index}
			<img
				src={frame.url}
				alt=""
				class={classNames(frameClasses, { hidden: !sprited || index !== frameIndex })}
				style:--sprite-left="{frame.left}px"
				style:--sprite-bottom="{frame.bottom}px"
				style:--sprite-width="{frame.width}px"
				style:--sprite-height="{frame.height}px"
				on:load={() => frameDrawn(frame.url)}
				on:error={() => (loadedFrames += 1)}
			/>
		{/each}

		{#if veil !== 'down'}
			<!-- The veil, last in the box so it covers the frames: the room the character is about
				to stand in, standing on the same baseline they will. It goes up as soon as the
				box is measured — which is before any frame's art has arrived — so the card shows
				where the character is coming while it loads instead of the floor showing through,
				and every frame that pops in as it decodes does so behind it. What it looks like is
				VeilBlock's; this only measures it. -->
			<VeilBlock
				left="{veilBox.left}px"
				bottom="{veilBox.bottom}px"
				width="{veilBox.width}px"
				height="{veilBox.height}px"
				cell={boxWidth * VEIL_CELL}
				fill={veilFill}
				fading={veil === 'fading'}
				on:shown={onVeilShown}
			/>
		{/if}
	{/if}
</div>
