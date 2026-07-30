<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type { FrameCell, Manifest, MugenFrameSheet } from '$utils/mugen/mugen-frame-sheet';

	// Folder (relative to the static root) with manifest.json + frame PNGs.
	export let basePath: string = '/assets/kikyo/frames';
	// Animation names to lay out, in order. Undefined renders every animation the
	// manifest defines.
	export let animations: string[] | undefined = undefined;
	export let scale: number = 1.75;
	// Whether each filmstrip cell carries a button asking for that frame to be
	// deleted. Off by default: the button belongs on the sheet only where a parent
	// handles `delete` by actually removing the frame (and calls reload()).
	export let deletable: boolean = false;
	// Blocks every delete button — for a parent whose write is still in flight.
	export let disabled: boolean = false;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ ready: Manifest; error: unknown; delete: FrameCell }>();

	// scrollEl scrolls the full sheet; spacer stretches to its size; the Pixi
	// canvas is overlaid on host and panned to follow the scroll (the camera).
	// overlay rides above the canvas under that same camera, so the delete buttons
	// sit on their cells at every scroll offset.
	let scrollEl: HTMLDivElement;
	let spacer: HTMLDivElement;
	let host: HTMLDivElement;
	let overlay: HTMLDivElement;
	let sheet: MugenFrameSheet | null = null;
	let cells: FrameCell[] = [];

	$: wrapperClasses = classNames('relative overflow-hidden rounded-box', classes);

	// How far inside a cell's top-right corner its button sits. Inside, not
	// straddling the corner: each row's header line runs just above its cells, and a
	// button that hung over the edge would sit on that text.
	const CELL_INSET = 3;

	/**
	 * Where a cell's button goes is measured geometry, not design: the sheet gives
	 * it in its own pixels, so it is assigned here while Tailwind keeps the look.
	 * `left` is the cell's right edge; the button is pulled back inside it by its
	 * own width (`-translate-x-full`).
	 */
	function place(node: HTMLElement, cell: FrameCell) {
		const apply = (target: FrameCell) => {
			node.style.left = `${target.x + target.width - CELL_INSET}px`;
			node.style.top = `${target.y + CELL_INSET}px`;
		};
		apply(cell);
		return { update: apply };
	}

	/**
	 * Scroll the sheet from a wheel that landed on a button. The scrolling element
	 * is this layer's *sibling*, not an ancestor, so a wheel over a control would
	 * otherwise bubble past it and scroll the page instead of the filmstrip.
	 */
	function forwardWheel(event: WheelEvent): void {
		if (!scrollEl) return;
		scrollEl.scrollLeft += event.deltaX;
		scrollEl.scrollTop += event.deltaY;
		event.preventDefault();
	}

	async function build(restore?: { left: number; top: number }): Promise<void> {
		// Import Pixi only in the browser so it never runs during SSR/prerender.
		const { MugenFrameSheet } = await import('$utils/mugen/mugen-frame-sheet');
		sheet = new MugenFrameSheet({ basePath, animations, scale });
		try {
			const manifest = await sheet.render({ scrollEl, spacer, host, overlay });
			// Put the viewport back before reading the cells, so the camera (which the
			// scroll handler moves) and the buttons land together.
			if (restore) {
				scrollEl.scrollLeft = restore.left;
				scrollEl.scrollTop = restore.top;
			}
			cells = sheet.cells;
			dispatch('ready', manifest);
		} catch (error) {
			dispatch('error', error);
		}
	}

	/**
	 * Re-read the manifest and draw the sheet again, keeping the viewport where it
	 * is. For a parent that has just changed what the manifest holds: a removed
	 * frame changes its animation's frame count and every row's geometry below it,
	 * so nothing short of a rebuild is right.
	 */
	export async function reload(): Promise<void> {
		if (!sheet) return;
		const restore = { left: scrollEl.scrollLeft, top: scrollEl.scrollTop };
		sheet.destroy();
		sheet = null;
		cells = [];
		await build(restore);
	}

	onMount(() => {
		void build();
	});

	onDestroy(() => sheet?.destroy());
</script>

<div class={wrapperClasses}>
	<div bind:this={scrollEl} class="h-[70vh] w-full overflow-auto">
		<div bind:this={spacer}></div>
	</div>
	<!-- Canvas overlay; pointer-events pass through so the scroll layer beneath
	     handles wheel and scrollbar interaction. -->
	<div bind:this={host} class="pointer-events-none absolute inset-0"></div>
	<!-- Controls layer: clipped to the viewport, panned by the sheet's camera, and
	     transparent to pointers except on the buttons themselves. -->
	<div
		class="pointer-events-none absolute inset-0 overflow-hidden"
		on:wheel|nonpassive={forwardWheel}
	>
		<div bind:this={overlay} class="absolute top-0 left-0">
			{#if deletable}
				{#each cells as cell (`${cell.animation}:${cell.index}`)}
					<button
						type="button"
						use:place={cell}
						class="btn btn-circle btn-error btn-xs pointer-events-auto absolute -translate-x-full"
						disabled={disabled || cell.frameCount < 2}
						title={cell.frameCount < 2
							? 'An animation must keep at least one frame'
							: `Delete frame #${cell.index} of ${cell.animation}`}
						on:click={() => dispatch('delete', cell)}
					>
						✕
					</button>
				{/each}
			{/if}
		</div>
	</div>
</div>
