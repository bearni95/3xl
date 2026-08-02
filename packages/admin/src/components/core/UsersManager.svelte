<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import type { AdminUser, GrantClaimsResult } from '$types/player-user.type';

	// The users read/grant API is served by @3xl/backend (default :2002), which
	// owns the Supabase DB password — the anon key can't read `auth.users`. Same
	// "admin SPA calls the backend" pattern as CharacterTemplateSync / Festivity.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	let users: AdminUser[] = [];
	let loading = false;
	let loadError = '';

	// Per-user "amount to grant" input, keyed by user id, and which row is mid-grant.
	let amounts: Record<string, number> = {};
	let granting: string | null = null;
	let grantError = '';

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

	// Grant `amount` extra daily claims to `user` for today, then fold the refreshed
	// row back into the table. `amount` defaults to the row's input (min 1).
	async function grant(user: AdminUser, amount: number) {
		if (!Number.isInteger(amount) || amount === 0) return;
		granting = user.id;
		grantError = '';
		try {
			const res = await fetch(`${API_BASE}/api/users/${user.id}/grant`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ amount })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Grant failed (${res.status})`);
			}
			const { user: updated } = (await res.json()) as GrantClaimsResult;
			users = users.map((u) => (u.id === updated.id ? updated : u));
			amounts = { ...amounts, [user.id]: 1 };
		} catch (err) {
			grantError = err instanceof Error ? err.message : String(err);
		} finally {
			granting = null;
		}
	}

	function amountFor(id: string): number {
		const value = amounts[id];
		return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;
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
			<span class="badge badge-ghost font-mono text-xs">booster_grants</span>
			{#if loading}
				<span class="loading loading-spinner loading-xs"></span>
			{:else}
				<span class="badge badge-neutral">{users.length} players</span>
			{/if}
			<button class="btn btn-ghost btn-sm ml-auto" type="button" on:click={load} disabled={loading}>
				Refresh
			</button>
		</div>

		<p class="text-sm opacity-70">
			Each player's daily booster cap is <code>floor(level / 4) + 1</code> boxes, plus two on the day
			they signed up, plus everything the day has granted them — a level reached, a town taken, a
			town held against a challenger, cards recycled. Granting adds extra claims
			<strong>for today only</strong>: they stack on top of the cap and reset at Catalan midnight
			(Europe/Madrid), exactly as the frontend's booster panel enforces.
		</p>

		{#if loadError}
			<div class="alert alert-error"><span>{loadError}</span></div>
		{/if}
		{#if grantError}
			<div class="alert alert-error"><span>{grantError}</span></div>
		{/if}

		{#if !loading && users.length > 0}
			<div class="overflow-x-auto">
				<table class="table table-zebra table-sm">
					<thead>
						<tr>
							<th>Player</th>
							<th class="text-right">Level</th>
							<th class="text-right">Granted today</th>
							<th class="text-right">Opened today</th>
							<th class="text-right">Remaining</th>
							<th>Grant extra claims</th>
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
								<td class="text-right tabular-nums">
									<span class={classNames({ 'text-success font-semibold': user.grantedToday > 0 })}>
										{user.grantedToday > 0 ? `+${user.grantedToday}` : '0'}
									</span>
								</td>
								<td class="text-right tabular-nums">{user.usedToday} / {user.capToday}</td>
								<td class="text-right tabular-nums">
									<span class={classNames('font-semibold', { 'text-warning': user.remainingToday === 0 })}>
										{user.remainingToday}
									</span>
								</td>
								<td>
									<div class="flex items-center gap-2">
										<input
											type="number"
											min="1"
											class="input input-bordered input-sm w-20"
											bind:value={amounts[user.id]}
											placeholder="1"
											disabled={granting === user.id}
										/>
										<button
											class="btn btn-primary btn-sm"
											type="button"
											on:click={() => grant(user, amountFor(user.id))}
											disabled={granting === user.id}
										>
											{#if granting === user.id}
												<span class="loading loading-spinner loading-xs"></span>
											{/if}
											Grant
										</button>
										<button
											class="btn btn-ghost btn-sm"
											type="button"
											on:click={() => grant(user, 1)}
											disabled={granting === user.id}
										>
											+1
										</button>
										<button
											class="btn btn-ghost btn-sm"
											type="button"
											on:click={() => grant(user, 5)}
											disabled={granting === user.id}
										>
											+5
										</button>
									</div>
								</td>
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
