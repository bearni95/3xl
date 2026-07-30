<script lang="ts">
	import classNames from 'classnames';
	import TeamLineup from '$components/core/TeamLineup.svelte';
	import type { SpawnBox, SpawnColor } from '$types/character-spawn.type';

	// The side the player fields, on a plate of its own at the map's bottom-left corner.
	// It was a slice of the panel's Profile tab, under the account row — which meant the
	// team was only on screen while that tab was forward, and never while a table or a
	// pack was. What a player is fielding is what every town on the map is read against,
	// so it stands on the map itself, at the far corner from the town panel: the side
	// being challenged at the top of the map, the side doing the challenging at its foot.
	//
	// Black, like the corner's other plates: it stands over satellite imagery, so the
	// lettering has to be read off the plate rather than off the terrain behind it.

	// The cards fielded, leader first, in the shape the statues take. A card carries the
	// box it was pulled from, which is the ink its statue is drawn in.
	export let members: {
		label: string;
		basePath: string | null;
		color: SpawnColor;
		box?: SpawnBox;
		locationName: string | null;
		spawnedAt?: string | number | Date | null;
		showId: number | null;
	}[] = [];
	export let classes: string = '';
</script>

<div
	class={classNames('flex flex-col gap-2 rounded-lg bg-black p-2 text-white shadow-xl', classes)}
>
	<span class="px-1 text-xs font-bold uppercase tracking-wide text-white/70">Active party</span>

	<!-- The player's own side, so it is mirrored — the lineup's default — and faces the
		rival side the town panel stands up unmirrored. -->
	<TeamLineup {members} classes="gap-1" />
</div>
