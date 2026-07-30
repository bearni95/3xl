<script lang="ts">
	import classNames from 'classnames';
	import Countdown from '$components/core/Countdown.svelte';
	import type { MapChallenge } from '$types/map.type';

	// The line a pin carries at its foot, under the statues holding the town: how far this
	// player has got towards taking the place, and the one control that acts on it. It
	// stands on the map rather than in a panel, so it carries the same chrome the pin's own
	// plate does — enough of a surface to be read over satellite imagery, and little enough
	// to see the ground through — the picture above it needing no such thing, a character
	// being their own silhouette while text is not.
	//
	// It decides nothing: which of the button and the countdown it draws is handed to
	// it, since the rules behind that (one fight per town per day, one battle at a
	// time, a full team to field) are the page's and the server's.

	export let siege: MapChallenge['siege'];
	// The control, or null when today's fight is spent and the countdown takes its place.
	export let button: MapChallenge['button'] = null;
	// When the town opens up again, epoch ms. Only read when there is no button.
	export let unlocksAt: number | null = null;
	// Told the moment that deadline passes, so the page can re-read the day's
	// challenges and the button can come back without a reload.
	export let onUnlock: (() => void) | undefined = undefined;
	export let classes: string = '';
</script>

<div
	class={classNames(
		'flex items-center justify-center gap-2 rounded-lg bg-base-100/80 px-2 py-1.5 text-white shadow-lg',
		classes
	)}
>
	<!-- The same counter the sidebar's tables carry, in the same terms: wins banked
		over wins needed, so a town never states the figure two ways. -->
	<span
		class="flex flex-none items-center gap-1.5 text-xs tabular-nums"
		title="Your wins banked / wins needed to take the town"
	>
		<span class="font-bold uppercase tracking-wide opacity-60">Siege</span>
		<span class={siege.wins > 0 ? 'font-semibold' : 'opacity-70'}>
			{siege.wins}/{siege.required}
		</span>
	</span>

	{#if button}
		<button
			type="button"
			class="btn btn-primary btn-xs flex-none"
			disabled={button.disabled}
			title={button.title}
			on:click={button.onClick}
		>
			{button.label}
		</button>
	{:else if unlocksAt}
		<Countdown
			until={unlocksAt}
			title="Already challenged today — the next one unlocks at midnight"
			classes="badge badge-ghost badge-sm flex-none font-semibold"
			on:elapsed={() => onUnlock?.()}
		/>
	{/if}
</div>
