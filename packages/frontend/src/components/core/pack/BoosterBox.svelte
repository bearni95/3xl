<script lang="ts">
	import classNames from 'classnames';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { spawnYearLabel } from '$utils/spawn/year';

	// One unopened booster box, drawn in the document: a lid seen from above with its four
	// corners cut off, and under it the face of the box — four fifths of the width, the
	// width the cut leaves the lid's front edge, with the two bevel faces those cuts opened
	// running down its sides. On the face, the show's poster inset a twentieth of the width
	// on all sides, the show's wordmark laid over the head of it and the place the box
	// belongs to over the foot.
	//
	// The face is 3:4, the very box a CharacterStatue is drawn in — a booster and the
	// cards it opens onto are the same object at two moments, and a grid that changes
	// shape under the tap that opens one is a grid that jumps. The lid is added on top of
	// that and the face drawn in to four fifths under it, so the whole component is 30:37
	// (see LID_DEPTH). Both ratios are the component's own, not the host's: hand it a
	// width and it takes the height that goes with it, hand it a height and it gives the
	// width back, so the same component is a grid cell or the whole panel purely by the box
	// it is put in. What is written over the picture, the grounds under it and the bevel's
	// faces are all sized off that width (the box declares itself the container), which is
	// what keeps every one of them the same share of the box at either size rather than a
	// caption that grows out of it.
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
	// Printed on white card instead of black. The stock changes and the ink with it, all four
	// of the box's tones turning over together: the same box, the same geometry, the other
	// material. The caller says which — the box has no idea why one run of them would be
	// printed differently.
	export let light: boolean = false;
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
	// The lid is a sixth of the width deep, which with a front four fifths as wide as the
	// lid and 3:4 of its own makes the whole component 30:37 — 16/15 of a width for the
	// front and another 1/6 above it for the lid.
	const LID_DEPTH = 'h-[calc(100cqw/6)]';
	const LID = 'origin-bottom [transform:perspective(187.826cqw)_rotateX(75.373deg)]';

	// The lid's four corners are cut off — an octagon rather than a square, the treatment
	// CharacterStatue gives the floor its characters stand on (see GROUND_CUT there): a tenth
	// off each end of the front and back edges, and 23% off each end of the two sides. A
	// tenth along the front because the front below is four
	// fifths of the width centred under it: taking a tenth off each end leaves the flat run
	// along the lid's front edge exactly the front's own width, so the top ends where the
	// picture begins and the two line up down both sides. The cut is made in the square
	// before the tilt, a transform mapping whatever shape is left, so the four diagonals are
	// laid down with the lid and read as bevelled edges of it rather than as notches cut out
	// of a picture. There is nothing but fill to cut, no surface here being outlined.
	//
	// The two ends of a cut are not the same fraction. A tenth along the front edge is fixed
	// — that is what leaves the front its four fifths — but the depth back along the side is
	// free, and it is what the diagonal's angle is made of: cut a tenth back and the outer
	// end of the cut lands 0.024 of a width above the front edge, which is a diagonal so
	// shallow it reads as a rounded corner rather than a bevelled one. It is cut 23% back
	// instead, which lifts that end to 0.052 — a bit over twice as high — and stands the
	// diagonal at 47.83°, within a fifth of a degree of the 48.01° CharacterStatue's own
	// bevel is cut at. So the two objects in this panel bevel at one angle despite standing
	// at different tilts, which is the thing that was actually wanted of the statue's
	// treatment: the same edge, not the same fraction.
	const LID_CUT =
		'[clip-path:polygon(10%_0,90%_0,100%_23%,100%_77%,90%_100%,10%_100%,0_77%,0_23%)]';

	// What a cut corner leaves is a face, and these are the two front ones: the front of the
	// box is the front of the same block the lid is the top of, so each of its sides carries
	// the slanted face the corner cut opened. They fill the two notches the cut takes out of
	// the lid's bottom corners and carry on down the front's sides, which is what turns a
	// clipped square standing over a picture into one bevelled solid.
	//
	// Their geometry is read off the cut, not chosen, and it is the lid's own perspective
	// that sets it rather than the statue's. The cut's inner end is the tenth mark along the
	// front edge (x = 0.1 of the width); its outer end is on the lid's side 23% of the way
	// back, where the perspective has drawn the side in to (1 − r)/2 = 0.05301 of the width
	// and lifted it 0.23·cos θ·r = 0.05193 above the front edge, r = d/(d + 0.23·sin θ) =
	// 0.89398 being the scale that far back. So a face is 0.04703 of the width wide and the
	// edge across its top rises 0.05193 over that width — 47.83°, which a skew about the
	// inner edge applies to the whole strip at once, top and bottom together, leaving nothing
	// vertical to measure: the strip is simply as tall as the front it stands beside. Change
	// the 23% in LID_CUT and both numbers here have to be worked out again, or the face stops
	// meeting the corner it fills.
	//
	// The width is in cqw against the whole box (the root declares itself a container), the
	// front's own width being no use to a figure taken from the lid's square.
	const BEVEL_FACE = 'absolute inset-y-0 w-[4.703cqw]';
	const BEVEL_FACE_LEFT = 'right-full origin-right [transform:skewY(47.83deg)]';
	const BEVEL_FACE_RIGHT = 'left-full origin-left [transform:skewY(-47.83deg)]';

	// The cover again on each bevel face: the same picture, turned over left to right, a third
	// of its width, and the third that shows is the one against the front — not the middle.
	//
	// It is given the front's own box to cover, 80cqw by the same height, so `object-cover`
	// crops it to exactly what the front is showing whatever proportions the poster has (the
	// saved ones run from 0.64 to 0.76, so a fixed height would have matched one show and
	// missed the rest). The strip is then made out of that by transform, not by a smaller box:
	// a third of the front's width, 26.667cqw, squashed into the face's 4.703 is a scale of
	// 0.17636, and it is negative because the picture is turned over. Squashing sideways
	// leaves every row where it was, so the column at the joint is the front's own edge column
	// row for row, and the face reads as that edge folded back rather than as a second picture
	// stood beside it.
	//
	// A scale about an edge does not put the picture where it is wanted on its own, so each
	// face carries the shift that lands it: measuring from the picture's left edge, which is
	// where both are anchored, the left face wants the cover's left edge at its right-hand
	// side — one face width in, 4.703cqw — and the right face wants the cover's right edge at
	// its left-hand side, which the turn puts three face widths in, 14.109cqw. `max-w-none`
	// because a picture wider than what holds it is the whole point here, and the preflight
	// caps every image at the width of its container.
	//
	// The face's skew is on the face, and a child is transformed with its parent, so the strip
	// shears with the bevel by the same 47.83° its top edge does.
	const FACE_COVER = 'absolute top-0 left-0 h-full w-[80cqw] max-w-none origin-left object-cover';
	const FACE_COVER_LEFT = '[transform:translateX(4.703cqw)_scaleX(-0.17636)]';
	const FACE_COVER_RIGHT = '[transform:translateX(14.109cqw)_scaleX(-0.17636)]';

	// The two stocks a box is printed on, and the four tones of each: the stock itself and
	// three steps off it, a twentieth, an eighth and a fifth of the way to the other end
	// (#0f0f0f / #1f1f1f / #333333 over black, #f0f0f0 / #e0e0e0 / #cccccc under white).
	// They are written as the colours they are rather than as veils laid over the stock,
	// because a veil can only tint a surface a single flat amount: the front and the two
	// grounds over the picture are gradients, and a gradient needs its ends to be colours.
	//
	// Every surface takes its step off the same scale, in the order a light above and to the
	// left would leave them — the top furthest from the stock, then the left face, then the
	// right, and the front graded from the left face's step at its head down to the pure
	// stock at its foot. Nothing on the box is one flat black or one flat white any more; the
	// front is where that shows, since the picture covers all of it but the frame and the
	// frame is what the eye reads the material off.
	//
	// The two grounds over the picture are drawn from the same scale, each starting in the
	// tone the front actually is where it sits — the head in the front's own head tone, the
	// foot in the stock the front reaches at its foot. That is what lets the poster's top and
	// bottom edges dissolve into the frame instead of ending on a line against it. Both are
	// written as ending in their own colour at zero alpha, which is a note to a reader rather
	// than to the browser: a gradient interpolates premultiplied, so a stop at zero alpha
	// contributes no colour at all and the fall is through the tone it started in whatever is
	// named at the far end. (Tailwind compiles the alpha-zero end of an arbitrary colour to a
	// transparent black; it renders the same, as it must.)
	//
	// The scale turns over with the stock and the order survives the turn: on black card each
	// step is lighter than the last, on white card darker, and either way the top is the
	// furthest from the front and the right face the nearest.
	$: skin = light
		? {
				top: 'bg-[#cccccc]',
				left: 'bg-[#e0e0e0]',
				right: 'bg-[#f0f0f0]',
				front: 'from-[#e0e0e0] to-white',
				head: 'from-[#e0e0e0] to-[#e0e0e0]/0',
				foot: 'from-white to-white/0',
				ink: 'text-black'
			}
		: {
				top: 'bg-[#333333]',
				left: 'bg-[#1f1f1f]',
				right: 'bg-[#0f0f0f]',
				front: 'from-[#1f1f1f] to-black',
				head: 'from-[#1f1f1f] to-[#1f1f1f]/0',
				foot: 'from-black to-black/0',
				ink: 'text-white'
			};

	// What the foot says, exactly as the baked pack says it: the place with the year this
	// copy would be minted in joined to it — "Barcelona '26". The gazetteer parks the
	// article after a comma to sort by, so it is put back at the front before the name
	// is said.
	$: place = [locationName ? restoreCatalanArticle(locationName) : '', spawnYearLabel(Date.now())]
		.filter(Boolean)
		.join(' ');
</script>

<!-- The lid over the face: 30:37 all told, the face's own 3:4 at four fifths of the width
	with the lid's sixth of a width above it. In a grid cell it is a column flex item and so
	takes the cell's width, the ratio giving it its height; stood up in a box that bounds the
	height instead, the host says `h-full` and the ratio gives the width back.

	The shadow is a drop shadow and no longer a box shadow: a box shadow is cast by this
	element's rectangle, and the box stopped filling its rectangle the moment the lid lost its
	corners and the front drew in to four fifths — it would have hung a straight-sided shadow
	out past the bevel down both sides and squared off the corners the cut opens. A drop
	shadow is cast by what is actually drawn, so the octagon and the two wings cast their own
	edges. -->
<div
	class={classNames('@container flex aspect-[30/37] min-h-0 flex-col drop-shadow-md', classes)}
>
	<!-- The lid stands in a strip exactly as deep as the tilted square draws (a sixth of
		the width), so the face below it starts where the lid's front edge is and comes out
		at its 3:4 without being told. The square itself is a full width tall before it is
		turned and hangs out of that strip upwards, which is why nothing here clips: it
		lands inside the strip only once the transform has folded it down. The corner cuts
		take nothing off that depth — they eat into the back corners, and the deepest line
		of the lid is the middle of its back edge, which the cut leaves alone. -->
	<div class={classNames('relative w-full flex-none', LID_DEPTH)}>
		<!-- Pinned by its bottom edge to the top of the face — that edge is the axis it
			turns about, so it is the one line the lid and the face share, and the box reads
			as one object folded at it. -->
		<!-- The top takes the step furthest off the stock, which is what puts an edge between it
			and the front: a top and a face in one colour are one shape, and a box with no edge
			between its top and its face is not a box. Which colour that step is belongs to the
			stock (see `skin`); the lid only says that it is the far one. -->
		<div class={classNames('absolute inset-x-0 bottom-0 aspect-square', skin.top, LID, LID_CUT)}></div>
	</div>

	<!-- The face: the picture and nothing else, edge to edge. There is no margin around it —
		the cover is the front, so it runs to all four edges and takes whatever cropping that
		costs it rather than standing inside a border of card. The front's own step off the
		stock is graded down the scale beneath it, from the step the left face takes at its
		head to the pure stock at its foot (see `skin`), which is what a show with no poster
		shows and what the two grounds over the picture are drawn from — each starting in the
		tone the front has where it sits, so neither ends on a colour the front is not. The
		flex sizing is the same, which is what still hands the box its 3:4.

		Nothing here is outlined. A rule round the front would be a line where the two bevel
		faces meet its sides, holding them a pixel off the block they are faces of, and on a
		surface that is all one colour a line around it is a line drawn across a solid. What
		separates the four surfaces is the four tones, which is what separates them on a real
		box too. -->
	<div class="relative min-h-0 w-4/5 min-w-0 flex-1 self-center">
		<!-- The bevel's two faces, hung off the front's sides so they are as tall as it is
			whatever height the box is drawn at (see BEVEL_FACE). They are hung off this block
			rather than off the front itself, which keeps their inner edge on the front's own edge
			whatever padding the front carries — an absolute inset is measured off the padding box,
			and a face placed in there would meet the block it is a face of somewhere inside it.
			Each takes its own step off the stock, the left further than the right, so the two sides
			of the same cut are not one flat band round the picture but two faces turned different
			ways (see `skin`), and each carries a flipped third of the cover over that (see
			FACE_COVER). Nothing is written on them, so they are hidden from a screen reader, which
			is being read the place and the mark. -->
		<div
			class={classNames(BEVEL_FACE, BEVEL_FACE_LEFT, skin.left, 'overflow-hidden')}
			aria-hidden="true"
		>
			{#if coverUrl}
				<img src={coverUrl} alt="" class={classNames(FACE_COVER, FACE_COVER_LEFT)} />
			{/if}
		</div>
		<div
			class={classNames(BEVEL_FACE, BEVEL_FACE_RIGHT, skin.right, 'overflow-hidden')}
			aria-hidden="true"
		>
			{#if coverUrl}
				<img src={coverUrl} alt="" class={classNames(FACE_COVER, FACE_COVER_RIGHT)} />
			{/if}
		</div>

		<div class={classNames('h-full w-full bg-gradient-to-b', skin.front)}>
			<!-- The picture and the two things written over it, in one box. Nothing pads it: the
				cover is the front, edge to edge on all four sides, and what that costs is a crop
				off two of them — a poster is not the box's shape and something has to give, so it
				covers rather than fits. With no padding this box and the front are the same box,
				which is also what the two bevel faces measure their strip of the picture against. -->
			<div class="relative h-full w-full">
				{#if coverUrl}
					<!-- The poster covers the front rather than fitting inside it: the widest posters
						saved are about 0.76 against the front's 0.75, so most of them are narrower than
						it is and lose off the height instead — a 2:3 one about a tenth, top and bottom.
						Whichever way it goes the front is all picture, which is what covering means. -->
					<img
						src={coverUrl}
						alt=""
						class={classNames('h-full w-full bg-gradient-to-b object-cover', skin.front)}
					/>
				{:else}
					<div class={classNames('h-full w-full bg-gradient-to-b', skin.front)}></div>
				{/if}

				{#if logoUrl}
					<!-- The show's wordmark across the head of the picture: the name of the thing comes
						first, and a booster box is picked up as a box of that show before it is read as
						this town's copy of it. It is over the picture and not in a band of its own, so
						it cannot be given a solid backing without cutting the poster off at a line; the
						gradient is how it gets its own ground instead — the front's own head tone where
						the mark is and gone by the bottom of it, so the picture runs into the frame above
						it rather than ending at it, the two being the same colour on that line. The fade
						wants more room than the mark does, hence the bottom padding: the
						mark sits in the solid end of it and the rest is the fall to nothing. The mark is
						90% of the picture and takes whatever height its own proportions give it, being
						lettering: it is read at the width it was drawn to be read at. The 90% is
						measured off the picture and not off a padded box, so the fade runs the full
						width of it while the mark keeps a twentieth clear of either side.

						The mark itself is not turned over with the stock. It is artwork and not ink —
						the wordmarks the authoring side enables are coloured lettering with a light
						outline, which reads on either card, and inverting them to suit the white one
						would put every show in false colours to save the one that is drawn in plain
						white. -->
					<div
						class={classNames(
							'absolute inset-x-0 top-0 flex justify-center bg-gradient-to-b pt-[2cqw] pb-[9cqw]',
							skin.head
						)}
					>
						<img src={logoUrl} alt="" class="w-[90%] object-contain" />
					</div>
				{/if}

				<!-- The place at the foot, on the same fade turned over: the pure stock at the bottom
					edge, which is what the front has come down to by then, and gone by the top of it,
					so the two grounds bracket the poster from its own two edges rather than one of
					them cutting across it — each in its own end of the front's grade, neither in a
					colour the front is not. Which copy of the box this is is
					the thing said last — the show is what a player is looking for and the town is what
					tells two of the same show apart, so it sits under the picture the way a caption
					does, and the mark keeps the head. The type is whichever of the two the card is
					not, since the card is what it is being read on. The cqw sizes are shares of the
					whole box rather than of the front, so neither the type nor either fade changed
					size when the front drew in to four fifths. -->
				<div
					class={classNames(
						'absolute inset-x-0 bottom-0 bg-gradient-to-t px-[3cqw] pt-[9cqw] pb-[2cqw] text-center text-[5.4cqw] font-bold leading-snug text-balance',
						skin.foot,
						skin.ink
					)}
					title={place}
				>
					{place}
				</div>
			</div>
		</div>
	</div>
</div>
