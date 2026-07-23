<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type { MugenAnimationPlayer } from '$utils/mugen/mugen-animation';

	// Folder (relative to the static root) with manifest.json + frame PNGs, and
	// the manifest animation key to loop.
	export let basePath: string;
	export let animation: string;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ error: unknown }>();

	let host: HTMLDivElement;
	let player: MugenAnimationPlayer | null = null;

	$: hostClasses = classNames(
		'h-[180px] w-[180px] overflow-hidden rounded-box bg-base-300',
		classes
	);

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
