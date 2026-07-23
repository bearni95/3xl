<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type { Manifest, MugenFrameSheet } from '$utils/mugen/mugen-frame-sheet';

	// Folder (relative to the static root) with manifest.json + frame PNGs.
	export let basePath: string = '/kikyo/frames';
	// Animation names to lay out, in order. Undefined renders every animation the
	// manifest defines.
	export let animations: string[] | undefined = undefined;
	export let scale: number = 1.75;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ ready: Manifest; error: unknown }>();

	// scrollEl scrolls the full sheet; spacer stretches to its size; the Pixi
	// canvas is overlaid on host and panned to follow the scroll (the camera).
	let scrollEl: HTMLDivElement;
	let spacer: HTMLDivElement;
	let host: HTMLDivElement;
	let sheet: MugenFrameSheet | null = null;

	$: wrapperClasses = classNames('relative overflow-hidden rounded-box', classes);

	onMount(async () => {
		// Import Pixi only in the browser so it never runs during SSR/prerender.
		const { MugenFrameSheet } = await import('$utils/mugen/mugen-frame-sheet');
		sheet = new MugenFrameSheet({ basePath, animations, scale });
		try {
			const manifest = await sheet.render({ scrollEl, spacer, host });
			dispatch('ready', manifest);
		} catch (error) {
			dispatch('error', error);
		}
	});

	onDestroy(() => sheet?.destroy());
</script>

<div class={wrapperClasses}>
	<div bind:this={scrollEl} class="h-[70vh] w-full overflow-auto">
		<div bind:this={spacer}></div>
	</div>
	<!-- Canvas overlay; pointer-events pass through so the scroll layer beneath
	     handles wheel and scrollbar interaction. -->
	<div bind:this={host} class="pointer-events-none absolute inset-0"></div>
</div>
