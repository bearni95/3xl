<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import type { BoardGrid, MugenBoard } from '$utils/mugen/mugen-board';

	// The board's two halves, each with its colour and lead character.
	export let grids: [BoardGrid, BoardGrid];
	// Both mirror the engine's own defaults (see MugenBoardOptions), so the board looks
	// the same whether a host says anything about its size or not.
	export let cellSize: number = 280;
	export let padding: number = 40;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ ready: MugenBoard; error: unknown }>();

	let host: HTMLDivElement;
	let board: MugenBoard | null = null;

	// Full-width, centred host so the canvas (max-width:100%, height:auto) can scale
	// down to the viewport on small screens instead of forcing horizontal overflow.
	$: wrapperClasses = classNames(
		'flex w-full min-w-0 justify-center overflow-hidden rounded-box leading-none',
		classes
	);

	onMount(async () => {
		// Import Pixi only in the browser so it never runs during SSR/prerender.
		const { MugenBoard } = await import('$utils/mugen/mugen-board');
		board = new MugenBoard({ grids, cellSize, padding });
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
