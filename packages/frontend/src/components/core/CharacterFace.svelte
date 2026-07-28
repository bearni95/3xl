<script lang="ts">
	import classNames from 'classnames';
	import type { CharacterFace } from '$utils/mugen/character-face';
	import { faceViewBox } from '$utils/mugen/face-crop';

	// The character's active portrait, as resolved by `characterFace`. When it
	// carries a crop, only that square is shown; otherwise the whole portrait is,
	// contained in the box the parent sizes.
	export let face: CharacterFace | null = null;
	export let alt: string = '';
	export let classes: string = '';

	// The framed square is drawn as an SVG viewBox over the sprite at its natural
	// size: the crop's pixels become the whole viewport, so it scales to whatever
	// box the layout gives it.
</script>

{#if face && face.crop && face.width > 0 && face.height > 0}
	<svg
		class={classNames('h-full w-full', classes)}
		viewBox={faceViewBox(face.crop)}
		role="img"
		aria-label={alt}
	>
		<image href={face.url} x="0" y="0" width={face.width} height={face.height} />
	</svg>
{:else if face}
	<img src={face.url} {alt} class={classNames('h-full w-full object-contain', classes)} />
{/if}
