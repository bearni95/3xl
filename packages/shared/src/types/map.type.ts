import type { PathOptions } from 'leaflet';

/** An image painted across a group of features rather than any one polygon. */
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
	 * Returns the image a feature is filled with, or null for a plain polygon.
	 * Features returning the same key merge into one image spanning their union,
	 * so a whole region's municipalities show one continuous picture.
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
	/** Poster/thumbnail shown in the pin; the pin is caption-only when null. */
	imageUrl: string | null;
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
