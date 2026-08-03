<script lang="ts">
	import classNames from 'classnames';
	import { _, locale } from 'svelte-i18n';
	import { openSignIn } from '$services/signInModal';

	// The door, at the foot of the map: one button, in the slot the account's own plate
	// takes once there is an account (see PlayerPanel). The column reads the same either
	// way — who is playing, or the way to become someone who is.
	//
	// It was the whole form standing open here: the gate's two checkboxes, four document
	// links, a paragraph of fine print and the provider button, on a plate of its own. All
	// of it was true and none of it was asked for yet, and it took the height of the corner
	// to say what one word says. So the corner says the word and the paperwork is behind it
	// (see SignInModal) — which is also what lets the documents be read on the sheet without
	// the map's corner having to survive being read over.
	//
	// No plate under it: a button brings its own ground, the way the statues above it do,
	// so what stands in this corner is the door itself rather than a panel about it. Whether
	// there is a door to draw at all is the host's to say — the corner it stands in only
	// exists when there is something to put in it, and the host answers the whole of the
	// session's three states rather than two of them, so nothing is drawn while the session
	// is still being read (see the map page).

	export let classes: string = '';
</script>

<!-- The label is an i18n message; wait for the locale, or the corner would show an empty
	button and then fill it. -->
{#if $locale}
	<button
		type="button"
		class={classNames('btn btn-primary w-full shadow-xl', classes)}
		on:click={openSignIn}
	>
		{$_('profile.access')}
	</button>
{/if}
