<script lang="ts">
	import classNames from 'classnames';
	import IdleSprite from '$components/core/IdleSprite.svelte';
	import { SpawnColor } from '$types/character-spawn.type';

	// The team as a row of characters standing on their own colour — the same three
	// facts a card leads with (who, what colour, how big) with none of the chrome, so a
	// team can be shown where a row of cards would be too much to read.

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
		<!-- A card's portrait field, and nothing else of the card: 4:3 with the art
			inset by 8% of its width, which is exactly the box a card fits its character
			into — so a character stands here at the size it stands at on its card, and
			short ones stay shorter than tall ones. -->
		<div
			class={classNames(
				'aspect-[4/3] flex-1 overflow-hidden rounded-box p-[8%]',
				colorFills[member.color]
			)}
		>
			<IdleSprite
				basePath={member.basePath}
				faceUrl={member.faceUrl}
				label={member.label}
				{flipped}
			/>
		</div>
	{/each}
</div>
