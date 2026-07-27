<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { ClaimPackGridScene } from './scene/ClaimPackGridScene';
	import type { OpenerPack } from './scene/opener-view.type';

	// The day's booster packs, one per celebrating place, laid out in the grid.
	export let packs: OpenerPack[] = [];
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ select: OpenerPack; openComplete: void }>();

	let host: HTMLDivElement;
	let scene: ClaimPackGridScene | null = null;

	// Pick a pack by id — used by the DOM festes list so a list click drives the same
	// centre + zoom + cut as tapping the pack on the canvas.
	export function selectPack(id: string): void {
		scene?.selectPack(id);
	}

	onMount(() => {
		if (!host) return;
		scene = new ClaimPackGridScene(host, packs, {
			onSelect: (pack) => dispatch('select', pack),
			onOpenComplete: () => dispatch('openComplete')
		});
	});

	onDestroy(() => {
		scene?.destroy();
		scene = null;
	});
</script>

<div bind:this={host} class={classNames('relative h-full w-full overflow-hidden', classes)}></div>
