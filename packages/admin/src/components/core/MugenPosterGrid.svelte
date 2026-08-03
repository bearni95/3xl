<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type {
		MugenPosterGrid,
		PosterCharacter,
		PosterGridStatus
	} from '$utils/mugen/mugen-poster-grid';

	// The roster to stand up, in the order it is to be read.
	export let characters: PosterCharacter[] = [];
	// Width of one character's cell in canvas px; its height follows from the board's
	// own ratio, so this is the only size knob there is.
	export let cellWidth: number = 150;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ status: PosterGridStatus; error: unknown }>();

	let host: HTMLDivElement;
	let grid: MugenPosterGrid | null = null;

	$: hostClasses = classNames('w-full overflow-hidden rounded-box', classes);

	onMount(async () => {
		// Import Pixi lazily so nothing runs during SSR/prerender.
		const { MugenPosterGrid } = await import('$utils/mugen/mugen-poster-grid');
		grid = new MugenPosterGrid({
			characters,
			cellWidth,
			onStatus: (status) => dispatch('status', status)
		});
		try {
			await grid.start(host);
		} catch (error) {
			dispatch('error', error);
		}
	});

	onDestroy(() => grid?.destroy());
</script>

<div bind:this={host} class={hostClasses}></div>
