<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { characters } from '@3xl/data';
	import type { ShowEntry } from '$types/show.type';
	import type { ShowCharacterAssignments } from '$types/show-template.type';

	// The saved shows to assign characters to (passed from the page so we don't
	// refetch the collection). Assignments themselves live only in Supabase and
	// are read/written through @3xl/backend (default :2002).
	export let shows: ShowEntry[] = [];

	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The remote show→characters map. Loaded on mount.
	let assignments: ShowCharacterAssignments = {};
	let loading = false;
	let loadError = '';
	let loaded = false;

	// Which show is being edited, and the working set of selected character ids.
	let selectedShowId: number | null = null;
	let draft = new Set<string>();

	let saving = false;
	let saveError = '';
	let savedOk = false;

	onMount(load);

	async function load() {
		loading = true;
		loadError = '';
		try {
			const res = await fetch(`${API_BASE}/api/show-templates/assignments`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Failed to load assignments (${res.status})`);
			}
			const data = (await res.json()) as { assignments: ShowCharacterAssignments };
			assignments = data.assignments;
			loaded = true;
		} catch (err) {
			loadError = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	function selectShow(showId: number) {
		selectedShowId = showId;
		draft = new Set(assignments[showId] ?? []);
		saveError = '';
		savedOk = false;
	}

	function toggleCharacter(id: string) {
		const next = new Set(draft);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		draft = next;
		savedOk = false;
	}

	async function save() {
		if (selectedShowId === null) return;
		saving = true;
		saveError = '';
		savedOk = false;
		try {
			const res = await fetch(`${API_BASE}/api/show-templates/${selectedShowId}/characters`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ characterIds: [...draft] })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Failed to save (${res.status})`);
			}
			const data = (await res.json()) as { assignments: ShowCharacterAssignments };
			assignments = data.assignments;
			savedOk = true;
		} catch (err) {
			saveError = err instanceof Error ? err.message : String(err);
		} finally {
			saving = false;
		}
	}

	// Ordered show list for the picker, plus a lookup for names/counts.
	$: sortedShows = [...shows].sort((a, b) => a.show.name.localeCompare(b.show.name));
	$: selectedShow = shows.find((entry) => entry.show.id === selectedShowId) ?? null;
	// The draft diverged from what's stored, so a save would actually change things.
	$: dirty =
		selectedShowId !== null &&
		(() => {
			const stored = new Set(assignments[selectedShowId] ?? []);
			if (stored.size !== draft.size) return true;
			for (const id of draft) if (!stored.has(id)) return true;
			return false;
		})();
</script>

<section class="card bg-base-100 shadow-xl">
	<div class="card-body gap-4">
		<div class="flex flex-wrap items-center gap-3">
			<h2 class="card-title">Show cast</h2>
			<span class="badge badge-ghost font-mono text-xs">show_characters</span>
		</div>
		<p class="text-sm opacity-70">
			Assign playable characters to a show. Both the show and each character must be synced to
			Supabase first (Sync tab / the character page) — the assignment is stored in the
			<code class="font-mono">show_characters</code> join table.
		</p>

		{#if loadError}
			<div class="alert alert-error"><span>{loadError}</span></div>
		{/if}

		{#if loading}
			<div class="flex items-center gap-2 opacity-70">
				<span class="loading loading-spinner loading-sm"></span>
				<span>Loading assignments…</span>
			</div>
		{:else if shows.length === 0}
			<p class="opacity-70">No saved shows yet — add some from the Search tab first.</p>
		{:else if loaded}
			<div class="grid gap-4 md:grid-cols-[18rem_1fr]">
				<!-- Show picker -->
				<ul class="menu bg-base-200 rounded-box max-h-96 flex-nowrap overflow-y-auto p-2">
					{#each sortedShows as entry (entry.show.id)}
						{@const count = assignments[entry.show.id]?.length ?? 0}
						<li>
							<button
								type="button"
								class={classNames('flex items-center justify-between gap-2', {
									'menu-active': entry.show.id === selectedShowId
								})}
								on:click={() => selectShow(entry.show.id)}
							>
								<span class="truncate" title={entry.show.name}>{entry.show.name}</span>
								{#if count > 0}
									<span class="badge badge-primary badge-sm">{count}</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>

				<!-- Character picker for the selected show -->
				{#if selectedShow}
					<div class="flex flex-col gap-3">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="font-semibold">{selectedShow.show.name}</h3>
							<span class="badge badge-neutral badge-sm">{draft.size} selected</span>
						</div>

						<div class="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
							{#each characters as character (character.id)}
								<label
									class="hover:bg-base-200 flex cursor-pointer items-center gap-2 rounded px-2 py-1"
								>
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										checked={draft.has(character.id)}
										on:change={() => toggleCharacter(character.id)}
									/>
									<span class="truncate">{character.label}</span>
									<span class="text-base-content/40 ml-auto font-mono text-xs">{character.id}</span>
								</label>
							{/each}
						</div>

						{#if saveError}
							<div class="alert alert-error"><span>{saveError}</span></div>
						{/if}
						{#if savedOk}
							<div class="alert alert-success"><span>Assignments saved.</span></div>
						{/if}

						<div class="flex items-center gap-2">
							<button
								class="btn btn-primary btn-sm"
								type="button"
								on:click={save}
								disabled={saving || !dirty}
							>
								{#if saving}
									<span class="loading loading-spinner loading-xs"></span>
								{/if}
								Save assignments
							</button>
							{#if dirty}
								<span class="text-warning text-xs">Unsaved changes</span>
							{/if}
						</div>
					</div>
				{:else}
					<div class="text-base-content/60 flex items-center justify-center p-8 text-sm">
						Select a show to assign its characters.
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
