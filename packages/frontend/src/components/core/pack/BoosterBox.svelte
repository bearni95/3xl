<script lang="ts">
	import classNames from 'classnames';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { spawnYearLabel } from '$utils/spawn/year';

	// One unopened booster box, drawn in the document: a plain lid seen from above, and
	// under it the face of the box — the show's poster inset a twentieth of the width on
	// all sides, with the show's wordmark laid over the head of it and the place the box
	// belongs to over the foot.
	//
	// The face is 3:4, the very box a CharacterStatue is drawn in — a booster and the
	// cards it opens onto are the same object at two moments, and a grid that changes
	// shape under the tap that opens one is a grid that jumps. The lid is added on top of
	// that, so the whole component is 2:3 (see LID_DEPTH). Both ratios are the
	// component's own, not the host's: hand it a width and it takes the height that goes
	// with it, hand it a height and it gives the width back, so the same component is a
	// grid cell or the whole panel purely by the box it is put in. What is written over the
	// picture and the grounds under it are sized off that width (the box declares itself the
	// container), which is what keeps both the same share of the picture at either size
	// rather than a caption that grows out of it.
	//
	// (Both outer edges used to be serrated into teeth, after the texture PackSprite
	// bakes. A booster is picked out of a grid by the poster on it; the teeth only ate
	// into that poster twice and gave the tile a silhouette no other object on this panel
	// has.)

	// Show poster used as the cover, or null for a plain frame.
	export let coverUrl: string | null = null;
	// The show's wordmark, heading the front. Null leaves the head alone entirely: which
	// logos a show may be said with is an authoring decision (the admin `/shows` screen),
	// and a show with none enabled goes unsaid rather than taking a stand-in.
	export let logoUrl: string | null = null;
	// Full name of the place the box belongs to, said at the foot of the front.
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

	// What the foot says, exactly as the baked pack says it: the place with the year this
	// copy would be minted in joined to it — "Barcelona '26". The gazetteer parks the
	// article after a comma to sort by, so it is put back at the front before the name
	// is said.
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
		<div
			class={classNames(
				'absolute inset-x-0 bottom-0 aspect-square border-[3px] border-black bg-black',
				LID
			)}
		>
			<!-- The top plane catches the light the front does not, which is what puts an edge
				between them: a top and a face in one flat colour are one shape, and a box with no
				edge between its top and its face is not a box. It is the plane that is lit and not
				the whole lid — the border stays outside it, so the black rule reads against the lit
				top the way the picture's frame reads against the picture. The lid's own black is
				what the light is mixed into: a lid in the theme's purple was the one thing on the
				box that was not the box's colour. -->
			<div class="absolute inset-0 bg-white/10"></div>
		</div>
	</div>

	<!-- The face: the box's own card stock, with the picture inset a twentieth of the width
		on all four sides. The margin is the front's and not the poster's, which is why it is
		padding here rather than an inset on the image — the card showing through it is what
		says the box is a printed board with a picture on it instead of a picture with a box
		behind it. Black, and not the theme's neutral: the two fades over the picture are
		black, so a black frame is the one colour that lets them run off the edges of the
		poster into it rather than stopping against a border of another hue. A percentage
		padding is a share of the width on every side, top and bottom included, so the frame
		is an even width all round rather than following the 3:4 out into a taller band above
		and below. This keeps the flex sizing the poster had, which is what still hands the
		box its 3:4.

		The 3px rule round it is the box's cut edge, the same one the lid carries: a fixed
		width and not a share of the container, because an edge is an edge at any size — a
		tile in a grid and the same box stood up the height of a panel are cut out of the
		same card. It is inside the element's own size (border-box), so nothing about the
		ratios or the 5% frame moves to make room for it. -->
	<div class="min-h-0 w-full flex-1 border-[3px] border-black bg-black p-[5%]">
		<!-- The picture and the two things written over it, in one box: the mark and the place
			belong to the poster's edges, not the box's, so they are placed against this rather
			than against the front — an absolute inset is measured off the padding box, and
			anchoring them out there would run the fades over the frame instead of ending them
			where the picture ends. -->
		<div class="relative h-full w-full">
			{#if coverUrl}
				<!-- The poster fills the picture whole: it is inset from the front now but not
					contained within it, so it covers what the frame leaves rather than standing
					centred in it with the neutral showing at its sides. A 2:3 poster covering a box
					this shape loses about a tenth off its height, top and bottom, which is the cost
					of a picture that is all picture. -->
				<img src={coverUrl} alt="" class="h-full w-full bg-black object-cover" />
			{:else}
				<div class="h-full w-full bg-black"></div>
			{/if}

			{#if logoUrl}
				<!-- The show's wordmark across the head of the picture: the name of the thing comes
					first, and a booster box is picked up as a box of that show before it is read as
					this town's copy of it. It is over the picture and not in a band of its own, so
					it cannot be given a solid backing without cutting the poster off at a line; the
					gradient is how it gets its own ground instead — black where the mark is and
					gone by the bottom of it, so the poster darkens into it rather than ending at it.
					The fade wants more room than the mark does, hence the bottom padding: the mark
					sits in the solid end of it and the rest is the fall to nothing. The mark is 90%
					of the picture and takes whatever height its own proportions give it, being
					lettering: it is read at the width it was drawn to be read at. The 90% is
					measured off the picture and not off a padded box, so the fade runs the full
					width of it while the mark keeps a twentieth clear of either side. -->
				<div
					class="absolute inset-x-0 top-0 flex justify-center bg-gradient-to-b from-black to-transparent pt-[2cqw] pb-[9cqw]"
				>
					<img src={logoUrl} alt="" class="w-[90%] object-contain" />
				</div>
			{/if}

			<!-- The place at the foot, on the same fade turned over: black at the bottom edge and
				gone by the top of it, so the two grounds bracket the poster from its own two edges
				rather than one of them cutting across it. Which copy of the box this is is the
				thing said last — the show is what a player is looking for and the town is what
				tells two of the same show apart, so it sits under the picture the way a caption
				does, and the mark keeps the head. White type, because it is black it is being read
				on. -->
			<div
				class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent px-[3cqw] pt-[9cqw] pb-[2cqw] text-center text-[5.4cqw] font-bold leading-snug text-balance text-white"
				title={place}
			>
				{place}
			</div>
		</div>
	</div>
</div>
