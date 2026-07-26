/**
 * PackSprite
 *
 * Renders a booster pack into a RenderTexture, framed to match {@link CardSprite}:
 * the show's poster fills the middle art area (object-cover) with plain dark
 * header and footer strips above and below it — outside the image — and the place
 * the pack belongs to overlaid at the top-centre of the poster (white with a black
 * outline). Rounded corners, a 2px black border and a soft black drop shadow sit
 * behind it. Exposes
 * split(y), which carves the rendered texture into top/bottom halves for the slice
 * animation.
 *
 * Ported from the yugioh-duel-sim booster opener; the cover is now a show poster
 * (loaded by URL) rather than a card's cropped artwork.
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

// Card-frame proportions, shared with CardSprite so a pack reads as the unopened
// member of the same family: a dark header strip and a dark footer strip, sized
// as a fraction of the pack height, over the poster art.
const HEADER_RATIO = 0.14;
const FOOTER_RATIO = 0.15;
/** Fill for the dark header/footer strips — opaque so they fully hide any poster
 * overflow behind them (the poster is a Sprite, not masked). */
const STRIP_FILL = { color: 0x111827, alpha: 1 } as const;

export interface PackSpriteOptions {
	/** Show poster URL used as the cover art, or null for a plain frame. */
	coverUrl: string | null;
	/** Full name of the place the pack belongs to, overlaid on the poster's top. */
	locationName: string | null;
	app: Application;
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

		const radius = Math.max(6, this.packW * 0.05);
		const framed = new Graphics();
		framed.roundRect(0, 0, this.packW, this.packH, radius);
		framed.fill({ texture: intermediate });
		framed.roundRect(0, 0, this.packW, this.packH, radius);
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
		shadow.roundRect(0, 0, this.packW, this.packH, radius);
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

	private buildComposition(cover: Texture | null): Container {
		const root = new Container();
		const w = this.packW;
		const h = this.packH;
		const headerH = Math.round(h * HEADER_RATIO);
		const footerH = Math.round(h * FOOTER_RATIO);
		const footerY = h - footerH;

		// The poster sits only in the art area between the strips; the header/footer
		// bars sit outside it, over this black backing.
		const artY = headerH;
		const artH = h - headerH - footerH;

		const bg = new Graphics();
		bg.rect(0, 0, w, h);
		bg.fill({ color: 0x000000, alpha: 1 });
		root.addChild(bg);

		if (cover && cover.width > 0 && cover.height > 0) {
			// The poster, `object-cover` within the art box: a plain Sprite (Sprites
			// never tile, unlike a texture fill) scaled to fully cover the box and
			// centred. Horizontal overflow is clipped by the render target; any
			// vertical overflow is hidden under the opaque header/footer strips drawn
			// on top of it. No mask — masks need a stencil the RenderTexture lacks.
			const imgW = cover.width;
			const imgH = cover.height;
			const scale = Math.max(w / imgW, artH / imgH);
			const drawW = imgW * scale;
			const drawH = imgH * scale;

			const sprite = new Sprite(cover);
			sprite.setSize(drawW, drawH);
			sprite.position.set((w - drawW) / 2, artY + (artH - drawH) / 2);
			root.addChild(sprite);
		}

		// Plain dark header + footer strips, outside the image — no text on them.
		const header = new Graphics();
		header.rect(0, 0, w, headerH);
		header.fill(STRIP_FILL);
		root.addChild(header);

		const footer = new Graphics();
		footer.rect(0, footerY, w, footerH);
		footer.fill(STRIP_FILL);
		root.addChild(footer);

		// The place the pack belongs to, overlaid at the top-centre of the image in
		// white with a black outline so it stays legible over the poster.
		if (this.locationName) {
			const loc = new Text({
				text: this.locationName,
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
