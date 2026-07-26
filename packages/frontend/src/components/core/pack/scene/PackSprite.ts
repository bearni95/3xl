/**
 * PackSprite
 *
 * Renders a booster pack into a RenderTexture: a diagonal warning→base gradient
 * frame, three stacked sections (top reflection / cover / bottom reflection) with
 * a fading frosted overlay, the show's name across the top, and a 2px border. The
 * cover art is the show's poster. Exposes split(y), which carves the rendered
 * texture into top/bottom halves for the slice animation.
 *
 * Ported from the yugioh-duel-sim booster opener; the cover is now a show poster
 * (loaded by URL) rather than a card's cropped artwork.
 */

import {
	Application,
	Container,
	FillGradient,
	Graphics,
	Rectangle,
	RenderTexture,
	Sprite,
	Text,
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

		// Three vertically stacked sections: aspect-[10/3] reflection /
		// aspect-square cover / aspect-[10/3] reflection.
		const topH = (h * 3) / 16;
		const midH = (h * 10) / 16;
		const botH = (h * 3) / 16;
		const midY = topH;
		const botY = topH + midH;

		// DaisyUI dark theme: base-100 ≈ #2a333c, base-300 ≈ #1d242c,
		// warning ≈ #fdd34c. warning/30 over base-100 ≈ #696341.
		const BASE_100 = 0x2a333c;
		const BASE_300 = 0x1d242c;
		const WARNING_30_OVER_BASE_100 = 0x696341;

		// `bg-gradient-to-br from-warning/30 via-base-300 to-base-100`.
		const bg = new Graphics();
		const bgGrad = new FillGradient({
			type: 'linear',
			start: { x: 0, y: 0 },
			end: { x: 1, y: 1 },
			textureSpace: 'local',
			colorStops: [
				{ offset: 0, color: WARNING_30_OVER_BASE_100 },
				{ offset: 0.5, color: BASE_300 },
				{ offset: 1, color: BASE_100 }
			]
		});
		bg.rect(0, 0, w, h);
		bg.fill(bgGrad);
		root.addChild(bg);

		if (cover && cover.width > 0 && cover.height > 0) {
			// object-cover object-top, then -scale-y-100 — top reflection.
			root.addChild(this.makeCoverSection(cover, 0, w, topH, 'top', true));
			// object-cover centered — the main face.
			root.addChild(this.makeCoverSection(cover, midY, w, midH, 'center', false));
			// object-cover object-bottom, then -scale-y-100 — bottom reflection.
			root.addChild(this.makeCoverSection(cover, botY, w, botH, 'bottom', true));
		}

		// Frosted-overlay equivalent: a dark tint over the outer edge of each
		// reflection that fades to transparent at the seam with the middle.
		const topOverlay = new Graphics();
		topOverlay.rect(0, 0, w, topH);
		topOverlay.fill(
			new FillGradient({
				type: 'linear',
				start: { x: 0, y: 0 },
				end: { x: 0, y: 1 },
				textureSpace: 'local',
				colorStops: [
					{ offset: 0, color: 'rgba(42, 51, 60, 0.55)' },
					{ offset: 1, color: 'rgba(42, 51, 60, 0)' }
				]
			})
		);
		root.addChild(topOverlay);

		const botOverlay = new Graphics();
		botOverlay.rect(0, botY, w, botH);
		botOverlay.fill(
			new FillGradient({
				type: 'linear',
				start: { x: 0, y: 0 },
				end: { x: 0, y: 1 },
				textureSpace: 'local',
				colorStops: [
					{ offset: 0, color: 'rgba(42, 51, 60, 0)' },
					{ offset: 1, color: 'rgba(42, 51, 60, 0.55)' }
				]
			})
		);
		root.addChild(botOverlay);

		// Show name across the top section (bold, uppercase, wide tracking).
		root.addChild(this.makeLabel(w, topH));

		return root;
	}

	private makeLabel(w: number, topH: number): Container {
		const padding = Math.max(8, w * 0.04);
		const maxWidth = w - padding * 2;
		const fontSize = Math.max(14, Math.round(w * 0.072));

		const label = new Text({
			text: this.packLabel.toUpperCase(),
			style: {
				fontFamily: 'sans-serif',
				fontSize,
				fontWeight: '700',
				letterSpacing: fontSize * 0.08,
				fill: 0xf2f2f2,
				stroke: { color: 0x000000, width: 2, join: 'round' },
				align: 'center',
				wordWrap: true,
				wordWrapWidth: maxWidth,
				dropShadow: {
					color: 0x000000,
					alpha: 0.8,
					blur: 4,
					distance: 2,
					angle: Math.PI / 2
				}
			}
		});
		label.anchor.set(0.5);
		label.position.set(w / 2, topH / 2);
		return label;
	}

	/**
	 * Renders a CSS `object-cover` slice of `cover` into a rectangle, optionally
	 * vertically flipped (the `-scale-y-100` reflection trick). Crops the source
	 * via Texture.frame so the resulting sprite is exactly section-sized.
	 */
	private makeCoverSection(
		cover: Texture,
		y: number,
		w: number,
		h: number,
		align: 'top' | 'bottom' | 'center',
		flip: boolean
	): Sprite {
		const imgW = cover.width;
		const imgH = cover.height;
		const scale = Math.max(w / imgW, h / imgH);
		const srcW = w / scale;
		const srcH = h / scale;
		const srcX = (imgW - srcW) / 2;
		let srcY: number;
		if (align === 'top') srcY = 0;
		else if (align === 'bottom') srcY = imgH - srcH;
		else srcY = (imgH - srcH) / 2;

		const baseFrame = cover.frame;
		const fx = Math.max(0, Math.round(baseFrame.x + srcX));
		const fy = Math.max(0, Math.round(baseFrame.y + srcY));
		const fw = Math.max(1, Math.min(baseFrame.width, Math.round(srcW)));
		const fh = Math.max(1, Math.min(baseFrame.height, Math.round(srcH)));

		const subTex = new Texture({
			source: cover.source,
			frame: new Rectangle(fx, fy, fw, fh)
		});

		const sprite = new Sprite(subTex);
		sprite.setSize(w, h);
		sprite.position.set(0, y);

		if (flip) {
			sprite.scale.y = -sprite.scale.y;
			sprite.position.y = y + h;
		}

		return sprite;
	}
}
