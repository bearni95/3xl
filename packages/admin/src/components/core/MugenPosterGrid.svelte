<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import type {
		MugenPosterGrid,
		PosterCharacter,
		PosterGridStatus
	} from '$utils/mugen/mugen-poster-grid';
	import type { CanvasRecording } from '$utils/capture/record-canvas';

	// The roster to stand up, filled outward from the middle in the order it is given.
	export let characters: PosterCharacter[] = [];
	// The widest a hexagon is drawn, in canvas px. A cap and not a size — the field is as
	// many cells across as the roster makes it, and the cell shrinks to fit the page.
	export let maxCellWidth: number = 150;
	// A picture to hang over the three kept cells at the middle of the field. Left out, they
	// are bare blue ground.
	export let centerImage: string = '';
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ status: PosterGridStatus; error: unknown }>();

	let host: HTMLDivElement;
	let grid: MugenPosterGrid | null = null;

	$: hostClasses = classNames('w-full overflow-hidden rounded-box', classes);

	/** Record the wall as it stands and hand back the video file. Null before it is up. */
	export async function record(durationMs: number): Promise<CanvasRecording | null> {
		return grid ? await grid.record(durationMs) : null;
	}

	/** Put every character back on the first frame of its idle. */
	export function rewind(): void {
		grid?.rewind();
	}

	/** A PNG of the wall as it stands. Null before it is up. */
	export async function snapshot(): Promise<Blob | null> {
		return grid ? await grid.snapshot() : null;
	}

	onMount(async () => {
		// Import Pixi lazily so nothing runs during SSR/prerender.
		const { MugenPosterGrid } = await import('$utils/mugen/mugen-poster-grid');
		grid = new MugenPosterGrid({
			characters,
			maxCellWidth,
			centerImage: centerImage || undefined,
			onStatus: (status) => dispatch('status', status)
		});
		try {
			await grid.start(host);
		} catch (error) {
			dispatch('error', error);
		}
	});

	onDestroy(() => grid?.destroy());
</script>

<div bind:this={host} class={hostClasses}></div>
