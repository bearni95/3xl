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
	/**
	 * The municipality's geojson feature id (e.g. `ES_08028`), or the
	 * {@link ULTRAMAR} sentinel id when the coordinate falls outside every area.
	 * Always set, so any resolved reading — Ultramar included — is claimable.
	 */
	id: string;
	municipality: string;
	province: string;
	country: string;
}

/** Sentinel geojson id stored for readings outside every defined area. */
export const ULTRAMAR_ID = 'ultramar';

/** Shown when a coordinate falls outside every defined area. */
export const ULTRAMAR: GeoRegion = {
	id: ULTRAMAR_ID,
	municipality: 'Ultramar',
	province: 'Ultramar',
	country: 'Ultramar'
};
