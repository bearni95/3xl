<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type { Manifest, MugenPlayer } from '$utils/mugen/mugen-player';

	// Folder (relative to the static root) produced by
	// scripts/generate-kikyo-sprites.js — holds manifest.json + frame PNGs.
	export let basePath: string = '/assets/kikyo/frames';
	export let width: number = 640;
	export let height: number = 360;
	export let scale: number = 2.5;
	export let speed: number = 90;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ ready: Manifest; error: unknown }>();

	let host: HTMLDivElement;
	let player: MugenPlayer | null = null;

	$: wrapperClasses = classNames('inline-flex overflow-hidden rounded-box leading-none', classes);

	onMount(async () => {
		// Import Pixi only in the browser so it never runs during SSR/prerender.
		const { MugenPlayer } = await import('$utils/mugen/mugen-player');
		player = new MugenPlayer({ basePath, scale, speed });
		try {
			const manifest = await player.start(host, width, height);
			dispatch('ready', manifest);
		} catch (error) {
			dispatch('error', error);
		}
	});

	onDestroy(() => player?.destroy());
</script>

<div bind:this={host} class={wrapperClasses}></div>
