<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';

	// The account's ways out of the panel's Profile tab: the player's own cards, the badges
	// they can earn, and the account itself (details list, username field, sign-out).
	//
	// It was three columns — the picture they wear, the reading beside it, and these — and
	// the first two are a plate at the map's top-right corner now (see PlayerPanel): who is
	// playing is worth having on screen whichever of the panel's tabs is forward, and a tab
	// can only be up by putting another one away. What is left here is the row of buttons,
	// which is the one part of the account that has nowhere else to be: each raises a modal
	// mounted at the layout root, so this tile dispatches and the host does it.
	//
	// Three across rather than three stacked: they are a row of ways out and were read as one
	// while they had two thirds of a row beside them, so filling the tile's width in a column
	// would make the account the tallest thing in a tab that is now about the account alone.

	export let classes: string = '';

	const dispatch = createEventDispatcher<{
		opensettings: void;
		openroster: void;
		openachievements: void;
	}>();
</script>

<div
	class={classNames(
		'grid w-full min-w-0 grid-cols-3 items-center gap-2 overflow-hidden rounded-md bg-base-200 p-3',
		classes
	)}
>
	<!-- What the player came to look at first, and the account's own settings last, outlined
		rather than filled. -->
	<button type="button" class="btn btn-primary btn-sm" on:click={() => dispatch('openroster')}>
		Roster
	</button>
	<button
		type="button"
		class="btn btn-primary btn-sm"
		on:click={() => dispatch('openachievements')}
	>
		Achievements
	</button>
	<button type="button" class="btn btn-outline btn-sm" on:click={() => dispatch('opensettings')}>
		Settings
	</button>
</div>
