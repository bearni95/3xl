<script lang="ts">
	import classNames from 'classnames';
	import { characters } from '@3xl/data';
	import CharacterFace from '$components/core/CharacterFace.svelte';
	import { characterFace, type CharacterFace as Face } from '$utils/mugen/character-face';
	import { activeTeamColor } from '$services/team.service';
	import { SpawnColor } from '$types/character-spawn.type';

	// The character the player wears, or null for the initial-letter avatar every
	// account starts on. Only the character is stored on the profile — the
	// portrait it shows is whichever face the admin picked for it, framed to the
	// square they cropped on it.
	export let characterId: string | null = null;
	// Fallback content: the first letter of the player's name.
	export let initial: string = '?';
	// DaisyUI sizes the avatar off the inner box's width class.
	export let size: string = 'w-14';
	export let textClasses: string = 'text-xl';
	export let classes: string = '';

	let face: Face | null = null;

	// The backdrop is the player's colours, not the theme's: whichever colour the
	// active team is bound to, and nothing at all when there is no team to read one
	// from. Same swatches as the portrait rings and the card scene. The border is
	// that very colour too — a portrait fills the box edge to edge, so the frame is
	// what's left of the backdrop once it's in.
	const colorClasses: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'bg-red-500 border-red-500 text-white',
		[SpawnColor.Yellow]: 'bg-yellow-400 border-yellow-400 text-neutral-900',
		[SpawnColor.Blue]: 'bg-blue-500 border-blue-500 text-white',
		[SpawnColor.Orange]: 'bg-orange-500 border-orange-500 text-white',
		[SpawnColor.Green]: 'bg-green-500 border-green-500 text-white',
		[SpawnColor.Purple]: 'bg-purple-500 border-purple-500 text-white'
	};

	$: backdropClasses = $activeTeamColor
		? colorClasses[$activeTeamColor]
		: 'border-transparent text-base-content';

	// `characterId` is named directly so the statement re-runs on every change.
	$: void loadFace(characterId);

	async function loadFace(id: string | null): Promise<void> {
		if (!id) {
			face = null;
			return;
		}
		const character = characters.find((entry) => entry.id === id);
		if (!character) {
			face = null;
			return;
		}
		try {
			const resolved = await characterFace(character.id, character.basePath);
			// A later pick may have landed while this was in flight; only the current
			// character's portrait may be shown.
			if (id === characterId) face = resolved;
		} catch {
			if (id === characterId) face = null;
		}
	}
</script>

<div class={classNames('avatar', { 'avatar-placeholder': !face }, classes)}>
	<div class={classNames(size, 'rounded-md border-2', backdropClasses)}>
		{#if face}
			<CharacterFace {face} />
		{:else}
			<span class={textClasses}>{initial}</span>
		{/if}
	</div>
</div>
