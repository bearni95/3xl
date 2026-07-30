<script context="module" lang="ts">
	import { SpawnBox } from '$types/character-spawn.type';

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
	//
	// In module scope because it is a fact about the two stocks and not about any one box: every
	// box drawn on the page reads the same record, and the squares the lid breaks into when it is
	// opened are painted the top's own tone off it rather than off a second copy of these hexes.
	const PACK_STOCK: Record<
		SpawnBox,
		{
			top: string;
			left: string;
			right: string;
			front: string;
			head: string;
			foot: string;
			ink: string;
		}
	> = {
		[SpawnBox.White]: {
			top: 'bg-[#cccccc]',
			left: 'bg-[#e0e0e0]',
			right: 'bg-[#f0f0f0]',
			front: 'from-[#e0e0e0] to-white',
			head: 'from-[#e0e0e0] to-[#e0e0e0]/0',
			foot: 'from-white to-white/0',
			ink: 'text-black'
		},
		[SpawnBox.Black]: {
			top: 'bg-[#333333]',
			left: 'bg-[#1f1f1f]',
			right: 'bg-[#0f0f0f]',
			front: 'from-[#1f1f1f] to-black',
			head: 'from-[#1f1f1f] to-[#1f1f1f]/0',
			foot: 'from-black to-black/0',
			ink: 'text-white'
		}
	};
</script>

<script lang="ts">
	import classNames from 'classnames';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import VeilBlock from '$components/core/VeilBlock.svelte';
	import restoreCatalanArticle from '$utils/string/restore-catalan-article';
	import { showIconName } from '$utils/show/show-icon';
	import { spawnYearLabel } from '$utils/spawn/year';

	// One unopened booster box, drawn in the document: a lid seen from above with its four
	// corners cut off, and under it the face of the box — four fifths of the width, the
	// width the cut leaves the lid's front edge, with the two bevel faces those cuts opened
	// running down its sides. On the face, the show's poster edge to edge, the place the box
	// belongs to laid over the head of it and the show's wordmark over the foot.
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
	// The show's wordmark, footing the front. Null leaves the foot alone entirely: which
	// logos a show may be said with is an authoring decision (the admin `/shows` screen),
	// and a show with none enabled goes unsaid rather than taking a stand-in.
	export let logoUrl: string | null = null;
	// Full name of the place the box belongs to, said at the foot of the front.
	export let locationName: string | null = null;
	// TMDB id of the show inside, which the lid's glyph is looked up by. A show with no
	// glyph drawn for it yet leaves the lid bare rather than taking a stand-in mark, the
	// same rule every other surface that badges a show goes by.
	export let showId: number | null = null;
	// Printed on white card instead of black. The stock changes and the ink with it, all four
	// of the box's tones turning over together: the same box, the same geometry, the other
	// material. The caller says which — the box has no idea why one run of them would be
	// printed differently.
	export let light: boolean = false;
	// Take the lid off. The top breaks into a grid of squares of its own tone and dissolves,
	// front row first, and `opened` is dispatched once it is gone — which is the whole of what a
	// box does when it is opened: what comes out of it is the caller's to stand up, and it is
	// what has to wait for that event before putting the cards where the box was (see PackGrid).
	// Turned off again the lid is simply back on, for a roll that never answered.
	export let opening: boolean = false;
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

	// The two grounds again on each bevel face: the print does not stop at the fold, so the
	// fade the poster's head and foot dissolve into carries round onto the faces the same way
	// the picture under it does. Without them a face was bright poster at top and bottom where
	// the front beside it had gone to card, which put a lit strip either side of both fades and
	// read as a frame round the picture rather than as the edge of it.
	//
	// Unlike the cover, a ground needs neither the flip nor the squash: a `to-b` gradient is one
	// colour all the way across its width, so turning it over or narrowing it changes nothing
	// that can be seen. What the face needs from the front is only its *width as a layout* —
	// each band is as tall as its padding plus what is written in it, and a wordmark or a place
	// name laid out in a strip 4.703cqw wide would wrap to a different height than the same
	// thing laid out across 80cqw. So the grounds are rendered here into a box of the front's
	// own width and height, with what is printed on them hidden (see the `grounds` snippet),
	// and the face's overflow crops that box to the strip: the bands land on exactly the rows
	// they land on over the front, and the fold is a fold rather than a joint between two
	// prints.
	//
	// Which leaves the tilt, and it comes for free: a child is transformed with its parent, so
	// the bands shear by the face's own 47.83°, in the direction that face is skewed — falling
	// away to the left on the left face and to the right on the right one, each band parallel
	// to the bevel's top edge. The skew turns about the inner edge, the one the face shares
	// with the front, so along that edge the band is at the front's own height and nothing has
	// to be lined up by hand.
	const FACE_GROUNDS = 'absolute top-0 left-0 h-full w-[80cqw]';

	// Which of the two stocks this box is printed on, and so the four tones every surface of
	// it takes its step off (see PACK_STOCK above, where the scale itself is written and why).
	// The caller says it as a boolean — a run of boxes is printed light or it is not — and the
	// two stocks are the game's own two boxes, so the flag is read as the box it means.
	$: skin = PACK_STOCK[light ? SpawnBox.White : SpawnBox.Black];

	// The glyph the lid is stamped with: the show's own, the very mark the map pins that show
	// with and the statue paints across the floor its characters stand on. Null for a show
	// with none drawn yet, which leaves the lid bare.
	$: showIcon = showIconName(showId);

	// Taking the lid off, which is the one thing this box does rather than merely shows. It
	// breaks into a grid of squares and the grid dissolves, from the middle of the top outwards
	// — the very squares a character's art arrives behind (VeilBlock's, on IdleSprite's clock),
	// laid inside the tilted square so they are tilted and clipped with the top they are breaking
	// up. Three states, in the order they happen: the top whole, the top crazed into squares,
	// the squares gone.
	//
	// `printed` is what turns the second into the third: the lid's own tone and the mark stamped
	// on it go the moment the grid is all the way in — invisibly, the squares being opaque and
	// the lid's own colour — so that what the sweep uncovers is the inside of the box and not
	// the top it has just broken up. Without it the squares would dissolve back onto a lid that
	// was still there.
	let lid: 'on' | 'crazing' | 'dissolving' | 'off' = 'on';
	let printed = true;
	let lidTimer: ReturnType<typeof setTimeout> | null = null;
	// The lid's own width, measured: the grid counts its rows and columns off a square given in
	// pixels, and this is the one number the box knows in shares of itself alone. It is the plane's
	// own width and not the drawn one — `clientWidth` is read off the layout box, before the
	// transform folds it down.
	let lidWidth = 0;

	// How long the crazed top holds before it goes, and how long it takes to go. The second is
	// VeilBlock's whole sweep — the grid stops being drawn at the end of it, so a sweep that ran
	// longer would be cut off mid-blur; its blur and its stagger are what add up to this
	// (IdleSprite holds the same two numbers for the same reason).
	const LID_HOLD = 300;
	const LID_FADE = 1000;
	// How big a square is, as a share of the lid's own square — the tenth a statue's veil takes
	// of the card it covers, so a box comes apart into the same grid its cards arrive behind. The
	// rows come out flat and flatter as they recede, a lid being a plane only a sixth of a width
	// deep, which is what a grid laid down on it rather than drawn over it looks like.
	const LID_CELL = 0.1;

	const dispatch = createEventDispatcher<{ opened: void }>();

	// The lid comes off when it is asked for and goes back on when the asking stops, which is
	// what a roll that never answered leaves behind: a box still sealed.
	$: if (opening) breakLid();
	else resetLid();

	/** Craze the top: the grid goes up over it, and nothing else happens until the grid says it
	 * is all the way in. */
	function breakLid(): void {
		if (lid !== 'on') return;
		lid = 'crazing';
	}

	/** The grid is all there, so the top under it is no longer needed — and once it has held a
	 * beat, neither is the grid. */
	function lidCrazed(): void {
		if (lid !== 'crazing' || lidTimer) return;
		printed = false;
		lidTimer = setTimeout(() => {
			lid = 'dissolving';
			lidTimer = setTimeout(() => {
				lid = 'off';
				lidTimer = null;
				dispatch('opened');
			}, LID_FADE);
		}, LID_HOLD);
	}

	/** Lid on, no grid, no clock. */
	function resetLid(): void {
		if (lidTimer) clearTimeout(lidTimer);
		lidTimer = null;
		lid = 'on';
		printed = true;
	}

	onDestroy(() => {
		if (lidTimer) clearTimeout(lidTimer);
	});

	// What the head says, exactly as the baked pack says it: the place with the year this
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
			stock (see `skin`); the lid only says that it is the far one. It is also what the
			show's glyph is stamped on, and the ink is set here rather than on the glyph: the
			glyph paints in `currentColor` and ShowIcon puts `text-current` on its own span, so a
			colour handed to it as a class is a second `color` rule at the same weight, settled
			by which of the two Tailwind emits last and not by which was asked for — `text-black`
			is emitted before `text-current` and lost to it, leaving a white box's mark in
			whatever the page was inheriting. Coloured from the plane it is printed on, there is
			nothing to settle: `currentColor` is the ink, which is the ink the front's type is set
			in — black on a white box, white on a black one, at full strength where the statue
			paints its floor in a veiled white, since a character stands in front of that floor
			and must not be argued with while nothing stands on a lid.

			The tone and the mark are both dropped the moment the grid below is all the way in: from
			there on the squares are the top, and it is they that go (see `printed`). -->
		<div
			class={classNames(
				'absolute inset-x-0 bottom-0 aspect-square',
				printed ? skin.top : null,
				skin.ink,
				LID,
				LID_CUT
			)}
			bind:clientWidth={lidWidth}
		>
			{#if showIcon && printed}
				<!-- Inside the tilted square, so the glyph is laid down with the lid rather than
					standing up on it, and clipped by the corner cuts along with it: the mark is
					printed on the top of the box, and a print on a plane seen in perspective is seen
					in the same perspective. Sized off the square rather than left at its own size —
					the glyph ships in `em` to follow whatever type it sits in, and a lid is not type
					— at four fifths of it, centred, so it is stamped on the top with a margin round
					it and does not run into the corners the cut takes off. Four fifths of both sides
					and not of the width alone: a mark squashed one way is a different mark. -->
				<ShowIcon
					name={showIcon}
					classes="absolute inset-0 justify-center [&>svg]:h-[80%] [&>svg]:w-[80%]"
				/>
			{/if}

			{#if (lid === 'crazing' || lid === 'dissolving') && lidWidth > 0}
				<!-- The top coming apart, inside the tilted square: the squares are laid down with the
					lid and clipped by its corner cuts exactly as the mark stamped on it is, so what
					breaks up is the plane and not a rectangle drawn over it — the rows flatten as they
					recede, which is a grid on a surface a sixth of a width deep seen from where this
					box is seen. They are painted the lid's own tone, so the top crazes into squares
					rather than being covered by something else, and the sweep starts at the middle
					square and travels out to the edges — a lid gives at the middle of itself, and a
					sweep off one edge would only have said which edge (the loading veils keep that
					one, running up the way a character stands). Measured in squares, so on this plane
					the ring the sweep opens in is drawn as the ellipse the perspective makes of it.
					What it looks like is its own; this says where it is, what it is printed on, which
					way it goes and when to leave. -->
				<VeilBlock
					left="0px"
					bottom="0px"
					width="{lidWidth}px"
					height="{lidWidth}px"
					cell={lidWidth * LID_CELL}
					fill={skin.top}
					from="centre"
					fading={lid === 'dissolving'}
					on:shown={lidCrazed}
				/>
			{/if}
		</div>
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
			FACE_COVER) with the poster's own two fades over that again, tilted with the face (see
			FACE_GROUNDS). Nothing is written on them, so they are hidden from a screen reader,
			which is being read the place and the mark. -->
		<div
			class={classNames(BEVEL_FACE, BEVEL_FACE_LEFT, skin.left, 'overflow-hidden')}
			aria-hidden="true"
		>
			{#if coverUrl}
				<img src={coverUrl} alt="" class={classNames(FACE_COVER, FACE_COVER_LEFT)} />
			{/if}
			<div class={FACE_GROUNDS}>{@render grounds(false)}</div>
		</div>
		<div
			class={classNames(BEVEL_FACE, BEVEL_FACE_RIGHT, skin.right, 'overflow-hidden')}
			aria-hidden="true"
		>
			{#if coverUrl}
				<img src={coverUrl} alt="" class={classNames(FACE_COVER, FACE_COVER_RIGHT)} />
			{/if}
			<div class={FACE_GROUNDS}>{@render grounds(false)}</div>
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

				{@render grounds(true)}
			</div>
		</div>
	</div>
</div>

<!-- The two grounds over the picture, drawn wherever the print goes: over the front, where they
	are also what is written on it, and over each bevel face, where they are the same two fades
	with nothing written in them (`printed` false hides the mark and the place, not their
	grounds — a face carries the print's fades, not its type, which at a twentieth of the front's
	width would be a smear of ink). One snippet and not three copies of it because the whole point
	is that the bands land on the same rows on all three surfaces: they are as tall as their
	padding plus their content, so a second hand-kept copy is a band that quietly stops matching
	the first the next time either is touched. -->
{#snippet grounds(printed: boolean)}
	<!-- The place across the head of the picture: which copy of the box this is, said first.
		Two boxes of the same show are told apart by nothing but the town on them, and a reader
		looking down a panel of boxes is looking down the line the towns are on — so the town
		takes the head, where a caption is found without hunting for it, and the show's mark
		goes under the picture like a signature. (It was the other way round: the mark headed
		the front and the town sat at its foot.)

		It is over the picture and not in a band of its own, so it cannot be given a solid
		backing without cutting the poster off at a line; the gradient is how it gets its own
		ground instead — the front's own head tone where the type is and gone by the bottom of
		it, so the picture runs into the frame above it rather than ending at it, the two being
		the same colour on that line. The fade wants more room than the type does, hence the
		bottom padding: the type sits in the solid end of it and the rest is the fall to
		nothing. The type is whichever of the two the card is not, since the card is what it is
		being read on. The cqw sizes are shares of the whole box rather than of the front, so
		neither the type nor either fade changed size when the front drew in to four fifths.

		The type is hidden on a face rather than dropped, and it is the type that is hidden and
		not the block holding it: hiding the block would take the gradient with it, visibility
		being inherited by what is painted as well as by what is written, and dropping the type
		would leave a band of another height — it is what this band's height is made of. The
		tooltip and the reading of it go with the printed one only: a face is inside an
		aria-hidden strip anyway, and a title on a copy nobody can point at says nothing. -->
	<div
		class={classNames(
			'absolute inset-x-0 top-0 bg-gradient-to-b px-[3cqw] pt-[2cqw] pb-[9cqw] text-center text-[5.4cqw] font-bold leading-snug text-balance',
			skin.head,
			skin.ink
		)}
		title={printed ? place : undefined}
	>
		<span class={classNames({ invisible: !printed })}>{place}</span>
	</div>

	{#if logoUrl}
		<!-- The show's wordmark at the foot, on the same fade turned over: the pure stock at the
			bottom edge, which is what the front has come down to by then, and gone by the top of
			it, so the two grounds bracket the poster from its own two edges rather than one of
			them cutting across it — each in its own end of the front's grade, neither in a colour
			the front is not. What show is inside is already said twice over on this box, by the
			glyph on the lid and by the poster covering the front, so the mark is the thing that
			can afford to be read last; the town cannot, being said nowhere else.

			The mark is 90% of the picture and takes whatever height its own proportions give it,
			being lettering: it is read at the width it was drawn to be read at. The 90% is
			measured off the picture and not off a padded box, so the fade runs the full width of
			it while the mark keeps a twentieth clear of either side.

			The mark itself is not turned over with the stock. It is artwork and not ink — the
			wordmarks the authoring side enables are coloured lettering with a light outline,
			which reads on either card, and inverting them to suit the white one would put every
			show in false colours to save the one that is drawn in plain white.

			On a face it is hidden for the reason the type is, and for the same good of the band's
			height. -->
		<div
			class={classNames(
				'absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t pt-[9cqw] pb-[2cqw]',
				skin.foot
			)}
		>
			<img
				src={logoUrl}
				alt=""
				class={classNames('w-[90%] object-contain', { invisible: !printed })}
			/>
		</div>
	{/if}
{/snippet}
