<script lang="ts">
	import classNames from 'classnames';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { MusicTrack, MusicCollection } from '$types/music.type';
	import type { ShowsCollection } from '$types/show.type';
	import MusicTrackEditor from '$components/core/MusicTrackEditor.svelte';

	// The music read/write API is served by @3xl/backend (default :2002), which writes
	// public/music.json straight into the git tree. The songs themselves are static and
	// same-origin, served by this app's vite at /assets — which is what lets the editor
	// play one back.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The two halves this screen puts together: the songs found in @3xl/assets, and
	// what the collection says about them. The files are the list — a definition
	// answers a song, never the other way round — so a file with no entry is a row
	// waiting to be filled in, and an entry whose file has gone is reported on its own
	// below, since there is nothing left for it to be about.
	let files: string[] = [];
	let tracks: MusicTrack[] = [];
	// Every saved show, reduced to what the select needs: the collection carries every
	// image TMDB holds and none of that is wanted here.
	let shows: { id: number; name: string }[] = [];

	let loading = false;
	let loadError = '';

	// Which song's definition the editor holds, by file name, or null for none open.
	// A file is enough on its own here: unlike an achievement there is no such thing
	// as a new entry with no key yet — the key is the asset.
	let editing: string | null = null;

	let saving = false;
	let deleting = false;
	let editorError = '';

	onMount(load);

	async function load(): Promise<void> {
		if (!browser) return;
		loading = true;
		loadError = '';
		try {
			const [collectionRes, filesRes, showsRes] = await Promise.all([
				fetch(`${API_BASE}/api/music`),
				fetch(`${API_BASE}/api/music/files`),
				fetch(`${API_BASE}/api/shows`)
			]);
			if (!collectionRes.ok) throw new Error(`Failed to load music (${collectionRes.status})`);
			tracks = ((await collectionRes.json()) as MusicCollection).tracks;
			if (filesRes.ok) files = ((await filesRes.json()) as { files: string[] }).files;
			if (showsRes.ok) {
				shows = ((await showsRes.json()) as ShowsCollection).shows
					.map((entry) => ({ id: entry.show.id, name: entry.show.name }))
					.sort((a, b) => a.name.localeCompare(b.name));
			}
		} catch (error) {
			loadError = error instanceof Error ? error.message : String(error);
		} finally {
			loading = false;
		}
	}

	async function handleSave(event: CustomEvent<MusicTrack>): Promise<void> {
		saving = true;
		editorError = '';
		try {
			const res = await fetch(`${API_BASE}/api/music`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(event.detail)
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? 'Save failed');
			}
			// The response is the whole collection as it now stands on disk, so the list
			// re-renders from the file rather than from what was typed.
			tracks = ((await res.json()) as MusicCollection).tracks;
			editing = event.detail.file;
		} catch (error) {
			editorError = error instanceof Error ? error.message : String(error);
		} finally {
			saving = false;
		}
	}

	async function handleDelete(event: CustomEvent<{ file: string }>): Promise<void> {
		await remove(event.detail.file);
	}

	/**
	 * Drop a definition. The song stays where it is — this only unsays what was said
	 * about it, so the row goes back to being an undefined file (or, for an entry whose
	 * file has gone, disappears).
	 */
	async function remove(file: string): Promise<void> {
		if (!confirm(`Remove the definition for "${file}"? The song file itself stays.`)) return;
		deleting = true;
		editorError = '';
		try {
			const res = await fetch(`${API_BASE}/api/music/${file}`, { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? 'Delete failed');
			}
			tracks = ((await res.json()) as MusicCollection).tracks;
			editing = null;
		} catch (error) {
			editorError = error instanceof Error ? error.message : String(error);
		} finally {
			deleting = false;
		}
	}

	function edit(file: string): void {
		editorError = '';
		editing = file;
	}

	// The screen's one derived list: a row per song found on disk, carrying whatever the
	// collection says about it. Every lookup is written into the statements themselves
	// rather than reached through a helper — a reactive statement re-runs when the
	// variables *it* mentions change, so a `tracks` read hidden inside a function would
	// leave the rows showing what the collection said before the last save.
	$: trackByFile = new Map(tracks.map((track) => [track.file, track]));
	$: showNameById = new Map(shows.map((show) => [show.id, show.name]));
	$: rows = files.map((file) => {
		const track = trackByFile.get(file) ?? null;
		return {
			file,
			track,
			// The show as it is named on the /shows screen. An id the collection no longer
			// holds is said as itself: the row has to show that the link is broken, and the
			// editor refuses to save it until it is repointed.
			show:
				track && track.showId !== null
					? (showNameById.get(track.showId) ?? `Unknown show ${track.showId}`)
					: null
		};
	});

	$: selected = editing ? (trackByFile.get(editing) ?? null) : null;
	// Entries the assets no longer back: the file was renamed or taken out of
	// @3xl/assets and the definition was left behind. Nothing plays them, so they are
	// shown apart from the songs rather than among them.
	$: orphans = tracks.filter((track) => !files.includes(track.file));
	$: defined = rows.filter((row) => row.track !== null).length;
</script>

<div class="flex-1 bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-4xl flex-col gap-6">
		<header class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold">Music</h1>
				<span class="badge badge-neutral">{defined}/{files.length} defined</span>
			</div>
			<p class="text-sm opacity-70">
				The songs vendored in <code class="font-mono">@3xl/assets</code>'
				<code class="font-mono">public/music/</code>, and what the game says about each: its
				title, and the show it opens. Authored into
				<code class="font-mono">@3xl/data</code>'s
				<code class="font-mono">public/music.json</code>, which is what the player in the map's
				corner reads. A song is added by dropping the file into that folder — the list here is
				whatever is found in it.
			</p>
			<a class="link link-primary text-sm" href="/">← Back to stage</a>
		</header>

		<section class="card bg-base-100 shadow-xl">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center gap-3">
					<h2 class="card-title">Vendored songs</h2>
					<span class="badge badge-ghost font-mono text-xs">/data/music.json</span>
				</div>

				{#if loadError}
					<div class="alert alert-error">
						<span>{loadError}</span>
					</div>
				{:else if loading}
					<div class="flex items-center gap-2 opacity-70">
						<span class="loading loading-spinner loading-sm"></span>
						<span>Loading music…</span>
					</div>
				{:else if files.length === 0}
					<p class="text-sm opacity-60">
						No songs found. Drop an mp3 into <code class="font-mono">@3xl/assets</code>'
						<code class="font-mono">public/music/</code> and reload.
					</p>
				{:else}
					<ul class="flex flex-col gap-2">
						{#each rows as row (row.file)}
							<li>
								<button
									type="button"
									class={classNames(
										'flex w-full items-center gap-3 rounded-box border p-3 text-left transition',
										editing === row.file
											? 'border-primary bg-primary/5'
											: 'border-base-300 hover:bg-base-200'
									)}
									on:click={() => edit(row.file)}
								>
									<span class="flex min-w-0 flex-1 flex-col gap-1">
										<span class="flex items-center gap-2">
											<span class="truncate font-semibold">
												{row.track ? row.track.title : 'Not defined'}
											</span>
											{#if !row.track}
												<span class="badge badge-warning badge-xs">No definition</span>
											{:else if row.track.showId === null}
												<span class="badge badge-ghost badge-xs">No show</span>
											{/if}
										</span>
										<span class="truncate font-mono text-[10px] opacity-50">{row.file}</span>
									</span>
									{#if row.show}
										<span class="badge badge-outline shrink-0">{row.show}</span>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		{#if editing !== null}
			<section class="card bg-base-100 shadow-xl">
				<div class="card-body gap-4">
					<div class="flex items-center gap-3">
						<h2 class="card-title">
							{selected ? `${selected.title} — definition` : 'New definition'}
						</h2>
						<span class="badge badge-ghost font-mono text-xs">{editing}</span>
					</div>

					<!-- Remount per song so the draft is always the one being edited, never the
					     fields left over from the last selection. -->
					{#key editing}
						<MusicTrackEditor
							file={editing}
							track={selected}
							{shows}
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

		{#if orphans.length > 0}
			<section class="card bg-base-100 shadow-xl">
				<div class="card-body gap-4">
					<div class="flex flex-wrap items-center gap-3">
						<h2 class="card-title">Definitions with no song</h2>
						<span class="badge badge-error badge-sm">{orphans.length}</span>
					</div>
					<p class="text-sm opacity-70">
						These entries name a file that is not in <code class="font-mono">public/music/</code>
						any more. Nothing plays them — either put the file back, or remove the definition.
					</p>
					<ul class="flex flex-col gap-2">
						{#each orphans as orphan (orphan.file)}
							<li class="flex items-center gap-3 rounded-box border border-base-300 p-3">
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate font-semibold">{orphan.title}</span>
									<span class="truncate font-mono text-[10px] opacity-50">{orphan.file}</span>
								</span>
								<button
									type="button"
									class="btn btn-error btn-outline btn-xs shrink-0"
									disabled={deleting}
									on:click={() => remove(orphan.file)}
								>
									Remove definition
								</button>
							</li>
						{/each}
					</ul>
					{#if editorError && editing === null}
						<div class="alert alert-error">
							<span>{editorError}</span>
						</div>
					{/if}
				</div>
			</section>
		{/if}
	</div>
</div>
