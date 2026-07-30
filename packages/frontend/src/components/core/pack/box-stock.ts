import { SpawnBox } from '$types/character-spawn.type';

// The two stocks a booster box is printed on, and the four tones of each: the stock
// itself and three steps off it, a twentieth, an eighth and a fifth of the way to the
// other end (#0f0f0f / #1f1f1f / #333333 over black, #f0f0f0 / #e0e0e0 / #cccccc under
// white).
//
// Every surface takes its step off the same scale, in the order a light above and to the
// left would leave them — the top furthest from the stock, then the left face, then the
// right, and the front graded from the left face's step at its head down to the pure
// stock at its foot. Nothing on the box is one flat black or one flat white; the front is
// where that shows, since the picture covers all of it but the frame and the frame is what
// the eye reads the material off. The two grounds over the picture are drawn from the same
// scale, each starting in the tone the front actually is where it sits — the head in the
// front's own head tone, the foot in the stock the front reaches at its foot — which is
// what lets the poster's top and bottom edges dissolve into the frame instead of ending on
// a line against it.
//
// The tones are written as the colours they are rather than as veils laid over the stock,
// because a veil can only tint a surface a single flat amount: the front and the two
// grounds over the picture are gradients, and a gradient needs its ends to be colours. Both
// grounds end in their own colour at zero alpha, which is a note to a reader rather than to
// the renderer: a gradient interpolates premultiplied, so a stop at zero alpha contributes
// no colour at all and the fall is through the tone it started in whatever is named at the
// far end. (Tailwind compiles the alpha-zero end of an arbitrary colour to a transparent
// black; it renders the same, as it must.)
//
// The scale turns over with the stock and the order survives the turn: on black card each
// step is lighter than the last, on white card darker, and either way the top is the
// furthest from the front and the right face the nearest.
//
// It is written twice here, in one file, because the box is drawn twice: BoosterBox.svelte
// paints it in the document out of Tailwind classes, and BoosterBoxSprite paints the same
// box on a canvas out of numbers, where no stylesheet reaches. Neither can read the other's
// form — Tailwind only emits classes it can see spelled out, and a canvas cannot be handed
// a class — so what keeps them one record is that the two are written side by side and a
// tone changed in one is a tone visibly unchanged in the other.

/** One stock as the document draws it: the Tailwind class each surface fills with. */
export interface PackStockClasses {
	top: string;
	left: string;
	right: string;
	front: string;
	head: string;
	foot: string;
	ink: string;
}

/**
 * One stock as a canvas draws it. Four surface tones plus the ink, as CSS hex — the
 * front is not listed, being the head tone graded to the foot one, and the two grounds
 * over the picture are those same two tones faded to nothing (see the comment above).
 */
export interface PackStockTones {
	top: string;
	left: string;
	right: string;
	/** The tone the front's grade starts in, at the top of the picture. */
	head: string;
	/** The stock itself, which the front's grade reaches at the foot of the picture. */
	foot: string;
	ink: string;
}

export const PACK_STOCK: Record<SpawnBox, PackStockClasses> = {
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

export const PACK_STOCK_TONES: Record<SpawnBox, PackStockTones> = {
	[SpawnBox.White]: {
		top: '#cccccc',
		left: '#e0e0e0',
		right: '#f0f0f0',
		head: '#e0e0e0',
		foot: '#ffffff',
		ink: '#000000'
	},
	[SpawnBox.Black]: {
		top: '#333333',
		left: '#1f1f1f',
		right: '#0f0f0f',
		head: '#1f1f1f',
		foot: '#000000',
		ink: '#ffffff'
	}
};
