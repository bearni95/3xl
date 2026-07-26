<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import ClaimPackOpener from './ClaimPackOpener.svelte';
	import type { ClaimPull } from './scene/pull.type';

	// The show poster (pack cover) and its name.
	export let coverUrl: string | null = null;
	export let packLabel: string = '';
	// The claimed character(s) revealed by this open.
	export let pulls: ClaimPull[] = [];
	// Bumped on every new open so the opener canvas remounts with a fresh pack.
	export let openSession: number = 0;
	// True while the parent is rolling the next claim.
	export let openAnotherBusy: boolean = false;
	// Disable "Open another" (no location claimed, mid-open, etc).
	export let openAnotherDisabled: boolean = false;

	const dispatch = createEventDispatcher<{ close: void; openAnother: void }>();
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
	role="dialog"
	aria-modal="true"
>
	<div
		class="flex h-full max-h-full w-full max-w-6xl flex-col gap-4 overflow-hidden rounded-lg bg-base-100 p-4 shadow-2xl"
	>
		<div class="flex shrink-0 items-center justify-between gap-3">
			<div>
				<h2 class="text-lg font-bold">{packLabel}</h2>
				<p class="text-xs opacity-60">Click anywhere along the pack to slice it open</p>
			</div>
			<button type="button" class="btn btn-sm btn-ghost" on:click={() => dispatch('close')}>
				Close
			</button>
		</div>

		<div class="min-h-0 flex-1 rounded-md bg-gradient-to-b from-base-300/80 to-base-200">
			{#key openSession}
				<ClaimPackOpener {coverUrl} label={packLabel} {pulls} />
			{/key}
		</div>

		<div class="flex shrink-0 justify-end gap-2">
			<button
				type="button"
				class={classNames('btn btn-sm bg-warning text-warning-content hover:bg-warning/80', {
					'cursor-wait': openAnotherBusy
				})}
				disabled={openAnotherDisabled}
				on:click={() => dispatch('openAnother')}
			>
				{#if openAnotherBusy}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				Open another
			</button>
		</div>
	</div>
</div>
