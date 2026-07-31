// Where each pin stands, once none of them may stand on another.
//
// A pin marks a point, but a pin is not a point: it is a plate a couple of hundred
// pixels across, and towns crowd. Drawn on their points, the pins of a comarca pile
// into one unreadable heap and the reader is left with whichever the paint order put
// on top. So the point and the mark are separated: the point stays exactly where it
// is, and the mark is moved off it until it has room, with a line drawn back to say
// which point it is still about (the line is the map's to draw — this only says where
// the mark ended up).
//
// A mark always stands to the RIGHT of its point, and is looked for as near to it as
// it can be had: the tries are sorted by how far they are from the place, so a pin
// takes the nearest free room there is and the line back is the shortest one that
// could have been drawn. Rightwards is not an optimisation but the one rule that makes
// the drawing readable — every leader line leaves its point the same way and meets its
// plate at the same corner, so a reader who has followed one has followed all of them.
//
// The room is looked for up and down first and only then further out, in columns a
// pin's own width apart. Vertical alone is the honest answer for a handful of towns on
// one line; it is not an answer at all for a viewport holding more plates than it has
// height for, which a comarca of villages is, and a second column is the difference
// between a few marks moved and a few marks buried.
//
// The one thing that does move a pin sideways is the edge of the screen: a mark that
// would hang off the right of the viewport is pulled back in, even to the point of
// standing over its own place, because a pin that cannot be read at all is worse than
// one whose line runs backwards.
//
// Nothing here reads the DOM or the map. It is given points and sizes in container
// pixels and hands back offsets, so it can be tested without either.

/** One pin to place: the point it marks, and the size it came out. */
export interface PinAnchor {
	id: string;
	/** The point the pin is about, in container pixels. */
	x: number;
	y: number;
	/** The pin's rendered width in pixels. */
	width: number;
	/** Its rendered height in pixels. */
	height: number;
}

/** Where a pin ended up, as its left-middle's distance from its point. */
export interface PinOffset {
	/** The pin's left edge, right of its point. Negative once an edge has pushed it back. */
	dx: number;
	/** The pin's middle, below its point. */
	dy: number;
}

export interface PinLayoutOptions {
	/** The gap a pin would like between its point and its left edge. */
	lead?: number;
	/** Clear space demanded between two pins. */
	gap?: number;
	/** How far each try moves a pin up or down. */
	step?: number;
	/** The furthest a pin is moved up or down before it is left where it wanted to be. */
	spread?: number;
	/** How many columns of room a pin may look through, its own place counting as one. */
	columns?: number;
	/** Keep-out from the viewport's edges. */
	margin?: number;
	/**
	 * Room the viewport has but the pins may not use: whatever is drawn over the canvas
	 * and is not a pin. A viewport is not the same thing as the room in it — the map
	 * carries a breadcrumb bar across its top and plates in its corners, and a pin
	 * "kept on screen" under one of them is a pin nobody can read. Given per edge, in
	 * pixels, measured from the viewport's own edge inwards.
	 */
	insets?: { top?: number; right?: number; bottom?: number; left?: number };
}

const DEFAULTS: Omit<Required<PinLayoutOptions>, 'insets'> = {
	lead: 16,
	gap: 4,
	step: 8,
	spread: 320,
	columns: 4,
	margin: 4
};

/** The four edges as plain numbers, so the rest of the file need not ask twice. */
interface Insets {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

interface Rect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

/**
 * Place every pin so no two overlap, in the order given — so a caller that wants one
 * pin to keep its place (the picked town, carrying its side and its box) passes it
 * first, and the rest give way to it rather than the other way round.
 *
 * Every pin is placed. A pin that finds no clear slot within `spread` is left at the
 * offset it asked for: at that point the view is fuller than it has room for, and
 * dropping the mark would take a town off the map to tidy it.
 */
export function layoutPins(
	pins: readonly PinAnchor[],
	viewport: { width: number; height: number },
	options: PinLayoutOptions = {}
): Map<string, PinOffset> {
	const settings = { ...DEFAULTS, ...options };
	// The room the pins actually have: the viewport, less the keep-out at its edges, less
	// whatever chrome the caller says is standing over it.
	const room = roomIn(viewport, settings.margin, settings.insets);
	const placed = new PlacedIndex(settings.gap);
	const offsets = new Map<string, PinOffset>();

	for (const pin of pins) {
		let chosen: PinOffset | null = null;
		for (const offset of tries(pin, room, settings)) {
			const rect = rectFor(pin, offset);
			if (!withinRoom(rect, pin, room)) continue;
			if (placed.hits(rect)) continue;
			chosen = offset;
			break;
		}
		// Nothing clear anywhere it looked: it stands where it asked to, pulled into the
		// room there is, and takes whatever overlap comes with that.
		if (!chosen) chosen = { dx: horizontalFit(pin, settings.lead, room), dy: 0 };
		offsets.set(pin.id, chosen);
		placed.add(rectFor(pin, chosen));
	}

	return offsets;
}

/**
 * Every place this pin would take, nearest to its point first — so the room it ends up
 * in is the closest free room there is, and the line drawn back to the place is the
 * shortest one the crowd left available.
 *
 * The places are the rungs of `columns` ladders: its own column at the lead it asked
 * for, and the ones a pin's width further out, each stepped up and down as far as
 * `spread`. Which rung comes next is decided by plain distance, so the choice between
 * "further up" and "further out" is made by which is actually nearer rather than by
 * which was written first.
 *
 * Handed out one at a time, by walking the ladders together and taking whichever has
 * the nearest rung waiting, rather than by building every place and sorting them. Most
 * pins take the first or second thing offered — a set of tries per pin per rebuild is
 * thousands of boxes nobody ever asks about, and this is on the path a pan runs down.
 */
function* tries(
	pin: PinAnchor,
	room: Rect,
	settings: Omit<Required<PinLayoutOptions>, 'insets'>
): Generator<PinOffset> {
	const { lead, gap, step, spread, columns } = settings;
	const ladders = Array.from({ length: columns }, (_, column) => ({
		dx: horizontalFit(pin, lead + column * (pin.width + gap), room),
		rung: 0
	}));

	for (;;) {
		let nearest = -1;
		let best = Infinity;
		for (let i = 0; i < ladders.length; i++) {
			const dy = rungOffset(ladders[i].rung, step);
			if (Math.abs(dy) > spread) continue;
			// Strictly nearer, so a tie is settled by the nearer column — and within a
			// column, below before above. Both only to settle it the same way every time:
			// the same view rebuilt twice must come out identical, or the pins would
			// shuffle themselves whenever the map was nudged.
			const distance = Math.hypot(ladders[i].dx, dy);
			if (distance < best) {
				best = distance;
				nearest = i;
			}
		}
		if (nearest < 0) return;
		const ladder = ladders[nearest];
		yield { dx: ladder.dx, dy: rungOffset(ladder.rung, step) };
		ladder.rung++;
	}
}

/**
 * A ladder's nth rung as a distance below the point: its own line first, then a step
 * below it, a step above it, two below, two above… Alternating, so a pin settles as
 * near its point as the crowd allows rather than drifting one way, and non-decreasing
 * in size, which is what lets the ladders be walked together.
 */
function rungOffset(rung: number, step: number): number {
	if (rung === 0) return 0;
	return rung % 2 === 1 ? step * ((rung + 1) / 2) : -step * (rung / 2);
}

/**
 * How far right of its point the pin may stand: the reach it asked for, less whatever
 * the right edge of the room takes back. A pin wider than the room keeps its reach —
 * there is no offset that fits it, and pulling it left only moves which end is cut off.
 */
function horizontalFit(pin: PinAnchor, reach: number, room: Rect): number {
	const spare = room.right - pin.width - pin.x;
	if (spare >= reach) return reach;
	return Math.max(spare, room.left - pin.x);
}

/**
 * The part of the viewport a pin may stand in: inside the margin, and inside whatever
 * the caller says is drawn over the canvas. Chrome that claims more than the viewport
 * has is ignored on that axis rather than collapsing the room to nothing — a pin has to
 * go somewhere, and behind the bar is better than off the map.
 */
function roomIn(
	viewport: { width: number; height: number },
	margin: number,
	insets: PinLayoutOptions['insets']
): Rect {
	const left = margin + (insets?.left ?? 0);
	const top = margin + (insets?.top ?? 0);
	const right = viewport.width - margin - (insets?.right ?? 0);
	const bottom = viewport.height - margin - (insets?.bottom ?? 0);
	return {
		left: right > left ? left : margin,
		top: bottom > top ? top : margin,
		right: right > left ? right : viewport.width - margin,
		bottom: bottom > top ? bottom : viewport.height - margin
	};
}

/** The box a pin occupies at an offset: its left-middle sits at the point plus it. */
function rectFor(pin: PinAnchor, offset: PinOffset): Rect {
	const left = pin.x + offset.dx;
	const top = pin.y + offset.dy - pin.height / 2;
	return { left, top, right: left + pin.width, bottom: top + pin.height };
}

/**
 * Whether the box stands inside the room there is. A pin bigger than that room in one
 * direction is not asked about that direction: it fails every offset there, and the
 * question is only ever used to reject one offset in favour of another.
 */
function withinRoom(rect: Rect, pin: PinAnchor, room: Rect): boolean {
	if (pin.height <= room.bottom - room.top) {
		if (rect.top < room.top || rect.bottom > room.bottom) return false;
	}
	if (pin.width <= room.right - room.left) {
		if (rect.left < room.left || rect.right > room.right) return false;
	}
	return true;
}

/**
 * The pins already standing, in buckets, so asking whether a box is clear costs the
 * few marks near it rather than every mark placed so far. A view can carry a couple of
 * hundred pins and each of them tries dozens of offsets, which is the one place in
 * this file where walking a list would be felt.
 */
class PlacedIndex {
	private static readonly CELL = 128;
	private readonly cells = new Map<string, Rect[]>();

	constructor(private readonly gap: number) {}

	add(rect: Rect): void {
		for (const key of this.keysFor(rect)) {
			const bucket = this.cells.get(key);
			if (bucket) bucket.push(rect);
			else this.cells.set(key, [rect]);
		}
	}

	/** Whether anything already placed is inside this box, or within the gap of it. */
	hits(rect: Rect): boolean {
		const grown = {
			left: rect.left - this.gap,
			top: rect.top - this.gap,
			right: rect.right + this.gap,
			bottom: rect.bottom + this.gap
		};
		const seen = new Set<Rect>();
		for (const key of this.keysFor(grown)) {
			for (const other of this.cells.get(key) ?? []) {
				if (seen.has(other)) continue;
				seen.add(other);
				if (overlaps(grown, other)) return true;
			}
		}
		return false;
	}

	private *keysFor(rect: Rect): Generator<string> {
		const cell = PlacedIndex.CELL;
		const fromX = Math.floor(rect.left / cell);
		const toX = Math.floor(rect.right / cell);
		const fromY = Math.floor(rect.top / cell);
		const toY = Math.floor(rect.bottom / cell);
		for (let cx = fromX; cx <= toX; cx++) {
			for (let cy = fromY; cy <= toY; cy++) yield `${cx}:${cy}`;
		}
	}
}

/** Two boxes sharing any area. Touching edges do not count as sharing. */
function overlaps(a: Rect, b: Rect): boolean {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
