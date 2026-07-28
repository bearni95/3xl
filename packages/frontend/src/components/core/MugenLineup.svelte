<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import type { MugenLineup } from '$utils/mugen/mugen-lineup';
	import { SPAWN_COLOR_HEX } from '$utils/spawn/color';
	import type { SpawnColor } from '$types/character-spawn.type';

	// One frame folder per slot (null = empty slot), rendered side by side on a
	// single canvas, each height-normalised like the board and mirrored.
	export let basePaths: (string | null)[] = [];
	// Per-slot spawn colour (aligned with basePaths); paints that slot's backdrop.
	export let colors: (SpawnColor | null)[] = [];
	export let cellWidth: number = 96;
	export let cellHeight: number = 128;
	export let gap: number = 8;
	export let classes: string = '';

	let host: HTMLDivElement;
	let lineup: MugenLineup | null = null;

	$: wrapperClasses = classNames('inline-flex leading-none', classes);
	$: cellColors = colors.map((color) => (color ? SPAWN_COLOR_HEX[color] : null));

	// Slot changes — a pick added or removed, or a different team coming forward —
	// are pushed into the live lineup. Rebuilding the component instead would spend a
	// WebGL context per change, and the browser only allows a handful at once.
	$: lineup?.setMembers(basePaths, cellColors);

	async function build(): Promise<void> {
		const { MugenLineup } = await import('$utils/mugen/mugen-lineup');
		lineup = new MugenLineup({ basePaths, cellColors, cellWidth, cellHeight, gap });
		await lineup.start(host);
	}

	onMount(() => {
		// Import Pixi only in the browser so it never runs during SSR/prerender.
		void build();
	});

	onDestroy(() => lineup?.destroy());
</script>

<div bind:this={host} class={wrapperClasses}></div>
