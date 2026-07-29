<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy } from 'svelte';
	import {
		loadIdleClip,
		placeIdleClip,
		type IdleClipFrame
	} from '$utils/mugen/idle-clip';

	// One character's looping idle animation, drawn in the document: an <img> per
	// frame, stacked in the box and swapped on the clip's own timings. It stands the
	// character up at exactly the size a card would (see `placeIdleClip`), but costs no
	// WebGL context — which is what makes it the right thing for the small surfaces
	// where a whole canvas would be more than the picture is worth.

	// The character's frames folder (e.g. `/assets/<id>/frames`); null draws nothing.
	export let basePath: string | null = null;
	// Static portrait, shown when the character ships no idle clip — the same fallback
	// the card makes. Null leaves the box empty.
	export let faceUrl: string | null = null;
	// What the picture is of, for anyone not looking at it.
	export let label: string = '';
	// Mirror the character horizontally — the normal look for the player's own cards.
	export let flipped: boolean = true;
	export let classes: string = '';

	// The box the clip is placed in, measured rather than assumed: the caller sizes it
	// however it likes and the fit follows.
	let boxWidth = 0;
	let boxHeight = 0;

	let frames: IdleClipFrame[] | null = null;
	let frameIndex = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

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
		const clip = await loadIdleClip(path);
		// A different character may have come forward while this one was loading.
		if (path !== loadedPath) return;
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

	// Every frame's box in the measured space. Recomputed as the box resizes, which is
	// all a resize costs — nothing reloads and the animation keeps its place.
	$: placement =
		frames && boxWidth > 0 && boxHeight > 0
			? placeIdleClip(frames, { width: boxWidth, height: boxHeight }, flipped)
			: null;

	// Pixel art: keep the upscaled frames crisp rather than smoothed, matching the
	// nearest-neighbour sampling the canvases draw them with. The frame boxes come
	// through as custom properties — a placement is measured geometry, not styling,
	// and there is no class that can carry a number only known at runtime.
	// The white rectangle is an outline, not a border: it is drawn outside the box
	// without taking any of it, so the frame is still exactly the size the fit gave it.
	$: frameClasses = classNames(
		'pointer-events-none absolute bottom-[var(--sprite-bottom)] left-[var(--sprite-left)]',
		'h-[var(--sprite-height)] w-[var(--sprite-width)] max-w-none [image-rendering:pixelated]',
		'outline outline-white',
		{ '-scale-x-100': flipped }
	);
</script>

<div
	class={classNames('relative h-full w-full overflow-hidden', classes)}
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
				style:--sprite-bottom="{placement.bottom}px"
				style:--sprite-width="{frame.width}px"
				style:--sprite-height="{frame.height}px"
			/>
		{/each}
	{:else if faceUrl}
		<img
			src={faceUrl}
			alt=""
			class={classNames('absolute inset-0 m-auto max-h-full max-w-full object-contain', {
				'-scale-x-100': flipped
			})}
		/>
	{/if}
</div>
