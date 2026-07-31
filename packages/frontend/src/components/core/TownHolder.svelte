<script lang="ts">
	import classNames from 'classnames';
	import { _ } from 'svelte-i18n';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';
	import type { SpawnColor } from '$types/character-spawn.type';

	// Who is holding the town, on the plate that names it: the face they wear and what
	// they are called, on the row between the place's name and how far it has been
	// taken — so a pin reads what the place is, whose it is, and what may be done about
	// it, in that order, on one surface.
	//
	// The face is the very avatar their profile card wears (see PlayerAvatar), read off
	// their profile row rather than copied onto the town, so a player who changes it is
	// changed on every town they hold. It is somebody else's face, which is why it is
	// told not to fall back to the reader's team colour: the letter avatar of a stranger
	// stands on nothing.
	//
	// It carries no surface of its own, for the same reason TownChallenge carries none:
	// it is already on the plate's, and a second one would print a card inside a card.

	export let name: string;
	// The two halves of the avatar being worn, which are only ever read together —
	// both null is the initial-letter avatar, drawn off the name beside it.
	export let characterId: string | null = null;
	export let color: SpawnColor | null = null;
	export let classes: string = '';

	// The letter stands on the name shown and nothing else, exactly as it does on the
	// player's own card — a holder who never named themselves is already worded by the
	// adapter, and the letter follows whatever that wording is.
	$: initial = (name || '?').charAt(0).toUpperCase();
</script>

<!-- `min-w-0` on the name is what lets a long username truncate inside the plate
	rather than push it wider: a flex item's floor is its content otherwise. -->
<div class={classNames('flex items-center gap-2', classes)} title={$_('map.holder.title')}>
	<PlayerAvatar
		{characterId}
		{color}
		{initial}
		ownColors={false}
		size="w-6"
		textClasses="text-xs font-bold"
		classes="flex-none"
	/>
	<span class="min-w-0 truncate text-xs font-semibold">{name}</span>
</div>
