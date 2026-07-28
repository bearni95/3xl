<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { ClaimPackGridScene } from './scene/ClaimPackGridScene';
	import type { OpenerPack } from './scene/opener-view.type';

	// The day's booster packs, one per celebrating place, laid out in the grid.
	export let packs: OpenerPack[] = [];
	// How many packs a row holds. Three suits a full-width canvas; a narrow host (the
	// map's side panel) asks for fewer so each pack still reads. Read once, at mount.
	export let columns: number = 3;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ select: OpenerPack; openComplete: void }>();

	let host: HTMLDivElement;
	let scene: ClaimPackGridScene | null = null;
	// False until every pack is baked and the grid is laid out — drives the spinner
	// that covers the canvas while it builds.
	let ready = false;

	// Pick a pack by id — used by the DOM festes list so a list click drives the same
	// centre + zoom + cut as tapping the pack on the canvas.
	export function selectPack(id: string): void {
		scene?.selectPack(id);
	}

	onMount(() => {
		if (!host) return;
		scene = new ClaimPackGridScene(
			host,
			packs,
			{
				onReady: () => (ready = true),
				onSelect: (pack) => dispatch('select', pack),
				onOpenComplete: () => dispatch('openComplete')
			},
			columns
		);
	});

	onDestroy(() => {
		scene?.destroy();
		scene = null;
	});
</script>

<div class={classNames('relative h-full w-full overflow-hidden', classes)}>
	<div bind:this={host} class="h-full w-full"></div>

	{#if !ready}
		<div
			class="absolute inset-0 flex items-center justify-center bg-base-200/80"
			aria-busy="true"
		>
			<span class="loading loading-spinner loading-lg text-primary"></span>
		</div>
	{/if}
</div>
