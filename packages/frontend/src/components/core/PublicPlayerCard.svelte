<script lang="ts">
	import classNames from 'classnames';
	import { _ } from 'svelte-i18n';
	import type { PlayerPlate } from '$types/profile.type';
	import { levelProgress } from '$utils/progression/level';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';

	// Who is playing, as their own public profile page reads them: the same four things
	// PlayerPanel prints and printed in the same words, stood up the other way — the
	// picture across the whole width of the card with the reading under it, rather than a
	// small square at the left end of a row.
	//
	// Its own component rather than a shape PlayerPanel can be asked for, because the two
	// are wanted in two different places and neither is a variant of the other: the plate
	// is furniture at a corner of the map, sized to the room a corner has, where a portrait
	// as wide as the plate would be most of what the plate says. This is a page about one
	// account and nothing else, with a column of its own to fill, so the picture is the
	// first thing on it and as large as the column is. A `stacked` flag on the plate would
	// have been one component drawing two things and every later change to either having
	// to say which of them it meant.
	//
	// It is a reading and never a way in. PlayerPanel is pressable where the account is the
	// reader's own — the picture opens the picker, the reading opens the settings sheet —
	// and this card is only ever about somebody else, so there is nothing here to press and
	// it is not built out of buttons that would refuse. That is why there is no
	// `interactive` prop to pass false to.
	//
	// The plate's own surface, base-100 at four fifths, which is what every plate in this
	// game is printed on and what this one needs to be read over satellite imagery.

	// The plate and not the account: the four things a player is read by (see PlayerPlate).
	// The public profile views hand over exactly this and nothing else about the account,
	// and a component handed less cannot print more by accident.
	export let profile: PlayerPlate;
	export let classes: string = '';

	// The letter avatar stands on the chosen name alone, so an account nobody has named
	// shows a question mark rather than a letter of its address.
	$: initial = (profile.username || '?').charAt(0).toUpperCase();
	$: shownName = profile.username || $_('profile.username.none');
	$: progress = levelProgress(profile.exp);
	$: expPercent = Math.round(progress.fraction * 100);
</script>

<div class={classNames('flex flex-col gap-2 rounded-lg bg-base-100/80 p-2 shadow-xl', classes)}>
	<!-- The picture first and across the whole card. `w-full` is a width and not a shape:
		the avatar keeps itself square off that width (see PlayerAvatar's aspect-square), so
		the card is as tall as the column is wide plus the reading under it. The letter is
		sized to the square it is centred in rather than to the plate's 20px — a portrait
		this size with a caption-sized initial in the middle of it would read as an empty
		frame. -->
	<PlayerAvatar
		characterId={profile.avatarCharacterId}
		color={profile.avatarColor}
		{initial}
		size="w-full"
		textClasses="text-5xl"
	/>

	<!-- The reading, on two rows and word for word the plate's: who they are with the level
		at the end of that row, then the bar with the experience figure written across it. -->
	<div class="flex min-w-0 flex-col gap-1">
		<!-- Name and level share a row, the level at its far end: they are the two things an
			account is said by. The name gives way first — it is the one that can be any length —
			so it truncates while the level keeps its place at the right, on the same baseline
			rather than merely in the same box. `min-w-0` is what lets it truncate instead of
			widening the card: a flex item's floor is its content otherwise. -->
		<div class="flex min-w-0 items-baseline gap-2">
			<span
				class={classNames('min-w-0 flex-1 truncate text-sm font-semibold text-white', {
					'text-white/50 italic': !profile.username
				})}
				title={shownName}>{shownName}</span
			>
			<span class="flex-none text-xs font-semibold text-white">
				{$_('profile.levelBadge', { values: { level: progress.level } })}
			</span>
		</div>

		<!-- The bar and the reading of it are one thing: the figure stands in flow with its own
			padding and the bar is stretched behind it (`inset-0`, with `h-full` because
			`.progress` brings a height of its own that an over-constrained top/bottom pair would
			otherwise lose to), so the bar is as tall as the type comes to and the label is centred
			in it by construction. It spans this level alone, not the totals written across it. -->
		<div class="group/exp relative w-full">
			<progress
				class="progress progress-primary absolute inset-0 h-full w-full"
				value={expPercent}
				max="100"
				aria-label={$_('profile.exp')}
			></progress>
			<!-- Over the bar, so it is painted after it, and centred across the width: a figure
				about the whole bar reads from the middle of it rather than from the end the fill
				happens to have reached. The tight black shadow is what lets one colour of lettering
				cross a bar that is two — the theme's yellow where the level has filled, a fifth of
				it over the plate where it has not.

				Faded out until the bar is hovered, and faded back when the pointer leaves: the
				bar's own length is the reading at a glance, and the exact figures are what the
				pointer is for. It stays in flow while it is invisible — opacity is not layout — so
				the bar keeps the height the type gives it either way and nothing moves when it
				comes and goes. -->
			<span
				class="relative block truncate px-1 py-0.5 text-center font-mono text-[0.65rem] text-white/70 opacity-0 transition-opacity duration-200 text-shadow-xs text-shadow-black group-hover/exp:opacity-100"
			>
				{#if progress.atMax}
					{$_('profile.expMax', { values: { exp: progress.exp.toLocaleString() } })}
				{:else}
					{$_('profile.expProgress', {
						values: {
							total: progress.exp.toLocaleString(),
							next: (progress.nextLevelExp ?? 0).toLocaleString()
						}
					})}
				{/if}
			</span>
		</div>
	</div>
</div>
