<script lang="ts" context="module">
	import {
		Chart,
		Filler,
		Legend,
		LineController,
		LineElement,
		LinearScale,
		CategoryScale,
		PointElement,
		Tooltip
	} from 'chart.js';

	// Only the pieces this chart draws with — the rest of Chart.js is left out,
	// once for the whole app rather than per instance.
	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
		Legend,
		Tooltip
	);
</script>

<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import type { ChartConfiguration } from 'chart.js';
	import { withAlpha } from '$utils/color/with-alpha';
	import type { CombatsPerDay } from '$types/admin-stats.type';

	export let days: CombatsPerDay[] = [];
	/** Dims the plot while a new window is loading, keeping the old render up. */
	export let loading: boolean = false;
	export let classes: string = '';

	let canvas: HTMLCanvasElement;
	// Colour probes: the theme lives in CSS, so the palette is read off elements
	// wearing the theme's own classes rather than hardcoded here. That keeps the
	// chart correct under any DaisyUI theme, light or dark.
	let seriesProbe: HTMLSpanElement;
	let altSeriesProbe: HTMLSpanElement;
	let inkProbe: HTMLSpanElement;
	let surfaceProbe: HTMLSpanElement;
	let gridProbe: HTMLSpanElement;
	let chart: Chart<'line', number[], string> | null = null;

	const dayLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
	const fullDayLabel = new Intl.DateTimeFormat('en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	/** `2026-07-29` -> `29 Jul` (the axis) / `Wed, 29 July 2026` (the tooltip). */
	function format(date: string, formatter: Intl.DateTimeFormat): string {
		const parsed = new Date(`${date}T00:00:00`);
		return Number.isNaN(parsed.valueOf()) ? date : formatter.format(parsed);
	}

	/**
	 * Draws the crosshair the reader actually aims with: a hairline down the
	 * hovered day, so nobody has to hit the 2px line itself.
	 */
	const crosshair = {
		id: 'crosshair',
		afterDatasetsDraw(instance: Chart) {
			const active = instance.getActiveElements();
			if (!active.length) return;
			const { ctx, chartArea } = instance;
			ctx.save();
			ctx.beginPath();
			ctx.lineWidth = 1;
			ctx.strokeStyle = withAlpha(getComputedStyle(inkProbe).color, 0.3);
			ctx.moveTo(active[0].element.x, chartArea.top);
			ctx.lineTo(active[0].element.x, chartArea.bottom);
			ctx.stroke();
			ctx.restore();
		}
	};

	/** One line per series, in the fixed order the legend and tooltip keep. */
	function buildDatasets(startedColor: string, completedColor: string, surface: string) {
		return [
			{ label: 'Started', color: startedColor, values: days.map((day) => day.started) },
			{ label: 'Completed', color: completedColor, values: days.map((day) => day.completed) }
		].map(({ label, color, values }, index) => ({
			label,
			data: values,
			borderColor: color,
			// Only the outer line carries a wash — completed is always inside
			// started, and two overlapping fills would just muddy the gap that is
			// the whole point of the pair.
			backgroundColor: withAlpha(color, 0.1),
			fill: index === 0,
			borderWidth: 2,
			borderJoinStyle: 'round' as const,
			borderCapStyle: 'round' as const,
			// The dot only appears where the reader is pointing, ringed in the
			// surface colour so it stays legible where the two lines cross.
			pointRadius: 0,
			pointHoverRadius: 5,
			pointHoverBackgroundColor: color,
			pointHoverBorderColor: surface,
			pointHoverBorderWidth: 2,
			pointHitRadius: 24
		}));
	}

	function buildConfig(): ChartConfiguration<'line', number[], string> {
		// Started and completed are two identities, not two magnitudes, so they
		// take two hues of the theme in a fixed order. The pair is checked against
		// the data-viz colour rules (lightness band, chroma, CVD separation and
		// contrast) on both the light and dark DaisyUI surfaces.
		const started = getComputedStyle(seriesProbe).color;
		const completed = getComputedStyle(altSeriesProbe).color;
		const ink = getComputedStyle(inkProbe).color;
		const surface = getComputedStyle(surfaceProbe).backgroundColor;
		const grid = getComputedStyle(gridProbe).backgroundColor;

		return {
			type: 'line',
			data: {
				labels: days.map((day) => format(day.date, dayLabel)),
				datasets: buildDatasets(started, completed, surface)
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				// The pointer picks a day, not a pixel.
				interaction: { mode: 'index', intersect: false },
				plugins: {
					// Two series, so identity never rests on colour alone.
					legend: {
						position: 'top',
						align: 'end',
						labels: {
							color: ink,
							// A short stroke keys each series, mirroring the mark. The key's
							// length is the smaller of the two box sides, so both are set.
							usePointStyle: true,
							pointStyle: 'line',
							boxWidth: 18,
							boxHeight: 18
						}
					},
					tooltip: {
						// A short stroke of the series colour keys each row — at tooltip
						// density a filled box is ink doing a label's job.
						usePointStyle: true,
						backgroundColor: withAlpha(ink, 0.9),
						titleColor: surface,
						bodyColor: surface,
						padding: 10,
						callbacks: {
							title: (items) => format(days[items[0].dataIndex]?.date ?? '', fullDayLabel),
							label: (item) => `${item.parsed.y} ${item.dataset.label?.toLowerCase() ?? ''}`,
							labelPointStyle: () => ({ pointStyle: 'line' as const, rotation: 0 })
						}
					}
				},
				scales: {
					x: {
						grid: { display: false },
						border: { color: grid },
						ticks: {
							color: withAlpha(ink, 0.6),
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 8
						}
					},
					y: {
						beginAtZero: true,
						grid: { color: grid },
						border: { display: false },
						ticks: {
							color: withAlpha(ink, 0.6),
							precision: 0,
							maxTicksLimit: 6
						}
					}
				}
			},
			plugins: [crosshair]
		};
	}

	onMount(() => {
		chart = new Chart(canvas, buildConfig());
	});

	onDestroy(() => {
		chart?.destroy();
		chart = null;
	});

	// Repaint whenever the window changes. `days` is named here so the statement
	// re-runs on a new series.
	$: if (chart && days) {
		chart.data.labels = days.map((day) => format(day.date, dayLabel));
		chart.data.datasets[0].data = days.map((day) => day.started);
		chart.data.datasets[1].data = days.map((day) => day.completed);
		chart.update();
	}
</script>

<!-- The theme probes. They render nothing; they exist so getComputedStyle can
     resolve the current theme's colours from the classes themselves. -->
<span bind:this={seriesProbe} class="hidden text-primary"></span>
<span bind:this={altSeriesProbe} class="hidden text-secondary"></span>
<span bind:this={inkProbe} class="hidden text-base-content"></span>
<span bind:this={surfaceProbe} class="hidden bg-base-100"></span>
<span bind:this={gridProbe} class="hidden bg-base-300"></span>

<div class={classNames('relative h-72 w-full transition-opacity', { 'opacity-50': loading }, classes)}>
	<canvas bind:this={canvas} aria-label="Combats started and completed per day"></canvas>
</div>
