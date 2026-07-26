/**
 * RevealCardSprite
 *
 * A single revealed card in the pack-opening canvas — one claimed character,
 * drawn as a trading card that mirrors RosterCard: the spawn's rolled colour is
 * the portrait backdrop, the face portrait sits on top (contained), and a dark
 * footer carries the character label and stat. The face texture is lazy-loaded
 * via the shared cache; the parent scene drives all positioning and tweens.
 */

import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { SpawnColor } from '$types/character-spawn.type';
import type { ClaimPull } from './pull.type';
import { textureCache } from './texture-cache';

export interface RevealCardSpriteOptions {
	pull: ClaimPull;
	width: number;
	height: number;
}

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
	private artSprite: Sprite;
	private artArea: { x: number; y: number; w: number; h: number };

	constructor(opts: RevealCardSpriteOptions) {
		super();
		this.pull = opts.pull;
		this.cardWidth = opts.width;
		this.cardHeight = opts.height;

		const radius = Math.max(6, this.cardWidth * 0.05);
		const footerH = Math.round(this.cardHeight * 0.18);
		const artH = this.cardHeight - footerH;
		this.artArea = { x: 0, y: 0, w: this.cardWidth, h: artH };

		// Colored portrait backdrop (the spawn's rolled colour), with a black
		// border to match the roster card framing.
		const backdrop = new Graphics();
		backdrop.roundRect(0, 0, this.cardWidth, this.cardHeight, radius);
		backdrop.fill(COLOR_HEX[this.pull.color] ?? 0x1f2937);
		backdrop.roundRect(0, 0, this.cardWidth, this.cardHeight, radius);
		backdrop.stroke({ width: 2, color: 0x000000, alpha: 0.9 });
		this.addChild(backdrop);

		// Dark footer strip carrying the label + stat.
		const footer = new Graphics();
		footer.rect(0, artH, this.cardWidth, footerH);
		footer.fill({ color: 0x111827, alpha: 0.92 });
		this.addChild(footer);

		// The face starts as a transparent 1×1 sprite; its real texture and size
		// are applied once loaded (contained within the art area).
		this.artSprite = new Sprite(Texture.EMPTY);
		this.addChild(this.artSprite);

		this.addChild(this.makeLabel(artH, footerH));

		const cached = textureCache.cached(this.pull.faceUrl);
		if (cached) {
			this.applyFace(cached);
		} else if (this.pull.faceUrl) {
			textureCache
				.face(this.pull.faceUrl)
				.then((tex) => {
					if (this.destroyed || !tex) return;
					this.applyFace(tex);
				})
				.catch(() => {});
		}
	}

	private applyFace(tex: Texture): void {
		this.artSprite.texture = tex;
		// object-contain within the art area, with a little inset padding.
		const pad = this.cardWidth * 0.08;
		const boxW = this.artArea.w - pad * 2;
		const boxH = this.artArea.h - pad * 2;
		const scale = Math.min(boxW / tex.width, boxH / tex.height);
		const w = tex.width * scale;
		const h = tex.height * scale;
		this.artSprite.width = w;
		this.artSprite.height = h;
		this.artSprite.position.set(
			this.artArea.x + (this.artArea.w - w) / 2,
			this.artArea.y + (this.artArea.h - h) / 2
		);
	}

	private makeLabel(artH: number, footerH: number): Container {
		const fontSize = Math.max(10, Math.round(this.cardWidth * 0.09));
		const label = new Text({
			text: `${this.pull.label}  ·  ${this.pull.stat}`,
			style: {
				fontFamily: 'sans-serif',
				fontSize,
				fontWeight: '700',
				fill: 0xf2f2f2,
				align: 'center',
				wordWrap: true,
				wordWrapWidth: this.cardWidth * 0.9
			}
		});
		label.anchor.set(0.5);
		label.position.set(this.cardWidth / 2, artH + footerH / 2);
		return label;
	}
}
