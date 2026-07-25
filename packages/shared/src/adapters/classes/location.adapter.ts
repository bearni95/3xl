import { AdapterClass } from './adapter.class';
import { pointInGeometry } from '../../utils/geo/pointInPolygon';
import { ULTRAMAR, type GeoLocation, type GeoRegion } from '../../types/location.type';

/** The single, persisted location record uses a fixed id. */
export const CURRENT_LOCATION_ID = 'current';

/**
 * Transforms the browser Geolocation API's `GeolocationPosition` into the
 * internal, serialisable {@link GeoLocation} shape and back to display strings.
 */
export class LocationAdapter extends AdapterClass {
	constructor() {
		super('location');
	}

	/** `GeolocationPosition` -> internal {@link GeoLocation}. */
	fromBrowser(position: GeolocationPosition): GeoLocation {
		return {
			id: CURRENT_LOCATION_ID,
			latitude: position.coords.latitude,
			longitude: position.coords.longitude,
			accuracy: position.coords.accuracy,
			timestamp: position.timestamp
		};
	}

	/** `41.38879, 2.15899` */
	toCoordinates(location: GeoLocation): string {
		return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
	}

	/** Human-readable capture time. */
	toCapturedAt(location: GeoLocation): string {
		return new Date(location.timestamp).toLocaleString();
	}

	/**
	 * Resolve a reading to its municipality/province/country by point-in-polygon
	 * against the municipality features (each carries `name`, `prov`, `territory`).
	 * Falls back to {@link ULTRAMAR} when the point is outside every area.
	 */
	toRegion(location: GeoLocation, municipalities: GeoJSON.FeatureCollection): GeoRegion {
		const { longitude, latitude } = location;
		for (const feature of municipalities.features) {
			if (feature.geometry && pointInGeometry(longitude, latitude, feature.geometry)) {
				const props = feature.properties ?? {};
				return {
					id: props.id ?? ULTRAMAR.id,
					municipality: props.name ?? ULTRAMAR.municipality,
					province: props.prov ?? ULTRAMAR.province,
					country: props.territory ?? ULTRAMAR.country
				};
			}
		}
		return ULTRAMAR;
	}

	/**
	 * Build a lookup from a municipality geojson id (e.g. `ES_08028`) to its
	 * display name, so a stored spawn location resolves back to a place name
	 * without re-scanning the feature collection per lookup.
	 */
	municipalityNames(municipalities: GeoJSON.FeatureCollection): Map<string, string> {
		const names = new Map<string, string>();
		for (const feature of municipalities.features) {
			const props = feature.properties ?? {};
			if (props.id && props.name) names.set(props.id, props.name);
		}
		return names;
	}
}

export const locationAdapter = new LocationAdapter();
