<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import type { ClaimableShow } from '$types/character-spawn.type';

	// One claimable show: its identity + assigned character pool. Rolling happens
	// in the parent; this card only shows the show and dispatches `claim`.
	export let show: ClaimableShow;
	// The show's assigned main poster URL (from shows.json), or null for a placeholder.
	export let posterUrl: string | null = null;
	// This card's roll is in flight.
	export let claiming: boolean = false;
	// Rolling is blocked (no location claimed, or another card is mid-roll).
	export let disabled: boolean = false;
	export let error: string = '';

	const dispatch = createEventDispatcher<{ claim: void }>();
</script>

<div class="card overflow-hidden bg-base-200 shadow-sm">
	<figure class="aspect-[2/3] w-full bg-base-300">
		{#if posterUrl}
			<img
				class="h-full w-full object-cover"
				src={posterUrl}
				alt={`Poster for ${show.name}`}
				loading="lazy"
			/>
		{:else}
			<div class="flex h-full w-full items-center justify-center text-xs opacity-40">No image</div>
		{/if}
	</figure>
	<div class="card-body gap-2 p-3">
		<h3 class="text-sm font-semibold leading-tight" title={show.name}>{show.name}</h3>
		<span class="text-xs opacity-60">
			{show.characterIds.length} character{show.characterIds.length === 1 ? '' : 's'}
		</span>
		<button
			class={classNames('btn btn-primary btn-sm', { 'btn-disabled': disabled || claiming })}
			on:click={() => dispatch('claim')}
		>
			{#if claiming}
				<span class="loading loading-spinner loading-xs"></span>
				Spawning…
			{:else}
				Spawn
			{/if}
		</button>
		{#if error}
			<span class="text-error text-xs">{error}</span>
		{/if}
	</div>
</div>
