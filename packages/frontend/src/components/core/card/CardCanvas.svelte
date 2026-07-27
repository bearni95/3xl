<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import { CardScene, type CardLayout } from './CardScene';
	import type { CardModel } from '$utils/card/card-model.type';

	// A single card (convenience) — centred and fit to the host.
	export let card: CardModel | null = null;
	// Several cards — packed into a grid. Takes precedence over `card` when set.
	export let cards: CardModel[] | null = null;
	// Max cards per row when rendering a fit-layout grid.
	export let columns: number = 3;
	// Layout mode: 'fit' scales everything to the host; 'grid' lays cards out at a
	// natural, responsive size in a navigable world (pair with `pannable`).
	export let layout: CardLayout = 'fit';
	// Enable map-style pan/zoom navigation (only meaningful in the 'grid' layout).
	export let pannable: boolean = false;
	// Optional per-card tap handler, called with the tapped card's index into the
	// rendered array. When set, cards become interactive (the roster toggles team
	// membership on tap); omit for a display-only canvas.
	export let onCardTap: ((index: number) => void) | undefined = undefined;
	// Recycle-style selection overlay: when `selectionMode` is on, every card whose
	// index isn't in `selectedIndices` is dimmed so the selected ones stand out. The
	// roster drives these to let the player pick cards to recycle; leave them off for
	// a plain canvas.
	export let selectionMode: boolean = false;
	export let selectedIndices: Set<number> = new Set();
	export let classes: string = '';

	let host: HTMLDivElement;
	let scene: CardScene | null = null;

	// Normalise the two convenience props into the array the scene wants.
	$: models = cards ?? (card ? [card] : []);

	// Cards and column count often change after mount (a roster loads its spawns
	// asynchronously), so push updates into the live scene reactively.
	$: scene?.setCards(models, columns);

	// Push selection changes into the live scene (dims unselected cards) without a
	// rebuild, so tapping cards on and off never restarts their idle animations.
	$: scene?.setSelection(selectionMode, selectedIndices);

	onMount(() => {
		if (!host) return;
		scene = new CardScene(host, { cards: models, columns, layout, pannable, onCardTap });
	});

	onDestroy(() => {
		scene?.destroy();
		scene = null;
	});
</script>

<div bind:this={host} class={classNames('relative h-full w-full overflow-hidden', classes)}></div>
