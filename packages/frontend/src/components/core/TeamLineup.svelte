<script lang="ts">
	import classNames from 'classnames';
	import IdleSprite from '$components/core/IdleSprite.svelte';
	import { SpawnColor } from '$types/character-spawn.type';

	// The team as a row of characters standing on their own colour — who is fielded and
	// what colour they bend, with none of a card's chrome, so a team can be shown where
	// a row of cards would be too much to read.

	// One entry per team member, in the order they are fielded (the leader first).
	export let members: {
		label: string;
		basePath: string | null;
		faceUrl: string | null;
		color: SpawnColor;
	}[] = [];
	// Mirror the characters — true (the default) is the player's own side.
	export let flipped: boolean = true;
	export let classes: string = '';

	// The same swatches the cards paint their portrait field with.
	const colorFills: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'bg-red-500',
		[SpawnColor.Yellow]: 'bg-yellow-400',
		[SpawnColor.Blue]: 'bg-blue-500',
		[SpawnColor.Orange]: 'bg-orange-500',
		[SpawnColor.Green]: 'bg-green-500',
		[SpawnColor.Purple]: 'bg-purple-500'
	};
</script>

<div class={classNames('flex w-full gap-2', classes)}>
	{#each members as member, index (index)}
		<!-- A square of the character's colour, enforced: the three share the row's width
			between them and each is as tall as it is wide, whatever the panel's width, so
			the row keeps its shape as the panel narrows. The character fills it — the
			sheet is placed to the square's full height — and nothing is inset or clipped,
			so no part of a frame is ever cut. -->
		<div class={classNames('aspect-square flex-1 rounded-box', colorFills[member.color])}>
			<IdleSprite
				basePath={member.basePath}
				faceUrl={member.faceUrl}
				label={member.label}
				{flipped}
			/>
		</div>
	{/each}
</div>
