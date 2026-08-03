<script lang="ts">
	import { onMount } from 'svelte';
	import type { AdminUser } from '$types/player-user.type';

	// The users API is served by @3xl/backend (default :2002), which owns the
	// Supabase DB password — the anon key can't read `auth.users`. Same "admin SPA
	// calls the backend" pattern as CharacterTemplateSync / Festivity.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	let users: AdminUser[] = [];
	let loading = false;
	let loadError = '';

	onMount(load);

	async function load() {
		loading = true;
		loadError = '';
		try {
			const res = await fetch(`${API_BASE}/api/users`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Failed to load users (${res.status})`);
			}
			users = ((await res.json()) as { users: AdminUser[] }).users;
		} catch (err) {
			loadError = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	function shortId(id: string): string {
		return id.slice(0, 8);
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString();
	}
</script>

<section class="card bg-base-100 shadow-xl">
	<div class="card-body gap-3">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="card-title">Players</h2>
			<span class="badge badge-ghost font-mono text-xs">auth.users</span>
			<span class="badge badge-ghost font-mono text-xs">booster_claims</span>
			{#if loading}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				<span class="badge badge-neutral">{users.length} players</span>
			{/if}
			<button class="btn btn-ghost btn-sm ml-auto" type="button" on:click={load} disabled={loading}>
				Refresh
			</button>
		</div>

		<!-- Read-only. There was a per-player grant of extra daily claims here, back
			when a day had an allowance of boxes to top up; a box is the calendar's now —
			one per player, per town, per year, per stock — so there is no balance an
			amount could be added to. -->
		<p class="text-sm opacity-70">
			A town deals each player two booster boxes a year and no more: the white one on the day
			of its festa major, the black one in the days around it. What is listed here is how many
			of those each player has taken.
		</p>

		{#if loadError}
			<div class="alert alert-error"><span>{loadError}</span></div>
		{/if}

		{#if !loading && users.length > 0}
			<div class="overflow-x-auto">
				<table class="table table-zebra table-sm">
					<thead>
						<tr>
							<th>Player</th>
							<th class="text-right">Level</th>
							<th class="text-right">Boxes this year</th>
							<th class="text-right">Boxes all time</th>
						</tr>
					</thead>
					<tbody>
						{#each users as user (user.id)}
							<tr>
								<td>
									<div class="font-medium">{user.email ?? '—'}</div>
									<div class="font-mono text-xs opacity-50" title={user.id}>
										{shortId(user.id)} · joined {formatDate(user.createdAt)}
									</div>
								</td>
								<td class="text-right tabular-nums">{user.level}</td>
								<td class="text-right tabular-nums">{user.boxesThisYear}</td>
								<td class="text-right tabular-nums opacity-70">{user.boxesOpened}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if !loading}
			<div class="flex items-center justify-center p-6 text-center opacity-60">
				No players have signed up yet.
			</div>
		{/if}
	</div>
</section>
