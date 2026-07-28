<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import { CardScene, type CardLayout } from './CardScene';
	import type { CardModel } from '$utils/card/card-model.type';

	// A single card (convenience) — centred and fit to the host.
	export let card: CardModel | null = null;
	// Several cards — packed into a grid. Takes precedence over `card` when set.
	export let cards: CardModel[] | null = null;
	// Fixed cells drawn before the cards in the 'grid' layout — the roster's active
	// team. A filled entry draws its card, a null one a card-sized empty frame; both
	// are display-only (a tap on them is not a card tap).
	export let slots: (CardModel | null)[] = [];
	// Max cards per row when rendering a fit-layout grid.
	export let columns: number = 3;
	// Layout mode: 'fit' scales everything to the host; 'grid' lays cards out at a
	// natural, responsive size in a navigable world (pair with `pannable`).
	export let layout: CardLayout = 'fit';
	// Enable map-style pan/zoom navigation (only meaningful in the 'grid' layout).
	export let pannable: boolean = false;
	// Horizontally mirror each card's idle art. Defaults to true (the player's normal
	// look); set false for the board's rival variant (original, unmirrored art).
	export let flipped: boolean = true;
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

	// Scroll a grid canvas back to its first row. Exposed for hosts that swap the
	// cards for a different set (the roster's pager) and want the new set to open at
	// the top instead of inheriting the previous scroll offset — call it through
	// `bind:this`.
	export function scrollToTop(): void {
		scene?.scrollToTop();
	}

	// Normalise the two convenience props into the array the scene wants.
	$: models = cards ?? (card ? [card] : []);

	// Cards, column count and slots often change after mount (a roster loads its
	// spawns asynchronously), so push updates into the live scene reactively — in one
	// call, so a change to any of them costs a single rebuild.
	$: scene?.setCards(models, columns, slots);

	// Push selection changes into the live scene (dims unselected cards) without a
	// rebuild, so tapping cards on and off never restarts their idle animations.
	$: scene?.setSelection(selectionMode, selectedIndices);

	onMount(() => {
		if (!host) return;
		scene = new CardScene(host, {
			cards: models,
			slots,
			columns,
			layout,
			pannable,
			flipped,
			onCardTap
		});
	});

	onDestroy(() => {
		scene?.destroy();
		scene = null;
	});
</script>

<div bind:this={host} class={classNames('relative h-full w-full overflow-hidden', classes)}></div>
