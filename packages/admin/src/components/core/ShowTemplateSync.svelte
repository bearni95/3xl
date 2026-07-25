<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import type { ShowsCollection } from '$types/show.type';
	import type { ShowTemplate, ShowTemplateSyncResult } from '$types/show-template.type';

	// The template read/sync API is served by @3xl/backend (default :2002), which
	// owns the Supabase DB password. This mirrors CharacterTemplateSync: it renders
	// the diff between the local shows.json collection and the remote
	// `show_templates` table, and triggers a manual sync.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// After a save from the search tab the collection changes, so let the parent
	// re-mount / re-load us: we fetch local afresh on mount.
	let local: ShowTemplate[] = [];
	let remote: ShowTemplate[] = [];
	let loading = false;
	let loadError = '';
	let loaded = false;

	let syncing = false;
	let syncError = '';
	let lastSync: ShowTemplateSyncResult | null = null;

	onMount(load);

	async function load() {
		loading = true;
		loadError = '';
		try {
			const [localRes, remoteRes] = await Promise.all([
				fetch(`${API_BASE}/api/shows`),
				fetch(`${API_BASE}/api/show-templates`)
			]);
			if (!localRes.ok) {
				const body = await localRes.json().catch(() => ({ message: localRes.statusText }));
				throw new Error(body.message ?? `Failed to load shows (${localRes.status})`);
			}
			if (!remoteRes.ok) {
				const body = await remoteRes.json().catch(() => ({ message: remoteRes.statusText }));
				throw new Error(body.message ?? `Failed to load templates (${remoteRes.status})`);
			}
			const collection = (await localRes.json()) as ShowsCollection;
			local = collection.shows
				.map((entry) => ({ id: entry.show.id, name: entry.show.name }))
				.sort((a, b) => a.id - b.id);
			const remoteData = (await remoteRes.json()) as { templates: ShowTemplate[] };
			remote = remoteData.templates;
			loaded = true;
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
			const res = await fetch(`${API_BASE}/api/show-templates/sync`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Sync failed (${res.status})`);
			}
			lastSync = (await res.json()) as ShowTemplateSyncResult;
			remote = lastSync.templates;
			loaded = true;
		} catch (err) {
			syncError = err instanceof Error ? err.message : String(err);
		} finally {
			syncing = false;
		}
	}

	// One row per id across both sides, with the sync status that drives the UI.
	type Status = 'synced' | 'missing' | 'mismatch' | 'orphan';
	interface Row {
		id: number;
		localName: string | null;
		remoteName: string | null;
		status: Status;
	}

	$: remoteById = new Map(remote.map((t) => [t.id, t]));
	$: localById = new Map(local.map((t) => [t.id, t]));
	$: rows = buildRows(localById, remoteById);

	function buildRows(
		localMap: Map<number, ShowTemplate>,
		remoteMap: Map<number, ShowTemplate>
	): Row[] {
		const ids = new Set<number>([...localMap.keys(), ...remoteMap.keys()]);
		return [...ids]
			.sort((a, b) => a - b)
			.map((id) => {
				const localName = localMap.get(id)?.name ?? null;
				const remoteName = remoteMap.get(id)?.name ?? null;
				let status: Status;
				if (localName === null) status = 'orphan';
				else if (remoteName === null) status = 'missing';
				else if (localName !== remoteName) status = 'mismatch';
				else status = 'synced';
				return { id, localName, remoteName, status };
			});
	}

	// Only count divergences once the remote list has actually loaded, so a load
	// error doesn't read as "everything out of sync".
	$: diffCount = loaded ? rows.filter((row) => row.status !== 'synced').length : 0;
	$: inSync = loaded && diffCount === 0;

	const statusBadge: Record<Status, string> = {
		synced: 'badge-success',
		missing: 'badge-warning',
		mismatch: 'badge-info',
		orphan: 'badge-error'
	};
	const statusLabel: Record<Status, string> = {
		synced: 'In sync',
		missing: 'Missing remotely',
		mismatch: 'Name differs',
		orphan: 'Orphan (remote only)'
	};
</script>

<section class="card bg-base-100 shadow-xl">
	<div class="card-body gap-4">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="card-title">Supabase show templates</h2>
			<span class="badge badge-ghost font-mono text-xs">show_templates</span>
			{#if loaded}
				{#if inSync}
					<span class="badge badge-success">In sync</span>
				{:else}
					<span class="badge badge-warning">{diffCount} out of sync</span>
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
				Sync local → Supabase
			</button>
		</div>

		<p class="text-sm opacity-70">
			The local <code class="font-mono">shows.json</code> collection is the source of truth. Each
			remote template keeps only the show's <strong>id</strong> and its
			<strong>name</strong>. Syncing upserts every saved show and removes remote rows that no longer
			exist locally.
		</p>

		{#if loadError}
			<div class="alert alert-error">
				<span>{loadError}</span>
			</div>
		{/if}
		{#if syncError}
			<div class="alert alert-error">
				<span>{syncError}</span>
			</div>
		{/if}
		{#if lastSync}
			<div class="alert alert-success">
				<span>
					Synced — {lastSync.added.length} added, {lastSync.updated.length} updated, {lastSync
						.removed.length} removed.
				</span>
			</div>
		{/if}

		{#if loading}
			<div class="flex items-center gap-2 opacity-70">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Loading remote templates…</span>
			</div>
		{:else if loaded}
			<div class="overflow-x-auto">
				<table class="table table-sm">
					<thead>
						<tr>
							<th>Status</th>
							<th>ID</th>
							<th>Local name</th>
							<th>Remote name</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.id)}
							<tr>
								<td>
									<span class={classNames('badge badge-sm', statusBadge[row.status])}>
										{statusLabel[row.status]}
									</span>
								</td>
								<td class="font-mono text-xs">{row.id}</td>
								<td class={classNames({ 'opacity-40': row.localName === null })}>
									{row.localName ?? '—'}
								</td>
								<td
									class={classNames({
										'opacity-40': row.remoteName === null,
										'text-info': row.status === 'mismatch'
									})}
								>
									{row.remoteName ?? '—'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</section>
