<script lang="ts">
	import classNames from 'classnames';
	import TeamCard from '$components/core/TeamCard.svelte';
	import type { SpawnColor } from '$types/character-spawn.type';

	// The team as a row of cards — who is fielded, what colour they bend, where they
	// were claimed and what show they come from. The card itself is TeamCard's; this is
	// only the row, sharing its width between them.

	// One entry per team member, in the order they are fielded (the leader first).
	export let members: {
		label: string;
		basePath: string | null;
		color: SpawnColor;
		locationName: string | null;
		showId: number | null;
	}[] = [];
	// Mirror the characters — true (the default) is the player's own side.
	export let flipped: boolean = true;
	export let classes: string = '';
</script>

<div class={classNames('flex w-full gap-2', classes)}>
	{#each members as member, index (index)}
		<TeamCard
			label={member.label}
			basePath={member.basePath}
			color={member.color}
			locationName={member.locationName}
			showId={member.showId}
			{flipped}
			classes="flex-1"
		/>
	{/each}
</div>
