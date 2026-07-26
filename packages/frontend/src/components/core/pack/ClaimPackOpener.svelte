<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import { ClaimPackScene } from './scene/ClaimPackScene';
	import type { ClaimPull } from './scene/pull.type';

	// The show poster used as the pack cover art, or null for a plain frame.
	export let coverUrl: string | null = null;
	// Pack label — the show name shown across the top of the pack.
	export let label: string = '';
	// The claimed character(s) revealed once the pack is sliced open.
	export let pulls: ClaimPull[] = [];
	export let classes: string = '';
	// Fires once the pack is fully sliced and the cards have fanned out.
	export let onOpenComplete: (() => void) | undefined = undefined;

	let host: HTMLDivElement;
	let scene: ClaimPackScene | null = null;

	onMount(() => {
		if (!host) return;
		scene = new ClaimPackScene(
			host,
			{ coverUrl, label },
			pulls,
			{ onOpenComplete: () => onOpenComplete?.() }
		);
	});

	onDestroy(() => {
		scene?.destroy();
		scene = null;
	});
</script>

<div bind:this={host} class={classNames('relative h-full w-full overflow-hidden', classes)}></div>
