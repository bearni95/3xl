<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import type { FaceCrop } from '$types/character-definition.type';
	import { clampFaceCrop } from '$utils/mugen/face-crop';

	// The portrait being framed and the square framed on it. Coordinates are the
	// sprite's own pixels, which is exactly what the SVG viewBox makes them: the
	// picture is drawn at its natural size, so pointer maths needs no scaling
	// beyond the box the browser lays the SVG out in.
	export let src: string;
	export let width: number;
	export let height: number;
	export let crop: FaceCrop;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ change: FaceCrop }>();

	// A square smaller than this is unusable as an avatar and impossible to grab.
	const MIN_SIZE = 8;

	let svgEl: SVGSVGElement;
	// The gesture in flight: which handle was grabbed, where it was grabbed, and
	// the square as it stood then — deltas apply to that, not to the live crop.
	let drag: { mode: 'move' | 'resize'; startX: number; startY: number; origin: FaceCrop } | null =
		null;

	// The largest square this sprite can hold, and so the range slider's ceiling.
	$: maxSize = Math.max(MIN_SIZE, Math.min(Math.round(width), Math.round(height)));
	// Grab handle, big enough to hit on a small portrait but never larger than the
	// square it resizes.
	$: handle = Math.max(6, Math.min(crop.size / 4, Math.round(maxSize / 8)));
	// Everything outside the square, dimmed: the sprite's box with the crop
	// punched out of it (even-odd fill).
	$: shadePath =
		`M0 0H${width}V${height}H0Z ` +
		`M${crop.x} ${crop.y}H${crop.x + crop.size}V${crop.y + crop.size}H${crop.x}Z`;

	function emit(next: FaceCrop): void {
		dispatch('change', clampFaceCrop(next, width, height));
	}

	// Pointer position in sprite pixels. The SVG carries the viewBox's aspect
	// ratio, so its box is never letterboxed and the two axes share one scale.
	function spritePoint(event: PointerEvent): { x: number; y: number } {
		const box = svgEl.getBoundingClientRect();
		return {
			x: ((event.clientX - box.left) / box.width) * width,
			y: ((event.clientY - box.top) / box.height) * height
		};
	}

	function start(mode: 'move' | 'resize', event: PointerEvent): void {
		const point = spritePoint(event);
		drag = { mode, startX: point.x, startY: point.y, origin: { ...crop } };
		svgEl.setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent): void {
		if (!drag) return;
		const point = spritePoint(event);
		const dx = point.x - drag.startX;
		const dy = point.y - drag.startY;
		if (drag.mode === 'move') {
			emit({ ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy });
		} else {
			// The square keeps its top-left corner; the far corner follows whichever
			// axis the pointer pushed further, so it stays square.
			emit({ ...drag.origin, size: Math.max(MIN_SIZE, drag.origin.size + Math.max(dx, dy)) });
		}
	}

	function end(event: PointerEvent): void {
		if (!drag) return;
		drag = null;
		svgEl.releasePointerCapture(event.pointerId);
	}

	function resize(event: Event): void {
		const size = Number((event.currentTarget as HTMLInputElement).value);
		// Grow from the centre so a resize keeps framing the same thing.
		const delta = (size - crop.size) / 2;
		emit({ x: crop.x - delta, y: crop.y - delta, size });
	}
</script>

<div class={classNames('flex shrink-0 flex-col items-center gap-1', classes)}>
	<svg
		bind:this={svgEl}
		class={classNames('h-40 w-auto touch-none rounded-box bg-base-300', {
			'cursor-grabbing': drag !== null
		})}
		viewBox={`0 0 ${width} ${height}`}
		role="presentation"
		on:pointermove={move}
		on:pointerup={end}
		on:pointercancel={end}
	>
		<image href={src} x="0" y="0" width={width} height={height} />
		<path d={shadePath} fill="black" fill-opacity="0.55" fill-rule="evenodd" />
		<rect
			x={crop.x}
			y={crop.y}
			width={crop.size}
			height={crop.size}
			fill="transparent"
			stroke="white"
			stroke-width={Math.max(1, maxSize / 100)}
			class="cursor-grab"
			role="presentation"
			on:pointerdown={(event) => start('move', event)}
		/>
		<rect
			x={crop.x + crop.size - handle}
			y={crop.y + crop.size - handle}
			width={handle}
			height={handle}
			fill="white"
			fill-opacity="0.8"
			class="cursor-nwse-resize"
			role="presentation"
			on:pointerdown={(event) => start('resize', event)}
		/>
	</svg>

	<input
		type="range"
		class="range range-xs w-40"
		min={MIN_SIZE}
		max={maxSize}
		value={crop.size}
		aria-label="Avatar square size"
		on:input={resize}
	/>
	<span class="text-[10px] leading-none opacity-60">
		{crop.x},{crop.y} · {crop.size}px
	</span>
</div>
