<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import ShowImageGrid from '$components/core/ShowImageGrid.svelte';
	import type {
		DisplayTMDBTvShow,
		DisplayTMDBTvSearchResponse,
		DisplayTMDBTvImages,
		DisplayTMDBImage
	} from '$types/tmdb.type';
	import type { ShowEntry, ShowsCollection } from '$types/show.type';

	// UI-only state. All TMDB access goes through the @3xl/backend proxy (default
	// :2002) so the API key stays server-side; this page just renders whatever the
	// endpoints return.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

	// The two views: the persisted shows.json collection (default) and TMDB search.
	type Tab = 'saved' | 'search';
	let tab: Tab = 'saved';

	// --- Saved shows (shows.json) ---------------------------------------------
	let savedShows: ShowEntry[] = [];
	let savedLoading = false;
	let savedError = '';
	// Ids already persisted, so search results can show as already added.
	let savedShowIds = new Set<number>();

	// Load the saved-show collection up front: it's the default tab, and it also
	// drives the "already added" state of the search results.
	onMount(loadSavedShows);

	async function loadSavedShows() {
		savedLoading = true;
		savedError = '';
		try {
			const res = await fetch(`${API_BASE}/api/shows`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Failed to load shows (${res.status})`);
			}
			const data = (await res.json()) as ShowsCollection;
			savedShows = data.shows;
			savedShowIds = new Set(data.shows.map((entry) => entry.show.id));
		} catch (err) {
			savedError = err instanceof Error ? err.message : String(err);
		} finally {
			savedLoading = false;
		}
	}

	// --- TMDB search ----------------------------------------------------------
	let query = '';
	let results: DisplayTMDBTvShow[] = [];
	let totalResults = 0;
	let loading = false;
	let searchError = '';
	let hasSearched = false;

	// Per-show image galleries, keyed by TMDB show id. Populated lazily after a
	// search resolves — one /api/tmdb/images request per result.
	let imagesByShow: Record<number, DisplayTMDBTvImages> = {};
	let imagesLoading: Record<number, boolean> = {};
	let imagesError: Record<number, string> = {};
	// Which results have their images section expanded. Fetching a show's images
	// is a separate TMDB call, so it happens on demand — only when a card is
	// opened (or saved), never for the whole result set at once.
	let expandedImages: Record<number, boolean> = {};

	// Per-show save state tracks the "Add to shows" button.
	let savingShow: Record<number, boolean> = {};
	let saveError: Record<number, string> = {};

	// Toggle a result's image gallery, fetching it the first time it's opened.
	function toggleImages(showId: number) {
		const open = !expandedImages[showId];
		expandedImages = { ...expandedImages, [showId]: open };
		if (open && !imagesByShow[showId] && !imagesLoading[showId]) loadImages(showId);
	}

	// Persist a search result — the show plus every image TMDB holds for it —
	// exactly as displayed, into shows.json via the backend.
	async function saveShow(show: DisplayTMDBTvShow) {
		savingShow = { ...savingShow, [show.id]: true };
		saveError = { ...saveError, [show.id]: '' };
		try {
			// Images load on demand, so a show can be saved without being expanded —
			// fetch them first if we don't have them yet.
			const images = imagesByShow[show.id] ?? (await loadImages(show.id));
			if (!images) throw new Error(imagesError[show.id] || 'Could not load images');

			const res = await fetch(`${API_BASE}/api/shows`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ show, images })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Failed to save (${res.status})`);
			}
			savedShowIds = new Set(savedShowIds).add(show.id);
			// Reflect the new entry in the saved tab without a round-trip.
			savedShows = [...savedShows.filter((entry) => entry.show.id !== show.id), { show, images }];
		} catch (err) {
			saveError = {
				...saveError,
				[show.id]: err instanceof Error ? err.message : String(err)
			};
		} finally {
			savingShow = { ...savingShow, [show.id]: false };
		}
	}

	async function search() {
		const trimmed = query.trim();
		if (!trimmed) return;

		loading = true;
		searchError = '';
		hasSearched = true;
		imagesByShow = {};
		imagesLoading = {};
		imagesError = {};
		expandedImages = {};
		try {
			const res = await fetch(`${API_BASE}/api/tmdb/search?query=${encodeURIComponent(trimmed)}`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Search failed (${res.status})`);
			}
			const data = (await res.json()) as DisplayTMDBTvSearchResponse;
			results = data.results;
			totalResults = data.totalResults;
		} catch (err) {
			results = [];
			totalResults = 0;
			searchError = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	async function loadImages(showId: number): Promise<DisplayTMDBTvImages | null> {
		imagesLoading = { ...imagesLoading, [showId]: true };
		imagesError = { ...imagesError, [showId]: '' };
		try {
			const res = await fetch(`${API_BASE}/api/tmdb/images?id=${showId}`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Failed to load images (${res.status})`);
			}
			const data = (await res.json()) as DisplayTMDBTvImages;
			imagesByShow = { ...imagesByShow, [showId]: data };
			return data;
		} catch (err) {
			imagesError = {
				...imagesError,
				[showId]: err instanceof Error ? err.message : String(err)
			};
			return null;
		} finally {
			imagesLoading = { ...imagesLoading, [showId]: false };
		}
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		search();
	}

	// --- Full-size preview modal ----------------------------------------------
	// The grid the modal was opened from, so it can page left/right across it.
	// Empty list means the modal is closed.
	let previewList: DisplayTMDBImage[] = [];
	let previewIndex = 0;
	let previewShowName = '';
	$: previewImage = previewList[previewIndex] ?? null;

	function openPreview(
		detail: { images: DisplayTMDBImage[]; image: DisplayTMDBImage },
		showName: string
	) {
		const index = detail.images.findIndex((img) => img.filePath === detail.image.filePath);
		previewList = detail.images;
		previewIndex = index < 0 ? 0 : index;
		previewShowName = showName;
	}

	function closePreview() {
		previewList = [];
	}

	// Wrap around at both ends so paging never dead-ends.
	function stepPreview(delta: number) {
		if (previewList.length === 0) return;
		previewIndex = (previewIndex + delta + previewList.length) % previewList.length;
	}

	function handleModalKeydown(event: KeyboardEvent) {
		if (previewList.length === 0) return;
		if (event.key === 'Escape') closePreview();
		else if (event.key === 'ArrowLeft') stepPreview(-1);
		else if (event.key === 'ArrowRight') stepPreview(1);
	}
</script>

<svelte:window on:keydown={handleModalKeydown} />

<div class="mx-auto max-w-5xl p-6">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">TV Shows</h1>
		<p class="text-base-content/60 text-sm">Manage saved shows and search TMDB.</p>
	</header>

	<div role="tablist" class="tabs tabs-bordered mb-6">
		<button
			role="tab"
			type="button"
			class={classNames('tab', { 'tab-active': tab === 'saved' })}
			on:click={() => (tab = 'saved')}
		>
			Saved shows
			<span class="badge badge-sm badge-neutral ml-2">{savedShows.length}</span>
		</button>
		<button
			role="tab"
			type="button"
			class={classNames('tab', { 'tab-active': tab === 'search' })}
			on:click={() => (tab = 'search')}
		>
			Search TMDB
		</button>
	</div>

	{#if tab === 'saved'}
		<!-- Saved collection from shows.json — the default view. -->
		{#if savedLoading}
			<div class="text-base-content/50 flex items-center gap-2 text-sm">
				<span class="loading loading-spinner loading-sm"></span>
				Loading saved shows…
			</div>
		{:else if savedError}
			<div class="alert alert-error mb-6" role="alert">
				<span>{savedError}</span>
			</div>
		{:else if savedShows.length === 0}
			<p class="text-base-content/60">
				No saved shows yet. Use the <button
					type="button"
					class="link"
					on:click={() => (tab = 'search')}>Search TMDB</button
				> tab to add some.
			</p>
		{:else}
			<ul class="flex flex-col gap-4">
				{#each savedShows as entry (entry.show.id)}
					{@const show = entry.show}
					<li class="card bg-base-100 border-base-300 border shadow-sm">
						<div class="flex gap-3 p-3">
							<div class="bg-base-200 h-36 w-24 shrink-0 overflow-hidden rounded">
								{#if show.posterUrl}
									<img
										class="h-full w-full object-cover"
										src={show.posterUrl}
										alt={`Poster for ${show.name}`}
										loading="lazy"
									/>
								{:else}
									<div
										class="text-base-content/40 flex h-full w-full items-center justify-center text-xs"
									>
										No image
									</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<h2 class="truncate font-semibold" title={show.name}>{show.name}</h2>
								<div class="text-base-content/60 mb-1 flex items-center gap-2 text-xs">
									<span>{show.firstAirYear}</span>
									{#if show.voteCount > 0}
										<span
											class={classNames('badge badge-sm', {
												'badge-success': show.voteAverage >= 7,
												'badge-warning': show.voteAverage >= 5 && show.voteAverage < 7,
												'badge-error': show.voteAverage < 5
											})}
										>
											★ {show.voteAverage.toFixed(1)}
										</span>
									{/if}
								</div>
								<p class="text-base-content/70 line-clamp-4 text-sm">
									{show.overview || 'No overview available.'}
								</p>
							</div>
						</div>

						<div class="border-base-300 border-t p-3">
							<ShowImageGrid
								images={entry.images}
								showName={show.name}
								on:preview={(e) => openPreview(e.detail, show.name)}
							/>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<!-- TMDB search -->
		<form class="mb-6 flex gap-2" on:submit={handleSubmit}>
			<input
				class="input input-bordered flex-1"
				type="search"
				placeholder="Search TV shows…"
				bind:value={query}
				aria-label="Search TV shows"
			/>
			<button class="btn btn-primary" type="submit" disabled={loading || !query.trim()}>
				{#if loading}
					<span class="loading loading-spinner loading-sm"></span>
				{/if}
				Search
			</button>
		</form>

		{#if searchError}
			<div class="alert alert-error mb-6" role="alert">
				<span>{searchError}</span>
			</div>
		{/if}

		{#if hasSearched && !loading && results.length === 0 && !searchError}
			<p class="text-base-content/60">No shows found for “{query.trim()}”.</p>
		{/if}

		{#if results.length > 0}
			<p class="text-base-content/60 mb-3 text-sm">
				{totalResults.toLocaleString()} result{totalResults === 1 ? '' : 's'}
			</p>
			<ul class="flex flex-col gap-4">
				{#each results as show (show.id)}
					<li class="card bg-base-100 border-base-300 border shadow-sm">
						<div class="flex gap-3 p-3">
							<div class="bg-base-200 h-36 w-24 shrink-0 overflow-hidden rounded">
								{#if show.posterUrl}
									<img
										class="h-full w-full object-cover"
										src={show.posterUrl}
										alt={`Poster for ${show.name}`}
										loading="lazy"
									/>
								{:else}
									<div
										class="text-base-content/40 flex h-full w-full items-center justify-center text-xs"
									>
										No image
									</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<h2 class="truncate font-semibold" title={show.name}>{show.name}</h2>
								<div class="text-base-content/60 mb-1 flex items-center gap-2 text-xs">
									<span>{show.firstAirYear}</span>
									{#if show.voteCount > 0}
										<span
											class={classNames('badge badge-sm', {
												'badge-success': show.voteAverage >= 7,
												'badge-warning': show.voteAverage >= 5 && show.voteAverage < 7,
												'badge-error': show.voteAverage < 5
											})}
										>
											★ {show.voteAverage.toFixed(1)}
										</span>
									{/if}
								</div>
								<p class="text-base-content/70 line-clamp-4 text-sm">
									{show.overview || 'No overview available.'}
								</p>
							</div>
							<div class="flex shrink-0 flex-col items-end gap-1">
								{#if savedShowIds.has(show.id)}
									<button class="btn btn-success btn-sm" type="button" disabled> ✓ Added </button>
								{:else}
									<button
										class="btn btn-primary btn-sm"
										type="button"
										on:click={() => saveShow(show)}
										disabled={savingShow[show.id]}
										title="Save this show and all its images to shows.json"
									>
										{#if savingShow[show.id]}
											<span class="loading loading-spinner loading-xs"></span>
										{/if}
										Add to shows
									</button>
								{/if}
								<button
									class="btn btn-ghost btn-sm"
									type="button"
									on:click={() => toggleImages(show.id)}
									aria-expanded={!!expandedImages[show.id]}
								>
									{expandedImages[show.id] ? 'Hide images' : 'Show images'}
								</button>
								{#if saveError[show.id]}
									<span class="text-error max-w-40 text-right text-xs">{saveError[show.id]}</span>
								{/if}
							</div>
						</div>

						<!-- All images TMDB holds for this show — fetched on first open. -->
						{#if expandedImages[show.id]}
							<div class="border-base-300 border-t p-3">
								{#if imagesLoading[show.id]}
									<div class="text-base-content/50 flex items-center gap-2 text-sm">
										<span class="loading loading-spinner loading-xs"></span>
										Loading images…
									</div>
								{:else if imagesError[show.id]}
									<p class="text-error text-sm">{imagesError[show.id]}</p>
								{:else if imagesByShow[show.id]}
									<ShowImageGrid
										images={imagesByShow[show.id]}
										showName={show.name}
										on:preview={(e) => openPreview(e.detail, show.name)}
									/>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>

{#if previewImage}
	<!-- Full-size image preview. Backdrop click and Escape (window handler) both close. -->
	<div
		class="modal modal-open"
		role="dialog"
		aria-modal="true"
		aria-label={`${previewImage.kind} for ${previewShowName}`}
	>
		<div class="modal-box flex max-h-[90vh] max-w-4xl flex-col gap-3 p-4">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<h3 class="truncate font-semibold" title={previewShowName}>
						{previewShowName}
					</h3>
					<p class="text-base-content/60 text-xs">
						{previewImage.kind} · {previewImage.width}×{previewImage.height}{previewImage.language
							? ` · ${previewImage.language}`
							: ''}
						{#if previewList.length > 1}
							<span class="text-base-content/40"> · {previewIndex + 1} / {previewList.length}</span>
						{/if}
					</p>
				</div>
				<button
					type="button"
					class="btn btn-sm btn-circle btn-ghost"
					on:click={closePreview}
					aria-label="Close preview"
				>
					✕
				</button>
			</div>
			<div
				class="bg-base-200 relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded"
			>
				<img
					class="max-h-[70vh] w-auto max-w-full object-contain"
					src={previewImage.fullUrl}
					alt={`${previewImage.kind} for ${previewShowName}`}
				/>
				{#if previewList.length > 1}
					<button
						type="button"
						class="btn btn-circle btn-sm absolute left-2 top-1/2 -translate-y-1/2"
						on:click={() => stepPreview(-1)}
						aria-label="Previous image"
					>
						❮
					</button>
					<button
						type="button"
						class="btn btn-circle btn-sm absolute right-2 top-1/2 -translate-y-1/2"
						on:click={() => stepPreview(1)}
						aria-label="Next image"
					>
						❯
					</button>
				{/if}
			</div>
		</div>
		<button
			type="button"
			class="modal-backdrop"
			on:click={closePreview}
			aria-label="Close preview"
		></button>
	</div>
{/if}
