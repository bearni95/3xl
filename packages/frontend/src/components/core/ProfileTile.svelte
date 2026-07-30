<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { Profile } from '$types/profile.type';
	import { levelProgress } from '$utils/progression/level';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';

	// The player, across the whole width of the panel's Profile tab and above the grid of
	// the side they field rather than in its first cell: a card in that grid is one
	// character, and the account is not one of them — it is who the three of them belong
	// to. So it takes a row of its own and reads left to right instead of standing as a
	// 3:4 portrait.
	//
	// Three columns, each a third: the picture they wear, the reading (name, level, the
	// bar), and the account's ways out of the panel — the roster, the badges and the
	// account's settings. Those are on the tile because it is the account's row now, and a
	// row that says who is playing is where what to do about it belongs.

	export let profile: Profile;
	export let classes: string = '';

	const dispatch = createEventDispatcher<{
		editavatar: void;
		opensettings: void;
		openroster: void;
		openachievements: void;
	}>();

	// Same as the full card: the letter avatar stands on the chosen name alone, so an
	// account nobody has named shows a question mark rather than a letter of its address.
	$: initial = (profile.username || '?').charAt(0).toUpperCase();
	$: shownName = profile.username || $_('profile.username.none');
	$: progress = levelProgress(profile.exp);
	$: expPercent = Math.round(progress.fraction * 100);

	function handleEditAvatar(): void {
		dispatch('editavatar');
	}
</script>

<div
	class={classNames(
		'grid w-full min-w-0 grid-cols-3 items-center gap-3 overflow-hidden rounded-md bg-base-200 p-3',
		classes
	)}
>
	<!-- The picture, filling its third — the column is what sizes it now, so the portrait
		takes the whole of it and the row is as tall as a third of its own width. -->
	<button
		type="button"
		class="group flex min-w-0 items-center justify-center"
		title={$_('profile.avatar.edit')}
		aria-label={$_('profile.avatar.edit')}
		on:click={handleEditAvatar}
	>
		<!-- The hover ring goes on the square itself rather than the box around it: a ring
			drawn on the box would stand well clear of the picture it is about. -->
		<PlayerAvatar
			characterId={profile.avatarCharacterId}
			{initial}
			size="w-full"
			textClasses="text-3xl"
			classes="w-full justify-center [&>div]:transition group-hover:[&>div]:ring-2 group-hover:[&>div]:ring-primary"
		/>
	</button>

	<!-- The reading, on three rows: the name, then the level, then the bar — which carries the
		experience figure inside it rather than on a fourth row above it. Read from the left,
		since it is a column beside the picture and no longer a caption under it. Too long a
		name is cut rather than wrapped — the row keeps one height whatever the account is
		called. -->
	<div class="flex min-w-0 flex-col gap-1">
		<span
			class={classNames('truncate text-sm font-semibold', {
				'text-base-content/50 italic': !profile.username
			})}
			title={shownName}>{shownName}</span
		>
		<span class="text-xs font-semibold">
			{$_('profile.levelBadge', { values: { level: progress.level } })}
		</span>
		<!-- The bar and the reading of it are one thing: the same cumulative pair the full card
			prints — total earned, then the total the next level begins at — inside the bar
			rather than on a line of its own above it. Two rows saying one number is a row more
			than the reading is worth in a column this narrow, and a bar with the figure across
			it says how far along it is and how far that is at once.

			The height is the label's, not a number picked to look like room for it: the reading
			stands in flow with its own padding and the bar is absolutely stretched behind it
			(`inset-0`, with `h-full` because `.progress` brings a height of its own that an
			over-constrained top/bottom pair would otherwise lose to). So whatever the label's
			type comes to, the bar is exactly that much plus the padding, and the label is
			centred in it by construction — nothing to keep in step by hand if the type ever
			changes.

			As on the full card, the bar spans this level alone, not the totals written on it. -->
		<div class="relative w-full">
			<progress
				class="progress progress-primary absolute inset-0 h-full w-full"
				value={expPercent}
				max="100"
				aria-label={$_('profile.exp')}
			></progress>
			<!-- Over the bar, so it is painted after it — and centred across the width as well,
				since a figure about the whole bar reads from the middle of it rather than from
				the end the fill happens to have reached. -->
			<span
				class="relative block truncate px-1 py-0.5 text-center font-mono text-[0.65rem] text-base-content/70"
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

	<!-- The account's ways out of the panel, stacked in the last third: the player's own
		cards, the badges they can earn, and then the account itself (details list, username
		field, sign-out) — what the player came to look at first, and the account's own
		settings last, outlined rather than filled. Each only raises a modal mounted at the
		layout root, so the tile dispatches and the host does it. -->
	<div class="flex min-w-0 flex-col gap-2">
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
</div>
