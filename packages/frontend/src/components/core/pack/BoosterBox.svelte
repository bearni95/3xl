<script lang="ts">
	import classNames from 'classnames';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { spawnYearLabel } from '$utils/spawn/year';

	// One unopened booster box, drawn in the document: a lid seen from above, and under
	// it the face of the box — the show's poster spanning the full width of it, a
	// coloured band above it saying the place the box belongs to and one below saying
	// what is inside.
	//
	// The face is 3:4, the very box a CharacterStatue is drawn in — a booster and the
	// cards it opens onto are the same object at two moments, and a grid that changes
	// shape under the tap that opens one is a grid that jumps. The lid is added on top of
	// that, so the whole component is 2:3 (see LID_DEPTH). Both ratios are the
	// component's own, not the host's: hand it a width and it takes the height that goes
	// with it, hand it a height and it gives the width back, so the same component is a
	// grid cell or the whole panel purely by the box it is put in. Everything written on
	// it is sized off that width (the box declares itself the container), which is what
	// keeps the bands the same share of the picture at both sizes rather than a caption
	// that grows out of them.
	//
	// (Both outer edges used to be serrated into teeth, after the texture PackSprite
	// bakes. A booster is picked out of a grid by the poster on it; the teeth only ate
	// into that poster twice and gave the tile a silhouette no other object on this panel
	// has.)

	// Show poster used as the cover, or null for a plain frame.
	export let coverUrl: string | null = null;
	// Full name of the place the box belongs to, said in the top band.
	export let locationName: string | null = null;
	export let classes: string = '';

	// The lid: the square top of the box, laid flat and seen in perspective rather than a
	// trapezoid drawn to look like one — the tilt CharacterStatue stands its characters
	// on, turned about the square's front edge, which here is the top edge of the face.
	// The two numbers are its own, though, because a lid is not a floor: this one is
	// asked for a back edge 66% of the front's and half the depth the statue's ground
	// draws, which is the shallower top a box on a shelf shows, seen from nearer eye
	// level than a fighter's feet are.
	//
	// Turning a square of side S about its front edge by θ, seen from a distance d, puts
	// its back edge at r = d/(d + S·sin θ) of the front's width and draws it S·cos θ·r
	// deep. Wanting r = 0.66 and a depth of S/6 gives cos θ = 1/(6·0.66) — that is
	// θ = 75.373° — and d = S·sin θ·0.66/0.34 = 1.8783·S. The distance is in cqw so it
	// tracks the box's own width (the component declares itself the container), CSS
	// perspective taking no percentage.
	//
	// Being a sixth of the width deep is what makes the whole component 2:3: a 3:4 face
	// is 4/3 of a width tall, and the lid puts another 1/6 of a width above it.
	const LID_DEPTH = 'h-[calc(100cqw/6)]';
	const LID = 'origin-bottom [transform:perspective(187.826cqw)_rotateX(75.373deg)]';

	// What the bands say, exactly as the baked pack says it: the place with the year
	// this copy would be minted in joined to it — "Barcelona '26" — and, below the
	// poster, what a pack holds. The gazetteer parks the article after a comma to
	// sort by, so it is put back at the front before the name is said.
	$: place = [locationName ? restoreCatalanArticle(locationName) : '', spawnYearLabel(Date.now())]
		.filter(Boolean)
		.join(' ');
</script>

<!-- The lid over the face: 2:3 all told, the face's own 3:4 with the lid's sixth of a
	width above it. In a grid cell it is a column flex item and so takes the cell's
	width, the ratio giving it its height; stood up in a box that bounds the height
	instead, the host says `h-full` and the ratio gives the width back. -->
<div class={classNames('@container flex aspect-[2/3] min-h-0 flex-col shadow-md', classes)}>
	<!-- The lid stands in a strip exactly as deep as the tilted square draws (a sixth of
		the width), so the face below it starts where the lid's front edge is and comes out
		at its 3:4 without being told. The square itself is a full width tall before it is
		turned and hangs out of that strip upwards, which is why nothing here clips: it
		lands inside the strip only once the transform has folded it down. -->
	<div class={classNames('relative w-full flex-none', LID_DEPTH)}>
		<!-- Pinned by its bottom edge to the top of the face — that edge is the axis it
			turns about, so it is the one line the lid and the face share, and the box reads
			as one object folded at it. -->
		<div class={classNames('absolute inset-x-0 bottom-0 aspect-square bg-neutral', LID)}>
			<!-- The top plane catches the light the front does not: without it a lid in the
				same flat neutral as the band below simply merges into it, and a box with no
				edge between its top and its face is not a box. -->
			<div class="absolute inset-0 bg-white/10"></div>
		</div>
	</div>

	<div
		class="flex-none truncate bg-neutral px-1 text-center text-[5.4cqw] font-bold leading-snug text-neutral-content"
		title={place}
	>
		{place}
	</div>

	{#if coverUrl}
		<!-- The poster whole, never cropped: it is contained in whatever the two bands
			leave of the 3:4 box, so a 2:3 poster stands centred with the neutral showing
			at its sides rather than being cut to fill the width. -->
		<img src={coverUrl} alt="" class="min-h-0 w-full flex-1 bg-neutral object-contain" />
	{:else}
		<div class="min-h-0 w-full flex-1 bg-neutral"></div>
	{/if}

	<div
		class="flex-none bg-neutral px-1 text-center text-[5.4cqw] font-bold leading-snug text-neutral-content"
	>
		x5 Cartes Localitzades
	</div>
</div>
