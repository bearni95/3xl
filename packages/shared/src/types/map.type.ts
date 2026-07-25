import type { PathOptions } from 'leaflet';

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
	 * Returns an image URL to paint as a feature's fill (stretched to its
	 * bounding box), or null to leave the normal `style.fillColor`.
	 */
	imageFill?: (feature: GeoJSON.Feature) => string | null;
	/** Called when a feature is clicked. */
	onClick?: (feature: GeoJSON.Feature) => void;
	/**
	 * Whether the layer captures pointer events. Defaults to true;
	 * set false on decorative layers so layers beneath stay hoverable.
	 */
	interactive?: boolean;
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
}
