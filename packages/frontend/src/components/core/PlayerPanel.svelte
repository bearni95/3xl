<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { Profile } from '$types/profile.type';
	import { levelProgress } from '$utils/progression/level';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';

	// Who is playing, on a plate at the map's top-right corner: the picture they wear and
	// the reading beside it — the name with the level at the end of its row, and the
	// experience bar with the figure written across it. It was the first two thirds of the
	// Profile tab's account row, which meant who you are was only on screen while that one
	// tab was forward; what was the last third of that row — the ways out of the panel — is
	// the panel's own stack of buttons now.
	//
	// It stands at the foot of the map under the side this account fields: a side and the player
	// fielding it are one statement, so they are one column at one corner.
	//
	// The breadcrumb bar's own surface — base-100 at four fifths — rather than the flat black
	// the map's plates used to be printed in. It still has to be read over satellite imagery,
	// which is what the black was for, but a plate on this map is furniture of the same chrome
	// the bar is: four fifths lets the terrain through enough to say the plate is over the map
	// without the lettering ever having to be read off it.

	// The plate is also the way into the account itself: the picture opens the picker, and
	// the reading beside it opens the settings sheet — which is the sheet this plate is the
	// summary of, so the summary is what you press to see the whole of it. It was reachable
	// only from the burger menu, two presses from a plate that was already showing you the
	// account you wanted to open.
	//
	// Two buttons side by side rather than one around everything: a button inside a button
	// is not a thing, and the avatar's own job predates this one. So the plate is a row of
	// two targets that between them cover it, and neither has to guess what a press meant.

	export let profile: Profile;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{ editavatar: void; open: void }>();

	// Same as the full card: the letter avatar stands on the chosen name alone, so an
	// account nobody has named shows a question mark rather than a letter of its address.
	$: initial = (profile.username || '?').charAt(0).toUpperCase();
	$: shownName = profile.username || $_('profile.username.none');
	$: progress = levelProgress(profile.exp);
	$: expPercent = Math.round(progress.fraction * 100);

	function handleEditAvatar(): void {
		dispatch('editavatar');
	}

	function handleOpen(): void {
		dispatch('open');
	}
</script>

<div
	class={classNames('flex items-center gap-2 rounded-lg bg-base-100/80 p-2 shadow-xl', classes)}
>
	<!-- The picture at the left end, at the size the corner has room for rather than at a
		share of the plate: the tile in the panel gave it a third of its width because the
		reading had a third of its own, and a portrait that size on a plate this size would be
		most of what the plate says. -->
	<button
		type="button"
		class="group flex flex-none items-center justify-center"
		title={$_('profile.avatar.edit')}
		aria-label={$_('profile.avatar.edit')}
		on:click={handleEditAvatar}
	>
		<!-- The hover ring goes on the square itself rather than the box around it: a ring
			drawn on the box would stand well clear of the picture it is about. -->
		<PlayerAvatar
			characterId={profile.avatarCharacterId}
			color={profile.avatarColor}
			{initial}
			size="w-12"
			textClasses="text-xl"
			classes="[&>div]:transition group-hover:[&>div]:ring-2 group-hover:[&>div]:ring-primary"
		/>
	</button>

	<!-- The reading, on two rows: who they are with the level they are at, then the bar
		carrying the experience figure inside it. `min-w-0` is what lets a name longer than the
		plate truncate instead of widening it — a flex item's floor is its content otherwise.
		It is the button that opens the account, and it takes the whole of the plate the
		picture does not, so there is no dead strip between the two targets. `text-left`
		because a button centres its contents and this is a reading, not a label. -->
	<button
		type="button"
		class="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-left"
		title={$_('settings.title')}
		aria-label={$_('settings.title')}
		on:click={handleOpen}
	>
		<!-- Name and level share a row, the level at its far end: they are the two things an
			account is said by, and the level had a row to itself for three characters of type.
			The name gives way first — it is the one that can be any length — so it truncates
			while the level keeps its place at the right, on the same baseline rather than merely
			in the same box. -->
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
			in it by construction. It spans this level alone, not the totals written across it.
			The bar is also the hover target for that figure (see the label below), which is what
			the group's name is for — the figure is the only thing on this plate that comes and
			goes, so it is named rather than left as the bare group the avatar beside it already
			uses for its own ring. -->
		<div class="group/exp relative w-full">
			<progress
				class="progress progress-primary absolute inset-0 h-full w-full"
				value={expPercent}
				max="100"
				aria-label={$_('profile.exp')}
			></progress>
			<!-- Over the bar, so it is painted after it, and centred across the width: a figure
				about the whole bar reads from the middle of it rather than from the end the fill
				happens to have reached. The tight black shadow is what lets one colour of
				lettering cross a bar that is two — the theme's yellow where the level has filled,
				a fifth of it over the plate where it has not.

				Faded out until the bar is hovered, and faded back when the pointer leaves: the
				bar's own length is the reading at a glance, and the exact figures are what the
				pointer is for. It stays in flow while it is invisible — opacity is not layout —
				so the bar keeps the height the type gives it either way and nothing moves when it
				comes and goes. It is a fade in both directions because the transition is on the
				element rather than on the hovered state. -->
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
	</button>
</div>
