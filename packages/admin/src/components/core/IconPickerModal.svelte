<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import capitalize from '$utils/string/capitalize';
	import GameIcon from '$components/core/GameIcon.svelte';

	// Every pickable glyph, as `<folder>/<slug>`, from GET /api/achievements/icons or
	// GET /api/shows/icons — the same directory listing the matching save validates
	// against, which is what keeps this from offering one the API would refuse. Which
	// of the two sets it is depends on what is being badged: a show may also take the
	// per-show `shows` marks, a badge may not.
	export let icons: string[] = [];
	export let selected: string = '';
	export let open: boolean = false;

	const dispatch = createEventDispatcher<{ select: { icon: string }; close: void }>();

	// The whole game-icons.net set is a few thousand glyphs, and each tile is its
	// own request for its own file, so the grid is drawn a page at a time: the
	// filter is the way through the set, and "show more" is there for browsing.
	const PAGE_SIZE = 120;

	let query = '';
	let limit = PAGE_SIZE;

	// Each opening starts from the whole set rather than from whatever was typed
	// the last time the modal was up. `query` is only assigned here, so this runs
	// on `open` alone and typing doesn't clear itself.
	$: if (open) query = '';
	// A new search is a new first page — same trick, `limit` is only written here.
	$: query, (limit = PAGE_SIZE);

	$: needle = query.trim().toLowerCase();
	$: filtered = needle ? icons.filter((icon) => icon.toLowerCase().includes(needle)) : icons;
	$: shown = filtered.slice(0, limit);

	/** `lorc/bordered-shield` → "Bordered Shield", the artist kept as its own line. */
	function label(icon: string): string {
		return capitalize(icon.split('/')[1] ?? icon);
	}

	function artist(icon: string): string {
		return icon.split('/')[0] ?? '';
	}

	function choose(icon: string): void {
		dispatch('select', { icon });
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (open && event.key === 'Escape') dispatch('close');
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div class="modal modal-open" role="dialog" aria-modal="true" aria-label="Choose an icon">
		<div class="modal-box flex max-h-[85vh] max-w-3xl flex-col gap-4">
			<div class="flex items-start justify-between gap-3">
				<div>
					<h3 class="font-semibold">Choose an icon</h3>
					<p class="text-base-content/60 text-xs">
						The artwork already vendored in <code class="font-mono">@3xl/assets</code>
						({icons.length} available). Drop an SVG into
						<code class="font-mono">public/icons/&lt;artist&gt;/</code> to add one.
					</p>
				</div>
				<button
					type="button"
					class="btn btn-sm btn-circle btn-ghost"
					on:click={() => dispatch('close')}
					aria-label="Close icon picker"
				>
					✕
				</button>
			</div>

			<input
				class="input input-bordered input-sm w-full"
				type="search"
				placeholder="Filter icons…"
				bind:value={query}
			/>

			{#if filtered.length === 0}
				<p class="text-base-content/50 py-6 text-center text-sm">No icon matches “{query}”.</p>
			{:else}
				<div class="flex min-h-0 flex-col gap-3 overflow-y-auto">
					<div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
						{#each shown as icon (icon)}
							<button
								type="button"
								class={classNames(
									'flex flex-col items-center gap-1 rounded-box border p-2 text-center transition',
									icon === selected
										? 'border-primary bg-primary/10'
										: 'border-transparent hover:bg-base-200'
								)}
								on:click={() => choose(icon)}
								aria-pressed={icon === selected}
							>
								<GameIcon name={icon} size="size-14" />
								<span class="w-full truncate text-xs" title={icon}>{label(icon)}</span>
								<span class="text-base-content/50 w-full truncate text-[10px]">{artist(icon)}</span>
							</button>
						{/each}
					</div>

					<div class="flex items-center justify-center gap-3 pb-1">
						<span class="text-base-content/50 text-xs">
							Showing {shown.length} of {filtered.length}{needle ? ' matches' : ''}
						</span>
						{#if shown.length < filtered.length}
							<button
								type="button"
								class="btn btn-xs"
								on:click={() => (limit += PAGE_SIZE)}
							>
								Show more
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
		<button
			type="button"
			class="modal-backdrop"
			on:click={() => dispatch('close')}
			aria-label="Close icon picker"
		></button>
	</div>
{/if}
