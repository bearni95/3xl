<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import { ClaimPackScene, type ClaimBooster } from './scene/ClaimPackScene';

	// The show poster used as the pack cover art, or null for a plain frame.
	export let coverUrl: string | null = null;
	// Full name of the place the pack belongs to, overlaid on the poster's top.
	export let locationName: string | null = null;
	// Rolls the booster against Supabase when the pack is sliced open, resolving
	// the claimed character(s) to reveal.
	export let claim: ClaimBooster;
	export let classes: string = '';
	// Fires once the pack is fully sliced and the cards have fanned out.
	export let onOpenComplete: ((revealed: number) => void) | undefined = undefined;

	let host: HTMLDivElement;
	let scene: ClaimPackScene | null = null;

	// Rebuild count after a lost GPU context — see rebuild(); capped so a page that has
	// truly run out of contexts isn't fought in a loop.
	let rebuilds = 0;
	const MAX_REBUILDS = 2;

	function build(): void {
		if (!host) return;
		scene = new ClaimPackScene(
			host,
			{ coverUrl, locationName },
			claim,
			{ onOpenComplete: (revealed) => onOpenComplete?.(revealed), onContextLost: rebuild }
		);
	}

	// The canvas lost its GPU context and the browser never restored it: the renderer
	// will not draw again, so start over on a fresh one rather than leave a blank box.
	function rebuild(): void {
		if (rebuilds >= MAX_REBUILDS || !host?.isConnected) return;
		rebuilds += 1;
		scene?.destroy();
		scene = null;
		build();
	}

	onMount(build);

	onDestroy(() => {
		scene?.destroy();
		scene = null;
	});
</script>

<div bind:this={host} class={classNames('relative h-full w-full overflow-hidden', classes)}></div>
