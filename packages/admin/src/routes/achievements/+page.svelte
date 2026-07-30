<script lang="ts">
	import classNames from 'classnames';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		ACHIEVEMENT_NAME_MAX_LENGTH,
		type Achievement,
		type AchievementsCollection,
		type AchievementStatus
	} from '$types/achievement.type';
	import GameIcon from '$components/core/GameIcon.svelte';
	import AchievementEditor from '$components/core/AchievementEditor.svelte';
	import AchievementTemplateSync from '$components/core/AchievementTemplateSync.svelte';

	// The achievement read/write API is served by @3xl/backend (default :2002),
	// which writes public/achievements.json straight into the git tree. The icon
	// artwork is static and same-origin, served by this app's vite at /assets.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	let achievements: Achievement[] = [];
	let icons: string[] = [];
	let loading = false;
	let loadError = '';

	// Which achievement the editor holds: an id, the sentinel for a new one, or
	// null for "no editor open". A saved id is not enough on its own — a fresh
	// draft has no id yet, and the two states have to be told apart.
	const NEW = Symbol('new');
	let editing: string | symbol | null = null;

	let saving = false;
	let deleting = false;
	let editorError = '';

	// Which card's Duplicate is in flight, so only that button spins.
	let duplicatingId: string | null = null;
	// A duplicate is written before it is edited, so a failure belongs to the card
	// that was clicked rather than to the editor, which is not open yet.
	let duplicateError = '';

	// Per-id Supabase status, published by the sync bar; badges each card.
	let statusById = new Map<string, AchievementStatus>();
	// How many players hold each badge, from Supabase — the one number that is not
	// in the git tree, and the one that says what deleting one would cost.
	let holdersById = new Map<string, number>();

	onMount(load);

	async function load(): Promise<void> {
		if (!browser) return;
		loading = true;
		loadError = '';
		try {
			const [collectionRes, iconsRes] = await Promise.all([
				fetch(`${API_BASE}/api/achievements`),
				fetch(`${API_BASE}/api/achievements/icons`)
			]);
			if (!collectionRes.ok) throw new Error(`Failed to load achievements (${collectionRes.status})`);
			achievements = ((await collectionRes.json()) as AchievementsCollection).achievements;
			if (iconsRes.ok) icons = ((await iconsRes.json()) as { icons: string[] }).icons;
		} catch (error) {
			loadError = error instanceof Error ? error.message : String(error);
		} finally {
			loading = false;
		}
	}

	async function handleSave(event: CustomEvent<Achievement>): Promise<void> {
		saving = true;
		editorError = '';
		try {
			const res = await fetch(`${API_BASE}/api/achievements`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(event.detail)
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? 'Save failed');
			}
			// The response is the whole collection as it now stands on disk, so the
			// grid re-renders from the file rather than from what was typed.
			achievements = ((await res.json()) as AchievementsCollection).achievements;
			editing = event.detail.id;
		} catch (error) {
			editorError = error instanceof Error ? error.message : String(error);
		} finally {
			saving = false;
		}
	}

	async function handleDelete(event: CustomEvent<{ id: string }>): Promise<void> {
		const { id } = event.detail;
		const held = holdersById.get(id) ?? 0;
		const warning = held > 0 ? ` ${held} player(s) currently hold it; syncing will take it away.` : '';
		if (!confirm(`Delete the achievement "${id}"?${warning}`)) return;
		deleting = true;
		editorError = '';
		try {
			const res = await fetch(`${API_BASE}/api/achievements/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? 'Delete failed');
			}
			achievements = ((await res.json()) as AchievementsCollection).achievements;
			editing = null;
		} catch (error) {
			editorError = error instanceof Error ? error.message : String(error);
		} finally {
			deleting = false;
		}
	}

	function edit(id: string): void {
		editorError = '';
		duplicateError = '';
		editing = id;
	}

	function createNew(): void {
		editorError = '';
		duplicateError = '';
		editing = NEW;
	}

	/**
	 * A free id for a copy of `id`: `<id>-copy`, then `-copy-2`, `-copy-3`… A save
	 * is an upsert by id, so reusing one would overwrite the badge it names.
	 */
	function copyId(id: string): string {
		const taken = new Set(achievements.map((achievement) => achievement.id));
		let candidate = `${id}-copy`;
		for (let n = 2; taken.has(candidate); n += 1) candidate = `${id}-copy-${n}`;
		return candidate;
	}

	/**
	 * The copy's name: the original with a suffix, or the original untouched when
	 * that would run past the limit. Not truncated — a name may template `{vars}`
	 * between braces, and cutting one in half would leave a stray brace behind.
	 */
	function copyName(name: string): string {
		const suffixed = `${name} (copy)`;
		return suffixed.length <= ACHIEVEMENT_NAME_MAX_LENGTH ? suffixed : name;
	}

	/**
	 * Duplicate a badge: write the copy into the collection (a real entry on disk,
	 * under an id of its own) and open the editor on it, so what is being edited is
	 * the duplicate and never the original.
	 */
	async function duplicate(achievement: Achievement): Promise<void> {
		const copy: Achievement = {
			...achievement,
			id: copyId(achievement.id),
			name: copyName(achievement.name),
			// The rows are the copy's own from the first save — editing one must not
			// reach back into the badge it was copied from.
			...(achievement.variables
				? { variables: achievement.variables.map((variable) => ({ ...variable })) }
				: {})
		};
		duplicatingId = achievement.id;
		duplicateError = '';
		editorError = '';
		try {
			const res = await fetch(`${API_BASE}/api/achievements`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(copy)
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? 'Duplicate failed');
			}
			achievements = ((await res.json()) as AchievementsCollection).achievements;
			editing = copy.id;
		} catch (error) {
			duplicateError = error instanceof Error ? error.message : String(error);
		} finally {
			duplicatingId = null;
		}
	}

	$: selected = typeof editing === 'string'
		? (achievements.find((achievement) => achievement.id === editing) ?? null)
		: null;

	const statusBadges: Record<AchievementStatus, string> = {
		synced: 'badge-success',
		missing: 'badge-warning',
		// A stale rule is worse than an unsynced badge: this one *is* being awarded,
		// against a requirement that is no longer the one on disk.
		mismatch: 'badge-warning',
		orphan: 'badge-error'
	};
	const statusLabels: Record<AchievementStatus, string> = {
		synced: 'In Supabase',
		missing: 'Not synced',
		mismatch: 'Rule out of date',
		orphan: 'Remote only'
	};
</script>

<div class="flex-1 bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-6xl flex-col gap-6">
		<header class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold">Achievements</h1>
				<span class="badge badge-neutral">{achievements.length} defined</span>
			</div>
			<p class="text-sm opacity-70">
				A badge is a glyph, a name and a line saying what earns it, authored into
				<code class="font-mono">@3xl/data</code>'s
				<code class="font-mono">public/achievements.json</code>. Supabase is told the id and nothing
				else, so it can record who holds what.
			</p>
			<a class="link link-primary text-sm" href="/">← Back to stage</a>
		</header>

		<AchievementTemplateSync
			local={achievements}
			on:statuschange={(event) => (statusById = event.detail)}
			on:holderschange={(event) => (holdersById = event.detail)}
		/>

		<section class="card bg-base-100 shadow-xl">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center gap-3">
					<h2 class="card-title">Defined achievements</h2>
					<span class="badge badge-ghost font-mono text-xs">/data/achievements.json</span>
					<button class="btn btn-primary btn-sm ml-auto" type="button" on:click={createNew}>
						New achievement
					</button>
				</div>

				{#if loadError}
					<div class="alert alert-error">
						<span>{loadError}</span>
					</div>
				{:else if loading}
					<div class="flex items-center gap-2 opacity-70">
						<span class="loading loading-spinner loading-sm"></span>
						<span>Loading achievements…</span>
					</div>
				{:else if achievements.length === 0}
					<p class="text-sm opacity-60">
						None defined yet. “New achievement” writes the first one into the collection.
					</p>
				{:else}
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each achievements as achievement (achievement.id)}
							{@const status = statusById.get(achievement.id)}
							{@const holders = holdersById.get(achievement.id) ?? 0}
							<div
								class={classNames(
									'flex flex-col rounded-box border transition',
									editing === achievement.id
										? 'border-primary bg-primary/5'
										: 'border-base-300 hover:bg-base-200'
								)}
							>
								<button
									type="button"
									class="flex flex-1 items-start gap-3 p-3 text-left"
									on:click={() => edit(achievement.id)}
								>
									<GameIcon name={achievement.icon} size="size-14" />
									<span class="flex min-w-0 flex-1 flex-col gap-1">
										<span class="flex items-center gap-2">
											<span class="truncate font-semibold">{achievement.name}</span>
											{#if status}
												<span class={classNames('badge badge-xs', statusBadges[status])}>
													{statusLabels[status]}
												</span>
											{/if}
										</span>
										<span class="line-clamp-2 text-xs opacity-70">{achievement.description}</span>
										<span class="flex items-center gap-2 font-mono text-[10px] opacity-50">
											<span class="truncate">{achievement.id}</span>
											{#if holders > 0}
												<span>· {holders} held</span>
											{/if}
										</span>
									</span>
								</button>
								<div class="px-3 pb-3">
									<button
										type="button"
										class="btn btn-ghost btn-xs"
										disabled={duplicatingId !== null}
										on:click={() => duplicate(achievement)}
									>
										{#if duplicatingId === achievement.id}
											<span class="loading loading-spinner loading-xs"></span>
										{/if}
										Duplicate
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				{#if duplicateError}
					<div class="alert alert-error">
						<span>{duplicateError}</span>
					</div>
				{/if}
			</div>
		</section>

		{#if editing !== null}
			<section class="card bg-base-100 shadow-xl">
				<div class="card-body gap-4">
					<div class="flex items-center gap-3">
						<h2 class="card-title">
							{selected ? `${selected.name} — definition` : 'New achievement'}
						</h2>
						{#if selected}
							<span class="badge badge-ghost font-mono text-xs">{selected.id}</span>
						{/if}
					</div>

					<!-- Remount per entry so the draft is always the one being edited, never
					     the fields left over from the last selection. -->
					{#key selected?.id ?? 'new'}
						<AchievementEditor
							achievement={selected}
							{icons}
							existingIds={achievements.map((achievement) => achievement.id)}
							{saving}
							{deleting}
							errorMessage={editorError}
							on:save={handleSave}
							on:delete={handleDelete}
							on:cancel={() => (editing = null)}
						/>
					{/key}
				</div>
			</section>
		{/if}
	</div>
</div>
