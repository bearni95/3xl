<script lang="ts">
	import classNames from 'classnames';
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import { MUSIC_TITLE_MAX_LENGTH, type MusicTrack, type MusicCollection } from '$types/music.type';
	import type { ShowsCollection } from '$types/show.type';
	import { musicTrackSrc } from '$utils/music/tracks';
	import {
		dailyShowShuffles,
		nextUtcMidnightMs,
		utcDayIso,
		utcMidnightMs
	} from '$utils/music/daily-shuffle';
	import { shiftDayIso } from '$utils/festes/catalan-day';

	// One row per song found in @3xl/assets, and the row is the definition: the name is
	// typed in it, the show is picked in it, and the song is played from it. There is no
	// editor to open first — a definition is three fields, and every one of them fits in
	// a cell, so an intermediate form would only have hidden them behind a click.
	//
	// The music read/write API is served by @3xl/backend (default :2002), which writes
	// public/music.json straight into the git tree. The songs themselves are static and
	// same-origin, served by this app's vite at /assets — which is what lets a row play
	// one back.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The two halves this screen puts together: the songs found in @3xl/assets, and what
	// the collection says about them. The files are the list — a definition answers a
	// song, never the other way round — so a file with no entry is a row waiting to be
	// filled in, and an entry whose file has gone is reported on its own below, since
	// there is nothing left for it to be about.
	let files: string[] = [];
	let tracks: MusicTrack[] = [];
	// Every saved show, reduced to what the select needs: the collection carries every
	// image TMDB holds and none of that is wanted here.
	let shows: { id: number; name: string }[] = [];

	let loading = false;
	let loadError = '';

	/** What a row's two fields currently say, which is not yet what the file says. */
	interface MusicDraft {
		title: string;
		showId: number | null;
	}

	// One draft per song, by file name. Held apart from `tracks` so that saving one row
	// cannot throw away what is half-typed in another: only the row that was saved is
	// re-seeded from the response.
	let drafts = new Map<string, MusicDraft>();

	// Which row is in flight, so only that row's button spins and the rest stay usable.
	let savingFile: string | null = null;
	let deletingFile: string | null = null;
	// The last refusal per row, in the server's own words.
	let errorByFile = new Map<string, string>();

	// The preview: one element for the whole table, because two songs playing over each
	// other tells the author nothing. `loadedFile` is what its src points at and
	// `playing` comes off its own events, so a row's button says what the element is
	// really doing rather than what it was last told to do.
	let preview: HTMLAudioElement | null = null;
	let loadedFile: string | null = null;
	let playing = false;

	// The day the shuffle below is shown for. Today by default; steppable, because a
	// per-day order is only visibly a per-day order when two days can be put side by
	// side. `today` is read once — this screen is not open across a midnight.
	const today = utcDayIso();
	let shuffleDay = today;

	onMount(load);
	// The preview is this screen's, unlike the player on the map: leaving the page is
	// the end of listening to a file you are naming.
	onDestroy(() => preview?.pause());

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
			// Every row starts on what the file says — an undefined song on empty fields.
			drafts = new Map(files.map((file) => [file, draftOf(entryFor(tracks, file))]));
		} catch (error) {
			loadError = error instanceof Error ? error.message : String(error);
		} finally {
			loading = false;
		}
	}

	function entryFor(collection: MusicTrack[], file: string): MusicTrack | null {
		return collection.find((track) => track.file === file) ?? null;
	}

	function draftOf(track: MusicTrack | null): MusicDraft {
		return { title: track?.title ?? '', showId: track?.showId ?? null };
	}

	/**
	 * Replace one row's draft. A new Map rather than a mutation: the rows, and the
	 * dirty/valid reading each of them shows, are derived from `drafts`, and a mutated
	 * Map is the same Map as far as that derivation is concerned.
	 */
	function setDraft(file: string, change: Partial<MusicDraft>): void {
		const current = drafts.get(file) ?? { title: '', showId: null };
		drafts = new Map(drafts).set(file, { ...current, ...change });
		if (errorByFile.has(file)) {
			errorByFile = new Map(errorByFile);
			errorByFile.delete(file);
		}
	}

	function setError(file: string, message: string): void {
		errorByFile = new Map(errorByFile).set(file, message);
	}

	function clearError(file: string): void {
		if (!errorByFile.has(file)) return;
		const next = new Map(errorByFile);
		next.delete(file);
		errorByFile = next;
	}

	/** Write one row into the collection. The row's own draft is what is sent. */
	async function save(file: string): Promise<void> {
		const draft = drafts.get(file);
		if (!draft) return;
		savingFile = file;
		clearError(file);
		try {
			const res = await fetch(`${API_BASE}/api/music`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ file, title: draft.title.trim(), showId: draft.showId })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? 'Save failed');
			}
			// The response is the whole collection as it now stands on disk, so the table
			// re-renders from the file rather than from what was typed — and this row's
			// draft is re-seeded from it, which is what makes the row stop reading dirty.
			tracks = ((await res.json()) as MusicCollection).tracks;
			drafts = new Map(drafts).set(file, draftOf(entryFor(tracks, file)));
		} catch (error) {
			setError(file, error instanceof Error ? error.message : String(error));
		} finally {
			savingFile = null;
		}
	}

	/**
	 * Drop a definition. The song stays where it is — this only unsays what was said
	 * about it, so the row goes back to being an undefined file (or, for an entry whose
	 * file has gone, disappears).
	 */
	async function remove(file: string): Promise<void> {
		if (!confirm(`Remove the definition for "${file}"? The song file itself stays.`)) return;
		deletingFile = file;
		clearError(file);
		try {
			const res = await fetch(`${API_BASE}/api/music/${file}`, { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? 'Delete failed');
			}
			tracks = ((await res.json()) as MusicCollection).tracks;
			drafts = new Map(drafts).set(file, draftOf(null));
		} catch (error) {
			setError(file, error instanceof Error ? error.message : String(error));
		} finally {
			deletingFile = null;
		}
	}

	/**
	 * Play this song, or pause it if it is the one already running. Switching rows
	 * pauses what was playing first, so the element only ever carries one song: the
	 * `pause` that the src change fires is the same event the button reads, which is why
	 * `playing` is never set by hand.
	 */
	function togglePlay(file: string): void {
		if (!browser) return;
		const audio = (preview ??= newPreview());
		if (loadedFile === file && playing) {
			audio.pause();
			return;
		}
		if (loadedFile !== file) {
			audio.pause();
			audio.src = musicTrackSrc(file);
			loadedFile = file;
		}
		// A refused play (a file that will not decode) leaves the element paused, and its
		// own event has already said so — there is nothing to set here.
		void audio.play().catch(() => undefined);
	}

	function newPreview(): HTMLAudioElement {
		const audio = new Audio();
		audio.preload = 'metadata';
		audio.addEventListener('play', () => (playing = true));
		audio.addEventListener('pause', () => (playing = false));
		audio.addEventListener('ended', () => (playing = false));
		return audio;
	}

	// The table's one derived list. Every lookup is written into the statements
	// themselves rather than reached through a helper — a reactive statement re-runs when
	// the variables *it* mentions change, so a `tracks` or `drafts` read hidden inside a
	// function would leave the rows showing what they said before the last keystroke.
	$: trackByFile = new Map(tracks.map((track) => [track.file, track]));
	$: showNameById = new Map(shows.map((show) => [show.id, show.name]));
	$: rows = files.map((file) => {
		const track = trackByFile.get(file) ?? null;
		const draft = drafts.get(file) ?? { title: '', showId: null };
		const title = draft.title.trim();
		return {
			file,
			track,
			draft,
			// What the backend will insist on, read here so the row's Save says so before a
			// round trip does: a name that is there and fits, and a link naming a show the
			// game actually holds.
			valid:
				title.length > 0 &&
				title.length <= MUSIC_TITLE_MAX_LENGTH &&
				(draft.showId === null || showNameById.has(draft.showId)),
			// An undefined song is dirty the moment it has a name, since saving it is what
			// defines it at all.
			dirty: !track || track.title !== title || track.showId !== draft.showId
		};
	});

	// Entries the assets no longer back: the file was renamed or taken out of
	// @3xl/assets and the definition was left behind. Nothing plays them, so they are
	// shown apart from the songs rather than among them.
	$: orphans = tracks.filter((track) => !files.includes(track.file));
	$: defined = rows.filter((row) => row.track !== null).length;

	// The day's order, per show. Only songs the assets actually back are in it: an entry
	// whose file has gone is in no order, because nothing can play it. Every lookup is
	// spelled out in the statement for the same reason the rows' are — a `tracks` read
	// hidden behind a helper would not re-run these when a row is saved.
	$: playable = tracks.filter((track) => files.includes(track.file));
	$: shuffles = dailyShowShuffles(playable, shuffleDay);
	$: shuffleMidnight = utcMidnightMs(shuffleDay);
	$: turnsOver = nextUtcMidnightMs(shuffleDay);
</script>

<div class="flex-1 bg-base-200 p-6 md:p-10">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold">Music</h1>
				<span class="badge badge-neutral">{defined}/{files.length} defined</span>
			</div>
			<p class="text-sm opacity-70">
				The songs vendored in <code class="font-mono">@3xl/assets</code>'
				<code class="font-mono">public/music/</code>, and what the game says about each: its
				name, and the show it opens. Play a row to hear which song it is, then name it and
				link it — Save writes that row into
				<code class="font-mono">@3xl/data</code>'s
				<code class="font-mono">public/music.json</code>, which is what the player in the map's
				corner reads. A song is added by dropping the file into that folder; the table is
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
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th class="w-10"></th>
									<th>Song</th>
									<th class="w-1/3">Name</th>
									<th class="w-1/3">Show</th>
									<th class="text-right">Definition</th>
								</tr>
							</thead>
							<tbody>
								{#each rows as row (row.file)}
									<tr class={classNames({ 'bg-base-200': loadedFile === row.file && playing })}>
										<td>
											<!-- The song itself, so the author can hear which one they are naming: a
												file name is not enough to tell two openings apart. -->
											<button
												type="button"
												class="btn btn-circle btn-ghost btn-sm"
												aria-label={loadedFile === row.file && playing
													? `Pause ${row.file}`
													: `Play ${row.file}`}
												on:click={() => togglePlay(row.file)}
											>
												{#if loadedFile === row.file && playing}
													<svg
														viewBox="0 0 24 24"
														fill="currentColor"
														class="size-4"
														aria-hidden="true"
													>
														<path d="M6 5h4v14H6zM14 5h4v14h-4z" />
													</svg>
												{:else}
													<svg
														viewBox="0 0 24 24"
														fill="currentColor"
														class="size-4"
														aria-hidden="true"
													>
														<path d="M8 5v14l11-7z" />
													</svg>
												{/if}
											</button>
										</td>
										<td>
											<div class="font-mono text-xs">{row.file}</div>
											{#if !row.track}
												<span class="badge badge-warning badge-xs">No definition</span>
											{/if}
										</td>
										<td>
											<input
												class={classNames('input input-sm input-bordered w-full', {
													'input-error': row.draft.title.length > 0 && !row.valid
												})}
												placeholder="We are"
												maxlength={MUSIC_TITLE_MAX_LENGTH}
												value={row.draft.title}
												on:input={(event) =>
													setDraft(row.file, { title: event.currentTarget.value })}
											/>
										</td>
										<td>
											<!-- The saved shows and nothing else: the link is what puts the show's
												glyph on the plate in the map's corner, so it has to name a show the
												game holds. A song that opens none is left on the first option and
												lettered by its name alone. -->
											<select
												class={classNames('select select-sm select-bordered w-full', {
													'select-error': !row.valid && row.draft.title.length > 0
												})}
												aria-label={`Show for ${row.file}`}
												value={row.draft.showId === null ? '' : String(row.draft.showId)}
												on:change={(event) =>
													setDraft(row.file, {
														showId: event.currentTarget.value
															? Number(event.currentTarget.value)
															: null
													})}
											>
												<option value="">— No show —</option>
												{#each shows as show (show.id)}
													<option value={String(show.id)}>{show.name}</option>
												{/each}
												<!-- An id the saved collection no longer holds: kept as an option of
													its own so the row shows what the file says instead of silently
													reading as "no show", and refused until it is repointed. -->
												{#if row.draft.showId !== null && !showNameById.has(row.draft.showId)}
													<option value={String(row.draft.showId)}>
														Unknown show {row.draft.showId}
													</option>
												{/if}
											</select>
										</td>
										<td>
											<div class="flex items-center justify-end gap-2">
												<button
													class="btn btn-primary btn-sm"
													type="button"
													disabled={!row.dirty || !row.valid || savingFile === row.file}
													on:click={() => save(row.file)}
												>
													{#if savingFile === row.file}
														<span class="loading loading-spinner loading-xs"></span>
													{/if}
													{row.track ? 'Save' : 'Define'}
												</button>
												{#if row.track}
													<button
														class="btn btn-ghost btn-sm"
														type="button"
														disabled={deletingFile === row.file}
														on:click={() => remove(row.file)}
													>
														{#if deletingFile === row.file}
															<span class="loading loading-spinner loading-xs"></span>
														{/if}
														Remove
													</button>
												{/if}
											</div>
										</td>
									</tr>
									{#if errorByFile.has(row.file)}
										<tr>
											<td colspan="5" class="pt-0">
												<div class="alert alert-error py-2 text-sm">
													<span>{errorByFile.get(row.file)}</span>
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</section>

		<section class="card bg-base-100 shadow-xl">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center gap-3">
					<h2 class="card-title">Daily shuffle</h2>
					<span class="badge badge-ghost font-mono text-xs">
						{Number.isFinite(shuffleMidnight) ? shuffleMidnight : '—'}
					</span>
				</div>
				<p class="text-sm opacity-70">
					A show with a dozen themes would otherwise open with the same one for ever, so each
					show's songs are put in a different order every day. The order is not rolled and not
					stored: it is drawn from a seed hashed out of the show's id and the day's midnight UTC
					as a Unix timestamp — the number in the badge above — so anyone asking on that day
					gets this same order, each show is ordered independently of every other, and all of
					them turn over at once when the timestamp does. Step the day to watch it move.
				</p>

				<div class="flex flex-wrap items-center gap-2">
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						aria-label="Previous day"
						on:click={() => (shuffleDay = shiftDayIso(shuffleDay, -1))}
					>
						←
					</button>
					<input
						type="date"
						class="input input-sm input-bordered"
						aria-label="Shuffle day"
						bind:value={shuffleDay}
					/>
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						aria-label="Next day"
						on:click={() => (shuffleDay = shiftDayIso(shuffleDay, 1))}
					>
						→
					</button>
					<button
						type="button"
						class="btn btn-outline btn-sm"
						disabled={shuffleDay === today}
						on:click={() => (shuffleDay = today)}
					>
						Today
					</button>
					{#if Number.isFinite(turnsOver)}
						<span class="text-xs opacity-60">
							turns over {new Date(turnsOver).toISOString().replace('T', ' ').slice(0, 16)} UTC
						</span>
					{/if}
				</div>

				{#if shuffles.length === 0}
					<p class="text-sm opacity-60">
						Nothing to order yet — a song is in a show's shuffle once it has a definition and
						its file is still in <code class="font-mono">public/music/</code>.
					</p>
				{:else}
					<div class="grid gap-4 md:grid-cols-2">
						{#each shuffles as shuffle (shuffle.showId ?? 'none')}
							<div class="rounded-box border border-base-300 p-4">
								<div class="mb-3 flex flex-wrap items-baseline gap-2">
									<h3 class="font-semibold">
										{shuffle.showId === null
											? 'No show'
											: (showNameById.get(shuffle.showId) ?? `Unknown show ${shuffle.showId}`)}
									</h3>
									<span class="badge badge-neutral badge-sm">{shuffle.tracks.length}</span>
									<!-- The seed itself, because the whole claim of this panel is that the
										order is derived and not rolled: a reader can hash the id and the
										timestamp and get this number back. -->
									<span class="font-mono text-xs opacity-50">seed {shuffle.seed}</span>
								</div>
								<ol class="flex flex-col gap-1">
									{#each shuffle.tracks as track, position (track.file)}
										<li
											class={classNames('flex items-baseline gap-2 rounded px-2 py-1', {
												'bg-base-200': loadedFile === track.file && playing
											})}
										>
											<span class="w-6 shrink-0 text-right font-mono text-xs opacity-50">
												{position + 1}
											</span>
											<!-- The same one preview element the table above plays through, so
												hearing a song from here is hearing the song, not a second copy
												of it over the first. -->
											<button
												type="button"
												class="link link-hover text-left text-sm"
												on:click={() => togglePlay(track.file)}
											>
												{track.title}
											</button>
											<span class="ml-auto truncate font-mono text-xs opacity-40">
												{track.file}
											</span>
										</li>
									{/each}
								</ol>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</section>

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
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<tbody>
								{#each orphans as orphan (orphan.file)}
									<tr>
										<td>
											<div class="font-medium">{orphan.title}</div>
											<div class="font-mono text-xs opacity-50">{orphan.file}</div>
										</td>
										<td class="text-right">
											<button
												type="button"
												class="btn btn-error btn-outline btn-sm"
												disabled={deletingFile === orphan.file}
												on:click={() => remove(orphan.file)}
											>
												{#if deletingFile === orphan.file}
													<span class="loading loading-spinner loading-xs"></span>
												{/if}
												Remove definition
											</button>
										</td>
									</tr>
									{#if errorByFile.has(orphan.file)}
										<tr>
											<td colspan="2" class="pt-0">
												<div class="alert alert-error py-2 text-sm">
													<span>{errorByFile.get(orphan.file)}</span>
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</section>
		{/if}
	</div>
</div>
