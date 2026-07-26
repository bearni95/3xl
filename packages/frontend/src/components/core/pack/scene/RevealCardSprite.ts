/**
 * RevealCardSprite
 *
 * A single revealed card in the pack-opening canvas — one claimed character,
 * drawn as a trading card that mirrors RosterCard: the spawn's rolled colour is
 * the portrait backdrop, a dark header strip at the top carries the character
 * name, the character's looping idle animation plays in the middle (contained
 * within the art area), a meta strip below it carries the rarity and claim
 * location, and a dark footer carries its ATK/DEF. The idle frames (and the
 * fallback face) are lazy-loaded via the shared cache; the parent scene drives
 * all positioning and tweens.
 */

import { type Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { SpawnColor } from '$types/character-spawn.type';
import { wowRarityLabel } from '$utils/rarity/wow-rarity';
import type { ClaimPull } from './pull.type';
import { textureCache, type IdleFrame } from './texture-cache';

export interface RevealCardSpriteOptions {
	pull: ClaimPull;
	width: number;
	height: number;
	/** The scene's Pixi app — its ticker drives the looping idle animation. */
	app: Application;
}

// Offset (as a fraction of card width) of the silhouette behind the art: a touch
// to the left and down, so the black copy reads as the character's shadow.
const SHADOW_OFFSET_X_RATIO = -0.05;
const SHADOW_OFFSET_Y_RATIO = 0.045;
/** Opacity of the black silhouette drop-shadow. */
const SHADOW_ALPHA = 0.45;

/** The d10 die icon (white SVG) shown next to the ATK value — the same one the
 * roster/team cards use for a character's stat. Served from @3xl/assets. */
const D10_ICON_URL = '/assets/icons/skoll/d10.svg';

// Hex twins of the Tailwind swatches RosterCard uses for each spawn colour.
const COLOR_HEX: Record<SpawnColor, number> = {
	[SpawnColor.Red]: 0xef4444,
	[SpawnColor.Yellow]: 0xfacc15,
	[SpawnColor.Blue]: 0x3b82f6,
	[SpawnColor.Orange]: 0xf97316,
	[SpawnColor.Green]: 0x22c55e,
	[SpawnColor.Purple]: 0xa855f7
};

export class RevealCardSprite extends Container {
	readonly pull: ClaimPull;
	readonly cardWidth: number;
	readonly cardHeight: number;
	private app: Application;
	private artSprite: Sprite;
	private shadowSprite: Sprite;
	private artArea: { x: number; y: number; w: number; h: number };

	// Idle-animation playback state (null until the frames load).
	private idleFrames: IdleFrame[] | null = null;
	private idleFitScale = 1;
	private idleFeetY = 0;
	private idleCenterX = 0;
	private frameIndex = 0;
	private frameElapsed = 0;
	private tickerAdded = false;

	constructor(opts: RevealCardSpriteOptions) {
		super();
		this.pull = opts.pull;
		this.cardWidth = opts.width;
		this.cardHeight = opts.height;
		this.app = opts.app;

		const radius = Math.max(6, this.cardWidth * 0.05);
		// A name header at the top, the art in the middle, an ATK/DEF footer below.
		const headerH = Math.round(this.cardHeight * 0.14);
		const footerH = Math.round(this.cardHeight * 0.16);
		const footerY = this.cardHeight - footerH;
		this.artArea = { x: 0, y: headerH, w: this.cardWidth, h: footerY - headerH };

		// Colored portrait backdrop (the spawn's rolled colour), with a black
		// border to match the roster card framing.
		const backdrop = new Graphics();
		backdrop.roundRect(0, 0, this.cardWidth, this.cardHeight, radius);
		backdrop.fill(COLOR_HEX[this.pull.color] ?? 0x1f2937);
		backdrop.roundRect(0, 0, this.cardWidth, this.cardHeight, radius);
		backdrop.stroke({ width: 2, color: 0x000000, alpha: 0.9 });
		this.addChild(backdrop);

		// Dark header strip at the top, carrying the character name.
		const header = new Graphics();
		header.rect(0, 0, this.cardWidth, headerH);
		header.fill({ color: 0x111827, alpha: 0.92 });
		this.addChild(header);

		// Dark footer strip carrying the ATK/DEF.
		const footer = new Graphics();
		footer.rect(0, footerY, this.cardWidth, footerH);
		footer.fill({ color: 0x111827, alpha: 0.92 });
		this.addChild(footer);

		// A black silhouette copy of the art, sitting behind the full-colour sprite
		// (added first, so lower z-index) and offset to the bottom-left — the
		// character's animated shadow. A black tint multiplies every visible pixel's
		// RGB to zero (brightness → 0) while the texture's alpha keeps the shape, so
		// the copy is a pure black silhouette that tracks the animation frame for
		// frame. Added before the art sprite so it always renders underneath it.
		this.shadowSprite = new Sprite(Texture.EMPTY);
		this.shadowSprite.tint = 0x000000;
		this.shadowSprite.alpha = SHADOW_ALPHA;
		this.addChild(this.shadowSprite);

		// The art starts as a transparent 1×1 sprite; its real texture and size are
		// applied once the idle frames (or the fallback face) load.
		this.artSprite = new Sprite(Texture.EMPTY);
		this.addChild(this.artSprite);

		this.addChild(this.makeName(headerH));
		this.addChild(this.makeStats(footerY, footerH));

		void this.loadArt();
	}

	override destroy(options?: Parameters<Container['destroy']>[0]): void {
		if (this.tickerAdded) {
			this.app.ticker.remove(this.tick);
			this.tickerAdded = false;
		}
		super.destroy(options);
	}

	/**
	 * Prefer the looping idle animation; fall back to the static face portrait when
	 * the character ships no idle clip (or its manifest can't be loaded).
	 */
	private async loadArt(): Promise<void> {
		const frames = await textureCache.idleFrames(this.pull.basePath);
		if (this.destroyed) return;
		if (frames && frames.length > 0) {
			this.applyIdle(frames);
			return;
		}

		// Fallback: the static face portrait, contained within the art area.
		const cached = textureCache.cached(this.pull.faceUrl);
		if (cached) {
			this.applyFace(cached);
		} else if (this.pull.faceUrl) {
			const tex = await textureCache.face(this.pull.faceUrl).catch(() => null);
			if (this.destroyed || !tex) return;
			this.applyFace(tex);
		}
	}

	/**
	 * Fit the idle animation inside the art area — scaled to fit by height, capped
	 * so the widest frame can't overflow sideways — and start looping it on the
	 * app ticker. Frames are anchored at their body axis with feet on a common
	 * line, so the character breathes in place without drifting.
	 */
	private applyIdle(frames: IdleFrame[]): void {
		this.idleFrames = frames;
		const pad = this.cardWidth * 0.08;
		const boxW = this.artArea.w - pad * 2;
		const boxH = this.artArea.h - pad * 2;

		const maxHeight = Math.max(...frames.map((f) => f.height));
		// Widest axis-to-edge extent across frames (each frame is placed by its body
		// anchor, which can sit off-centre), so the whole cycle stays within the box.
		const maxHalfExtent = Math.max(
			...frames.map((f) => Math.max(f.anchorX, 1 - f.anchorX) * f.width)
		);
		const heightScale = boxH / maxHeight;
		const widthScale = boxW / 2 / maxHalfExtent;
		this.idleFitScale = Math.min(heightScale, widthScale);

		// Centre the character in the art area: feet on a line half the content
		// height below the box centre.
		const contentHeight = maxHeight * this.idleFitScale;
		const centerY = this.artArea.y + this.artArea.h / 2;
		this.idleCenterX = this.artArea.x + this.artArea.w / 2;
		this.idleFeetY = centerY + contentHeight / 2;

		this.frameIndex = 0;
		this.frameElapsed = 0;
		this.applyIdleFrame();

		if (!this.tickerAdded) {
			this.app.ticker.add(this.tick);
			this.tickerAdded = true;
		}
	}

	/** Push the current idle frame's texture, anchor, scale and position to both
	 * the full-colour art sprite and the black silhouette shadow behind it. */
	private applyIdleFrame(): void {
		const frames = this.idleFrames;
		if (!frames || frames.length === 0) return;
		const frame = frames[this.frameIndex % frames.length];

		// Body axis horizontally (stable pivot across frames), feet at the bottom.
		this.artSprite.texture = frame.texture;
		this.artSprite.anchor.set(frame.anchorX, 1);
		this.artSprite.scale.set(this.idleFitScale);
		this.artSprite.position.set(this.idleCenterX, this.idleFeetY);

		// The silhouette mirrors the art, offset to the bottom-left.
		const dx = this.cardWidth * SHADOW_OFFSET_X_RATIO;
		const dy = this.cardWidth * SHADOW_OFFSET_Y_RATIO;
		this.shadowSprite.texture = frame.texture;
		this.shadowSprite.anchor.set(frame.anchorX, 1);
		this.shadowSprite.scale.set(this.idleFitScale);
		this.shadowSprite.position.set(this.idleCenterX + dx, this.idleFeetY + dy);
	}

	private tick = (): void => {
		const frames = this.idleFrames;
		if (!frames || frames.length < 2 || this.destroyed) return;
		this.frameElapsed += this.app.ticker.deltaMS;
		let guard = frames.length;
		while (this.frameElapsed >= frames[this.frameIndex].duration && guard-- > 0) {
			this.frameElapsed -= frames[this.frameIndex].duration;
			this.frameIndex = (this.frameIndex + 1) % frames.length;
		}
		this.applyIdleFrame();
	};

	private applyFace(tex: Texture): void {
		this.artSprite.texture = tex;
		// object-contain within the art area, with a little inset padding.
		const pad = this.cardWidth * 0.08;
		const boxW = this.artArea.w - pad * 2;
		const boxH = this.artArea.h - pad * 2;
		const scale = Math.min(boxW / tex.width, boxH / tex.height);
		const w = tex.width * scale;
		const h = tex.height * scale;
		const x = this.artArea.x + (this.artArea.w - w) / 2;
		const y = this.artArea.y + (this.artArea.h - h) / 2;
		this.artSprite.anchor.set(0, 0);
		this.artSprite.scale.set(1);
		this.artSprite.width = w;
		this.artSprite.height = h;
		this.artSprite.position.set(x, y);

		// The silhouette mirrors the face, offset to the bottom-left.
		const dx = this.cardWidth * SHADOW_OFFSET_X_RATIO;
		const dy = this.cardWidth * SHADOW_OFFSET_Y_RATIO;
		this.shadowSprite.texture = tex;
		this.shadowSprite.anchor.set(0, 0);
		this.shadowSprite.scale.set(1);
		this.shadowSprite.width = w;
		this.shadowSprite.height = h;
		this.shadowSprite.position.set(x + dx, y + dy);
	}

	/** The character name, centred in the top header strip. */
	private makeName(headerH: number): Text {
		const name = new Text({
			text: this.pull.label,
			style: {
				fontFamily: 'sans-serif',
				fontSize: Math.max(10, Math.round(this.cardWidth * 0.09)),
				fontWeight: '700',
				fill: 0xf2f2f2,
				align: 'center',
				wordWrap: true,
				wordWrapWidth: this.cardWidth * 0.9
			}
		});
		name.anchor.set(0.5);
		name.position.set(this.cardWidth / 2, headerH / 2);
		return name;
	}

	/**
	 * The footer stat row: the ATK value with the d10 die icon beside it on the
	 * left, and the DEF value with a trailing "+" on the right — spaced apart to
	 * the two edges of the footer, with no separator between them.
	 */
	private makeStats(footerY: number, footerH: number): Container {
		const group = new Container();
		const centerY = footerY + footerH / 2;
		const padX = this.cardWidth * 0.12;
		const fontSize = Math.max(11, Math.round(this.cardWidth * 0.1));

		// Attack: the ATK value, then the d10 die icon right beside it.
		const atk = new Text({
			text: `${this.pull.atk}`,
			style: { fontFamily: 'sans-serif', fontSize, fontWeight: '700', fill: 0xf2f2f2 }
		});
		atk.anchor.set(0, 0.5);
		atk.position.set(padX, centerY);
		group.addChild(atk);

		// The d10 icon loads async; place it just right of the ATK value once ready.
		const iconGap = fontSize * 0.35;
		void textureCache.icon(D10_ICON_URL).then((tex) => {
			if (this.destroyed || group.destroyed || !tex) return;
			const icon = new Sprite(tex);
			icon.anchor.set(0, 0.5);
			icon.scale.set(fontSize / tex.height);
			icon.position.set(atk.x + atk.width + iconGap, centerY);
			group.addChild(icon);
		});

		// Defense: the DEF value with a trailing "+", pinned to the right edge.
		const def = new Text({
			text: `${this.pull.def}+`,
			style: { fontFamily: 'sans-serif', fontSize, fontWeight: '700', fill: 0xf2f2f2 }
		});
		def.anchor.set(1, 0.5);
		def.position.set(this.cardWidth - padX, centerY);
		group.addChild(def);

		return group;
	}
}
