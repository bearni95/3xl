<script lang="ts">
	import classNames from 'classnames';
	import Countdown from '$components/core/Countdown.svelte';
	import type { MapChallenge } from '$types/map.type';

	// The block a pin carries at its foot, under the statues holding the town: how far this
	// player has got towards taking the place, and the one control that acts on it, stacked
	// — the standing on its own row, the control under it, so the reading and the doing are
	// not competing for one line. It
	// stands on the map rather than in a panel, so it carries the same chrome the pin's own
	// plate does — enough of a surface to be read over satellite imagery, and little enough
	// to see the ground through — the picture above it needing no such thing, a character
	// being their own silhouette while text is not.
	//
	// It decides nothing: which of the button and the countdown it draws is handed to
	// it, since the rules behind that (a town cooling down after a fight, one battle at
	// a time, a full team to field) are the page's and the server's.

	export let siege: MapChallenge['siege'];
	// The control, or null while the town is cooling down and the countdown takes its
	// place.
	export let button: MapChallenge['button'] = null;
	// When the town opens up again, epoch ms. Only read when there is no button.
	export let unlocksAt: number | null = null;
	// Told the moment that deadline passes, so the page can re-read the cooldowns and
	// the button can come back without a reload.
	export let onUnlock: (() => void) | undefined = undefined;
	export let classes: string = '';
</script>

<div
	class={classNames(
		'flex flex-col items-center justify-center gap-2 rounded-lg bg-base-100/80 px-2 py-1.5 text-white shadow-lg',
		classes
	)}
>
	<!-- The same standing the sidebar's tables count out, drawn rather than said: wins
		banked against wins needed, as how much of the town has been taken. A bar is read
		at the distance a pin is looked at from, where two small numbers separated by a
		slash are not, and it is the row the button is pressed in answer to — so it is
		the width of the button, filling towards it. The figures themselves stay in the
		title, for a reader who wants the count and not the picture. -->
	<progress
		class="progress progress-primary w-full"
		value={siege.wins}
		max={siege.required}
		title="Your wins banked / wins needed to take the town: {siege.wins}/{siege.required}"
	></progress>

	{#if button}
		<button
			type="button"
			class="btn btn-primary btn-lg flex-none"
			disabled={button.disabled}
			title={button.title}
			on:click={button.onClick}
		>
			{button.label}
		</button>
	{:else if unlocksAt}
		<Countdown
			until={unlocksAt}
			title="Just fought — this town opens up again when the countdown runs out"
			classes="badge badge-ghost badge-sm flex-none font-semibold"
			on:elapsed={() => onUnlock?.()}
		/>
	{/if}
</div>
