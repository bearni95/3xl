<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		FestivityRemoteState,
		FestivitySyncResult,
		FestivityWindow
	} from '$types/festivity.type';

	// The festivity read/sync API is served by @3xl/backend (default :2002),
	// which owns the Supabase DB password. This component mirrors the local baked
	// calendar's today→year-end window into the `festa_locations` + `festivities`
	// tables — same "admin calls the backend" pattern as CharacterTemplateSync.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The remote-state payload GET /api/festivities returns.
	interface FestivityStatus {
		window: FestivityWindow;
		remote: FestivityRemoteState;
		localFestivities: number;
		localLocations: number;
	}

	let status: FestivityStatus | null = null;
	let loading = false;
	let loadError = '';

	let syncing = false;
	let syncError = '';
	let lastSync: FestivitySyncResult | null = null;

	onMount(loadStatus);

	async function loadStatus() {
		loading = true;
		loadError = '';
		try {
			const res = await fetch(`${API_BASE}/api/festivities`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Failed to load state (${res.status})`);
			}
			status = (await res.json()) as FestivityStatus;
		} catch (err) {
			loadError = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	async function sync() {
		syncing = true;
		syncError = '';
		try {
			const res = await fetch(`${API_BASE}/api/festivities/sync`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Sync failed (${res.status})`);
			}
			lastSync = (await res.json()) as FestivitySyncResult;
			// Fold the sync result back into the displayed state.
			status = {
				window: lastSync.window,
				remote: lastSync.remote,
				localFestivities: lastSync.festivitiesTotal,
				localLocations: lastSync.remote.locations
			};
		} catch (err) {
			syncError = err instanceof Error ? err.message : String(err);
		} finally {
			syncing = false;
		}
	}

	// Whether Supabase already mirrors exactly the window's local festivities.
	$: inSync =
		!!status &&
		status.remote.festivities === status.localFestivities &&
		status.remote.locations === status.localLocations;
</script>

<section class="card bg-base-100 shadow-xl">
	<div class="card-body gap-3">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="card-title">Supabase festivity calendar</h2>
			<span class="badge badge-ghost font-mono text-xs">festa_locations</span>
			<span class="badge badge-ghost font-mono text-xs">festivities</span>
			{#if loading}
				<span class="loading loading-spinner loading-xs"></span>
			{:else if status}
				{#if inSync}
					<span class="badge badge-success">In sync</span>
				{:else}
					<span class="badge badge-warning">Out of sync</span>
				{/if}
			{/if}
			<button
				class="btn btn-primary btn-sm ml-auto"
				type="button"
				on:click={sync}
				disabled={syncing || loading}
			>
				{#if syncing}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				Sync festes majors → Supabase
			</button>
		</div>

		<p class="text-sm opacity-70">
			The local <code class="font-mono">@3xl/data</code> calendar is the source of truth. Syncing
			mirrors every municipality's local-holiday date from
			{#if status}
				<strong>{status.window.from}</strong> through <strong>{status.window.to}</strong>
			{:else}
				today through the year's end
			{/if}
			into two normalized, FK-related tables:
			<code class="font-mono">festa_locations</code> (one row per municipality) and
			<code class="font-mono">festivities</code> (one row per location + date). Dates outside the
			window are removed. The dataset keeps both of a town's local holidays and doesn't flag which is
			the festa major, so every in-window date is pushed — the festa major is among them.
		</p>

		{#if status}
			<div class="flex flex-wrap gap-4 text-sm">
				<div>
					<div class="text-xl font-bold tabular-nums text-primary">{status.remote.locations}</div>
					<div class="opacity-60">locations remote</div>
				</div>
				<div>
					<div class="text-xl font-bold tabular-nums text-primary">
						{status.remote.festivities}
					</div>
					<div class="opacity-60">festivities remote</div>
				</div>
				<div>
					<div class="text-xl font-bold tabular-nums">{status.localLocations}</div>
					<div class="opacity-60">locations in window</div>
				</div>
				<div>
					<div class="text-xl font-bold tabular-nums">{status.localFestivities}</div>
					<div class="opacity-60">festivities in window</div>
				</div>
				{#if status.remote.earliest && status.remote.latest}
					<div>
						<div class="text-sm font-semibold tabular-nums">
							{status.remote.earliest} → {status.remote.latest}
						</div>
						<div class="opacity-60">remote date range</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if loadError}
			<div class="alert alert-error"><span>{loadError}</span></div>
		{/if}
		{#if syncError}
			<div class="alert alert-error"><span>{syncError}</span></div>
		{/if}
		{#if lastSync}
			<div class="alert alert-success">
				<span>
					Synced — {lastSync.festivitiesAdded} festivities added, {lastSync.festivitiesRemoved} removed;
					{lastSync.locationsUpserted} locations upserted, {lastSync.locationsRemoved} removed.
				</span>
			</div>
		{/if}
	</div>
</section>
