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

	// The three cells: 35% of the row to each flank and 40% to the middle, which is
	// pulled 7.5% over each of the two beside it. Said as widths — a basis that neither
	// grows nor shrinks — rather than as shares of what is left, so each cell measures
	// exactly the figure it was given whatever the row turns out to be. Shares were how
	// this read while the three of them and the margins happened to come to a whole row;
	// these do not (110% of basis less the 15% the middle pulls back is 95%), so the row
	// carries 5% of empty at its far end, and a share would have quietly handed that out
	// again and made every cell wider than it says.
	// The middle is raised because overlapping is a question of paint order otherwise,
	// and paint order runs one way: it would cover the flank before it and be covered by
	// the flank after it, which is an overlap on one side only.
	// Written out as whole classes because Tailwind only emits what it can see spelled.
	// Any cell past the third (there is no such team) falls back to a flank's width.
	const cellShares = [
		'shrink-0 grow-0 basis-[35%]',
		'relative z-10 -mx-[7.5%] shrink-0 grow-0 basis-[40%]',
		'shrink-0 grow-0 basis-[35%]'
	];

	// Where each member stands. The team arrives in slot order — the leader first — and the
	// row's middle is the wider piece lapped over the two beside it, so that is where the
	// leader goes: the one the row is about stands in front of their side rather than at the
	// end of it. Only the first two trade places; everyone after keeps the order they came
	// in, so nothing is ever dropped by being arranged. A side of one has no middle to stand
	// in and is left where it is.
	$: lineup = members.length < 2 ? members : [members[1], members[0], ...members.slice(2)];
</script>

<!-- The row itself is outlined in green and each statue's cell in purple. Outlines
	rather than borders, so the lines are drawn over the layout instead of taking
	width out of it and moving the statues they are meant to be measuring. -->
<div class={classNames('flex w-full outline outline-1 outline-green-500', classes)}>
	{#each lineup as member, index (index)}
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
