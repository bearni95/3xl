import { ObjectServiceClass } from '$services/classes/object-service.class';
import { CURRENT_LOCATION_ID } from '$adapters/classes/location.adapter';
import type { GeoLocation } from '$types/location.type';

/**
 * Persists the user's last captured browser location. A `timestamp` of `0`
 * is the sentinel for "never captured" — see {@link hasLocation}.
 */
export const locationService = new ObjectServiceClass<GeoLocation>('claim-location', {
	id: CURRENT_LOCATION_ID,
	latitude: 0,
	longitude: 0,
	accuracy: 0,
	timestamp: 0
});

/** Whether a real reading has been stored (vs. the empty sentinel). */
export function hasLocation(location: GeoLocation): boolean {
	return location.timestamp > 0;
}
