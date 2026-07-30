<script lang="ts">
	import classNames from 'classnames';
	import Countdown from '$components/core/Countdown.svelte';
	import type { MapChallenge } from '$types/map.type';

	// The line the town panel carries under its side: how far this player has got towards
	// taking the town, and the one control that acts on it. The panel it sits on is the
	// dark plate that makes it legible over satellite imagery, so this draws itself only a
	// lighter step of that plate — enough to read as a bar of its own within it.
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
		'flex items-center justify-center gap-2 rounded bg-white/10 px-2 py-1',
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
