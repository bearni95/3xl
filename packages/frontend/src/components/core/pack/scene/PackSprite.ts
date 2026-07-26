/**
 * PackSprite
 *
 * Renders a booster pack into a RenderTexture, framed to match {@link CardSprite}:
 * the show's poster spans the full pack width and is never cropped — the pack's
 * height adapts to the poster's aspect ratio — with plain white header and footer
 * strips above and below it, and the place the pack belongs to overlaid at the
 * top-centre of the poster (white with a black outline). Square corners, a 2px
 * black border and a soft black drop shadow sit behind it. Exposes split(y), which
 * carves the rendered texture into top/bottom halves for the slice animation.
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
/** Fill for the header/footer strips — opaque white so they fully hide any poster
 * overflow behind them (the poster is a Sprite, not masked). */
const STRIP_FILL = { color: 0xffffff, alpha: 1 } as const;
/** A row of equilateral triangles marches across the top edge, bases on the start
 * of the top white strip (y = 0). Their base is a target fraction of the pack
 * width, rounded to a whole count so they tile the width edge to edge. */
const TRIANGLE_BASE_RATIO = 0.1;
const TRIANGLE_FILL = { color: 0x000000, alpha: 1 } as const;

export interface PackSpriteOptions {
	/** Show poster URL used as the cover art, or null for a plain frame. */
	coverUrl: string | null;
	/** Full name of the place the pack belongs to, overlaid on the poster's top. */
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

		const composition = this.buildComposition(cover);

		// Render the rectangular composition into an intermediate texture, then
		// re-render it through a rect-shaped Graphics with a texture fill so the
		// 2px black border is baked into the final renderTex (which is also
		// what `split()` needs).
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
		framed.rect(0, 0, this.packW, this.packH);
		framed.stroke({ width: 2, color: 0x000000, alpha: 1 });

		this.renderTex = RenderTexture.create({
			width: this.packW,
			height: this.packH,
			resolution: 1
		});
		this.app.renderer.render({ container: framed, target: this.renderTex });
		framed.destroy();
		intermediate.destroy(true);

		// Soft black drop shadow behind the pack, offset down/right.
		const shadow = new Graphics();
		shadow.rect(0, 0, this.packW, this.packH);
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

		const bg = new Graphics();
		bg.rect(0, 0, w, h);
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

		// Plain white header + footer strips, outside the image — no text on them.
		const header = new Graphics();
		header.rect(0, 0, w, headerH);
		header.fill(STRIP_FILL);
		root.addChild(header);

		const footer = new Graphics();
		footer.rect(0, footerY, w, footerH);
		footer.fill(STRIP_FILL);
		root.addChild(footer);

		// A row of equilateral triangles across the top, bases on y = 0 (the start of
		// the top white strip) and apexes pointing down into it. The base is rounded
		// to a whole count so the row tiles the full width with no gap or overhang.
		const triCount = Math.max(1, Math.round(w / (w * TRIANGLE_BASE_RATIO)));
		const triBase = w / triCount;
		const triHeight = ((triBase * Math.sqrt(3)) / 2) * 0.67;
		const triangles = new Graphics();
		for (let i = 0; i < triCount; i++) {
			const x0 = i * triBase;
			triangles.poly([x0, 0, x0 + triBase, 0, x0 + triBase / 2, triHeight]);
		}
		triangles.fill(TRIANGLE_FILL);
		root.addChild(triangles);

		// The place the pack belongs to, overlaid at the top-centre of the image in
		// white with a black outline so it stays legible over the poster.
		if (this.locationName) {
			const loc = new Text({
				text: restoreCatalanArticle(this.locationName),
				style: {
					fontFamily: 'sans-serif',
					fontSize: Math.max(10, Math.round(w * 0.08)),
					fontWeight: '700',
					fill: 0xffffff,
					stroke: { color: 0x000000, width: Math.max(2, Math.round(w * 0.02)) },
					align: 'center',
					wordWrap: true,
					wordWrapWidth: w * 0.92
				}
			});
			loc.anchor.set(0.5, 0);
			loc.position.set(w / 2, artY + Math.round(w * 0.04));
			root.addChild(loc);
		}

		return root;
	}
}
