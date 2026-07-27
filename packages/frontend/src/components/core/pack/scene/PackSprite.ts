/**
 * PackSprite
 *
 * Renders a booster pack into a RenderTexture, framed to match {@link CardSprite}:
 * the show's poster spans the full pack width and is never cropped — the pack's
 * height adapts to the poster's aspect ratio — with coloured header and footer bands
 * above and below it, and the place the pack belongs to set within the header band
 * below its teeth (white with a black outline). Each band picks up the poster's colour
 * on its side (top pixel row → header, bottom row → footer). Both the top and bottom
 * edges are serrated into teeth (the teeth are the band colour, the notches between
 * them transparent, the bottom the top rotated 180°), so the whole pack silhouette —
 * a 2px black border and a soft black drop shadow follow it — is serrated rather than a
 * rectangle with triangles painted over it. Exposes split(y), which carves the rendered
 * texture into top/bottom halves for the slice animation.
 *
 * Ported from the yugioh-duel-sim booster opener; the cover is now a show poster
 * (loaded by URL) shown whole rather than a card's cropped artwork.
 */

import {
	Application,
	BlurFilter,
	Container,
	Graphics,
	Rectangle,
	RenderTexture,
	Sprite,
	Text,
	Texture
} from 'pixi.js';
import { textureCache } from '$components/core/card/texture-cache';
import restoreCatalanArticle from '$utils/string/restore-catalan-article';
import { spawnYearLabel } from '$utils/spawn/year';

// Card-frame proportions, shared with CardSprite so a pack reads as the unopened
// member of the same family: a white header strip and a white footer strip framing
// the poster. The poster spans the full pack width, so its height sets the art
// area and the strips are sized as a fraction of the pack *width* to stay an even
// band regardless of the poster's aspect ratio.
const HEADER_RATIO = 0.22;
const FOOTER_RATIO = 0.24;
/** Fallback art aspect (height / width) used when there is no cover, chosen so a
 * plain frame keeps roughly the old 5/8 pack silhouette. */
const DEFAULT_ART_ASPECT = 1.14;
/** The pack's top and bottom edges are serrated into equilateral teeth. Each tooth base is a
 * target fraction of the pack width, rounded to a whole count so the row tiles the
 * width edge to edge. The teeth are the header-band colour and the notches between
 * them are transparent — the band's top edge literally zig-zags, so the whole pack
 * silhouette (fill, border, drop shadow) is serrated rather than a rectangle with
 * triangles painted over it. */
const TRIANGLE_BASE_RATIO = 0.1;

export interface PackSpriteOptions {
	/** Show poster URL used as the cover art, or null for a plain frame. */
	coverUrl: string | null;
	/** Full name of the place the pack belongs to, set within the top colour band. */
	locationName: string | null;
	app: Application;
	/** Bounding box the pack is fitted into. The pack takes the full width unless
	 * the resulting (aspect-driven) height would exceed the box, in which case it
	 * shrinks to fit; read {@link PackSprite.packWidth}/{@link PackSprite.packHeight}
	 * after {@link PackSprite.load} for the actual footprint. */
	width: number;
	height: number;
}

export interface PackHalves {
	top: Sprite;
	bottom: Sprite;
}

export class PackSprite extends Container {
	private app: Application;
	private coverUrl: string | null;
	private locationName: string | null;
	private packW: number;
	private packH: number;
	private renderTex: RenderTexture | null = null;
	private mainSprite: Sprite | null = null;
	/** Fill for the serrated top band: the most frequent colour in the cover's first
	 * pixel row, resolved in load(). White until then. */
	private topColor = 0xffffff;
	/** Fill for the serrated bottom band: the most frequent colour in the cover's
	 * last pixel row, resolved in load(). White until then. */
	private bottomColor = 0xffffff;

	constructor(opts: PackSpriteOptions) {
		super();
		this.app = opts.app;
		this.coverUrl = opts.coverUrl;
		this.locationName = opts.locationName;
		this.packW = opts.width;
		this.packH = opts.height;
	}

	get packWidth(): number {
		return this.packW;
	}

	get packHeight(): number {
		return this.packH;
	}

	async load(): Promise<void> {
		const cover = await textureCache.poster(this.coverUrl);

		// The cover spans the full pack width and is never cropped, so its aspect
		// ratio sets the pack's height. Resolve the final footprint (fitted inside
		// the caller's box) before composing.
		this.resolveDimensions(cover);
		const edges = this.detectEdgeColors(cover);
		this.topColor = edges.top;
		this.bottomColor = edges.bottom;

		const composition = this.buildComposition(cover);

		// The pack silhouette: the serrated top edge, down the right side, the serrated
		// bottom edge (the same teeth rotated 180°), and up the left side. Used to bake
		// the 2px border and to shape the drop shadow so both trace the teeth rather
		// than a straight rectangle top/bottom.
		const { points: topEdge } = this.serration();
		const silhouette = [...topEdge, ...this.bottomEdge(topEdge)];

		// Render the composition (whose top notches are transparent) into an
		// intermediate texture, then re-render it through a Graphics: a rect fills it
		// with that texture (transparent notches stay transparent), and the silhouette
		// poly bakes the 2px black border around the teeth into the final renderTex
		// (which is also what `split()` needs).
		const intermediate = RenderTexture.create({
			width: this.packW,
			height: this.packH,
			resolution: 1
		});
		this.app.renderer.render({ container: composition, target: intermediate });
		composition.destroy({ children: true });

		const framed = new Graphics();
		framed.rect(0, 0, this.packW, this.packH);
		framed.fill({ texture: intermediate });
		framed.poly(silhouette);
		framed.stroke({ width: 2, color: 0x000000, alpha: 1 });

		this.renderTex = RenderTexture.create({
			width: this.packW,
			height: this.packH,
			resolution: 1
		});
		this.app.renderer.render({ container: framed, target: this.renderTex });
		framed.destroy();
		intermediate.destroy(true);

		// Soft black drop shadow behind the pack, offset down/right. It follows the
		// serrated silhouette so the shadow's top and bottom edges match the teeth.
		const shadow = new Graphics();
		shadow.poly(silhouette);
		shadow.fill({ color: 0x000000, alpha: 0.55 });
		shadow.filters = [new BlurFilter({ strength: 12 })];
		shadow.position.set(4, 10);
		this.addChild(shadow);

		this.mainSprite = new Sprite(this.renderTex);
		this.mainSprite.width = this.packW;
		this.mainSprite.height = this.packH;
		this.addChild(this.mainSprite);
	}

	/**
	 * Slice the rendered pack into top/bottom halves at the given local y.
	 * The returned sprites have anchor (0,0) and live in the same coord space
	 * as this container — the caller sets their final positions.
	 */
	split(cutY: number): PackHalves {
		if (!this.renderTex) throw new Error('PackSprite.split called before load');
		const tex = this.renderTex;
		const py = Math.max(1, Math.min(this.packH - 1, Math.round(cutY)));

		const topTex = new Texture({
			source: tex.source,
			frame: new Rectangle(0, 0, this.packW, py)
		});
		const bottomTex = new Texture({
			source: tex.source,
			frame: new Rectangle(0, py, this.packW, this.packH - py)
		});

		const top = new Sprite(topTex);
		top.width = this.packW;
		top.height = py;

		const bottom = new Sprite(bottomTex);
		bottom.width = this.packW;
		bottom.height = this.packH - py;

		return { top, bottom };
	}

	override destroy(options?: Parameters<Container['destroy']>[0]): void {
		if (this.renderTex) {
			this.renderTex.destroy(true);
			this.renderTex = null;
		}
		super.destroy(options);
	}

	/**
	 * Fit the pack inside the caller's box: it takes the full box width and grows
	 * as tall as the full-width, uncropped cover needs (plus the header/footer
	 * bands). If that would overflow the box height, the pack narrows so the whole
	 * stack fits. The cover's aspect ratio drives the art height; a coverless pack
	 * falls back to {@link DEFAULT_ART_ASPECT}.
	 */
	private resolveDimensions(cover: Texture | null): void {
		const boxW = this.packW;
		const boxH = this.packH;
		const artAspect =
			cover && cover.width > 0 && cover.height > 0
				? cover.height / cover.width
				: DEFAULT_ART_ASPECT;
		// Total pack height expressed as a multiple of the pack width.
		const heightPerWidth = HEADER_RATIO + artAspect + FOOTER_RATIO;
		const width = Math.min(boxW, boxH / heightPerWidth);
		this.packW = Math.round(width);
		this.packH = Math.round(width * heightPerWidth);
	}

	/**
	 * The dominant colours of the cover's first and last pixel rows, as 0xRRGGBB —
	 * the top band picks up the poster's top edge, the bottom band its bottom edge.
	 * Reads the poster's pixels once and tallies each row; falls back to white when
	 * there is no cover or the pixels can't be read.
	 */
	private detectEdgeColors(cover: Texture | null): { top: number; bottom: number } {
		if (!cover || cover.width <= 0 || cover.height <= 0) return { top: 0xffffff, bottom: 0xffffff };
		try {
			const { pixels, width, height } = this.app.renderer.extract.pixels(cover);
			return {
				top: this.dominantRowColor(pixels, width, 0),
				bottom: this.dominantRowColor(pixels, width, height - 1)
			};
		} catch {
			return { top: 0xffffff, bottom: 0xffffff };
		}
	}

	/** The most frequent opaque colour across pixel row `row` of an extracted RGBA
	 * buffer, as 0xRRGGBB; white when the row is empty/fully transparent. */
	private dominantRowColor(pixels: Uint8ClampedArray, width: number, row: number): number {
		const base = row * width * 4;
		const counts = new Map<number, number>();
		let best = 0xffffff;
		let bestCount = 0;
		for (let x = 0; x < width; x++) {
			const i = base + x * 4;
			if (pixels[i + 3] === 0) continue; // skip fully transparent pixels
			const color = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
			const n = (counts.get(color) ?? 0) + 1;
			counts.set(color, n);
			if (n > bestCount) {
				bestCount = n;
				best = color;
			}
		}
		return best;
	}

	/**
	 * The serrated top edge as a left-to-right polyline from (0, 0) to (packW, 0),
	 * dipping to `depth` at each tooth centre and rising back to 0 at each tooth
	 * boundary. Appending the pack's right/bottom/left corners to these points gives
	 * the full pack silhouette; the header band reuses them for its own top edge. The
	 * teeth tile the width edge to edge (their count is rounded so there is no gap or
	 * overhang) and every vertex is snapped to a whole pixel so the row stays crisp.
	 */
	private serration(): { points: number[]; depth: number } {
		const w = this.packW;
		const triCount = Math.max(1, Math.round(w / (w * TRIANGLE_BASE_RATIO)));
		const triBase = w / triCount;
		const depth = Math.round(((triBase * Math.sqrt(3)) / 2) * 0.67);
		const points: number[] = [0, 0];
		for (let i = 0; i < triCount; i++) {
			const xL = Math.round(i * triBase);
			const xR = Math.round((i + 1) * triBase);
			// Down to the notch bottom at this tooth's centre, then back up to the top
			// edge at its right boundary (shared with the next tooth's left boundary).
			points.push(Math.round((xL + xR) / 2), depth, xR, 0);
		}
		return { points, depth };
	}

	/**
	 * The serrated bottom edge as a polyline from (packW, packH) to (0, packH): the
	 * top edge rotated 180° about the pack centre — mirrored vertically (y → packH−y)
	 * and reversed — so the teeth point down and the notches sit at the same columns
	 * as the top. Appended after the top edge it closes the pack silhouette; the
	 * footer band reuses it for its own bottom edge.
	 */
	private bottomEdge(topEdge: number[]): number[] {
		const h = this.packH;
		const out: number[] = [];
		for (let i = topEdge.length - 2; i >= 0; i -= 2) {
			out.push(topEdge[i], h - topEdge[i + 1]);
		}
		return out;
	}

	private buildComposition(cover: Texture | null): Container {
		const root = new Container();
		const w = this.packW;
		const h = this.packH;
		const headerH = Math.round(w * HEADER_RATIO);
		const footerH = Math.round(w * FOOTER_RATIO);
		const footerY = h - footerH;

		// The poster sits only in the art area between the strips; the header/footer
		// bars sit outside it, over this white backing.
		const artY = headerH;
		const artH = h - headerH - footerH;

		const { points: topEdge, depth: triHeight } = this.serration();

		// White backing behind the poster art. It spans only the art area (from the
		// notch depth of the serrated top down to the top of the footer band) so the
		// transparent notches at both the top and bottom teeth stay transparent rather
		// than showing white — the teeth themselves are painted by the coloured bands.
		const bg = new Graphics();
		bg.rect(0, triHeight, w, footerY - triHeight);
		bg.fill({ color: 0xffffff, alpha: 1 });
		root.addChild(bg);

		if (cover && cover.width > 0 && cover.height > 0) {
			// The poster spans the full pack width and is never cropped: the art box
			// height was sized from its aspect ratio in resolveDimensions(), so the
			// sprite fills the box between the strips edge to edge. A plain Sprite
			// (Sprites never tile, unlike a texture fill) scaled to the box.
			const sprite = new Sprite(cover);
			sprite.setSize(w, artH);
			sprite.position.set(0, artY);
			root.addChild(sprite);
		}

		// Header + footer bands, outside the image — no text on the footer. Each is
		// painted the cover's dominant colour on its side (top row → header, bottom row
		// → footer) so the frame's edges pick up the poster. Both outer edges are the
		// serrated polyline: the teeth are the band colour and the notches between them
		// are transparent (nothing is drawn there), so top and bottom read as real
		// serrated silhouettes rather than triangles painted over a rectangle. The
		// footer edge is the top edge rotated 180°, so its teeth point down.
		const header = new Graphics();
		header.poly([...topEdge, w, headerH, 0, headerH]);
		header.fill({ color: this.topColor, alpha: 1 });
		root.addChild(header);

		const footer = new Graphics();
		footer.poly([0, footerY, w, footerY, ...this.bottomEdge(topEdge)]);
		footer.fill({ color: this.bottomColor, alpha: 1 });
		root.addChild(footer);

		// The place the pack belongs to, contained within the top coloured band, below
		// the serrated teeth, in white with a black outline so it stays legible over the
		// header colour. The spawn's two-digit
		// year (rolled at open time, so "now") is joined to it exactly as the card's meta
		// strip does — e.g. `Barcelona '26`.
		if (this.locationName) {
			const bandTop = triHeight;
			const bandH = headerH - triHeight;
			const label = [restoreCatalanArticle(this.locationName), spawnYearLabel(Date.now())]
				.filter(Boolean)
				.join(' ');
			const loc = new Text({
				text: label,
				style: {
					fontFamily: 'sans-serif',
					fontSize: Math.max(10, Math.round(Math.min(w * 0.08, bandH * 0.6))),
					fontWeight: '700',
					fill: 0xffffff,
					stroke: { color: 0x000000, width: Math.max(2, Math.round(w * 0.02)) },
					align: 'center',
					wordWrap: true,
					wordWrapWidth: w * 0.92
				}
			});
			loc.anchor.set(0.5, 0.5);
			loc.position.set(w / 2, bandTop + bandH / 2);
			root.addChild(loc);
		}

		return root;
	}
}
