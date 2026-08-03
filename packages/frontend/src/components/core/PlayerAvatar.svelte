<script lang="ts">
	import classNames from 'classnames';
	import { characters } from '@3xl/data';
	import CharacterFace from '$sharedComponents/CharacterFace.svelte';
	import { characterFace, type CharacterFace as Face } from '$utils/mugen/character-face';
	import { teamColor } from '$services/team.service';
	import { SpawnColor } from '$types/character-spawn.type';

	// The two halves of the avatar being worn: the character whose portrait it shows,
	// and the colour it is printed in. Both null for the initial-letter avatar every
	// account starts on. The artwork itself is not passed in — it is whichever face
	// the admin picked for that character, framed to the square they cropped on it.
	export let characterId: string | null = null;
	export let color: SpawnColor | null = null;
	// Fallback content: the first letter of the player's name.
	export let initial: string = '?';
	// DaisyUI sizes the avatar off the inner box's width class; the height is the
	// box's own business (see `aspect-square` below), so a caller only ever says how
	// wide — including `w-full`, which is a width and not a shape.
	export let size: string = 'w-14';
	export let textClasses: string = 'text-xl';
	// Whether the letter avatar may stand on the signed-in player's team colour. True
	// wherever the avatar is the reader's own — their card, their picker. False for
	// somebody else's, which is a face on a map pin: a stranger's letter printed on the
	// reader's colours says a thing about that stranger that is not true, and there is
	// no team of theirs to read one from either.
	export let ownColors: boolean = true;
	export let classes: string = '';

	let face: Face | null = null;

	// The backdrop is the player's colours, not the theme's, and its first source is
	// the avatar itself: an avatar is a portrait *in a colour*, so the colour it was
	// dealt in is what it stands on. The letter avatar has no colour of its own —
	// there is no item behind it — so it falls back to whichever colour the player's
	// team is bound to, and to nothing at all when there is no team to read one from.
	// Same swatches as the portrait rings and the card scene. The border is that very
	// colour too: a portrait fills the box edge to edge, so the frame is what's left
	// of the backdrop once it's in.
	const colorClasses: Record<SpawnColor, string> = {
		[SpawnColor.Red]: 'bg-red-500 border-red-500 text-white',
		[SpawnColor.Yellow]: 'bg-yellow-400 border-yellow-400 text-neutral-900',
		[SpawnColor.Blue]: 'bg-blue-500 border-blue-500 text-white',
		[SpawnColor.Orange]: 'bg-orange-500 border-orange-500 text-white',
		[SpawnColor.Green]: 'bg-green-500 border-green-500 text-white',
		[SpawnColor.Purple]: 'bg-purple-500 border-purple-500 text-white'
	};

	$: worn = color ?? (ownColors ? $teamColor : null);
	$: backdropClasses = worn ? colorClasses[worn] : 'border-transparent text-base-content';

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

<!-- `items-center` is half of what keeps the box square, and the half that is easy to
	miss: `.avatar` is a flex container, so its box stretches to the line it is on by
	default, and a stretched height is a definite height — which beats an aspect ratio
	outright. In a fixed `w-14` slot there was no line to stretch to and it never showed;
	dropped into a grid cell beside cards several times its height, the box took the
	row's height and the square became a tall rectangle. Not stretching it leaves its
	height its own to work out.

	Centred rather than started, and that is not a caller's choice to make: where the
	avatar is not stretched at all the two are the same thing, and where it is — the one
	case, a cell in a grid of much taller cards — the middle is where a square that does
	not fill its cell belongs. A caller cannot say otherwise by passing `items-*` in
	`classes` either, whatever the order: Tailwind decides which of two utilities for the
	same property wins by where they sit in the sheet, not by where they sit in the
	attribute, so an alignment offered as an override would silently not be one. -->
<div class={classNames('avatar items-center', { 'avatar-placeholder': !face }, classes)}>
	<!-- The other half: the shape itself. The portrait inside is an SVG at `h-full`,
		which against an auto height has nothing to be full of, so the box is what states
		it — a fixed `w-14` was square only because the crop happened to be. Said once
		here, for every caller, so a caller only ever gives a width. -->
	<div class={classNames(size, 'aspect-square rounded-md border-2', backdropClasses)}>
		{#if face}
			<CharacterFace {face} />
		{:else}
			<span class={textClasses}>{initial}</span>
		{/if}
	</div>
</div>
