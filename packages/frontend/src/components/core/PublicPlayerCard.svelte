<script lang="ts">
	import classNames from 'classnames';
	import { _ } from 'svelte-i18n';
	import type { PlayerPlate } from '$types/profile.type';
	import { levelProgress } from '$utils/progression/level';
	import PlayerAvatar from '$components/core/PlayerAvatar.svelte';

	// Who is playing, as their own public profile page reads them: the picture they wear,
	// and beside it the two things an account is said by — the name they chose and the
	// level they are at.
	//
	// Its own component rather than a shape PlayerPanel can be asked for, because the two
	// are wanted in two different places and neither is a variant of the other: the plate
	// is furniture at a corner of the map, sized to the room a corner has, so its picture
	// is a small square at the left end of a row and its reading carries the experience bar
	// as well. This is a page about one account and nothing else, with a column of its own
	// to fill, so the picture takes a third of that column and the reading is the name and
	// the level and no more of a reading than that. A `stacked` flag on the plate would
	// have been one component drawing two things and every later change to either having
	// to say which of them it meant.
	//
	// What is deliberately not here is the experience bar. A bar is a thing a player watches
	// filling — it is about what they are on their way to — and this page is somebody else
	// being looked at; the level they have reached is the fact about them, and how far into
	// the next one they happen to be is not a stranger's business to read off a page.
	//
	// It is a reading and never a way in. PlayerPanel is pressable where the account is the
	// reader's own — the picture opens the picker, the reading opens the settings sheet —
	// and this card is only ever about somebody else, so there is nothing here to press and
	// it is not built out of buttons that would refuse. That is why there is no
	// `interactive` prop to pass false to.
	//
	// It draws no ground of its own. The plate under it is the whole column's — the card
	// and the way into the game stand on one sheet, as the towns beside them do — and a
	// surface here would be a second plate inside that one, printing base-100 at four
	// fifths over base-100 at four fifths. So this is the reading alone, and where it is
	// read over satellite imagery is the caller's business.

	// The plate and not the account: the four things a player is read by (see PlayerPlate).
	// The public profile views hand over exactly this and nothing else about the account,
	// and a component handed less cannot print more by accident.
	export let profile: PlayerPlate;
	export let classes: string = '';

	// The letter avatar stands on the chosen name alone, so an account nobody has named
	// shows a question mark rather than a letter of its address.
	$: initial = (profile.username || '?').charAt(0).toUpperCase();
	$: shownName = profile.username || $_('profile.username.none');
	// Only the level is read off the progression — the fraction and the totals were the
	// bar's, and the bar is gone (see above).
	$: progress = levelProgress(profile.exp);
</script>

<!-- Three columns: the picture in the first and the reading across the other two. Said as a
	grid rather than as a flex row so the picture is a *third of the card* at any width — a
	flex row would have sized it from its own content, and a portrait sized by its own artwork
	is a different square on every account. `items-center` so the reading sits on the middle of
	the picture's height rather than at the top of a square several lines tall.
	No fill, no rounding and no shadow: see above — the ground is the column's. -->
<div class={classNames('grid grid-cols-3 items-center gap-2', classes)}>
	<!-- `w-full` is a width and not a shape: the avatar keeps itself square off the width of
		the cell it is in (see PlayerAvatar's aspect-square). The letter is sized to that square
		rather than to the plate's 20px — a portrait this size with a caption-sized initial in
		the middle of it would read as an empty frame. -->
	<PlayerAvatar
		characterId={profile.avatarCharacterId}
		color={profile.avatarColor}
		{initial}
		size="w-full"
		textClasses="text-5xl"
	/>

	<!-- The reading, across the two columns the picture leaves, on two rows of its own. The name
		takes the first and takes the whole of it — this is a page about one player, and their
		name is the thing on it that is the largest — with the level under it rather than beside
		it. They shared a row at the plate's size, where a name and three characters of type fit
		on one line; at 2xl a name of any length would push the level off the end of the card, and
		one that did not would leave it hanging in the middle of the row.
		`min-w-0` twice over is what lets the name truncate instead of widening the card: a grid
		item's floor is its content, and so is a block's. -->
	<div class="col-span-2 flex min-w-0 flex-col">
		<span
			class={classNames('min-w-0 truncate text-2xl font-semibold text-white', {
				'text-white/50 italic': !profile.username
			})}
			title={shownName}>{shownName}</span
		>
		<span class="text-lg font-semibold text-white">
			{$_('profile.levelBadge', { values: { level: progress.level } })}
		</span>
	</div>
</div>
