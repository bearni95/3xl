<script lang="ts">
	import classNames from 'classnames';

	// One piece of a loading veil: a rectangle somewhere in the box, tiled with a grid of
	// grey squares, that goes away square by square when whatever it stands in for has
	// arrived — the bottom row first, then up.
	//
	// It is a shape and nothing else — it neither knows what is loading nor decides when to
	// go. A surface says where it is and how big, and whoever is doing the loading says
	// when to leave (see IdleSprite, which holds the clock and hands the same `fading` to
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
	// How big a square is, in pixels. This one is a number, not a length: the grid counts
	// its own rows and columns off it to know which row a square is in, and no CSS unit
	// will count anything. The caller picks it as a share of the surface, so the grid comes
	// out the same size on a card as on a pin.
	export let cell: number;
	// Go. Once this turns true the squares blur away from the bottom up and do not come
	// back; the caller stops drawing the piece once the sweep is over.
	export let fading: boolean = false;

	// How long one square takes to go, and how far apart the bottom row and the top one
	// start. Half the sweep each, so the whole thing is over in the sum of the two, which
	// is IdleSprite's VEIL_FADE — it stops drawing this at that point, so a sweep that ran
	// longer would be cut off mid-blur. `duration-150` below is VEIL_BLUR_MS said in CSS;
	// keep the three numbers agreeing.
	const VEIL_BLUR_MS = 150;
	const VEIL_STAGGER_MS = 150;

	// How far a square blurs before it is gone, as a share of its own width — the whole
	// point is that the squares dissolve rather than switch off, so the radius is measured
	// against the thing being blurred and not in flat pixels.
	const VEIL_BLUR_SHARE = 0.5;

	// The greys, as veils of black over the white each square carries rather than a palette
	// of their own: it is the same way the card's other faces are shaded (the bevel's black
	// band, the panel's white ones).
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

	// The rectangle's own size, measured rather than worked out: it is given in whatever
	// unit the caller thinks in, and the grid needs pixels to count squares in.
	let boxWidth = 0;
	let boxHeight = 0;

	// Enough squares to cover the rectangle and no more, the last row and column running
	// over the edge rather than stopping short of it — a veil with a bare strip down one
	// side is a veil the picture shows through. What runs over is clipped, and the row that
	// is only partly there is the top one, furthest from where the eye starts.
	$: columns = cell > 0 && boxWidth > 0 ? Math.ceil(boxWidth / cell) : 0;
	$: rows = cell > 0 && boxHeight > 0 ? Math.ceil(boxHeight / cell) : 0;

	// Every square with its grey and the moment it leaves. The bottom row goes at once and
	// each row above it waits a little longer, the whole spread fixed at VEIL_STAGGER_MS
	// however many rows there are: a tall sheet and a short one are uncovered in the same
	// time, which is what keeps every piece of the veil on the one clock.
	$: cells = Array.from({ length: columns * rows }, (_, index) => {
		const rowsFromBottom = rows - 1 - Math.floor(index / columns);
		return {
			shade: CELL_SHADES[index % CELL_SHADES.length],
			delay: rows > 1 ? Math.round((rowsFromBottom / (rows - 1)) * VEIL_STAGGER_MS) : 0
		};
	});

	// The rectangle: a clipped grid of squares of the given size, its rows held to the
	// bottom edge so the one that overruns does it off the top. It has no colour of its own
	// — the squares carry the white, since a single background behind them all could only
	// go at once and the point is that it goes a row at a time.
	//
	// The lengths come through as custom properties: they are measured or derived geometry,
	// and no class can carry a number only known at runtime.
	const GRID =
		'bottom-[var(--veil-bottom)] left-[var(--veil-left)] h-[var(--veil-height)] w-[var(--veil-width)] grid grid-cols-[repeat(var(--veil-columns),var(--veil-cell))] auto-rows-[var(--veil-cell)] content-end';

	// A square: white with its grey laid over it, and a hairline of that white left showing
	// all round as grout, which is what makes the tiling read as a grid of squares rather
	// than as one mottled block. Padding rather than a gap in the grid, so the white is the
	// square's own and blurs away with it — a gap would show the picture through the seams.
	//
	// It blurs as it goes rather than simply fading, and thins as it blurs: blur alone never
	// clears a tiled surface, since it only spreads a square's ink over its neighbours' room
	// and the middle of the block stays as solid as it started, whatever the radius.
	$: cellClasses = classNames(
		'bg-white p-px transition-[filter,opacity] duration-150 delay-[var(--veil-delay)]',
		fading ? 'opacity-0 blur-[var(--veil-blur)]' : 'opacity-100 blur-[0px]'
	);
</script>

<!-- Nothing is written on it and it is not the picture it stands in for, so it is hidden
	from a screen reader, which is being read the surface's own label. -->
<div
	class={classNames('pointer-events-none absolute overflow-hidden', GRID)}
	style:--veil-left={left}
	style:--veil-bottom={bottom}
	style:--veil-width={width}
	style:--veil-height={height}
	style:--veil-cell="{cell}px"
	style:--veil-columns={columns}
	style:--veil-blur="{cell * VEIL_BLUR_SHARE}px"
	bind:clientWidth={boxWidth}
	bind:clientHeight={boxHeight}
	aria-hidden="true"
>
	{#each cells as { shade, delay }}
		<div class={cellClasses} style:--veil-delay="{delay}ms">
			<div class="h-full w-full {shade}"></div>
		</div>
	{/each}
</div>
