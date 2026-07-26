<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import { CardScene } from './CardScene';
	import type { CardModel } from './card-model.type';

	// A single card (convenience) — centred and fit to the host.
	export let card: CardModel | null = null;
	// Several cards — packed into a grid. Takes precedence over `card` when set.
	export let cards: CardModel[] | null = null;
	// Max cards per row when rendering a grid.
	export let columns: number = 3;
	export let classes: string = '';

	let host: HTMLDivElement;
	let scene: CardScene | null = null;

	// Normalise the two convenience props into the array the scene wants.
	$: models = cards ?? (card ? [card] : []);

	onMount(() => {
		if (!host) return;
		scene = new CardScene(host, { cards: models, columns });
	});

	onDestroy(() => {
		scene?.destroy();
		scene = null;
	});
</script>

<div bind:this={host} class={classNames('relative h-full w-full overflow-hidden', classes)}></div>
