import type { ID } from './core.type';

/**
 * A geolocation reading captured from the browser's Geolocation API,
 * flattened into a plain, serialisable shape for persistence.
 */
export interface GeoLocation {
	id: ID;
	latitude: number;
	longitude: number;
	/** Accuracy of the lat/long in metres, as reported by the browser. */
	accuracy: number;
	/** Epoch milliseconds at which the reading was taken. */
	timestamp: number;
}

/** The named administrative area a coordinate resolves to. */
export interface GeoRegion {
	municipality: string;
	province: string;
	country: string;
}

/** Shown when a coordinate falls outside every defined area. */
export const ULTRAMAR: GeoRegion = {
	municipality: 'Ultramar',
	province: 'Ultramar',
	country: 'Ultramar'
};
