<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy } from 'svelte';

	// One piece of a loading veil: a rectangle somewhere in the box, tiled with a grid of
	// grey squares, that blurs itself into place square by square and, when whatever it
	// stands in for has arrived, blurs away again — both times from the bottom row up, and
	// both times with the columns broken up out of order, though not the same order twice.
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
	// What the squares are painted, as a background class. Whatever it is, it is the ground
	// the shading is laid over, so a colour comes back through the greys rather than being
	// replaced by them. White is the default for a surface with no colour to give.
	export let fill: string = 'bg-white';
	// Go. Once this turns true the squares blur away from the bottom up and do not come
	// back; the caller stops drawing the piece once the sweep is over.
	export let fading: boolean = false;

	// Says when every square is in and the veil is at full strength. What put it up waits
	// for this before it counts towards taking it down — a veil caught halfway in and sent
	// straight back out reads as a flicker rather than as a reveal, which is exactly what a
	// character whose art is already in the browser's cache would get.
	const dispatch = createEventDispatcher<{ shown: void }>();

	// How long one square takes to go, how far apart the bottom row and the top one start,
	// and how late a column can be on top of that. The three add up to the whole sweep,
	// which is IdleSprite's VEIL_FADE — it stops drawing this at that point, so a sweep that
	// ran longer would be cut off mid-blur. The rows get the larger share of the waiting:
	// the sweep is up the block, and the columns only break the line it goes up in.
	// `duration-500` below is VEIL_BLUR_MS said in CSS; keep the four numbers agreeing.
	//
	// A second for a sweep, half of it the blur of any one square. The proportions are what
	// they were at a third of the length — the rows still take a little over twice what the
	// columns do — but a square now takes long enough to blur that it can be watched doing
	// it, and the wave up the rows is a wave rather than a flinch.
	const VEIL_BLUR_MS = 500;
	const VEIL_STAGGER_MS = 350;
	const VEIL_COLUMN_MS = 150;

	// The waiting a square can be asked to do, and the whole of a sweep: the last square to
	// start, plus its own blur. Both sweeps are that long, being the same one either way.
	const VEIL_SPREAD_MS = VEIL_STAGGER_MS + VEIL_COLUMN_MS;
	const VEIL_SWEEP_MS = VEIL_SPREAD_MS + VEIL_BLUR_MS;

	// How late each column is, as a share of VEIL_COLUMN_MS — dealt twice over, once for
	// coming in and once for going out, so a column is not the same amount late both times
	// and the wave breaks differently on the way to the picture than on the way from it.
	//
	// Drawn from evenly spaced values and shuffled, rather than taken at random one by one:
	// the whole of the range gets used that way, where independent draws clump and leave the
	// scatter looking like two or three columns going together. Reshuffled while any four
	// columns in a row climb or fall together — a run that long is a diagonal crossing the
	// grid, which is the single thing the scatter exists to break, and the rest of what a
	// shuffle turns up is exactly the disorder wanted.
	//
	// Dealt once, when the block starts, and kept: a re-measure that changes the column count
	// must not redeal the waits under a sweep that is already running. Each block deals for
	// itself, so a row of statues does not break in step.
	const COLUMN_POOL = 16;
	const COLUMN_RUN = 4;

	const columnWaitsIn = dealColumnWaits();
	const columnWaitsOut = dealColumnWaits();

	/** A wait for every column the pool covers, in no order and with no long run in it. */
	function dealColumnWaits(): number[] {
		const waits = Array.from({ length: COLUMN_POOL }, (_, index) => index / (COLUMN_POOL - 1));
		// A shuffle that will not settle is used as it stands: the animation is not worth
		// spinning on, and the odds of eight in a row all carrying a run are vanishing.
		for (let attempt = 0; attempt < 8; attempt += 1) {
			for (let i = waits.length - 1; i > 0; i -= 1) {
				const j = Math.floor(Math.random() * (i + 1));
				[waits[i], waits[j]] = [waits[j], waits[i]];
			}
			if (!hasRun(waits)) break;
		}
		return waits;
	}

	/** Whether COLUMN_RUN columns anywhere in a row all climb or all fall. */
	function hasRun(waits: number[]): boolean {
		for (let start = 0; start + COLUMN_RUN <= waits.length; start += 1) {
			let climbing = true;
			let falling = true;
			for (let i = start + 1; i < start + COLUMN_RUN; i += 1) {
				if (waits[i] <= waits[i - 1]) climbing = false;
				if (waits[i] >= waits[i - 1]) falling = false;
			}
			if (climbing || falling) return true;
		}
		return false;
	}

	// How far a square blurs before it is gone, as a share of its own width — the whole
	// point is that the squares dissolve rather than switch off, so the radius is measured
	// against the thing being blurred and not in flat pixels.
	const VEIL_BLUR_SHARE = 0.5;

	// The shading, as veils of black over whatever a square is painted rather than as greys of
	// its own: it is the same way the card's other faces are shaded (the bevel's black band,
	// the panel's white ones), and it is what lets the squares take the character's colour
	// without this having to know a thing about which six it might be — black over a colour
	// darkens it and leaves it that colour, where a grey would paint it out.
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

	// Every square with its grey and the two moments it moves at. Its row says most of both —
	// the bottom row goes at once and each row above waits a little longer, the whole spread
	// fixed at VEIL_STAGGER_MS however many rows there are, so a tall sheet and a short one
	// are uncovered in the same time and every piece of the veil stays on the one clock — and
	// its column adds the rest, which is what stops a row moving all at once as a band.
	//
	// The row's share is the same coming and going: both sweeps run up the block, the way the
	// character stands. The column's share is the one dealt twice, so the two sweeps break in
	// different places while running the same way.
	$: cells = Array.from({ length: columns * rows }, (_, index) => {
		const rowsFromBottom = rows - 1 - Math.floor(index / columns);
		const rowWait = rows > 1 ? (rowsFromBottom / (rows - 1)) * VEIL_STAGGER_MS : 0;
		const column = (index % columns) % COLUMN_POOL;
		return {
			shade: CELL_SHADES[index % CELL_SHADES.length],
			waitIn: Math.round(rowWait + columnWaitsIn[column] * VEIL_COLUMN_MS),
			waitOut: Math.round(rowWait + columnWaitsOut[column] * VEIL_COLUMN_MS)
		};
	});

	// The squares are drawn hidden and blur themselves in, once there are squares to draw.
	let entered = false;
	let entering = false;
	let shownTimer: ReturnType<typeof setTimeout> | null = null;

	$: if (cells.length > 0) enter();

	function enter(): void {
		if (entering) return;
		entering = true;
		// Two frames, not one: the squares have to have been drawn hidden, and had that
		// drawing settled, before the state that unhides them lands — otherwise the browser
		// has no earlier value to work from and they simply appear.
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				entered = true;
				shownTimer = setTimeout(() => dispatch('shown'), VEIL_SWEEP_MS);
			})
		);
	}

	onDestroy(() => {
		if (shownTimer) clearTimeout(shownTimer);
	});

	// The rectangle: a clipped grid of squares of the given size, its rows held to the
	// bottom edge so the one that overruns does it off the top. It has no colour of its own
	// — the squares carry the fill, since a single background behind them all could only
	// go at once and the point is that it goes a row at a time.
	//
	// The lengths come through as custom properties: they are measured or derived geometry,
	// and no class can carry a number only known at runtime.
	const GRID =
		'bottom-[var(--veil-bottom)] left-[var(--veil-left)] h-[var(--veil-height)] w-[var(--veil-width)] grid grid-cols-[repeat(var(--veil-columns),var(--veil-cell))] auto-rows-[var(--veil-cell)] content-end';

	// A square: the fill with its shading laid over it, and a hairline of the fill left showing
	// all round as grout, which is what makes the tiling read as a grid of squares rather
	// than as one mottled block. Padding rather than a gap in the grid, so the colour is the
	// square's own and blurs away with it — a gap would show the picture through the seams.
	//
	// It blurs as it goes rather than simply fading, and thins as it blurs: blur alone never
	// clears a tiled surface, since it only spreads a square's ink over its neighbours' room
	// and the middle of the block stays as solid as it started, whatever the radius.
	//
	// Blurred and gone is where it starts as well as where it ends — one state, left and then
	// returned to, which is what makes the entrance and the exit the same animation run
	// towards opposite ends rather than two written to match.
	$: cellClasses = classNames(
		'p-px transition-[filter,opacity] duration-500 delay-[var(--veil-delay)]',
		fill,
		!entered || fading ? 'opacity-0 blur-[var(--veil-blur)]' : 'opacity-100 blur-[0px]'
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
	{#each cells as { shade, waitIn, waitOut }}
		<!-- Whichever wait belongs to the way this square is going. It is coming in until it is
			told to leave, and there is one transition either way, so the wait is swapped under it
			at the moment the state it is heading for changes. -->
		<div class={cellClasses} style:--veil-delay="{fading ? waitOut : waitIn}ms">
			<div class="h-full w-full {shade}"></div>
		</div>
	{/each}
</div>
