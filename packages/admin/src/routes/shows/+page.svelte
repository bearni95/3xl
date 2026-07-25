<script lang="ts">
	import classNames from 'classnames';
	import type {
		DisplayTMDBTvShow,
		DisplayTMDBTvSearchResponse,
		DisplayTMDBTvImages,
		DisplayTMDBImage
	} from '$types/tmdb.type';

	// Image kinds rendered as separate labeled grids, in display order.
	const imageGroups: { key: 'posters' | 'backdrops' | 'logos'; label: string }[] = [
		{ key: 'posters', label: 'Posters' },
		{ key: 'backdrops', label: 'Backdrops' },
		{ key: 'logos', label: 'Logos' }
	];

	// UI-only state. All TMDB access goes through the @3xl/backend proxy (default
	// :2002) so the API key stays server-side; this page just renders whatever the
	// endpoints return.
	const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2002';

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

	async function search() {
		const trimmed = query.trim();
		if (!trimmed) return;

		loading = true;
		searchError = '';
		hasSearched = true;
		imagesByShow = {};
		imagesLoading = {};
		imagesError = {};
		try {
			const res = await fetch(`${API_BASE}/api/tmdb/search?query=${encodeURIComponent(trimmed)}`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(body.message ?? `Search failed (${res.status})`);
			}
			const data = (await res.json()) as DisplayTMDBTvSearchResponse;
			results = data.results;
			totalResults = data.totalResults;
			for (const show of results) loadImages(show.id);
		} catch (err) {
			results = [];
			totalResults = 0;
			searchError = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	async function loadImages(showId: number) {
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
		} catch (err) {
			imagesError = {
				...imagesError,
				[showId]: err instanceof Error ? err.message : String(err)
			};
		} finally {
			imagesLoading = { ...imagesLoading, [showId]: false };
		}
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		search();
	}

	// Image opened in the full-size modal, or null when the modal is closed.
	let previewImage: (DisplayTMDBImage & { showName: string }) | null = null;

	function openPreview(image: DisplayTMDBImage, showName: string) {
		previewImage = { ...image, showName };
	}

	function closePreview() {
		previewImage = null;
	}

	function handleModalKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') closePreview();
	}
</script>

<svelte:window on:keydown={handleModalKeydown} />

<div class="mx-auto max-w-5xl p-6">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">TV Shows</h1>
		<p class="text-base-content/60 text-sm">Search TV shows on TMDB.</p>
	</header>

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
					</div>

					<!-- All images TMDB holds for this show -->
					<div class="border-base-300 border-t p-3">
						{#if imagesLoading[show.id]}
							<div class="text-base-content/50 flex items-center gap-2 text-sm">
								<span class="loading loading-spinner loading-xs"></span>
								Loading images…
							</div>
						{:else if imagesError[show.id]}
							<p class="text-error text-sm">{imagesError[show.id]}</p>
						{:else if imagesByShow[show.id]}
							{@const images = imagesByShow[show.id]}
							{#if images.all.length === 0}
								<p class="text-base-content/50 text-sm">No images available.</p>
							{:else}
								<div class="flex flex-col gap-4">
									{#each imageGroups as group (group.key)}
										{@const groupImages = images[group.key]}
										{#if groupImages.length > 0}
											<section>
												<h3 class="text-base-content/60 mb-2 text-xs font-semibold uppercase">
													{group.label}
													<span class="text-base-content/40 font-normal normal-case">
														· {groupImages.length}
													</span>
												</h3>
												<div
													class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
												>
													{#each groupImages as image (image.filePath)}
														<button
															type="button"
															class="bg-base-200 flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded transition hover:ring-2 hover:ring-primary"
															on:click={() => openPreview(image, show.name)}
															title={`${image.kind} · ${image.width}×${image.height}${image.language ? ` · ${image.language}` : ''}`}
														>
															<img
																class="h-full w-full object-contain"
																src={image.thumbnailUrl}
																alt={`${image.kind} for ${show.name}`}
																loading="lazy"
															/>
														</button>
													{/each}
												</div>
											</section>
										{/if}
									{/each}
								</div>
							{/if}
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if previewImage}
	<!-- Full-size image preview. Backdrop click and Escape (window handler) both close. -->
	<div
		class="modal modal-open"
		role="dialog"
		aria-modal="true"
		aria-label={`${previewImage.kind} for ${previewImage.showName}`}
	>
		<div class="modal-box flex max-h-[90vh] max-w-4xl flex-col gap-3 p-4">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<h3 class="truncate font-semibold" title={previewImage.showName}>
						{previewImage.showName}
					</h3>
					<p class="text-base-content/60 text-xs">
						{previewImage.kind} · {previewImage.width}×{previewImage.height}{previewImage.language
							? ` · ${previewImage.language}`
							: ''}
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
			<div class="bg-base-200 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded">
				<img
					class="max-h-[70vh] w-auto max-w-full object-contain"
					src={previewImage.fullUrl}
					alt={`${previewImage.kind} for ${previewImage.showName}`}
				/>
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
