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
	// Printed on white card instead of black. Every part of the box that is black becomes
	// white and the ink that is white becomes black: the same box, the same geometry, the
	// other stock. The caller says which — the box has no idea why one run of them would be
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

	// The lid's four corners are cut off — an octagon rather than a square, a tenth of each
	// side nearest a corner taken away, the treatment CharacterStatue gives the floor its
	// characters stand on (see GROUND_CUT there). A tenth because the front below is four
	// fifths of the width centred under it: taking a tenth off each end leaves the flat run
	// along the lid's front edge exactly the front's own width, so the top ends where the
	// picture begins and the two line up down both sides. The cut is made in the square
	// before the tilt, a transform mapping whatever shape is left, so the four diagonals are
	// laid down with the lid and read as bevelled edges of it rather than as notches cut out
	// of a picture. It takes the 3px rule with it along those diagonals, which costs nothing:
	// the rule is the same colour the fill is, on either stock.
	const LID_CUT =
		'[clip-path:polygon(10%_0,90%_0,100%_10%,100%_90%,90%_100%,10%_100%,0_90%,0_10%)]';

	// What a cut corner leaves is a face, and these are the two front ones: the front of the
	// box is the front of the same block the lid is the top of, so each of its sides carries
	// the slanted face the corner cut opened. They fill the two notches the cut takes out of
	// the lid's bottom corners and carry on down the front's sides, which is what turns a
	// clipped square standing over a picture into one bevelled solid.
	//
	// Their geometry is read off the cut, not chosen, and it is the lid's own perspective
	// that sets it rather than the statue's — the same figure at a different tilt. The cut's
	// inner end is the tenth mark along the front edge (x = 0.1 of the width); its outer end
	// is on the lid's side a tenth of the way back, where the perspective has drawn the side
	// in to (1 − r₁)/2 = 0.02449 of the width and lifted it 0.1·cos θ·r₁ = 0.02402 above the
	// front edge, r₁ = d/(d + 0.1·sin θ) = 0.95102 being the scale a tenth back. So a face is
	// 0.07551 of the width wide and the edge across its top rises 0.02402 over that width —
	// 17.64°, which a skew about the inner edge applies to the whole strip at once, top and
	// bottom together, leaving nothing vertical to measure: the strip is simply as tall as the
	// front it stands beside. A shallower tilt than the statue's cuts a shallower bevel, which
	// is the same thing said twice: a lid seen from nearer eye level shows less of its own top.
	//
	// The width is in cqw against the whole box (the root declares itself a container), the
	// front's own width being no use to a figure taken from the lid's square.
	const BEVEL_FACE = 'absolute inset-y-0 w-[7.551cqw]';
	const BEVEL_FACE_LEFT = 'right-full origin-right [transform:skewY(17.64deg)]';
	const BEVEL_FACE_RIGHT = 'left-full origin-left [transform:skewY(-17.64deg)]';

	// The plane the cut surfaces are shaded on, and the front is not: the top and the two
	// side faces are the faces the cut opened, all three of them the same stock under the
	// same veil, and the printed front is the one plane that is not veiled. One name for
	// where it goes rather than the same three literals — the sides are the colour of the
	// top by being given the colour of the top, so the two cannot drift apart.
	const LIT = 'absolute inset-0';

	// The two stocks a box is printed on, black or white, and what each does to every part
	// of it that has a colour. Which way round the veil goes is the one thing that is not a
	// straight swap: on black card the cut faces are lifted off the front by white, and on
	// white card there is no lifting a face off paper that is already the lightest thing on
	// it, so the same 10% goes the other way and the cut surfaces are shaded instead. Both
	// are the same statement — the top and the sides are one tone and the front is another,
	// which is what puts an edge between them.
	//
	// The fades end in the stock at zero alpha rather than in `transparent`, so what they
	// pass through on the way is the card's own colour and never a grey that belongs to
	// neither.
	$: skin = light
		? {
				card: 'border-white bg-white',
				fill: 'bg-white',
				veil: 'bg-black/10',
				fade: 'from-white to-white/0',
				ink: 'text-black'
			}
		: {
				card: 'border-black bg-black',
				fill: 'bg-black',
				veil: 'bg-white/10',
				fade: 'from-black to-black/0',
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
		<div
			class={classNames(
				'absolute inset-x-0 bottom-0 aspect-square border-[3px]',
				skin.card,
				LID,
				LID_CUT
			)}
		>
			<!-- The top plane is veiled where the front is not, which is what puts an edge between
				them: a top and a face in one flat colour are one shape, and a box with no edge
				between its top and its face is not a box. It is the plane that is veiled and not
				the whole lid — the border stays outside it, so the rule reads against the veiled
				top the way the picture's frame reads against the picture. Which way the veil goes
				is the stock's business (see `skin`); the lid only says where it lies. -->
			<div class={classNames(LIT, skin.veil)}></div>
		</div>
	</div>

	<!-- The face: the box's own card stock, with the picture inset a twentieth of the width
		on all four sides. The margin is the front's and not the poster's, which is why it is
		padding here rather than an inset on the image — the card showing through it is what
		says the box is a printed board with a picture on it instead of a picture with a box
		behind it. The stock's own colour and not the theme's neutral: the two fades over the
		picture end in that same colour, so the frame is the one thing that lets them run off
		the edges of the poster into it rather than stopping against a border of another hue —
		which holds on white card exactly as it did on black. A percentage
		padding is a share of the width on every side, top and bottom included, so the frame
		is an even width all round rather than following the 3:4 out into a taller band above
		and below. This keeps the flex sizing the poster had, which is what still hands the
		box its 3:4.

		The 3px rule round it is the box's cut edge, the same one the lid carries: a fixed
		width and not a share of the container, because an edge is an edge at any size — a
		tile in a grid and the same box stood up the height of a panel are cut out of the
		same card. It is inside the element's own size (border-box), so nothing about the
		ratios or the 5% frame moves to make room for it. -->
	<div class="relative min-h-0 w-4/5 min-w-0 flex-1 self-center">
		<!-- The bevel's two faces, hung off the front's sides so they are as tall as it is
			whatever height the box is drawn at (see BEVEL_FACE). They are hung off this block
			rather than off the front itself so their inner edge lands on the front's outer edge:
			an absolute inset is measured off the padding box, which the 3px rule sits outside
			of, and a face placed in there would meet the block it is a face of three pixels in.
			They take the tilted top's colour, being the other faces the same cut opened — the
			same stock under the same veil (see LIT), so the three cut surfaces are one material
			and the printed front is the only plane on the box that is unveiled. Nothing is written
			on them, so they are hidden from a screen reader, which is being read the place and
			the mark. -->
		<div class={classNames(BEVEL_FACE, BEVEL_FACE_LEFT, skin.fill)} aria-hidden="true">
			<div class={classNames(LIT, skin.veil)}></div>
		</div>
		<div class={classNames(BEVEL_FACE, BEVEL_FACE_RIGHT, skin.fill)} aria-hidden="true">
			<div class={classNames(LIT, skin.veil)}></div>
		</div>

		<div class={classNames('h-full w-full border-[3px] p-[5%]', skin.card)}>
			<!-- The picture and the two things written over it, in one box: the mark and the place
				belong to the poster's edges, not the box's, so they are placed against this rather
				than against the front — an absolute inset is measured off the padding box, and
				anchoring them out there would run the fades over the frame instead of ending them
				where the picture ends. -->
			<div class="relative h-full w-full">
				{#if coverUrl}
					<!-- The poster fills the picture whole: it is inset from the front now but not
						contained within it, so it covers what the frame leaves rather than standing
						centred in it with the card showing at its sides. A 2:3 poster covering a box
						this shape loses about a tenth off its height, top and bottom, which is the cost
						of a picture that is all picture. -->
					<img
						src={coverUrl}
						alt=""
						class={classNames('h-full w-full object-cover', skin.fill)}
					/>
				{:else}
					<div class={classNames('h-full w-full', skin.fill)}></div>
				{/if}

				{#if logoUrl}
					<!-- The show's wordmark across the head of the picture: the name of the thing comes
						first, and a booster box is picked up as a box of that show before it is read as
						this town's copy of it. It is over the picture and not in a band of its own, so
						it cannot be given a solid backing without cutting the poster off at a line; the
						gradient is how it gets its own ground instead — the card's colour where the mark
						is and gone by the bottom of it, so the poster runs into it rather than ending at
						it. The fade wants more room than the mark does, hence the bottom padding: the
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
							skin.fade
						)}
					>
						<img src={logoUrl} alt="" class="w-[90%] object-contain" />
					</div>
				{/if}

				<!-- The place at the foot, on the same fade turned over: solid card at the bottom edge
					and gone by the top of it, so the two grounds bracket the poster from its own two
					edges rather than one of them cutting across it. Which copy of the box this is is
					the thing said last — the show is what a player is looking for and the town is what
					tells two of the same show apart, so it sits under the picture the way a caption
					does, and the mark keeps the head. The type is whichever of the two the card is
					not, since the card is what it is being read on. The cqw sizes are shares of the
					whole box rather than of the front, so neither the type nor either fade changed
					size when the front drew in to four fifths. -->
				<div
					class={classNames(
						'absolute inset-x-0 bottom-0 bg-gradient-to-t px-[3cqw] pt-[9cqw] pb-[2cqw] text-center text-[5.4cqw] font-bold leading-snug text-balance',
						skin.fade,
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
