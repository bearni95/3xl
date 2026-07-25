<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DisplayTMDBImage, DisplayTMDBTvImages } from '$types/tmdb.type';

	// Image kinds rendered as separate labeled grids, in display order.
	const imageGroups: { key: 'posters' | 'backdrops' | 'logos'; label: string }[] = [
		{ key: 'posters', label: 'Posters' },
		{ key: 'backdrops', label: 'Backdrops' },
		{ key: 'logos', label: 'Logos' }
	];

	export let images: DisplayTMDBTvImages;
	export let showName: string;

	// The grid renders the groups top-to-bottom; navigation in the preview modal
	// follows that same visual order, so hand it this flattened list.
	$: orderedImages = imageGroups.flatMap((group) => images[group.key]);

	const dispatch = createEventDispatcher<{
		preview: { images: DisplayTMDBImage[]; image: DisplayTMDBImage };
	}>();
</script>

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
					<div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
						{#each groupImages as image (image.filePath)}
							<button
								type="button"
								class="bg-base-200 hover:ring-primary flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded transition hover:ring-2"
								on:click={() => dispatch('preview', { images: orderedImages, image })}
								title={`${image.kind} · ${image.width}×${image.height}${image.language ? ` · ${image.language}` : ''}`}
							>
								<img
									class="h-full w-full object-contain"
									src={image.thumbnailUrl}
									alt={`${image.kind} for ${showName}`}
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
