<script lang="ts">
	import classNames from 'classnames';
	import CharacterStatue from '$components/core/CharacterStatue.svelte';
	import { SpawnBox, type SpawnColor } from '$types/character-spawn.type';

	// The team as a row of cards — who is fielded, what colour they bend, where they
	// were claimed and what show they come from. The card itself is CharacterStatue's;
	// this is only the row, sharing its width between them.

	// One entry per team member, in the order they are fielded (the leader first).
	// `spawnedAt` is what a real card was minted at, and it is optional for the same
	// reason its claim place is: a town's seeded house team was never minted, so it
	// leaves the year out and the statue says the place alone. `box` is optional on the
	// same grounds — a side that was never pulled out of anything is printed black, the
	// statue's own default and what the commoner box is.
	export let members: {
		label: string;
		basePath: string | null;
		color: SpawnColor;
		box?: SpawnBox;
		locationName: string | null;
		spawnedAt?: string | number | Date | null;
		showId: number | null;
	}[] = [];
	// Mirror the characters — true (the default) is the player's own side.
	export let flipped: boolean = true;
	export let classes: string = '';

	// The three cells' shares of the row: 30% to each flank and 40% to the middle.
	// Said as grow factors over a zero basis rather than as percentages, so the three
	// divide whatever width the row turns out to have and always add up to exactly it.
	// Written out as whole classes because Tailwind only emits what it can see spelled.
	// Any cell past the third (there is no such team) falls back to a flank's share.
	const cellShares = ['basis-0 grow-[3]', 'basis-0 grow-[4]', 'basis-0 grow-[3]'];
</script>

<!-- The row itself is outlined in green and each statue's cell in purple. Outlines
	rather than borders, so the lines are drawn over the layout instead of taking
	width out of it and moving the statues they are meant to be measuring. -->
<div class={classNames('flex w-full outline outline-1 outline-green-500', classes)}>
	{#each members as member, index (index)}
		<CharacterStatue
			label={member.label}
			basePath={member.basePath}
			color={member.color}
			box={member.box ?? SpawnBox.Black}
			locationName={member.locationName}
			spawnedAt={member.spawnedAt ?? null}
			showId={member.showId}
			{flipped}
			classes={classNames(
				cellShares[index] ?? cellShares[0],
				'outline outline-1 outline-purple-500'
			)}
		/>
	{/each}
</div>
