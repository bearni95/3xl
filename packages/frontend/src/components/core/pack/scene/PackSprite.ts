/**
 * PackSprite
 *
 * Renders a booster pack into a RenderTexture: the show's poster shown in full
 * (object-contain) over a black backing, with a 2px black border and a soft
 * black drop shadow behind it. Exposes split(y), which carves the rendered
 * texture into top/bottom halves for the slice animation.
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
	Texture
} from 'pixi.js';
import { textureCache } from './texture-cache';

export interface PackSpriteOptions {
	/** Show poster URL used as the cover art, or null for a plain frame. */
	coverUrl: string | null;
	/** Pack label — the show name, shown across the top section. */
	label: string;
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
	private packLabel: string;
	private packW: number;
	private packH: number;
	private renderTex: RenderTexture | null = null;
	private mainSprite: Sprite | null = null;

	constructor(opts: PackSpriteOptions) {
		super();
		this.app = opts.app;
		this.coverUrl = opts.coverUrl;
		this.packLabel = opts.label;
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

	private buildComposition(cover: Texture | null): Container {
		const root = new Container();
		const w = this.packW;
		const h = this.packH;

		// Black backing — fills any letterbox left by the contained poster.
		const bg = new Graphics();
		bg.rect(0, 0, w, h);
		bg.fill({ color: 0x000000, alpha: 1 });
		root.addChild(bg);

		if (cover && cover.width > 0 && cover.height > 0) {
			// The poster, `object-cover`: scaled so it fully covers the pack,
			// centred and cropped by the render target (no black letterbox).
			const imgW = cover.width;
			const imgH = cover.height;
			const scale = Math.max(w / imgW, h / imgH);
			const drawW = imgW * scale;
			const drawH = imgH * scale;

			const sprite = new Sprite(cover);
			sprite.setSize(drawW, drawH);
			sprite.position.set((w - drawW) / 2, (h - drawH) / 2);
			root.addChild(sprite);
		}

		return root;
	}
}
