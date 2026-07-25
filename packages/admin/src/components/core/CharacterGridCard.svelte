<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import MugenAnimationPreview from '$components/core/MugenAnimationPreview.svelte';
	import type { CharacterOption } from '@3xl/data';

	// The character this card represents, and whether it's the active selection.
	export let character: CharacterOption;
	export let selected: boolean = false;

	const dispatch = createEventDispatcher<{ select: CharacterOption }>();

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

<button type="button" class={cardClasses} on:click={handleSelect}>
	<!-- Every character's idle animation is keyed `idle` in its manifest. -->
	<MugenAnimationPreview basePath={character.basePath} animation="idle" />
	<span class="max-w-[180px] truncate text-center text-sm font-medium">{character.label}</span>
</button>
