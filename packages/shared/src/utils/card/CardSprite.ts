/**
 * CardSprite
 *
 * A single character trading card, drawn as a Pixi `Container` and reusable in
 * any canvas (the pack opener's reveal, a collection grid, …). It mirrors
 * RosterCard: the character's colour is the portrait backdrop, a dark upper block
 * at the top carries the character name and, on a second row beneath it, the
 * rarity badge (left) opposite the show name (right); the character's looping idle
 * animation plays in the middle (contained within the art area); a meta strip
 * below it carries a free-text location label, and a dark footer carries its
 * ATK/DEF/SPD/HP stats. The idle frames (and the fallback face) are lazy-loaded via
 * the shared cache; the host scene drives all positioning and tweens.
 */

import { type Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { spawnYearLabel } from '../spawn/year';
import { SpawnColor } from '../../types/character-spawn.type';
import type { CardModel } from './card-model.type';
import { textureCache, type IdleFrame } from './texture-cache';

export interface CardSpriteOptions {
	card: CardModel;
	width: number;
	height: number;
	/** The host's Pixi app — its ticker drives the looping idle animation. */
	app: Application;
}

// Offset (as a fraction of card width) of the silhouette behind the art: a touch
// to the left and down, so the black copy reads as the character's shadow.
const SHADOW_OFFSET_X_RATIO = -0.05;
const SHADOW_OFFSET_Y_RATIO = 0.045;
/** Opacity of the black silhouette drop-shadow. */
const SHADOW_ALPHA = 0.45;

/**
 * Native source-pixel height treated as a "full-height" character. Every card scales
 * its idle by the same ratio (art-box height ÷ this value) so on-screen size tracks a
 * character's real sprite size relative to the roster — a short character renders
 * smaller than a tall one instead of each being stretched to fill its box. Sized so a
 * tall MUGEN character (Trunks ~136px) nearly fills the art box; anything taller is
 * capped to the box in {@link CardSprite.applyIdle}. Exported so the board engine can
 * scale its standing characters against the same reference — the two surfaces then
 * agree on every character's size relative to the others. */
export const REFERENCE_SOURCE_HEIGHT = 150;

/** The d10 die icon (white SVG) shown next to the ATK value — the same one the
 * roster/team cards use for a character's stat. Served from @3xl/assets. */
const D10_ICON_URL = '/assets/icons/skoll/d10.svg';

// Canonical WoW quality colours, indexed by rarity tier — so the rarity label
// reads in its quality colour (Common grey → Legendary orange → …).
const RARITY_COLOR: Record<number, number> = {
	0: 0xf2f2f2, // Common
	1: 0x1eff00, // Uncommon
	2: 0x0070dd, // Rare
	3: 0xa335ee, // Epic
	4: 0xff8000, // Legendary
	5: 0xe6cc80, // Artifact
	6: 0x00ccff // Heirloom
};

// Hex twins of the Tailwind swatches RosterCard uses for each spawn colour.
const COLOR_HEX: Record<SpawnColor, number> = {
	[SpawnColor.Red]: 0xef4444,
	[SpawnColor.Yellow]: 0xfacc15,
	[SpawnColor.Blue]: 0x3b82f6,
	[SpawnColor.Orange]: 0xf97316,
	[SpawnColor.Green]: 0x22c55e,
	[SpawnColor.Purple]: 0xa855f7
};

export class CardSprite extends Container {
	readonly card: CardModel;
	readonly cardWidth: number;
	readonly cardHeight: number;
	private app: Application;
	private artSprite: Sprite;
	private shadowSprite: Sprite;
	private artArea: { x: number; y: number; w: number; h: number };

	// Resolves once the card's idle animation (or face fallback) has been applied,
	// so a host scene can wait for the card to actually render before revealing it.
	private readonly artReady: Promise<void>;

	// Idle-animation playback state (null until the frames load).
	private idleFrames: IdleFrame[] | null = null;
	private idleFitScale = 1;
	private idleFeetY = 0;
	private idleCenterX = 0;
	private frameIndex = 0;
	private frameElapsed = 0;
	private tickerAdded = false;

	constructor(opts: CardSpriteOptions) {
		super();
		this.card = opts.card;
		this.cardWidth = opts.width;
		this.cardHeight = opts.height;
		this.app = opts.app;

		const radius = Math.max(6, this.cardWidth * 0.05);
		// Top→bottom: a name header, a rarity/show row, the art, a location meta strip,
		// an ATK/DEF/SPD/HP footer.
		const headerH = Math.round(this.cardHeight * 0.14);
		// The row under the name carrying the rarity badge (left) and show name (right).
		const showRowH = Math.round(this.cardHeight * 0.1);
		const footerH = Math.round(this.cardHeight * 0.15);
		const metaH = Math.round(this.cardHeight * 0.11);
		const footerY = this.cardHeight - footerH;
		const metaY = footerY - metaH;
		const artY = headerH + showRowH;
		this.artArea = { x: 0, y: artY, w: this.cardWidth, h: metaY - artY };

		// Colored portrait backdrop (the character's colour), with a black
		// border to match the roster card framing.
		const backdrop = new Graphics();
		backdrop.roundRect(0, 0, this.cardWidth, this.cardHeight, radius);
		backdrop.fill(COLOR_HEX[this.card.color] ?? 0x1f2937);
		backdrop.roundRect(0, 0, this.cardWidth, this.cardHeight, radius);
		backdrop.stroke({ width: 2, color: 0x000000, alpha: 0.9 });
		this.addChild(backdrop);

		// Dark upper block: the name header and the rarity/show row directly beneath
		// it share one dark fill so they read as one upper block with two rows (the
		// mirror of the location + stats block at the bottom).
		const header = new Graphics();
		header.rect(0, 0, this.cardWidth, artY);
		header.fill({ color: 0x111827, alpha: 0.92 });
		this.addChild(header);
		// A faint divider between the name row and the rarity/show row.
		const topDivider = new Graphics();
		topDivider.moveTo(this.cardWidth * 0.08, headerH);
		topDivider.lineTo(this.cardWidth * 0.92, headerH);
		topDivider.stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
		this.addChild(topDivider);

		// Dark meta strip below the art, carrying the location label, then the
		// ATK/DEF/SPD/HP footer directly beneath it (both share the same dark fill so
		// they read as one lower block with two rows).
		const meta = new Graphics();
		meta.rect(0, metaY, this.cardWidth, metaH + footerH);
		meta.fill({ color: 0x111827, alpha: 0.92 });
		this.addChild(meta);
		// A faint divider between the meta row and the ATK/DEF row.
		const divider = new Graphics();
		divider.moveTo(this.cardWidth * 0.08, footerY);
		divider.lineTo(this.cardWidth * 0.92, footerY);
		divider.stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
		this.addChild(divider);

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

		this.addChild(this.makeHeader(headerH));
		this.addChild(this.makeShowRow(headerH, showRowH));
		this.addChild(this.makeMeta(metaY, metaH));
		this.addChild(this.makeStats(footerY, footerH));

		this.artReady = this.loadArt();
	}

	/**
	 * Resolves once the card's idle animation (or static face fallback) has loaded
	 * and been applied — i.e. the card has something to render. Lets a host scene
	 * hold an animation (e.g. sliding the pack open) until the card is on screen.
	 */
	whenReady(): Promise<void> {
		return this.artReady;
	}

	override destroy(options?: Parameters<Container['destroy']>[0]): void {
		// When the whole scene is torn down, `app.destroy()` nulls the ticker before
		// it recursively destroys children, so guard against it already being gone.
		if (this.tickerAdded && this.app.ticker) {
			this.app.ticker.remove(this.tick);
		}
		this.tickerAdded = false;
		super.destroy(options);
	}

	/**
	 * Prefer the looping idle animation; fall back to the static face portrait when
	 * the character ships no idle clip (or its manifest can't be loaded).
	 */
	private async loadArt(): Promise<void> {
		const frames = await textureCache.idleFrames(this.card.basePath);
		if (this.destroyed) return;
		if (frames && frames.length > 0) {
			this.applyIdle(frames);
			return;
		}

		// Fallback: the static face portrait, contained within the art area.
		const cached = textureCache.cached(this.card.faceUrl);
		if (cached) {
			this.applyFace(cached);
		} else if (this.card.faceUrl) {
			const tex = await textureCache.face(this.card.faceUrl).catch(() => null);
			if (this.destroyed || !tex) return;
			this.applyFace(tex);
		}
	}

	/**
	 * Fit the idle animation inside the art area and start looping it on the app
	 * ticker. The key point is that every card scales its sprite by the *same* ratio
	 * ({@link REFERENCE_SOURCE_HEIGHT}), so a character's on-screen size reflects its
	 * true sprite size relative to the others — a short character (Krillin, ~78px)
	 * renders visibly smaller than a tall one (Trunks, ~136px) rather than each sprite
	 * being stretched to fill its box, which is what made stocky characters balloon.
	 * The shared scale is then capped so a character taller or wider than the box can
	 * never overflow it. Frames are anchored at their body axis on a common baseline
	 * (so the character breathes in place without drifting), and that baseline is
	 * placed to centre the animation vertically within the art area.
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
		// One shared ratio for every card keeps proportions honest between characters;
		// the height/width caps only bite for a sprite that would otherwise spill out
		// of the art box.
		const sharedScale = boxH / REFERENCE_SOURCE_HEIGHT;
		const heightCap = boxH / maxHeight;
		const widthCap = boxW / 2 / maxHalfExtent;
		this.idleFitScale = Math.min(sharedScale, heightCap, widthCap);

		// Centre the animation vertically in the coloured art area (scale unchanged):
		// place the shared feet baseline so the tallest frame's rendered height is
		// centred in the box. Every frame still shares this one baseline, so the
		// character breathes in place without drifting.
		this.idleCenterX = this.artArea.x + this.artArea.w / 2;
		const renderedHeight = maxHeight * this.idleFitScale;
		this.idleFeetY = this.artArea.y + this.artArea.h / 2 + renderedHeight / 2;

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

	/**
	 * The top header strip: the character name centred.
	 */
	private makeHeader(headerH: number): Container {
		const group = new Container();
		const centerY = headerH / 2;

		const name = new Text({
			text: this.card.label,
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
		name.position.set(this.cardWidth / 2, centerY);
		group.addChild(name);

		return group;
	}

	/**
	 * The row directly under the name: the `[N]` rarity badge (in its WoW quality
	 * colour) flush left, and the show name flush right, spaced apart across the row.
	 * The show name is truncated to whatever width the rarity badge leaves it.
	 */
	private makeShowRow(headerH: number, showRowH: number): Container {
		const group = new Container();
		const centerY = headerH + showRowH / 2;
		const leftX = this.cardWidth * 0.08;
		const rightX = this.cardWidth * 0.92;

		// Rarity badge, flush left: the bracketed tier number in its quality colour.
		let rarityRight = leftX;
		if (this.card.rarity != null) {
			const rarity = new Text({
				text: `[${this.card.rarity}]`,
				style: {
					fontFamily: 'sans-serif',
					fontSize: Math.max(9, Math.round(this.cardWidth * 0.072)),
					fontWeight: '700',
					fill: RARITY_COLOR[this.card.rarity] ?? 0xf2f2f2
				}
			});
			rarity.anchor.set(0, 0.5);
			rarity.position.set(leftX, centerY);
			group.addChild(rarity);
			rarityRight = leftX + rarity.width;
		}

		// Show name, flush right and muted, truncated to the width the rarity badge
		// leaves it (with a small gap so the two never touch).
		if (this.card.showName) {
			const gap = this.cardWidth * 0.06;
			const show = new Text({
				text: this.card.showName,
				style: {
					fontFamily: 'sans-serif',
					fontSize: Math.max(8, Math.round(this.cardWidth * 0.06)),
					fontWeight: '600',
					fill: 0x9ca3af
				}
			});
			this.ellipsize(show, this.card.showName, Math.max(0, rightX - rarityRight - gap));
			show.anchor.set(1, 0.5);
			show.position.set(rightX, centerY);
			group.addChild(show);
		}

		return group;
	}

	/**
	 * The meta row between the art and the ATK/DEF row: the location label, with the
	 * spawn year as a two-digit suffix (e.g. `Barcelona '25`), centred in the row.
	 * Omitted when the card carries neither a location nor a spawn date.
	 */
	private makeMeta(metaY: number, metaH: number): Container {
		const group = new Container();
		const centerY = metaY + metaH / 2;
		const fontSize = Math.max(8, Math.round(this.cardWidth * 0.06));

		// Join the location and the two-digit spawn year into one muted label, centred
		// in the row and truncated to most of its width.
		const label = [this.card.locationName, spawnYearLabel(this.card.spawnedAt)]
			.filter(Boolean)
			.join(' ');
		if (label) {
			const loc = new Text({
				text: label,
				style: { fontFamily: 'sans-serif', fontSize, fontWeight: '600', fill: 0x9ca3af }
			});
			this.ellipsize(loc, label, this.cardWidth * 0.9);
			loc.anchor.set(0.5, 0.5);
			loc.position.set(this.cardWidth / 2, centerY);
			group.addChild(loc);
		}

		return group;
	}

	/** Trim `full` with a trailing ellipsis until the text fits within `maxWidth`. */
	private ellipsize(text: Text, full: string, maxWidth: number): void {
		text.text = full;
		let trimmed = full;
		while (trimmed.length > 1 && text.width > maxWidth) {
			trimmed = trimmed.slice(0, -1);
			text.text = `${trimmed.trimEnd()}…`;
		}
	}

	/**
	 * The footer stat row: the four combat attributes the board fields — ATK and DEF
	 * on the left, SPD and HP on the right — each a value under a small caption. (The
	 * rarity badge now lives in the show row under the name, not here.) ATK's caption
	 * is the shared d10 die icon (as on the roster/team cards); the other three use a
	 * small text label.
	 */
	private makeStats(footerY: number, footerH: number): Container {
		const group = new Container();
		const captionY = footerY + footerH * 0.32;
		const valueY = footerY + footerH * 0.7;
		const captionSize = Math.max(7, Math.round(this.cardWidth * 0.05));
		const valueSize = Math.max(11, Math.round(this.cardWidth * 0.09));

		// Cell centres: ATK/DEF flush left, SPD/HP flush right. Same four attributes
		// (and order) as the combat board's table.
		const cells: { x: number; label: string; value: number }[] = [
			{ x: this.cardWidth * 0.15, label: 'ATK', value: this.card.atk },
			{ x: this.cardWidth * 0.33, label: 'DEF', value: this.card.def },
			{ x: this.cardWidth * 0.67, label: 'SPD', value: this.card.spd },
			{ x: this.cardWidth * 0.85, label: 'HP', value: this.card.hp }
		];

		for (const cell of cells) {
			const value = new Text({
				text: `${cell.value}`,
				style: { fontFamily: 'sans-serif', fontSize: valueSize, fontWeight: '700', fill: 0xf2f2f2 }
			});
			value.anchor.set(0.5, 0.5);
			value.position.set(cell.x, valueY);
			group.addChild(value);

			if (cell.label === 'ATK') {
				// The d10 icon loads async; it stands in for the ATK caption once ready.
				void textureCache.icon(D10_ICON_URL).then((tex) => {
					if (this.destroyed || group.destroyed || !tex) return;
					const icon = new Sprite(tex);
					icon.anchor.set(0.5, 0.5);
					icon.scale.set(captionSize / tex.height);
					icon.position.set(cell.x, captionY);
					group.addChild(icon);
				});
			} else {
				const caption = new Text({
					text: cell.label,
					style: {
						fontFamily: 'sans-serif',
						fontSize: captionSize,
						fontWeight: '700',
						fill: 0x9ca3af
					}
				});
				caption.anchor.set(0.5, 0.5);
				caption.position.set(cell.x, captionY);
				group.addChild(caption);
			}
		}

		return group;
	}
}
