<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { characters } from '@3xl/data';
	import type {
		CharacterTemplate,
		CharacterTemplateStatus,
		CharacterTemplateSyncResult
	} from '$types/character-template.type';

	// The template read/sync API is served by @3xl/backend (default :2002),
	// which owns the Supabase service key. This component owns the diff between
	// the local @3xl/data registry and the remote `character_templates` table:
	// it renders a compact sync bar and emits the per-id status map so the
	// character grid can badge each card — same pattern as the shows page.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// Emits the computed per-id status whenever it changes, so the parent can
	// pass each character's status down to its grid card.
	const dispatch = createEventDispatcher<{
		statuschange: Map<string, CharacterTemplateStatus>;
	}>();

	// Local templates: the registry projected to what Supabase stores — id + the
	// display name shown on the frontend (the registry label).
	const local: CharacterTemplate[] = characters
		.map((character) => ({ id: character.id, name: character.label }))
		.sort((a, b) => a.id.localeCompare(b.id));

	let remote: CharacterTemplate[] = [];
	let loading = false;
	let loadError = '';
	let loaded = false;

	let syncing = false;
	let syncError = '';
	let lastSync: CharacterTemplateSyncResult | null = null;

	onMount(loadRemote);

	async function loadRemote() {
		loading = true;
		loadError = '';
		try {
			const res = await fetch(`${API_BASE}/api/character-templates`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Failed to load templates (${res.status})`);
			}
			const data = (await res.json()) as { templates: CharacterTemplate[] };
			remote = data.templates;
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
			const res = await fetch(`${API_BASE}/api/character-templates/sync`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Sync failed (${res.status})`);
			}
			lastSync = (await res.json()) as CharacterTemplateSyncResult;
			remote = lastSync.templates;
			loaded = true;
		} catch (err) {
			syncError = err instanceof Error ? err.message : String(err);
		} finally {
			syncing = false;
		}
	}

	// Per-id sync status across both sides. Orphans (remote-only) have no local
	// character, so they never appear on the grid but still count toward the diff.
	$: remoteById = new Map(remote.map((t) => [t.id, t]));
	$: localById = new Map(local.map((t) => [t.id, t]));
	$: statusById = buildStatuses(localById, remoteById);

	function buildStatuses(
		localMap: Map<string, CharacterTemplate>,
		remoteMap: Map<string, CharacterTemplate>
	): Map<string, CharacterTemplateStatus> {
		const ids = new Set<string>([...localMap.keys(), ...remoteMap.keys()]);
		const statuses = new Map<string, CharacterTemplateStatus>();
		for (const id of ids) {
			const localName = localMap.get(id)?.name ?? null;
			const remoteName = remoteMap.get(id)?.name ?? null;
			if (localName === null) statuses.set(id, 'orphan');
			else if (remoteName === null) statuses.set(id, 'missing');
			else if (localName !== remoteName) statuses.set(id, 'mismatch');
			else statuses.set(id, 'synced');
		}
		return statuses;
	}

	// Publish the status map upward only once the remote list has loaded, so a
	// pre-load state doesn't badge every card as out of sync.
	$: dispatch('statuschange', loaded ? statusById : new Map());

	// Only count divergences once the remote list has actually loaded, so a load
	// error doesn't read as "everything out of sync".
	$: diffCount = loaded ? [...statusById.values()].filter((s) => s !== 'synced').length : 0;
	$: inSync = loaded && diffCount === 0;
</script>

<section class="card bg-base-100 shadow-xl">
	<div class="card-body gap-3">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="card-title">Supabase character templates</h2>
			<span class="badge badge-ghost font-mono text-xs">character_templates</span>
			{#if loading}
				<span class="loading loading-spinner loading-xs"></span>
			{:else if loaded}
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
			The local <code class="font-mono">@3xl/data</code> registry is the source of truth. Each remote
			template keeps only the character's <strong>id</strong> and its frontend
			<strong>name</strong>. Syncing upserts every local character and removes remote rows that no
			longer exist locally. Each card below is badged with its sync state.
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
	</div>
</section>
