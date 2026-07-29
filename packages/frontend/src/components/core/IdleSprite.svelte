<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy } from 'svelte';
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

	// The veil: a white rectangle the size the sheet is about to be, held over the
	// picture until the picture is actually there (see the markup). It is up from the
	// moment the geometry is known, comes down once every frame has loaded, and the
	// three states are one thing rather than two flags because the order matters — up,
	// then fading, then not drawn at all.
	//
	// It holds a moment after the frames are ready before it starts to go, so the
	// uncovering is a deliberate reveal of a finished picture rather than a race with
	// the last frame's first paint.
	const VEIL_HOLD = 300;
	// As long again to fade. Written twice — the class below carries the same number,
	// CSS taking no variable for a duration — so change the two together.
	const VEIL_FADE = 300;

	let veil: 'up' | 'fading' | 'down' = 'up';
	let veilTimer: ReturnType<typeof setTimeout> | null = null;

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

	/** Hold the veil over the finished picture, then fade it out and stop drawing it. */
	function uncover(): void {
		if (veil !== 'up' || veilTimer) return;
		veilTimer = setTimeout(() => {
			veil = 'fading';
			veilTimer = setTimeout(() => {
				veil = 'down';
				veilTimer = null;
			}, VEIL_FADE);
		}, VEIL_HOLD);
	}

	/** Put it back up, for a character whose picture is not there yet. */
	function cover(): void {
		if (veilTimer) clearTimeout(veilTimer);
		veilTimer = null;
		veil = 'up';
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

	// The picture is up: the geometry is settled and every frame the sheet holds has
	// loaded. Only then does the veil begin to come down — a placement on its own says
	// where the character will be, not that it is there yet.
	$: ready = placement !== null && loadedFrames >= placement.frames.length;
	$: if (ready) uncover();

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

	// The veil is placed off the same four properties as a frame, being the same kind of
	// measured box, and is never mirrored: a plain rectangle has no side to it. `duration-300`
	// is VEIL_FADE said in CSS — keep the two the same.
	$: veilClasses = classNames(
		'pointer-events-none absolute bottom-[var(--sprite-bottom)] left-[var(--sprite-left)]',
		'h-[var(--sprite-height)] w-[var(--sprite-width)] bg-white transition-opacity duration-300',
		veil === 'fading' ? 'opacity-0' : 'opacity-100'
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
			them and no frame of the loop ever arrives late. -->
		{#each placement.frames as frame, index}
			<img
				src={frame.url}
				alt=""
				class={classNames(frameClasses, { hidden: index !== frameIndex })}
				style:--sprite-left="{frame.left}px"
				style:--sprite-bottom="{frame.bottom}px"
				style:--sprite-width="{frame.width}px"
				style:--sprite-height="{frame.height}px"
				on:load={() => (loadedFrames += 1)}
				on:error={() => (loadedFrames += 1)}
			/>
		{/each}

		{#if veil !== 'down'}
			<!-- The veil, last in the box so it covers the frames: a white rectangle exactly
				the sheet the clip is about to sweep out, standing where the character will
				stand. It goes up as soon as that box is known — which is before any frame's
				art has arrived — so the card shows the character's own footprint while it
				loads instead of the floor showing through, and every frame that pops in as it
				decodes does so behind it. Nothing is written on it and it is not the picture,
				so it is hidden from a screen reader, which is being read the box's own label. -->
			<div
				class={veilClasses}
				style:--sprite-left="{placement.sheet.left}px"
				style:--sprite-bottom="{placement.sheet.bottom}px"
				style:--sprite-width="{placement.sheet.width}px"
				style:--sprite-height="{placement.sheet.height}px"
				aria-hidden="true"
			></div>
		{/if}
	{/if}
</div>
