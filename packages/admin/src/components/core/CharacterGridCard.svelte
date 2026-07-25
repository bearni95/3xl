<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import MugenAnimationPreview from '$components/core/MugenAnimationPreview.svelte';
	import type { CharacterOption } from '@3xl/data';
	import type { CharacterTemplateStatus } from '$types/character-template.type';

	// The character this card represents, and whether it's the active selection.
	export let character: CharacterOption;
	export let selected: boolean = false;
	// Supabase sync state for this character; `undefined` until the remote
	// templates have loaded (no badge shown while unknown).
	export let syncStatus: CharacterTemplateStatus | undefined = undefined;

	const dispatch = createEventDispatcher<{ select: CharacterOption }>();

	const statusBadge: Record<CharacterTemplateStatus, string> = {
		synced: 'badge-success',
		missing: 'badge-warning',
		mismatch: 'badge-info',
		orphan: 'badge-error'
	};
	const statusLabel: Record<CharacterTemplateStatus, string> = {
		synced: 'Synced',
		missing: 'Not synced',
		mismatch: 'Name differs',
		orphan: 'Orphan'
	};

	$: cardClasses = classNames(
		'card cursor-pointer items-center gap-2 border-2 bg-base-100 p-3 shadow-md transition',
		{
			'border-primary ring-2 ring-primary': selected,
			'border-transparent hover:border-base-300 hover:shadow-lg': !selected
		}
	);

	function handleSelect() {
		dispatch('select', character);
	}
</script>

<button type="button" class={classNames(cardClasses, 'relative')} on:click={handleSelect}>
	{#if syncStatus}
		<span class={classNames('badge badge-sm absolute right-2 top-2', statusBadge[syncStatus])}>
			{statusLabel[syncStatus]}
		</span>
	{/if}
	<!-- Every character's idle animation is keyed `idle` in its manifest. -->
	<MugenAnimationPreview basePath={character.basePath} animation="idle" />
	<span class="max-w-[180px] truncate text-center text-sm font-medium">{character.label}</span>
</button>
