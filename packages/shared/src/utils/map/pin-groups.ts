// Which marks are one mark.
//
// A pin marks a point, but a pin is not a point: it is a plate a couple of hundred pixels
// across, and towns crowd. Moving each one off its point until it has room is one answer
// (see pin-layout) and it is the answer of last resort — every mark moved is a mark
// standing beside its place rather than on it, and a comarca of villages so laid out is a
// screen of plates joined to the map by lines, in which the terrain has gone.
//
// The answer taken first is to stop drawing marks that will not fit and draw one mark
// instead: the pins that would have collided become a single pin, styled exactly as one of
// them, saying how many places it stands for. What the reader loses is which of the five
// towns is which; what they get back is a map with five towns' worth of room on it, and the
// count says plainly that there is something folded there to go and look at.
//
// Marks are folded only into marks of their OWN KIND, and the kinds are the caller's to
// keep apart by calling this once per kind: the region pins are one family and the booster
// marks hung on towns are another, and a plate saying "4" that turns out to have meant two
// towns and two booster boxes is a count of nothing. Two families laid over each other
// still overlap, which is what the displacement is left for.
//
// Nothing here reads the DOM or the map. It is given points and sizes in container pixels
// and hands back the marks to draw, so it can be tested without either.

/** One mark offered for folding: the point it stands on, and the box it takes there. */
export interface GroupCandidate {
	id: string;
	/** The point the mark is about, in container pixels. */
	x: number;
	y: number;
	/** The box it takes, centred on that point. */
	width: number;
	height: number;
	/**
	 * Whether it may be folded at all. A mark that is not groupable comes back as a group
	 * of one and takes nothing into itself — which is how a caller keeps the one mark a
	 * reader asked for by name (the picked town, carrying its side and the way to fight it)
	 * out of a count. It still stands in the way of everything after it, so a neighbour
	 * that would have collided with it is not folded into it either: it is simply left to
	 * be moved off it.
	 */
	groupable?: boolean;
}

/** What ends up drawn: one mark, standing for one or more of the marks offered. */
export interface PinGroup {
	/** The ids it stands for, in the order they were offered. A group of one is that one. */
	ids: string[];
	/** Where it stands: the mean of its members' points. */
	x: number;
	y: number;
	/** The box it is reckoned to take there: the largest any of its members would have. */
	width: number;
	height: number;
}

export interface PinGroupOptions {
	/** Clear space demanded between two marks — the same gap the layout would keep. */
	gap?: number;
}

const DEFAULT_GAP = 4;

/**
 * Fold the marks that cannot all be drawn, in the order given — so a caller that wants one
 * mark to stand alone passes it first and marks it ungroupable, and the crowd forms around
 * it rather than swallowing it.
 *
 * Every mark offered comes back in exactly one group, and the groups come back in the order
 * their first member was offered in, so the same view folds the same way every time it is
 * rebuilt. A mark joins the NEAREST group it would have collided with rather than the first
 * — two crowds a plate apart stay two crowds, instead of the second being drawn into the
 * first by whichever of its towns happened to be offered earliest.
 *
 * A group's point is the mean of its members', which moves as members join, so the one mark
 * ends up standing amid the places it is about rather than on whichever of them came first.
 * That also means an early member can end up outside the box its group finally occupies:
 * the count is still honest — it is a count of what was folded, not of what is under the
 * plate — and unfolding is a zoom away.
 */
export function groupPins(
	pins: readonly GroupCandidate[],
	options: PinGroupOptions = {}
): PinGroup[] {
	const gap = options.gap ?? DEFAULT_GAP;
	const groups: Group[] = [];

	for (const pin of pins) {
		if (pin.groupable === false) {
			groups.push(started(pin, false));
			continue;
		}
		const home = nearest(groups, pin, gap);
		if (!home) {
			groups.push(started(pin, true));
			continue;
		}
		home.ids.push(pin.id);
		home.sumX += pin.x;
		home.sumY += pin.y;
		home.x = home.sumX / home.ids.length;
		home.y = home.sumY / home.ids.length;
		home.width = Math.max(home.width, pin.width);
		home.height = Math.max(home.height, pin.height);
	}

	return groups.map(({ ids, x, y, width, height }) => ({ ids, x, y, width, height }));
}

/** A group while it is still being built: its running mean, and whether it may take more. */
interface Group extends PinGroup {
	open: boolean;
	sumX: number;
	sumY: number;
}

function started(pin: GroupCandidate, open: boolean): Group {
	return {
		ids: [pin.id],
		x: pin.x,
		y: pin.y,
		width: pin.width,
		height: pin.height,
		open,
		sumX: pin.x,
		sumY: pin.y
	};
}

/**
 * The group this mark belongs to, if any: the nearest one it would have stood on top of.
 * Walked rather than indexed — a view carries a few dozen groups at the very most, and one
 * pass over them per pin is nothing beside the pins themselves being drawn.
 */
function nearest(groups: readonly Group[], pin: GroupCandidate, gap: number): Group | null {
	let found: Group | null = null;
	let best = Infinity;
	for (const group of groups) {
		if (!group.open) continue;
		if (!collides(group, pin, gap)) continue;
		const distance = Math.hypot(group.x - pin.x, group.y - pin.y);
		if (distance < best) {
			best = distance;
			found = group;
		}
	}
	return found;
}

/** Whether the two boxes, each centred on its own point, would share any room. */
function collides(a: PinGroup, b: GroupCandidate, gap: number): boolean {
	return (
		Math.abs(a.x - b.x) * 2 < a.width + b.width + gap * 2 &&
		Math.abs(a.y - b.y) * 2 < a.height + b.height + gap * 2
	);
}
