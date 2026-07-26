import type { PathOptions } from 'leaflet';

/** An image fill plus the group key that decides which features share it. */
export interface ImageFill {
	/** Features returning the same key merge into one image over their union. */
	key: string;
	/** The image URL painted across that group. */
	url: string;
}

/** A GeoJSON layer drawn on top of the base map, in array order (last = topmost). */
export interface MapOverlay {
	/** URL of the GeoJSON file, fetched client-side after the map mounts. */
	url: string;
	/** Leaflet path options applied to every feature. */
	style: PathOptions;
	/** Style merged onto a feature while hovered; reset on mouseout. */
	hoverStyle?: PathOptions;
	/** Returns the hover tooltip label for a feature. */
	label?: (feature: GeoJSON.Feature) => string;
	/**
	 * Returns an image to paint as a feature's fill (stretched to its bounding
	 * box), or null to leave the normal `style.fillColor`. Features that resolve
	 * to the same group `key` share one image spanning their combined shape; a
	 * bare string is shorthand for `{ key: url, url }`. Re-evaluated whenever the
	 * overlays prop changes, so the fill can follow live UI state.
	 */
	imageFill?: (feature: GeoJSON.Feature) => ImageFill | string | null;
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
