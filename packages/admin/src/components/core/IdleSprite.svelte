<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy } from 'svelte';
	import type { PosterFrame } from '$utils/mugen/mugen-poster-grid';

	// An idle cycle as the poster wall loaded it, played here as plain <img> frames — the
	// same artwork the canvas is drawing, in the document, where a stylesheet reaches it.
	export let frames: PosterFrame[] = [];
	export let classes: string = '';

	// A frame is held for its own MUGEN duration, but a cycle that asks for zero would be a
	// timer calling itself as fast as the browser allows.
	const MIN_FRAME_MS = 16;

	let index = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	// `frames` named here so the cycle restarts when the row is handed a different one;
	// `index` deliberately not, or every tick would re-schedule the one it just ran.
	$: play(frames);

	function play(cycle: PosterFrame[]): void {
		stop();
		index = 0;
		// A single frame is a still, and nothing to step through.
		if (cycle.length > 1) next(cycle);
	}

	function next(cycle: PosterFrame[]): void {
		timer = setTimeout(
			() => {
				index = (index + 1) % cycle.length;
				next(cycle);
			},
			Math.max(MIN_FRAME_MS, cycle[index].duration)
		);
	}

	function stop(): void {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	}

	onDestroy(stop);

	$: frame = frames[index % Math.max(1, frames.length)];
	$: spriteClasses = classNames(
		'h-full w-full object-contain object-bottom [image-rendering:pixelated]',
		classes
	);
</script>

{#if frame}
	<img src={frame.src} alt="" class={spriteClasses} />
{/if}
