/**
 * The ground the game is played on, drawn into a canvas.
 *
 * Satellite imagery, framed on the Països Catalans and read through a veil — the same
 * backdrop the player app's `/profile/[id]` stands a profile on, except that there it is
 * Leaflet, a tree of DOM under the page, and here it is Pixi, inside the canvas.
 *
 * **That difference is the whole point.** What is inside a canvas is what a canvas exports; a
 * map behind one is a thing the reader can see and the file cannot. So the poster wall draws
 * its own country rather than standing on somebody else's, which is what puts it in the PNG
 * and in the video without either of them having to composite anything.
 *
 * It is a *picture* and not a map: nothing here pans, zooms, hovers or answers a click. The
 * borders are not drawn either — the map at the root draws every tier of them and fills each
 * shape with the colour its pin flies, because that map is a reading of who holds what, and
 * this is a backdrop for a roster. What the country is *for* here is the framing: the layers
 * named in {@link PixiBasemapOptions.frameLayers} are fetched for their coordinates alone, so
 * nothing outside has to know where the Països Catalans are, and the imagery lands on the
 * same view however the box is shaped.
 *
 * Nothing is written on it. The imagery's credit stands where the game shows it, on the map
 * at the root; this canvas is a picture of a roster, and the wall's whole output is that
 * picture to put on something else.
 */

import { Container, ImageSource, Sprite, Texture } from 'pixi.js';
import {
	boundsOfCollection,
	fitBounds,
	type LatLngBounds,
	type MercatorFit,
	tileGrid,
	tileUrl,
	tileZoomFor,
	unionBounds
} from '../geo/web-mercator';

export interface PixiBasemapOptions {
	/**
	 * GeoJSON layers whose polygons decide what is framed. Fetched for their coordinates and
	 * never drawn, so this wants the *coarsest* layer that covers the country rather than the
	 * finest: the dissolved territories give the same box as the municipalities they were
	 * dissolved from, at a twentieth of the bytes.
	 */
	frameLayers: string[];
	/** A `{z}/{y}/{x}` tile template. Left out, the box is empty. */
	tileUrl?: string;
	/** The deepest tile zoom the server offers. */
	maxTileZoom?: number;
	/** Edge-to-edge tile size of the source. */
	tileSize?: number;
	/** The veil over the imagery: a colour, and how much of it at the top and at the foot. */
	veilColor?: number;
	veilFrom?: number;
	veilTo?: number;
}

const DEFAULTS = {
	maxTileZoom: 19,
	tileSize: 256,
	veilColor: 0x000000,
	veilFrom: 0.5,
	veilTo: 0.2
};

/**
 * The vertical gradient the imagery is read through, as a texture one pixel wide.
 *
 * A gradient is a fact about the *height* of the box and nothing about its width, so one
 * column of it stretched across is the whole of it — and a texture drawn off a 2D canvas is
 * a gradient every renderer agrees about, which a shader-side one would not be.
 */
function veilTexture(color: number, from: number, to: number): Texture {
	const canvas = document.createElement('canvas');
	canvas.width = 1;
	canvas.height = 256;
	const context = canvas.getContext('2d');
	if (!context) return Texture.WHITE;
	const red = (color >> 16) & 0xff;
	const green = (color >> 8) & 0xff;
	const blue = color & 0xff;
	const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
	gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${from})`);
	gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, ${to})`);
	context.fillStyle = gradient;
	context.fillRect(0, 0, canvas.width, canvas.height);
	return Texture.from(canvas);
}

/**
 * One tile, fetched and turned into a texture.
 *
 * Fetched by hand rather than through `Assets.load`, which cannot load a tile at all: its
 * texture parser decides whether a URL is an image by looking at the **file extension**, and
 * a tile server's URL is a path of three numbers with no extension on the end of it. So every
 * tile was refused before a request was made, which is a backdrop of nothing.
 *
 * Going through `fetch` and a blob has a second virtue that matters more here than the first:
 * a CORS refusal comes back as a failed *fetch* rather than as a picture that silently
 * poisons the canvas. Bytes that arrive have already satisfied the cross-origin check, and a
 * bitmap decoded from a blob of them cannot taint anything — which is what keeps the wall
 * readable back out as a PNG.
 */
async function loadTile(url: string): Promise<Texture> {
	const response = await fetch(url, { mode: 'cors' });
	if (!response.ok) throw new Error(`Tile ${url} answered ${response.status}`);
	const bitmap = await createImageBitmap(await response.blob());
	return new Texture({ source: new ImageSource({ resource: bitmap }) });
}

export class PixiBasemap {
	/** Everything this draws, in one container to be put behind whatever it is a backdrop to. */
	readonly view = new Container();

	private readonly options: Required<Omit<PixiBasemapOptions, 'tileUrl'>> &
		Pick<PixiBasemapOptions, 'tileUrl'>;

	private readonly tiles = new Container();
	private readonly veil = new Sprite();

	/** The box the framing layers stand in, once they have landed. */
	private bounds: LatLngBounds | null = null;

	/** The box last drawn for, so a wall re-laying itself thirty times as it loads does not
	 * rebuild a mosaic thirty times. Only a change of *size* is a reason to draw again. */
	private drawnWidth = 0;
	private drawnHeight = 0;
	/** Bumped on every draw; a mosaic still loading when the next one starts drops its tiles. */
	private generation = 0;
	private destroyed = false;

	constructor(options: PixiBasemapOptions) {
		this.options = { ...DEFAULTS, ...options };
		this.veil.texture = veilTexture(
			this.options.veilColor,
			this.options.veilFrom,
			this.options.veilTo
		);
		this.view.addChild(this.tiles, this.veil);
	}

	/**
	 * Fetch the framing layers and work out the box they all stand in. A layer that will not
	 * load is left out rather than failing the backdrop — what the screen is for is in front
	 * of it.
	 */
	async load(): Promise<void> {
		const collections = await Promise.all(
			this.options.frameLayers.map(async (url) => {
				try {
					const response = await fetch(url);
					if (!response.ok) return null;
					return (await response.json()) as unknown;
				} catch {
					return null;
				}
			})
		);
		if (this.destroyed) return;
		this.bounds = collections.reduce<LatLngBounds | null>(
			(box, collection) => unionBounds(box, boundsOfCollection(collection)),
			null
		);
		// The box it was last drawn for is still the box it is in; there is simply something
		// to draw in it now.
		this.redraw(this.drawnWidth, this.drawnHeight);
	}

	/** Draw for a box of this size. A repeat of the size already drawn is not a redraw. */
	layout(width: number, height: number): void {
		if (width === this.drawnWidth && height === this.drawnHeight) return;
		this.redraw(width, height);
	}

	destroy(): void {
		this.destroyed = true;
		this.view.destroy({ children: true });
	}

	private redraw(width: number, height: number): void {
		this.drawnWidth = width;
		this.drawnHeight = height;
		if (this.destroyed || width <= 0 || height <= 0 || !this.bounds) return;

		this.veil.width = width;
		this.veil.height = height;
		void this.drawTiles(fitBounds(this.bounds, width, height), width, height, ++this.generation);
	}

	/** The imagery: every tile the box touches, at the first zoom whose tiles are no smaller
	 * than they are drawn. Each lands when it lands — a mosaic that fills in is better than a
	 * blank box that fills in all at once. */
	private async drawTiles(
		fit: MercatorFit,
		width: number,
		height: number,
		generation: number
	): Promise<void> {
		this.tiles.removeChildren().forEach((child) => child.destroy());
		const template = this.options.tileUrl;
		if (!template) return;

		const { tileSize, maxTileZoom } = this.options;
		const zoom = tileZoomFor(fit.worldSize, tileSize, maxTileZoom);
		const grid = tileGrid(fit, zoom, tileSize, width, height);
		await Promise.all(
			grid.map(async (tile) => {
				let texture: Texture;
				try {
					texture = await loadTile(tileUrl(template, tile));
				} catch {
					// A tile that will not come is a hole in the imagery and nothing more.
					return;
				}
				if (this.destroyed || generation !== this.generation) return;
				const sprite = new Sprite(texture);
				sprite.position.set(tile.left, tile.top);
				// A whole pixel wider than it needs, so two neighbours meet rather than leaving
				// the hairline that rounding a fractional size to the screen otherwise opens.
				sprite.width = tile.size + 1;
				sprite.height = tile.size + 1;
				this.tiles.addChild(sprite);
			})
		);
	}
}
