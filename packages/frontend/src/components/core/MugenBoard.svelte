<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import type { BoardGrid, MugenBoard } from '$utils/mugen/mugen-board';

	// The two 3x3 grids to render, each with its colour and centre character.
	export let grids: [BoardGrid, BoardGrid];
	export let cellSize: number = 120;
	export let depth: number = 760;
	export let farRatio: number = 0.97;
	export let padding: number = 40;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ ready: MugenBoard; error: unknown }>();

	let host: HTMLDivElement;
	let board: MugenBoard | null = null;

	$: wrapperClasses = classNames('inline-flex overflow-hidden rounded-box leading-none', classes);

	onMount(async () => {
		// Import Pixi only in the browser so it never runs during SSR/prerender.
		const { MugenBoard } = await import('$utils/mugen/mugen-board');
		board = new MugenBoard({ grids, cellSize, depth, farRatio, padding });
		try {
			await board.start(host);
			dispatch('ready', board);
		} catch (error) {
			dispatch('error', error);
		}
	});

	onDestroy(() => board?.destroy());
</script>

<div bind:this={host} class={wrapperClasses}></div>
