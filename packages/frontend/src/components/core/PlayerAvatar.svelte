<script lang="ts">
	import classNames from 'classnames';
	import { characters } from '@3xl/data';
	import { characterFaceUrl } from '$utils/mugen/character-face';
	import { activeTeamColor } from '$services/team.service';
	import { SpawnColor } from '$types/character-spawn.type';

	// The character the player wears, or null for the initial-letter avatar every
	// account starts on. Only the character is stored on the profile — the
	// portrait it shows is whichever face the admin picked for it.
	export let characterId: string | null = null;
	// Fallback content: the first letter of the player's name.
	export let initial: string = '?';
	// DaisyUI sizes the avatar off the inner box's width class.
	export let size: string = 'w-14';
	export let textClasses: string = 'text-xl';
	export let classes: string = '';

	let faceUrl: string | null = null;

	// The backdrop is the player's colours, not the theme's: whichever colour the
	// active team is bound to, and nothing at all when there is no team to read one
	// from. Same swatches as the portrait rings and the card scene.
	const colorClasses: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'bg-red-500 text-white',
		[SpawnColor.Yellow]: 'bg-yellow-400 text-neutral-900',
		[SpawnColor.Blue]: 'bg-blue-500 text-white',
		[SpawnColor.Orange]: 'bg-orange-500 text-white',
		[SpawnColor.Green]: 'bg-green-500 text-white',
		[SpawnColor.Purple]: 'bg-purple-500 text-white'
	};

	$: backdropClasses = $activeTeamColor ? colorClasses[$activeTeamColor] : 'text-base-content';

	// `characterId` is named directly so the statement re-runs on every change.
	$: void loadFace(characterId);

	async function loadFace(id: string | null): Promise<void> {
		if (!id) {
			faceUrl = null;
			return;
		}
		const character = characters.find((entry) => entry.id === id);
		if (!character) {
			faceUrl = null;
			return;
		}
		try {
			const url = await characterFaceUrl(character.id, character.basePath);
			// A later pick may have landed while this was in flight; only the current
			// character's portrait may be shown.
			if (id === characterId) faceUrl = url;
		} catch {
			if (id === characterId) faceUrl = null;
		}
	}
</script>

<div class={classNames('avatar', { 'avatar-placeholder': !faceUrl }, classes)}>
	<div class={classNames(size, 'rounded-md', backdropClasses)}>
		{#if faceUrl}
			<img src={faceUrl} alt="" class="object-contain" />
		{:else}
			<span class={textClasses}>{initial}</span>
		{/if}
	</div>
</div>
