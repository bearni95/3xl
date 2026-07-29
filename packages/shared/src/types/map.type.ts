import type { PathOptions } from 'leaflet';

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
	 * Raw SVG markup drawn in the pin's frame — the show's glyph, inlined so it
	 * paints in the frame's own colour rather than a baked one. The pin is
	 * caption-only when null (no glyph drawn for that show yet), exactly as the
	 * panel's tables fall back to the show's name alone.
	 */
	iconSvg: string | null;
	/**
	 * Classes painted onto the pin's frame — the region's own colour, as a fill
	 * plus the ink that reads on it. Null leaves the frame on the neutral base
	 * surface, which is also what a region with no colour yet gets.
	 */
	frameClasses?: string | null;
	/** Primary caption under the image (the show name). */
	title: string;
	/** Secondary text for the hover tooltip (e.g. the region name). */
	subtitle?: string;
	/**
	 * `properties.id`s of the overlay features this pin stands for (the region's
	 * municipalities). Hovering the pin applies the overlays' `hoverStyle` to them,
	 * so the whole region lights up as if each polygon were hovered directly.
	 */
	featureIds?: string[];
	/**
	 * Whether the pin sits outside the currently selected area. Dimmed pins render
	 * at reduced opacity so the selected region's pins stand out, without hiding
	 * the rest of the map's breakdown.
	 */
	dimmed?: boolean;
	/** Called when the pin is clicked. */
	onClick?: () => void;
}

/**
 * A star badge dropped on a point — used to flag the municipalities celebrating
 * a festa major today, independent of the poster/region pins. Always drawn (no
 * level-of-detail folding), so a town's star shows at every zoom, and rendered
 * above the region pins so it reads as a highlight over the map.
 */
export interface MapStar {
	/** Stable id (the municipality feature id), so the layer can diff on rebuild. */
	id: string;
	/** Where the star sits, as [lat, lng] — the municipality's centre. */
	position: [number, number];
	/** Text shown as the hover tooltip (e.g. the municipality name). */
	label?: string;
	/** Called when the star is clicked (e.g. open the town's festa booster pack). */
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
