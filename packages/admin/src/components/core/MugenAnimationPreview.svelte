<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type { MugenAnimationPlayer } from '$utils/mugen/mugen-animation';

	// Folder (relative to the static root) with manifest.json + frame PNGs, and
	// the manifest animation key to loop.
	export let basePath: string;
	export let animation: string;
	// The host box's size, as its own prop rather than part of `classes`: the
	// player fills whatever box it is given, so a caller that only wants a
	// smaller preview replaces this instead of fighting the default with a
	// second, equally specific height/width utility.
	export let size: string = 'h-[180px] w-[180px]';
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ error: unknown }>();

	let host: HTMLDivElement;
	let player: MugenAnimationPlayer | null = null;

	$: hostClasses = classNames('overflow-hidden rounded-box bg-base-300', size, classes);

	onMount(async () => {
		// Import the player lazily so nothing runs during SSR/prerender.
		const { MugenAnimationPlayer } = await import('$utils/mugen/mugen-animation');
		player = new MugenAnimationPlayer({ basePath, animation });
		try {
			await player.start(host);
		} catch (error) {
			dispatch('error', error);
		}
	});

	onDestroy(() => player?.destroy());
</script>

<div bind:this={host} class={hostClasses}></div>
