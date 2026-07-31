// Where each pin stands, once none of them may stand on another.
//
// A pin marks a point, but a pin is not a point: it is a plate a couple of hundred
// pixels across, and towns crowd. Drawn on their points, the pins of a comarca pile
// into one unreadable heap and the reader is left with whichever the paint order put
// on top.
//
// A mark therefore stands ON its point — centred on it, as a mark about a place should
// be — for as long as it has the room to, and that is what most marks do: the crowding
// is answered first by folding the pins that would have collided into one pin that says
// how many it stands for (see pin-groups), so what reaches this pass is a set of marks
// that mostly fits. What is left over is what folding could not help — two marks of
// different kinds on one point, and the one mark that is never folded — and only those
// are moved: the point stays exactly where it is, and the mark is moved off it until it
// has room, with a line drawn back to say which point it is still about (the line is the
// map's to draw — this only says where the mark ended up, and whether it was moved at
// all, since a mark standing on its own point has nothing to explain).
//
// A mark that has to move always moves to the RIGHT of its point, and is looked for as
// near to it as it can be had: the tries are sorted by how far they are from the place,
// so a pin takes the nearest free room there is and the line back is the shortest one
// that could have been drawn. Rightwards is not an optimisation but the one rule that makes
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
	/**
	 * Whether the pin had to leave its point. False means it is standing on it, centred,
	 * and there is nothing for a leader line to say; true means the mark is beside its
	 * place.
	 */
	moved: boolean;
	/**
	 * Whether to draw the line back to the point. A mark standing on its point never has one;
	 * a mark that moved has one whenever a line can be run to it without touching another
	 * mark, which is what the moving is looked for (see pick). Where the crowd leaves no such
	 * route — most of all where the point itself is already covered — the mark is placed
	 * anyway and left unexplained, because a strip that crosses two plates on its way says
	 * something about them and not about the place it came from.
	 */
	leader: boolean;
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
	/**
	 * Room already taken by something that is not a pin, in container pixels — a mark drawn
	 * over the canvas rather than on a point, which no pin may be dealt the room of. An inset
	 * cannot say this: a box in a corner would have to be written as a whole band across the
	 * top or a whole column down the side, and the pins would give up the rest of that band
	 * for nothing. Treated exactly as a pin already placed there, because that is what it is.
	 */
	reserved?: readonly { left: number; top: number; right: number; bottom: number }[];
}

const DEFAULTS: Omit<Required<PinLayoutOptions>, 'insets' | 'reserved'> = {
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
	// Whatever is standing over the canvas goes in first, so every pin sees it as room taken.
	for (const rect of options.reserved ?? []) placed.add(rect);
	const offsets = new Map<string, PinOffset>();

	// The lines already drawn. A mark may not be put down on one either: a plate laid across
	// the middle of a line breaks it into two strips pointing at nothing, which is the same
	// wrong reading from the other side.
	const lines: Segment[] = [];

	for (const pin of pins) {
		let chosen: PinOffset | null = null;
		// Its own point first, and on its own terms: a mark centred on the place it is about,
		// with no line to draw and nothing to explain. Only a mark that cannot be read there —
		// because another is already standing there, or because the point is too near an edge
		// for the plate to fit around it — goes looking sideways.
		//
		// A line already drawn is NOT among the things that move a mark off its own point:
		// standing on the place is worth more than a line's being whole, and a mark pushed
		// aside by a line would then need a line of its own to explain the push.
		const home = homeOffset(pin);
		const homeRect = rectFor(pin, home);
		if (withinRoom(homeRect, pin, room) && !placed.hits(homeRect)) chosen = home;

		// Whether a line back to this point could be drawn at all. It could not if the point is
		// already under something: every line from it would leave from beneath that mark, and a
		// strip appearing out of the side of a plate says the plate is what it is about. The
		// mark still moves — it has to be readable somewhere — it simply goes unexplained,
		// which is the honest end of it, the place being covered by the very mark that would
		// have had to be crossed to say so.
		const reachable = !chosen && !placed.covers(pin.x, pin.y);

		if (!chosen) chosen = pick(pin, room, settings, placed, lines, reachable);
		// Nothing clear anywhere it looked, even once the lines were disregarded: it stands
		// where it asked to, pulled into the room there is, and takes whatever overlap comes
		// with that — and says nothing about it, a line through a heap being one more thing in
		// the heap.
		if (!chosen) {
			chosen = { dx: horizontalFit(pin, settings.lead, room), dy: 0, moved: true, leader: false };
		}
		offsets.set(pin.id, chosen);
		placed.add(rectFor(pin, chosen));
		if (chosen.leader) lines.push(segmentFor(pin, chosen));
	}

	return offsets;
}

/**
 * The nearest place this mark can be moved to, looked for twice: once on the terms that keep
 * every line clear of every mark, and — only if that found nothing — again with the lines
 * disregarded, in which case the mark takes the room but draws no line to it. A crowd dense
 * enough to leave no clear route is a crowd where one more strip crossing two plates helps
 * nobody, and the mark being readable at all is what matters by then.
 */
function pick(
	pin: PinAnchor,
	room: Rect,
	settings: Omit<Required<PinLayoutOptions>, 'insets' | 'reserved'>,
	placed: PlacedIndex,
	lines: readonly Segment[],
	reachable: boolean
): PinOffset | null {
	for (const clear of reachable ? [true, false] : [false]) {
		for (const offset of tries(pin, room, settings)) {
			const rect = rectFor(pin, offset);
			if (!withinRoom(rect, pin, room)) continue;
			if (placed.hits(rect)) continue;
			if (clear) {
				const line = segmentFor(pin, offset);
				if (placed.crossed(line)) continue;
				if (lines.some((other) => segmentHitsRect(other, rect))) continue;
			}
			return { ...offset, leader: clear };
		}
	}
	return null;
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
	settings: Omit<Required<PinLayoutOptions>, 'insets' | 'reserved'>
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
		yield { dx: ladder.dx, dy: rungOffset(ladder.rung, step), moved: true, leader: true };
		ladder.rung++;
	}
}

/**
 * Where a mark stands when nothing is in its way: centred on its own point, which is where
 * a mark about a place belongs and is the one position that needs no explaining. Given as an
 * offset to the pin's left-middle like every other, so the caller has one thing to apply.
 */
function homeOffset(pin: PinAnchor): PinOffset {
	return { dx: -pin.width / 2, dy: 0, moved: false, leader: false };
}

/** A leader line, as the two ends it runs between: the point, and the mark's left-middle. */
interface Segment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

/** The line this offset would need: from the point to where the mark's left edge lands. */
function segmentFor(pin: PinAnchor, offset: { dx: number; dy: number }): Segment {
	return { x1: pin.x, y1: pin.y, x2: pin.x + offset.dx, y2: pin.y + offset.dy };
}

/**
 * Whether a line touches a box at all. Asked of a line and the marks it would have to pass to
 * get where it is going, so "touches" is everything: an end inside the box, or any part of the
 * run crossing an edge of it.
 */
function segmentHitsRect(line: Segment, rect: Rect): boolean {
	// Nowhere near it: the cheap answer, and the one nearly every ask gets.
	if (Math.max(line.x1, line.x2) <= rect.left) return false;
	if (Math.min(line.x1, line.x2) >= rect.right) return false;
	if (Math.max(line.y1, line.y2) <= rect.top) return false;
	if (Math.min(line.y1, line.y2) >= rect.bottom) return false;
	if (within(line.x1, line.y1, rect) || within(line.x2, line.y2, rect)) return true;
	return (
		crosses(line, rect.left, rect.top, rect.right, rect.top) ||
		crosses(line, rect.right, rect.top, rect.right, rect.bottom) ||
		crosses(line, rect.right, rect.bottom, rect.left, rect.bottom) ||
		crosses(line, rect.left, rect.bottom, rect.left, rect.top)
	);
}

/** Whether a point stands inside a box. Its edges count as outside: touching is not crossing. */
function within(x: number, y: number, rect: Rect): boolean {
	return x > rect.left && x < rect.right && y > rect.top && y < rect.bottom;
}

/** Whether a line and one edge of a box cross, by the sides each end of one falls on. */
function crosses(line: Segment, x1: number, y1: number, x2: number, y2: number): boolean {
	const a = side(line.x1, line.y1, line.x2, line.y2, x1, y1);
	const b = side(line.x1, line.y1, line.x2, line.y2, x2, y2);
	const c = side(x1, y1, x2, y2, line.x1, line.y1);
	const d = side(x1, y1, x2, y2, line.x2, line.y2);
	return a * b < 0 && c * d < 0;
}

/** Which side of the line through the first two points the third falls on. */
function side(x1: number, y1: number, x2: number, y2: number, px: number, py: number): number {
	return (x2 - x1) * (py - y1) - (y2 - y1) * (px - x1);
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
		for (const other of this.near(grown)) {
			if (overlaps(grown, other)) return true;
		}
		return false;
	}

	/**
	 * Whether a point is under something already placed — asked of a mark's own point, to
	 * know whether a line back to it could be seen leaving it at all. No gap: what matters
	 * here is being covered, not being crowded.
	 */
	covers(x: number, y: number): boolean {
		const at = { left: x, top: y, right: x, bottom: y };
		for (const other of this.near(at)) {
			if (within(x, y, other)) return true;
		}
		return false;
	}

	/** Whether a line would have to pass through anything already placed to get where it goes. */
	crossed(line: Segment): boolean {
		const box = {
			left: Math.min(line.x1, line.x2),
			top: Math.min(line.y1, line.y2),
			right: Math.max(line.x1, line.x2),
			bottom: Math.max(line.y1, line.y2)
		};
		for (const other of this.near(box)) {
			if (segmentHitsRect(line, other)) return true;
		}
		return false;
	}

	/** Everything placed in the buckets this box touches: a superset, each of them once. */
	private *near(box: Rect): Generator<Rect> {
		const seen = new Set<Rect>();
		for (const key of this.keysFor(box)) {
			for (const other of this.cells.get(key) ?? []) {
				if (seen.has(other)) continue;
				seen.add(other);
				yield other;
			}
		}
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
