/**
 * The projection every slippy map is drawn in, and the arithmetic for fitting a piece of it
 * into a box.
 *
 * Web Mercator puts the whole world on a **unit square**: longitude runs straight across it,
 * latitude is bent by the log-tangent that keeps every small shape the right shape, and the
 * poles are cut off at ±{@link MAX_LATITUDE} because the bend sends them to infinity. That
 * one square is also how tiles are addressed — at zoom `z` it is cut into `2^z` by `2^z` of
 * them — so a projection and a tile grid are the same fact stated twice, which is why they
 * are worked out here together rather than in whatever is doing the drawing.
 *
 * Nothing here knows about Pixi, Leaflet or a canvas: it is coordinates in and coordinates
 * out. What it exists for is that the poster wall draws the country *into* its own canvas
 * (so that the map lands in the exported picture and the exported video), and a drawing has
 * to agree with itself about where a place is.
 */

/** Where Mercator is cut off. Beyond it the projection runs away to infinity. */
export const MAX_LATITUDE = 85.05112877980659;

/** A point on the unit square the whole world is projected onto — both in [0, 1], y down. */
export interface WorldPoint {
	x: number;
	y: number;
}

/** Southwest + northeast corners as [lat, lng] — the same shape the map's bounds take. */
export type LatLngBounds = [[number, number], [number, number]];

/** A place on the world square. */
export function projectWorld(lat: number, lng: number): WorldPoint {
	const clamped = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
	const phi = (clamped * Math.PI) / 180;
	return {
		x: (lng + 180) / 360,
		y: (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2
	};
}

/**
 * A fitted view: how big the whole world is in box pixels, which corner of it the box's own
 * top-left stands on, and the projection from a place to a point in the box.
 */
export interface MercatorFit {
	/** How many pixels the whole world would be across at this fit. */
	worldSize: number;
	/** The world-pixel coordinate drawn at the box's top-left corner. */
	offsetX: number;
	offsetY: number;
	/** A place, in pixels from the box's top-left corner. */
	project(lat: number, lng: number): WorldPoint;
}

/**
 * The view that stands `bounds` whole inside a `width` × `height` box, centred.
 *
 * The scale is whichever of the two dimensions the box is worse at holding, which is what
 * makes the whole of the bounds fit rather than most of it — and in a *square* box that is
 * usually the one nobody thought about. The other dimension then has room left over, and it
 * is shared out either side rather than left at one end.
 */
export function fitBounds(bounds: LatLngBounds, width: number, height: number): MercatorFit {
	const [[south, west], [north, east]] = bounds;
	const a = projectWorld(south, west);
	const b = projectWorld(north, east);
	const minX = Math.min(a.x, b.x);
	const maxX = Math.max(a.x, b.x);
	const minY = Math.min(a.y, b.y);
	const maxY = Math.max(a.y, b.y);
	// A box with no extent in one direction (a single place, a degenerate layer) would divide
	// by zero and take the fit with it; the floor is small enough never to bind on real bounds.
	const spanX = Math.max(maxX - minX, Number.EPSILON);
	const spanY = Math.max(maxY - minY, Number.EPSILON);
	const worldSize = Math.min(width / spanX, height / spanY);
	const offsetX = ((minX + maxX) / 2) * worldSize - width / 2;
	const offsetY = ((minY + maxY) / 2) * worldSize - height / 2;
	return {
		worldSize,
		offsetX,
		offsetY,
		project(lat: number, lng: number): WorldPoint {
			const point = projectWorld(lat, lng);
			return { x: point.x * worldSize - offsetX, y: point.y * worldSize - offsetY };
		}
	};
}

/**
 * The tile zoom to ask for at a given fit: the first one whose tiles are no smaller than they
 * are drawn, so every tile is scaled *down* onto the box rather than up. Rounding the other
 * way would be a quarter of the files and a blurred picture, and this is a backdrop that gets
 * exported at the size it is drawn.
 */
export function tileZoomFor(worldSize: number, tileSize: number, maxZoom: number): number {
	const exact = Math.log2(worldSize / tileSize);
	return Math.max(0, Math.min(maxZoom, Math.ceil(exact)));
}

/** One tile of the mosaic: which tile it is, and the box it fills in the fitted view. */
export interface MapTile {
	x: number;
	y: number;
	z: number;
	left: number;
	top: number;
	/** Drawn size, the same both ways — a tile is square in this projection. */
	size: number;
}

/**
 * Every tile that touches a `width` × `height` box at this fit, in reading order.
 *
 * The grid is clamped to the world in y (there is nothing above the north edge to ask for)
 * and *wrapped* in x, since the world joins up east to west — though at any zoom that shows
 * one country, the range never reaches round.
 */
export function tileGrid(
	fit: MercatorFit,
	zoom: number,
	tileSize: number,
	width: number,
	height: number
): MapTile[] {
	const count = 2 ** zoom;
	const drawn = fit.worldSize / count;
	// The far edges are `ceil - 1` rather than `floor`, which are the same tile everywhere
	// except on an exact boundary — where floor would ask for the tile that *starts* at the
	// edge of the box and so covers none of it. A box the size of a whole number of tiles is
	// not a rare case here: it is what a fit lands on whenever the bounds fill the box.
	const firstX = Math.floor(fit.offsetX / drawn);
	const lastX = Math.ceil((fit.offsetX + width) / drawn) - 1;
	const firstY = Math.max(0, Math.floor(fit.offsetY / drawn));
	const lastY = Math.min(count - 1, Math.ceil((fit.offsetY + height) / drawn) - 1);

	const tiles: MapTile[] = [];
	for (let y = firstY; y <= lastY; y++) {
		for (let x = firstX; x <= lastX; x++) {
			tiles.push({
				// Wrapped into the world's own range: `((x % n) + n) % n` is the modulo that
				// answers for negatives too, which a box straddling the antimeridian produces.
				x: ((x % count) + count) % count,
				y,
				z: zoom,
				left: x * drawn - fit.offsetX,
				top: y * drawn - fit.offsetY,
				size: drawn
			});
		}
	}
	return tiles;
}

/** The tile's URL, off a `{z}/{y}/{x}`-style template. */
export function tileUrl(template: string, tile: MapTile): string {
	return template
		.replace('{z}', String(tile.z))
		.replace('{y}', String(tile.y))
		.replace('{x}', String(tile.x));
}

/**
 * The box every coordinate in `collection` stands inside, or null for a collection with no
 * coordinates in it at all. GeoJSON positions nest to arbitrary depth (rings, polygons,
 * multi-polygons), so this walks down to the bare `[lng, lat]` pairs.
 */
export function boundsOfCollection(collection: unknown): LatLngBounds | null {
	let minLat = Infinity;
	let minLng = Infinity;
	let maxLat = -Infinity;
	let maxLng = -Infinity;

	const walk = (coords: unknown): void => {
		if (!Array.isArray(coords)) return;
		if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
			const [lng, lat] = coords as [number, number];
			if (lat < minLat) minLat = lat;
			if (lat > maxLat) maxLat = lat;
			if (lng < minLng) minLng = lng;
			if (lng > maxLng) maxLng = lng;
			return;
		}
		for (const child of coords) walk(child);
	};

	const features = (collection as { features?: { geometry?: { coordinates?: unknown } }[] })
		?.features;
	if (!Array.isArray(features)) return null;
	for (const feature of features) walk(feature?.geometry?.coordinates);

	if (minLat === Infinity) return null;
	return [
		[minLat, minLng],
		[maxLat, maxLng]
	];
}

/** The box holding both, either alone, or null for two nulls. */
export function unionBounds(
	a: LatLngBounds | null,
	b: LatLngBounds | null
): LatLngBounds | null {
	if (!a) return b;
	if (!b) return a;
	return [
		[Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])],
		[Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])]
	];
}
