<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import ClaimPackOpener from './ClaimPackOpener.svelte';
	import type { ClaimPull } from './scene/pull.type';
	import { cardHref } from './scene/card-url';

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

	// Link to the standalone /card page for the revealed card (opens in a new tab),
	// where it renders as a shareable animated GIF. Null until a card is revealed.
	$: cardLink = pulls.length > 0 ? cardHref(pulls[0]) : null;
</script>

<div class="card h-full min-h-[32rem] w-full bg-base-100 shadow-xl">
	<div class="card-body gap-4 p-4">
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
			{#if cardLink}
				<a
					class="btn btn-sm btn-ghost"
					href={cardLink}
					target="_blank"
					rel="noopener noreferrer"
				>
					Open card ↗
				</a>
			{/if}
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
