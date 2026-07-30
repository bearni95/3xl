<script lang="ts">
	import classNames from 'classnames';
	import TeamLineup from '$components/core/TeamLineup.svelte';
	import TownChallenge from '$components/core/TownChallenge.svelte';
	import type { MapChallenge } from '$types/map.type';
	import type { SpawnColor } from '$types/character-spawn.type';

	// What picking a town on the map adds to it: the side holding the place, and what can be
	// done about that. The map itself draws the selected town exactly as it draws every other,
	// so this is the whole of what a pick says.
	//
	// It says it on nothing. There is no surface here — no plate, no fill, no shadow — because
	// a statue brings its own ground and its own panel, every word on one is read off the
	// card's own colour rather than off the terrain, and the challenge bar under them is a
	// figure and a button that carry their own. A black plate behind all that was a box drawn
	// around things that did not need one.
	//
	// It does not name the place either. The plate that used to head it — the tile, the town,
	// the show it flies — said exactly what the last crumb of the bar above it says, in the
	// same three parts and drawn the same way, about the same town: the bar is where this map
	// says where it is looking, so the panel under it is only the answer to what is *there*.

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
</script>

<div class={classNames('flex flex-col gap-2 text-white', classes)}>
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
