<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type {
		Achievement,
		AchievementSettings,
		AchievementStatus,
		AchievementSyncResult,
		AchievementTemplateRow
	} from '$types/achievement.type';
	import {
		DAILY_ACHIEVEMENT_COUNT,
		DAILY_ACHIEVEMENT_COUNT_MAX,
		DAILY_ACHIEVEMENT_COUNT_MIN
	} from '$utils/achievement/daily';

	// The sync API is served by @3xl/backend (default :2002), which owns the
	// Supabase DB password. This component owns the diff between the local
	// achievements.json collection and the remote `achievement_templates` table.
	//
	// Supabase holds no wording, so rewording a badge is not a divergence. It does
	// hold each badge's **requirement** — awarding is a rule, and the rule has to live
	// where it is enforced — compiled up there from the source text on this side. So a
	// badge that exists on both sides can still be out of date: `mismatch` is a rule
	// that has been edited here since the last sync, and until it is synced the
	// database is still awarding the old one.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The locally authored collection, loaded by the page (which already has it).
	export let local: Achievement[] = [];

	const dispatch = createEventDispatcher<{
		statuschange: Map<string, AchievementStatus>;
		holderschange: Map<string, number>;
	}>();

	let remote: AchievementTemplateRow[] = [];
	let holders = new Map<string, number>();
	let loading = false;
	let loadError = '';
	let loaded = false;

	let syncing = false;
	let syncError = '';
	let lastSync: AchievementSyncResult | null = null;

	// How many badges a day the game sets. A setting rather than a rule — it decides how
	// much is offered, never whether anything is earned — and it lives in Supabase
	// because the draw happens in two places (the browser and `claim_achievements`) and
	// both have to read the same number. `dailyCount` is what the database says;
	// `dailyDraft` is what this input holds until it is saved.
	let dailyCount = DAILY_ACHIEVEMENT_COUNT;
	let dailyDraft = DAILY_ACHIEVEMENT_COUNT;
	let savingDaily = false;
	let dailyError = '';

	onMount(loadRemote);

	async function loadRemote() {
		loading = true;
		loadError = '';
		try {
			// The holder counts come from the same trip: they are what says whether
			// retiring a badge would take anything away from anyone.
			const [templatesRes, holdersRes, settingsRes] = await Promise.all([
				fetch(`${API_BASE}/api/achievement-templates`),
				fetch(`${API_BASE}/api/achievement-templates/holders`),
				fetch(`${API_BASE}/api/achievement-templates/settings`)
			]);
			if (!templatesRes.ok) {
				const body = await templatesRes.json().catch(() => ({ message: templatesRes.statusText }));
				throw new Error(body.message ?? `Failed to load achievements (${templatesRes.status})`);
			}
			remote = ((await templatesRes.json()) as { templates: AchievementTemplateRow[] }).templates;
			if (holdersRes.ok) {
				const data = (await holdersRes.json()) as { holders: Record<string, number> };
				holders = new Map(Object.entries(data.holders));
			}
			if (settingsRes.ok) {
				const settings = (await settingsRes.json()) as AchievementSettings;
				dailyCount = settings.dailyCount;
				dailyDraft = settings.dailyCount;
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
			// The response carries the ids alone, and what the diff below compares is the
			// rules — so the rows are re-read rather than reconstructed from it.
			await loadRemote();
		} catch (err) {
			syncError = err instanceof Error ? err.message : String(err);
		} finally {
			syncing = false;
		}
	}

	/**
	 * Move the setting. Written through the backend rather than from here, like every
	 * other authoring write: the table takes no client writes at all, since raising the
	 * count raises what the game pays out.
	 */
	async function saveDailyCount() {
		savingDaily = true;
		dailyError = '';
		try {
			const res = await fetch(`${API_BASE}/api/achievement-templates/settings`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ dailyCount: dailyDraft })
			});
			const body = await res.json().catch(() => ({ message: res.statusText }));
			if (!res.ok) throw new Error(body.message ?? `Save failed (${res.status})`);
			dailyCount = (body as AchievementSettings).dailyCount;
			dailyDraft = dailyCount;
		} catch (err) {
			dailyError = err instanceof Error ? err.message : String(err);
		} finally {
			savingDaily = false;
		}
	}

	$: dailyDirty = Number.isInteger(dailyDraft) && dailyDraft !== dailyCount;

	// Recomputed whenever either side moves — the page re-loads the collection on
	// every save, so `local` changing is what republishes the badges.
	$: statusById = buildStatuses(local, remote);

	function buildStatuses(
		localList: Achievement[],
		remoteRows: AchievementTemplateRow[]
	): Map<string, AchievementStatus> {
		const remoteById = new Map(remoteRows.map((row) => [row.id, row]));
		const localSet = new Set(localList.map((achievement) => achievement.id));
		const statuses = new Map<string, AchievementStatus>();
		for (const achievement of localList) {
			const row = remoteById.get(achievement.id);
			if (!row) {
				statuses.set(achievement.id, 'missing');
				continue;
			}
			// The requirement as authored is stored beside the tree it compiled to, so
			// the two sides can be compared without parsing anything here.
			const mine = achievement.requirement?.trim() || null;
			statuses.set(achievement.id, mine === (row.requirement ?? null) ? 'synced' : 'mismatch');
		}
		// Remote-only ids have no card on the grid, but they are still a divergence —
		// and, unlike a missing one, players may be wearing them.
		for (const row of remoteRows) if (!localSet.has(row.id)) statuses.set(row.id, 'orphan');
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
			Supabase keeps each achievement's <strong>id and its requirement</strong> — the glyph, name and
			description stay in <code class="font-mono">@3xl/data</code>'s
			<code class="font-mono">public/achievements.json</code>, so rewording a badge needs no sync at
			all. The requirement is different: it is compiled up there and it is what
			<code class="font-mono">claim_achievements</code> awards a badge against, so editing one leaves
			the database enforcing the old rule until you sync. Syncing inserts ids that are missing up
			there, rewrites the rules that have changed, and deletes ids that no longer exist here —
			deleting an id also removes it from every player who held it
			(<code class="font-mono">player_achievements</code> cascades).
		</p>

		<!-- The one number here that is a setting rather than a rule. It is read from
		     Supabase by both the browser and `claim_achievements`, so this is the one
		     place it is changed and neither side has it written into it. -->
		<div class="flex flex-wrap items-center gap-3 rounded-box bg-base-200 p-3">
			<span class="text-sm font-medium">Badges set per day</span>
			<input
				class="input input-bordered input-sm w-20"
				type="number"
				min={DAILY_ACHIEVEMENT_COUNT_MIN}
				max={DAILY_ACHIEVEMENT_COUNT_MAX}
				bind:value={dailyDraft}
				aria-label="How many badges a player is set each day"
			/>
			<button
				class="btn btn-sm"
				type="button"
				disabled={!dailyDirty || savingDaily}
				on:click={saveDailyCount}
			>
				{#if savingDaily}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				Save
			</button>
			<span class="text-xs opacity-60">
				<code class="font-mono">achievement_settings.daily_count</code> — the pool is drawn from
				every badge with a rule, so a pool smaller than this simply gives all of it.
			</span>
			{#if dailyError}
				<span class="text-error text-xs">{dailyError}</span>
			{/if}
		</div>

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
					Synced — {lastSync.added.length} added, {lastSync.updated.length} rules rewritten,
					{lastSync.removed.length} removed.
				</span>
			</div>
		{/if}
	</div>
</section>
