<script lang="ts">
	import classNames from 'classnames';
	import { _ } from 'svelte-i18n';
	import Countdown from '$components/core/Countdown.svelte';
	import type { MapChallenge } from '$types/map.type';

	// The lower half of a pin's plate, under the line naming the place: how far this player has
	// got towards taking it, and the one control that acts on it, across one row of three — the
	// standing in the first third, the control in the two beside it. They were stacked, on the
	// reasoning that a reading and a doing should not compete for a line; what that cost is the
	// height, two full-width bands where the block says one thing about one town, and the two
	// are not competing so much as answering each other: this is how far you have got, and this
	// is the way to get further. The wider share goes to the control because a control carries
	// words and the bar carries two numbers written inside itself.
	//
	// It carries no surface of its own. It used to stand apart at the foot of the pin and so
	// had to letter itself onto something readable over satellite imagery; on the plate it is
	// already on that surface, and giving it a second one would have printed a card inside a
	// card and read as a second mark about a second thing. Its width is the plate's for the
	// same reason.
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

	// Whether there is anything to stand beside the bar. A town cooling down has the countdown
	// there instead of the button, and a town with neither — the plate over the arena's board,
	// where a fight already under way is not a fight to be started — has an empty two thirds of
	// a row, which is why the bar takes the whole of it in that case.
	$: control = Boolean(button) || Boolean(unlocksAt);
</script>

<!-- One row of three. The bar is a picture that fills whatever width it is given and the
	control is words that need enough of one, so the split is a third to the reading and two
	thirds to the doing — a ratio rather than two numbers, so the block answers whatever width
	it is laid in: 400px of a column beside the map, or the 240px of a pin's plate.
	Centred across the row, since the two are of different heights and neither is the line the
	other is set on.
	One row of three wherever it is laid: on a plate, or as its own row under the side standing
	on a town (see TownPin). It carried a stacked variant for a while, for when it was squeezed
	into a third of a pin's width beside those statues rather than laid under them. -->
<div class={classNames('grid grid-cols-3 items-center gap-1.5', classes)}>
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
		empty part and has to read on both.

		The first third of the row, or the whole of it where there is no control to stand beside
		it: a bar squeezed into a third with two thirds of nothing after it is a row that has
		lost something rather than a row of one thing. -->
	<div
		class={classNames('relative w-full', control ? 'col-span-1' : 'col-span-3')}
		title={$_('map.challenge.siege')}
	>
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

	<!-- The two thirds beside it, whichever of the two is standing there. -->
	{#if button}
		<button
			type="button"
			class="btn btn-primary btn-sm col-span-2 w-full"
			disabled={button.disabled}
			title={button.title}
			on:click={button.onClick}
		>
			{button.label}
		</button>
	{:else if unlocksAt}
		<Countdown
			until={unlocksAt}
			title={$_('map.challenge.cooldown')}
			classes="badge badge-ghost badge-sm col-span-2 font-semibold"
			on:elapsed={() => onUnlock?.()}
		/>
	{/if}
</div>
