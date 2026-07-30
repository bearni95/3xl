<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type {
		Achievement,
		AchievementStatus,
		AchievementSyncResult
	} from '$types/achievement.type';

	// The sync API is served by @3xl/backend (default :2002), which owns the
	// Supabase DB password. This component owns the diff between the local
	// achievements.json collection and the remote `achievement_templates` table —
	// same pattern as CharacterTemplateSync, with one difference that matters:
	// Supabase holds only the id, so a badge is never "out of date" up there. It is
	// either known to the database or it isn't.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The locally authored collection, loaded by the page (which already has it).
	export let local: Achievement[] = [];

	const dispatch = createEventDispatcher<{
		statuschange: Map<string, AchievementStatus>;
		holderschange: Map<string, number>;
	}>();

	let remote: string[] = [];
	let holders = new Map<string, number>();
	let loading = false;
	let loadError = '';
	let loaded = false;

	let syncing = false;
	let syncError = '';
	let lastSync: AchievementSyncResult | null = null;

	onMount(loadRemote);

	async function loadRemote() {
		loading = true;
		loadError = '';
		try {
			// The holder counts come from the same trip: they are what says whether
			// retiring a badge would take anything away from anyone.
			const [idsRes, holdersRes] = await Promise.all([
				fetch(`${API_BASE}/api/achievement-templates`),
				fetch(`${API_BASE}/api/achievement-templates/holders`)
			]);
			if (!idsRes.ok) {
				const body = await idsRes.json().catch(() => ({ message: idsRes.statusText }));
				throw new Error(body.message ?? `Failed to load achievements (${idsRes.status})`);
			}
			remote = ((await idsRes.json()) as { ids: string[] }).ids;
			if (holdersRes.ok) {
				const data = (await holdersRes.json()) as { holders: Record<string, number> };
				holders = new Map(Object.entries(data.holders));
			}
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
			const res = await fetch(`${API_BASE}/api/achievement-templates/sync`, { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Sync failed (${res.status})`);
			}
			lastSync = (await res.json()) as AchievementSyncResult;
			remote = lastSync.ids;
			loaded = true;
			// Awards cascade off a deleted template, so the counts are stale the moment
			// a sync removes anything.
			if (lastSync.removed.length > 0) await loadRemote();
		} catch (err) {
			syncError = err instanceof Error ? err.message : String(err);
		} finally {
			syncing = false;
		}
	}

	// Recomputed whenever either side moves — the page re-loads the collection on
	// every save, so `local` changing is what republishes the badges.
	$: statusById = buildStatuses(local, remote);

	function buildStatuses(
		localList: Achievement[],
		remoteIds: string[]
	): Map<string, AchievementStatus> {
		const remoteSet = new Set(remoteIds);
		const localSet = new Set(localList.map((achievement) => achievement.id));
		const statuses = new Map<string, AchievementStatus>();
		for (const achievement of localList) {
			statuses.set(achievement.id, remoteSet.has(achievement.id) ? 'synced' : 'missing');
		}
		// Remote-only ids have no card on the grid, but they are still a divergence —
		// and, unlike a missing one, players may be wearing them.
		for (const id of remoteIds) if (!localSet.has(id)) statuses.set(id, 'orphan');
		return statuses;
	}

	// Publish upward only once the remote list has loaded, so a pre-load state
	// doesn't badge every card as out of sync.
	$: dispatch('statuschange', loaded ? statusById : new Map());
	$: dispatch('holderschange', loaded ? holders : new Map());

	$: orphanIds = loaded
		? [...statusById.entries()].filter(([, status]) => status === 'orphan').map(([id]) => id)
		: [];
	$: diffCount = loaded ? [...statusById.values()].filter((s) => s !== 'synced').length : 0;
	$: inSync = loaded && diffCount === 0;
</script>

<section class="card bg-base-100 shadow-xl">
	<div class="card-body gap-3">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="card-title">Supabase achievements</h2>
			<span class="badge badge-ghost font-mono text-xs">achievement_templates</span>
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
			Supabase keeps <strong>only the id</strong> of each achievement — the glyph, name and
			description stay in <code class="font-mono">@3xl/data</code>'s
			<code class="font-mono">public/achievements.json</code>, so rewording a badge needs no sync at
			all. Syncing inserts ids that are missing up there and deletes ids that no longer exist here;
			deleting an id also removes it from every player who held it
			(<code class="font-mono">player_achievements</code> cascades).
		</p>

		{#if orphanIds.length > 0}
			<div class="alert alert-warning">
				<span>
					In Supabase but not authored locally:
					{#each orphanIds as id, index (id)}
						<code class="font-mono">{id}</code>{#if holders.get(id)}<span class="opacity-70">
								({holders.get(id)} holders)</span
							>{/if}{#if index < orphanIds.length - 1},&nbsp;{/if}
					{/each}
					. The next sync deletes them and their awards.
				</span>
			</div>
		{/if}

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
					Synced — {lastSync.added.length} added, {lastSync.removed.length} removed.
				</span>
			</div>
		{/if}
	</div>
</section>
