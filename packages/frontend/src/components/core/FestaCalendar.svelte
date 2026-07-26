<script lang="ts">
	import classNames from 'classnames';
	import type { FestaMonthGrid } from '$utils/festes/festa-calendar';

	// The twelve month grids for the year, the per-date festival counts, the
	// currently selected date, and the row-click setter. All computed upstream so
	// this component only paints.
	export let grids: FestaMonthGrid[] = [];
	export let countByDate: Map<string, number> = new Map();
	export let selected: string | null = null;
	export let onSelect: (date: string) => void;

	// Catalan month and weekday (Monday-first) labels — a Catalan festivals grid.
	const monthNames = [
		'Gener',
		'Febrer',
		'Març',
		'Abril',
		'Maig',
		'Juny',
		'Juliol',
		'Agost',
		'Setembre',
		'Octubre',
		'Novembre',
		'Desembre'
	];
	const weekdayNames = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

	// Bucket a day's festival count (0–4) into a heat shade. Fixed thresholds
	// rather than a max-relative scale, so a lone movable-feast Monday (a handful
	// of days with 100+ towns) doesn't flatten every ordinary festa-major day into
	// the palest tint.
	function heatBucket(count: number): number {
		if (count <= 0) return 0;
		if (count <= 2) return 1;
		if (count <= 5) return 2;
		if (count <= 12) return 3;
		return 4;
	}

	// Heat shade per bucket — increasing primary tint, kept as static classes so
	// Tailwind keeps them (no dynamic class-name assembly, no inline styles).
	const heatClasses = [
		'',
		'bg-primary/20 text-base-content',
		'bg-primary/40 text-base-content',
		'bg-primary/60 text-primary-content',
		'bg-primary/80 text-primary-content'
	];
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
	{#each grids as grid (grid.month)}
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-2 p-3">
				<h3 class="text-sm font-bold uppercase tracking-wide opacity-70">
					{monthNames[grid.month]}
				</h3>
				<div class="grid grid-cols-7 gap-0.5 text-center">
					{#each weekdayNames as weekday}
						<div class="text-[0.65rem] font-semibold opacity-50">{weekday}</div>
					{/each}
					{#each grid.weeks as week}
						{#each week as cell}
							{#if cell}
								{@const count = countByDate.get(cell.date) ?? 0}
								{@const bucket = heatBucket(count)}
								<button
									type="button"
									disabled={count === 0}
									title={count > 0 ? `${count} festes` : undefined}
									class={classNames(
										'relative aspect-square rounded text-xs',
										heatClasses[bucket],
										{
											'font-medium': count > 0,
											'opacity-40': count === 0,
											'cursor-pointer hover:ring-2 hover:ring-primary/50': count > 0,
											'ring-2 ring-accent ring-offset-1 ring-offset-base-100':
												selected === cell.date
										}
									)}
									on:click={() => count > 0 && onSelect(cell.date)}
								>
									{cell.day}
								</button>
							{:else}
								<div></div>
							{/if}
						{/each}
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>
