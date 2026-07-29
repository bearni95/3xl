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

	// The character whose clip is loaded (or loading). A change swaps the clip; a
	// repeat of the same path is not a reload, since the clips are cached anyway.
	let loadedPath: string | null | undefined = undefined;
	$: if (basePath !== loadedPath) {
		loadedPath = basePath;
		void load(basePath);
	}

	async function load(path: string | null): Promise<void> {
		stop();
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

	onDestroy(stop);

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
			/>
		{/each}
	{/if}
</div>
