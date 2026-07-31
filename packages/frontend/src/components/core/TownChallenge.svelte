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
	<!-- The same standing the sidebar's tables count out, drawn and said at once: wins
		banked against wins needed, as how much of the town has been taken, with the count
		itself standing in the bar. The picture is what carries at the distance a pin is
		looked at from and the figures are what a reader checks once they are close, so the
		bar is tall enough to hold them rather than being a rule with a caption beside it.
		The two are one object and cannot disagree — the same two numbers fill it and letter
		it.

		The count is laid over the bar rather than put inside it: a <progress> is a replaced
		element with no inside to put anything in, and it is what draws the fill (a width
		measured from `value` and `max`, which is not something a class can say). So the
		element keeps the drawing and a span over it keeps the lettering, both in the same
		box. White with a shadow under it, since the type crosses the filled part and the
		empty part and has to read on both. -->
	<div class="relative w-full" title="Your wins banked / wins needed to take the town">
		<progress
			class="progress progress-primary block h-6 w-full"
			value={siege.wins}
			max={siege.required}
		></progress>
		<span
			class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-white drop-shadow-md"
		>
			{siege.wins}/{siege.required}
		</span>
	</div>

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
