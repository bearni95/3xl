<script lang="ts">
	import classNames from 'classnames';
	import type { CharacterFace } from '$utils/mugen/character-face';
	import { faceViewBox } from '$utils/mugen/face-crop';

	// The character's active portrait, as resolved by `characterFace` — always
	// shown as the square the admin Faces tab frames on it, authored or default.
	//
	// This lives in @3xl/shared rather than in either app because the admin has to
	// draw a portrait exactly as the game does: the Faces tab is where the square is
	// framed, and the dashboard is where the framing is judged. A second copy would
	// be a second answer to "what does this character look like".
	export let face: CharacterFace | null = null;
	export let alt: string = '';
	export let classes: string = '';

	// The framed square is drawn as an SVG viewBox over the sprite at its natural
	// size: the crop's pixels become the whole viewport, so it scales to whatever
	// box the layout gives it.
	//
	// `rounded-[inherit]` takes the caller's own radius, so the portrait is clipped
	// at the leaf rather than relying on an ancestor's `overflow-hidden` — which
	// browsers stop honouring on a rounded box the moment anything in it paints
	// into its own layer, and the square then pokes out over the corners.
	const base = 'h-full w-full rounded-[inherit]';
</script>

{#if face && face.crop && face.width > 0 && face.height > 0}
	<svg class={classNames(base, classes)} viewBox={faceViewBox(face.crop)} role="img" aria-label={alt}>
		<image href={face.url} x="0" y="0" width={face.width} height={face.height} />
	</svg>
{:else if face}
	<!-- The manifest never described this sprite's size, so there are no pixels to
	     crop in. `object-cover object-top` frames the same square the default crop
	     would have: as wide as the sprite allows, anchored to its top edge. -->
	<img src={face.url} {alt} class={classNames(base, 'object-cover object-top', classes)} />
{/if}
