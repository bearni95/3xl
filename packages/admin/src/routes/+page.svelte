<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import CombatsPerDayChart from '$components/core/CombatsPerDayChart.svelte';
	import type { CombatsPerDay, CombatsPerDayResponse } from '$types/admin-stats.type';

	// Aggregates come from @3xl/backend (default :2002), which reads Supabase with
	// the DB password — the browser never talks to the game database directly.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The windows the range row offers, in days.
	const RANGES = [7, 30, 90];

	let range = 30;
	let days: CombatsPerDay[] = [];
	let loading = true;
	let error: string | null = null;

	// The one headline figure the dashboard leads with: fights in the window.
	$: total = days.reduce((sum, day) => sum + day.combats, 0);

	async function load(window: number): Promise<void> {
		loading = true;
		try {
			const res = await fetch(`${API_BASE}/api/stats/combats-per-day?days=${window}`);
			const body = await res.json();
			if (!res.ok) throw new Error((body as { message?: string }).message ?? res.statusText);
			days = (body as CombatsPerDayResponse).days;
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	function select(window: number): void {
		range = window;
		void load(window);
	}

	onMount(() => load(range));
</script>

<div class="flex-1 bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<header class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold">Dashboard</h1>
			<p class="text-sm opacity-70">What the live game has been doing, straight from Supabase.</p>
		</header>

		<!-- The range scopes everything below it, so it sits above the card. -->
		<div class="join">
			{#each RANGES as window (window)}
				<button
					type="button"
					class={classNames('btn join-item btn-sm', { 'btn-primary': range === window })}
					on:click={() => select(window)}
				>
					Last {window} days
				</button>
			{/each}
		</div>

		<div class="card bg-base-100 shadow-xl">
			<div class="card-body gap-4">
				<div class="flex flex-col gap-1">
					<h2 class="card-title">Combats fought per day</h2>
					<p class="text-sm opacity-70">
						Finished fights, counted on the Catalan day they were reported on.
					</p>
				</div>

				{#if error}
					<div class="alert alert-error">
						<span>{error}</span>
					</div>
				{:else}
					<div class="flex flex-col gap-1">
						<span class="text-5xl font-semibold leading-none">{total.toLocaleString('en-GB')}</span>
						<span class="text-sm opacity-70">combats in the last {range} days</span>
					</div>
					<CombatsPerDayChart {days} {loading} />
				{/if}
			</div>
		</div>
	</div>
</div>
