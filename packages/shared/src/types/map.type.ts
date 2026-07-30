import type { PathOptions } from 'leaflet';
import type { SpawnColor } from './character-spawn.type';

/** A GeoJSON layer drawn on top of the base map, in array order (last = topmost). */
export interface MapOverlay {
	/** URL of the GeoJSON file, fetched client-side after the map mounts. */
	url: string;
	/**
	 * Leaflet path options for this layer's shapes: one object applied to every
	 * feature, or a function asked for each feature's own — which is what lets a
	 * layer paint every region in its own colour rather than one colour for the
	 * whole tier. The function is called again on every repaint, so it may read
	 * live state (the colour a region flies right now).
	 */
	style: PathOptions | ((feature?: GeoJSON.Feature) => PathOptions);
	/** Style merged onto a feature while hovered; reset on mouseout. */
	hoverStyle?: PathOptions;
	/**
	 * Style merged onto every feature of this layer listed in the map's `dimmedIds`
	 * — the regions sitting clear of the open selection, faded exactly as their pins
	 * are. Declared per layer because a stack of fills has to fade as one: the layer
	 * carrying the visible wash steps down to half, while the layers painting over it
	 * step out of the way instead of compounding their own alpha on top.
	 */
	dimmedStyle?: PathOptions;
	/** Returns the hover tooltip label for a feature. */
	label?: (feature: GeoJSON.Feature) => string;
	/** Called when a feature is clicked. */
	onClick?: (feature: GeoJSON.Feature) => void;
	/**
	 * Whether the layer captures pointer events. Defaults to true;
	 * set false on decorative layers so layers beneath stay hoverable.
	 */
	interactive?: boolean;
}

/** A standalone straight line (polyline) drawn on the map, independent of any GeoJSON. */
export interface MapLine {
	/** Ordered vertices as [lat, lng] pairs; a straight segment between each. */
	points: [number, number][];
	/** Leaflet path options for the line's stroke. */
	style: PathOptions;
	/** Text shown as a permanent centred label over the line. */
	label?: string;
}

/**
 * A line drawn from a point on the map to the centre of a DOM element sitting over it —
 * the leader tying the open town to the panel that talks about it. One end is
 * geographic and the other is a place on the screen, so the map re-reads the element's
 * box and re-projects that end on every pan, zoom and resize: at a still map it is a
 * line between a town and a panel, and while the map moves the panel end stays put
 * while the town end travels with the terrain.
 */
export interface MapTether {
	/**
	 * The map end: the point the town's pin stands on. The line is drawn to the middle of
	 * that pin rather than to the point itself — a pin grows upwards out of its point, so
	 * the point is its bottom edge, and the map decides the rise from the pin it drew.
	 */
	position: [number, number];
	/**
	 * The screen end: the element whose centre the line runs to, measured live from its
	 * bounding box. Null (an element not mounted yet) draws no line.
	 */
	anchor: HTMLElement | null;
	/** The line's colour — the town's own, so the leader is read as belonging to it. */
	color: string;
	/** Stroke width in px. */
	weight?: number;
}

/**
 * What the map's corner says about taking the town it is open on: how far the reader has
 * got towards it, and the one control that acts on it. The side to be beaten is standing
 * out on that town's own pin, with a leader run from there to this, so the two are read
 * as one thing about one place without the odds being written over the terrain.
 *
 * Plain data and a callback — which of the button and the countdown is drawn is
 * decided by whoever hands this over, since the rules (one fight per town per day,
 * one battle at a time, a full team to field) are theirs and not the map's.
 */
export interface MapChallenge {
	/** Wins banked against the wins needed to take the region. */
	siege: { wins: number; required: number };
	/** The control to act with, or null when the countdown stands in its place. */
	button: { label: string; title: string; disabled: boolean; onClick: () => void } | null;
	/** Epoch ms the region can be acted on again at; null unless it is closed. */
	unlocksAt: number | null;
	/** Called the moment that countdown runs out, so the control can come back. */
	onUnlock?: () => void;
}

/**
 * A pin dropped at a point, showing an image and caption in a small card — used
 * to mark each imaged region's top show on the map instead of painting it across
 * the region's polygons.
 */
export interface MapMarker {
	/** Stable id (the region key), so the marker layer can diff on rebuild. */
	id: string;
	/** Where the pin sits, as [lat, lng]. */
	position: [number, number];
	/**
	 * The region's bounding box as `[[south, west], [north, east]]`, when known.
	 * Lets a level-of-detail map decide which grouping tier to draw by whether the
	 * region fits the viewport, rather than by a raw pin count.
	 */
	bounds?: [[number, number], [number, number]];
	/**
	 * Raw SVG markup drawn on the pin's tile — the show's glyph, inlined so it paints
	 * in the tile's own colour rather than a baked one. The pin is lettering-only when
	 * null (no glyph drawn for that show yet), exactly as the panel's tables fall back
	 * to the show's name alone.
	 *
	 * Only reached when the pin has no {@link MapMarker.team}: a region standing the
	 * side that holds it shows *them* rather than a glyph for the show they belong to,
	 * their floors carrying that glyph anyway.
	 */
	iconSvg: string | null;
	/**
	 * The side standing on this region, in the order it is fielded — drawn on the pin
	 * above its plate, in place of the show's tile, as the very statues the roster and
	 * the town's own panel draw a team with. One member per statue, in the shape
	 * `TeamLineup` takes.
	 *
	 * Only a municipality has one, and only the picked one: a comarca or a province is
	 * not a thing anybody holds, and every town wearing its side at once would be a
	 * terrain of cards with no map left under it. Absent or empty means the same thing.
	 */
	team?: {
		label: string;
		basePath: string | null;
		color: SpawnColor;
		locationName: string | null;
		showId: number | null;
	}[];
	/**
	 * Classes painted onto the glyph's tile at the left end of the pin's plate — the
	 * region's own colour, as a fill plus the ink that reads on it. Null leaves the
	 * tile on the neutral base surface, which is also what a region with no colour
	 * yet gets.
	 */
	frameClasses?: string | null;
	/** The show the region flies — the plate's second line, under the place's name. */
	title: string;
	/** The region's own name — the plate's top line. */
	subtitle?: string;
	/**
	 * `properties.id`s of the overlay features this pin stands for (the region's
	 * municipalities). Hovering the pin applies the overlays' `hoverStyle` to them,
	 * so the whole region lights up as if each polygon were hovered directly.
	 */
	featureIds?: string[];
	/**
	 * Whether the pin sits outside the currently selected area. A dimmed pin fades its
	 * coloured tile so the selected region's pins stand out, without hiding the rest of
	 * the map's breakdown; its plate keeps full opacity either way, so every pin on
	 * screen is still legible.
	 */
	dimmed?: boolean;
	/** Called when the pin is clicked. */
	onClick?: () => void;
}

/**
 * A booster box hung at a point — the municipalities whose festa major the booster
 * window reaches, each carrying the pack the Booster tab has waiting for it. Drawn
 * with the very component that tab's grid draws (BoosterBox), off the same four
 * things, so the box on the town and the box in the panel are one object seen in two
 * places. Independent of the poster/region pins and always drawn (no level-of-detail
 * folding), so a town's box shows at every zoom. Hung under the point its pin stands
 * on, and under the pin layer: a town keeps its pin and gets a box.
 */
export interface MapBoosterBox {
	/** Stable id (the municipality feature id), so the layer can diff on rebuild. */
	id: string;
	/** The point the box hangs under, as [lat, lng] — the municipality's centre. */
	position: [number, number];
	/** The assigned show's poster, used as the box's cover, or null for a plain frame. */
	coverUrl?: string | null;
	/** The show's wordmark across the head of the cover, or null when it has none. */
	logoUrl?: string | null;
	/**
	 * TMDB id of the assigned show, which the glyph stamped on the box's lid is looked up
	 * by — the same mark this map already pins the show with.
	 */
	showId?: number | null;
	/** The town the box belongs to, said across the foot of the cover. */
	locationName?: string | null;
	/**
	 * Printed on white card instead of black — the stock the Booster tab prints this
	 * town's box on: white for a town de festa today, black for a town the window
	 * reaches but whose day is past or still coming.
	 */
	light?: boolean;
	/** Called when the box is clicked (e.g. open the town's festa booster pack). */
	onClick?: () => void;
}

/** A standalone circular region drawn on the map, independent of any GeoJSON. */
export interface MapCircle {
	/** Centre as [lat, lng]. */
	center: [number, number];
	/** Radius in metres. */
	radius: number;
	/** Leaflet path options for the circle's stroke/fill. */
	style: PathOptions;
	/** Text shown as a permanent centred label over the circle. */
	label?: string;
	/** Called when the circle is clicked. */
	onClick?: () => void;
}
