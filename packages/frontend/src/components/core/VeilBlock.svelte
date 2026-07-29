<script lang="ts">
	import classNames from 'classnames';

	// One piece of a loading veil: a white rectangle somewhere in the box, tiled with a
	// grid of grey squares, that fades out when whatever it stands in for has arrived.
	//
	// It is a shape and nothing else — it neither knows what is loading nor decides when to
	// go. A surface says where it is and how big, and whoever is doing the loading says
	// when to fade (see IdleSprite, which holds the clock and hands the same `fading` to
	// every piece it puts up). That is what lets several of these read as one veil in
	// pieces rather than as separate placeholders kept in step by luck.

	// Where the rectangle is, as CSS lengths: `left` and `bottom` from the box's own left
	// and bottom edges, then the size. Lengths rather than numbers because the callers do
	// not agree on a unit — a sprite measures itself in pixels it has just measured, a
	// floor tile in shares of the card — and neither is this component's business.
	export let left: string;
	export let bottom: string;
	export let width: string;
	export let height: string;
	// Go. Once this turns true the rectangle fades over VEIL_FADE and does not come back;
	// the caller stops drawing it after that.
	export let fading: boolean = false;

	// The squares: a fixed size in cqw, so every piece of the veil is tiled with the same
	// grid whatever shape it is, and so the grid is a share of the surface rather than a
	// pixel size that would look coarse on a card and fine on a pin. The columns fill the
	// rectangle's width and the rows are as tall as a column is wide, which is what keeps a
	// cell square without either measurement being known here. A single hairline gap lets
	// the white underneath through as grout, which is what makes the tiling read as a grid
	// of squares rather than as one mottled block.
	const GRID =
		'grid grid-cols-[repeat(auto-fill,var(--veil-cell))] auto-rows-[var(--veil-cell)] gap-px';

	// Enough cells to fill the largest rectangle any surface asks for — the tallest sheet a
	// character can have, standing on the floor's baseline, comes to ten columns of nine —
	// and the rest are simply clipped. Cheaper to over-draw a few empty divs than to have
	// the count depend on a width in cqw that only the browser ever works out.
	const CELL_COUNT = 120;

	// The greys, as veils of black over the white rather than a palette of their own: it is
	// the same way the card's other faces are shaded (the bevel's black band, the panel's
	// white ones), and being alpha they dim with the rectangle as it fades instead of
	// staying solid until it goes.
	//
	// Cycled in order, not drawn at random: the same cell is the same grey on every card and
	// on every re-measure, so nothing shimmers while the veil sits there. Eleven of them
	// against a column count that is never eleven, so the sequence slips along by a few
	// cells each row and the grid comes out varied instead of striped.
	const CELL_SHADES = [
		'bg-black/5',
		'bg-black/15',
		'bg-black/10',
		'bg-black/25',
		'bg-black/5',
		'bg-black/20',
		'bg-black/10',
		'bg-black/5',
		'bg-black/15',
		'bg-black/25',
		'bg-black/10'
	];

	const cells = Array.from(
		{ length: CELL_COUNT },
		(_, index) => CELL_SHADES[index % CELL_SHADES.length]
	);

	// The four lengths come through as custom properties: they are measured or derived
	// geometry, and no class can carry a number only known at runtime. `duration-300` is
	// IdleSprite's VEIL_FADE said in CSS — keep the two the same.
	$: classes = classNames(
		'pointer-events-none absolute overflow-hidden bg-white transition-opacity duration-300',
		'bottom-[var(--veil-bottom)] left-[var(--veil-left)] h-[var(--veil-height)] w-[var(--veil-width)]',
		'[--veil-cell:10cqw]',
		GRID,
		fading ? 'opacity-0' : 'opacity-100'
	);
</script>

<!-- Nothing is written on it and it is not the picture it stands in for, so it is hidden
	from a screen reader, which is being read the surface's own label. -->
<div
	class={classes}
	style:--veil-left={left}
	style:--veil-bottom={bottom}
	style:--veil-width={width}
	style:--veil-height={height}
	aria-hidden="true"
>
	{#each cells as shade}
		<div class={shade}></div>
	{/each}
</div>
