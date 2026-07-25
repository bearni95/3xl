<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import type { MugenLineup } from '$utils/mugen/mugen-lineup';

	// One frame folder per slot (null = empty slot), rendered side by side on a
	// single canvas at a shared scale so proportions stay true.
	export let basePaths: (string | null)[] = [];
	export let cellWidth: number = 96;
	export let cellHeight: number = 128;
	export let gap: number = 8;
	export let classes: string = '';

	let host: HTMLDivElement;
	let lineup: MugenLineup | null = null;

	$: wrapperClasses = classNames('inline-flex leading-none', classes);

	async function build(): Promise<void> {
		const { MugenLineup } = await import('$utils/mugen/mugen-lineup');
		lineup = new MugenLineup({ basePaths, cellWidth, cellHeight, gap });
		await lineup.start(host);
	}

	onMount(() => {
		// Import Pixi only in the browser so it never runs during SSR/prerender.
		void build();
	});

	onDestroy(() => lineup?.destroy());
</script>

<div bind:this={host} class={wrapperClasses}></div>
