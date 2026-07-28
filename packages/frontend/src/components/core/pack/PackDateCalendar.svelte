<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { buildMonthGrids } from '$utils/festes/festa-calendar';

	// The month on screen (`YYYY-MM`), owned by the parent so the counts it feeds in
	// always belong to the month being drawn.
	export let month: string;
	// The date being browsed, and today — both `YYYY-MM-DD`.
	export let value: string;
	export let today: string;
	// How many municipalities are de festa on each date of the month, as Supabase
	// counted them. Missing means none.
	export let counts: Map<string, number> = new Map();
	export let loading: boolean = false;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ select: string; month: string }>();

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

	$: year = Number(month.slice(0, 4));
	$: monthIndex = Number(month.slice(5, 7)) - 1;
	$: grid = buildMonthGrids(year)[monthIndex];

	// Step the month on screen, in UTC parts so no DST change can shift it.
	function stepMonth(delta: number): void {
		const stepped = new Date(Date.UTC(year, monthIndex + delta, 1));
		dispatch('month', `${stepped.getUTCFullYear()}-${String(stepped.getUTCMonth() + 1).padStart(2, '0')}`);
	}
</script>

<div class={classNames('rounded-md border border-base-300 bg-base-100 p-2', classes)}>
	<div class="flex items-center gap-2">
		<button
			type="button"
			class="btn btn-ghost btn-xs flex-none"
			on:click={() => stepMonth(-1)}
			aria-label="Mes anterior"
		>
			‹
		</button>
		<p class="flex-1 text-center text-xs font-bold">{monthNames[monthIndex]} {year}</p>
		<button
			type="button"
			class="btn btn-ghost btn-xs flex-none"
			on:click={() => stepMonth(1)}
			aria-label="Mes següent"
		>
			›
		</button>
	</div>

	<div class={classNames('mt-1 grid grid-cols-7 gap-0.5 text-center', { 'opacity-50': loading })}>
		{#each weekdayNames as weekday}
			<div class="text-[0.6rem] font-semibold opacity-50">{weekday}</div>
		{/each}
		{#each grid.weeks as week}
			{#each week as cell}
				{#if cell}
					{@const count = counts.get(cell.date) ?? 0}
					<button
						type="button"
						class={classNames(
							'flex aspect-square flex-col items-center justify-center rounded leading-none',
							{
								'bg-primary text-primary-content': cell.date === value,
								'ring-1 ring-primary': cell.date === today && cell.date !== value,
								'opacity-40': count === 0 && cell.date !== value
							}
						)}
						on:click={() => dispatch('select', cell.date)}
					>
						<span class="text-[0.7rem]">{cell.day}</span>
						{#if count > 0}
							<span class="text-[0.55rem] tabular-nums opacity-70">{count}</span>
						{/if}
					</button>
				{:else}
					<div></div>
				{/if}
			{/each}
		{/each}
	</div>
</div>
