<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import type { DisplayTMDBImage, DisplayTMDBTvImages, TMDBImageKind } from '$types/tmdb.type';

	// Image kinds rendered as separate labeled grids, in display order. `kind` is
	// the singular tag each image carries (image.kind), used to key the enabled set.
	const imageGroups: { key: 'posters' | 'backdrops' | 'logos'; kind: TMDBImageKind; label: string }[] =
		[
			{ key: 'posters', kind: 'poster', label: 'Posters' },
			{ key: 'backdrops', kind: 'backdrop', label: 'Backdrops' },
			{ key: 'logos', kind: 'logo', label: 'Logos' }
		];

	export let images: DisplayTMDBTvImages;
	export let showName: string;
	// When set, each thumbnail gains a toggle and enabled images are marked.
	// Off (the search tab) renders a plain read-only gallery.
	export let selectable: boolean = false;
	// The enabled filePaths per section, so the grid can mark each thumbnail.
	export let enabledByKind: Partial<Record<TMDBImageKind, string[]>> = {};
	// How many columns the thumbnail grid uses. The caller drives this from a
	// slider; map each value to a static Tailwind class so nothing is inlined.
	export let columns: number = 8;

	const columnClasses: Record<number, string> = {
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-4',
		5: 'grid-cols-5',
		6: 'grid-cols-6',
		7: 'grid-cols-7',
		8: 'grid-cols-8',
		9: 'grid-cols-9',
		10: 'grid-cols-10',
		11: 'grid-cols-11',
		12: 'grid-cols-12'
	};
	$: gridClass = classNames('grid gap-2', columnClasses[columns] ?? 'grid-cols-8');

	// The grid renders the groups top-to-bottom; navigation in the preview modal
	// follows that same visual order, so hand it this flattened list.
	$: orderedImages = imageGroups.flatMap((group) => images[group.key]);

	const dispatch = createEventDispatcher<{
		preview: { images: DisplayTMDBImage[]; image: DisplayTMDBImage };
		toggle: { kind: TMDBImageKind; filePath: string };
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
						{#if selectable && (enabledByKind[group.kind]?.length ?? 0) > 0}
							<span class="text-primary font-normal normal-case">
								· {enabledByKind[group.kind]?.length} enabled
							</span>
						{/if}
					</h3>
					<div class={gridClass}>
						{#each groupImages as image (image.filePath)}
							{@const isEnabled = enabledByKind[group.kind]?.includes(image.filePath) ?? false}
							<div class="relative">
								<button
									type="button"
									class={classNames(
										'bg-base-200 hover:ring-primary flex h-24 w-full cursor-pointer items-center justify-center overflow-hidden rounded transition hover:ring-2',
										{ 'ring-primary ring-2': isEnabled }
									)}
									on:click={() => dispatch('preview', { images: orderedImages, image })}
									title={`${image.kind} · ${image.width}×${image.height}${image.language ? ` · ${image.language}` : ''}`}
								>
									<img
										class={classNames('h-full w-full object-contain transition', {
											'opacity-40': selectable && !isEnabled
										})}
										src={image.thumbnailUrl}
										alt={`${image.kind} for ${showName}`}
										loading="lazy"
									/>
								</button>
								{#if selectable}
									<button
										type="button"
										class={classNames(
											'btn btn-circle btn-xs absolute right-1 top-1 border-none',
											isEnabled ? 'btn-primary' : 'btn-neutral/70'
										)}
										on:click|stopPropagation={() =>
											dispatch('toggle', { kind: group.kind, filePath: image.filePath })}
										aria-pressed={isEnabled}
										title={isEnabled ? 'Enabled — click to disable' : 'Click to enable'}
									>
										{isEnabled ? '★' : '☆'}
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>
{/if}
