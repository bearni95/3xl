<script lang="ts">
	import classNames from 'classnames';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import TeamLineup from '$components/core/TeamLineup.svelte';
	import TownChallenge from '$components/core/TownChallenge.svelte';
	import { showIconName } from '$utils/show/show-icon';
	import type { MapChallenge } from '$types/map.type';
	import type { SpawnColor } from '$types/character-spawn.type';

	// Everything the map used to say about the town being looked at, gathered onto one
	// plate at the corner of the map instead of onto the town's own pin: the place and the
	// show it flies with that show's glyph on a coloured tile, the side holding it, and
	// what can be done about that. The map itself draws the selected town exactly as it
	// draws every other, so this panel is the whole of what picking one adds.
	//
	// It reads the same plate the pins do — tile at the left end, the place lettered over
	// its show — because the town on the map and the town in the panel are the one town,
	// and the two should be recognisable as the same label.

	// The place, with its article already restored by the caller.
	export let name: string = '';
	// The show the town flies, and its id, for the name and the glyph on the tile. A show
	// with no glyph drawn yet leaves the tile carrying its colour alone.
	export let showName: string | null = null;
	export let showId: number | null = null;
	// The tile's fill plus the ink that reads on it — the town's own colour, in the same
	// six the pins, the cards and the combat buttons paint with. Null while the town has
	// no colour yet, which leaves the tile on the neutral surface.
	export let tileClasses: string | null = null;
	// The side holding the town, in the order it is fielded, in the shape the statues take.
	export let team: {
		label: string;
		basePath: string | null;
		color: SpawnColor;
		locationName: string | null;
		showId: number | null;
	}[] = [];
	// The siege standing and the one control that acts on it, or null when there is nothing
	// to take (the player holds the place already).
	export let challenge: MapChallenge | null = null;
	export let classes: string = '';

	$: showIcon = showIconName(showId);
</script>

<!-- Black, for the same reason a pin's plate is: it stands over satellite imagery, and
	the lettering has to be read off the panel rather than off whatever terrain has ended
	up behind it. -->
<div class={classNames('flex flex-col gap-2 rounded-lg bg-black p-2 text-white shadow-xl', classes)}>
	<div class="flex items-center gap-2">
		{#if tileClasses || showIcon}
			<!-- The tile the pin draws, at the same 40px with the same 28px glyph on it, and in
				the same six colours. The glyph is sized through ShowIcon rather than from here:
				the component wraps the svg in a span of its own, so a rule aimed at this div's
				own children would never reach the artwork. `currentColor` is what the tile's ink
				gives it. Decorative — the show is named in the line right beside it. -->
			<div
				class={classNames(
					'flex size-10 flex-none items-center justify-center rounded-lg',
					tileClasses ?? 'bg-base-100 text-base-content'
				)}
				aria-hidden="true"
			>
				{#if showIcon}
					<ShowIcon name={showIcon} classes="[&>svg]:size-7" />
				{/if}
			</div>
		{/if}

		<!-- `min-w-0` is what lets a name longer than the panel truncate instead of
			widening it: a flex item's floor is its content otherwise. -->
		<div class="flex min-w-0 flex-col text-left leading-tight">
			<span class="truncate text-sm font-semibold">{name}</span>
			<span class="truncate text-xs font-medium text-white/70">{showName ?? '—'}</span>
		</div>
	</div>

	{#if team.length > 0}
		<!-- A town's side is somebody else's, so it faces the viewer unmirrored, as a rival
			side does on the board. -->
		<TeamLineup members={team} flipped={false} classes="gap-1" />
	{/if}

	{#if challenge}
		<TownChallenge
			siege={challenge.siege}
			button={challenge.button}
			unlocksAt={challenge.unlocksAt}
			onUnlock={challenge.onUnlock}
		/>
	{/if}
</div>
