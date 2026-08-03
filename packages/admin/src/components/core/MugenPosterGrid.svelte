<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type {
		MugenPosterGrid,
		PosterCharacter,
		PosterGridStatus
	} from '$utils/mugen/mugen-poster-grid';

	// The roster to stand up, wound out from the middle in the order it is given.
	export let characters: PosterCharacter[] = [];
	// The widest a hexagon is drawn, in canvas px. A cap and not a size — the field is as
	// many cells across as the roster makes it, and the cell shrinks to fit the page.
	export let maxCellWidth: number = 150;
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
			maxCellWidth,
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
