<script lang="ts">
	import classNames from 'classnames';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import type { SpawnColor } from '$types/character-spawn.type';

	// The team as a row of cards — who is fielded, what colour they bend, where they
	// were claimed and what show they come from. The card itself is CharacterStatue's;
	// this is only the row, sharing its width between them.

	// One entry per team member, in the order they are fielded (the leader first).
	// `spawnedAt` is what a real card was minted at, and it is optional for the same
	// reason its claim place is: a town's seeded house team was never minted, so it
	// leaves the year out and the statue says the place alone.
	export let members: {
		label: string;
		basePath: string | null;
		color: SpawnColor;
		locationName: string | null;
		spawnedAt?: string | number | Date | null;
		showId: number | null;
	}[] = [];
	// Mirror the characters — true (the default) is the player's own side.
	export let flipped: boolean = true;
	export let classes: string = '';
</script>

<div class={classNames('flex w-full gap-2', classes)}>
	{#each members as member, index (index)}
		<CharacterStatue
			label={member.label}
			basePath={member.basePath}
			color={member.color}
			locationName={member.locationName}
			spawnedAt={member.spawnedAt ?? null}
			showId={member.showId}
			{flipped}
			classes="flex-1"
		/>
	{/each}
</div>
