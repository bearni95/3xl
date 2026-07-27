/**
 * CardSprite
 *
 * A single character trading card, drawn as a Pixi `Container` and reusable in
 * any canvas (the pack opener's reveal, a collection grid, …). It mirrors
 * RosterCard: the character's colour is the portrait backdrop, a dark header strip
 * at the top carries the rarity badge (left) and the character name (centred), the
 * character's looping idle animation plays in the square colour area below it, with
 * the show name overlaid transparently across the top of that square and a free-text
 * location label overlaid across its bottom; a dark footer below carries its
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
	/**
	 * Horizontally mirror the idle art (and its shadow), so the character faces the
	 * opposite way. Defaults to `true` — the flipped view is the card's normal look
	 * everywhere (roster, packs, the player's board cards). Pass `false` for the
	 * original, unmirrored variant, which the board's rival cards use so the two sides
	 * face each other.
	 */
	flipped?: boolean;
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

/** Multiplier applied to the fitted idle scale so the character (and its shadow)
 * reads a little bigger than the strict fit — a deliberate 30% zoom. */
const IDLE_SCALE_BOOST = 1.3;

/**
 * The width of the MTG-style frame drawn around a card of the given content width.
 * The frame is *outset* — it extends this far beyond each edge — so a layout placing
 * several cards must reserve this much space around each one to avoid overlap.
 */
export function cardBorderWidth(cardWidth: number): number {
	return Math.max(6, Math.round(cardWidth * 0.05));
}

/** The d10 die icon (white SVG) shown after the ATK value — the same one the
 * roster/team cards use for a character's stat. Served from @3xl/assets. */
const D10_ICON_URL = '/assets/icons/skoll/d10.svg';
/** The d4 die icon (white SVG, same Skoll set as the d10) shown after the HP value. */
const D4_ICON_URL = '/assets/icons/skoll/d4.svg';

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
	// Horizontally mirror the art + shadow (default true; see CardSpriteOptions).
	private flipped: boolean;

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
		this.flipped = opts.flipped ?? true;

		const radius = Math.max(6, this.cardWidth * 0.05);
		// Top→bottom: a name header, the art, an ATK/DEF/SPD/HP footer. The coloured art
		// area is a full-width SQUARE (side = card width); only the name header and stats
		// footer take a band of their own, splitting the vertical space left over by
		// their prior ratios (name .14, stats .15 of card height; sum .29). The
		// rarity/show and location rows have no band — they are overlaid, transparently,
		// on the top and bottom of the colour square (see makeShowRow / makeMeta).
		const artSide = this.cardWidth;
		const chrome = this.cardHeight - artSide; // vertical space for the header + footer
		const headerH = Math.round(chrome * (0.14 / 0.29));
		const artY = headerH;
		const footerY = artY + artSide; // the square's bottom edge = the footer's top
		const footerH = this.cardHeight - footerY;
		this.artArea = { x: 0, y: artY, w: artSide, h: artSide };
		// The rarity/show and location rows are drawn (with no background) over the top
		// and bottom of the colour square respectively.
		const showRowH = Math.round(this.cardHeight * 0.1);
		const metaH = Math.round(this.cardHeight * 0.1);

		// Colored portrait backdrop (the character's colour). The header/footer bands are
		// a 50% black overlay on top of this, so they darken the character colour rather
		// than reading as solid black. No stroke — the rarity-coloured frame sits directly
		// against the card edge.
		const backdrop = new Graphics();
		backdrop.roundRect(0, 0, this.cardWidth, this.cardHeight, radius);
		backdrop.fill(COLOR_HEX[this.card.color] ?? 0x1f2937);
		this.addChild(backdrop);

		// Header strip at the top, carrying the character name — black at 70% opacity.
		// The rarity/show row is not part of it — it floats transparently over the
		// colour square below.
		const header = new Graphics();
		header.rect(0, 0, this.cardWidth, headerH);
		header.fill({ color: 0x000000, alpha: 0.7 });
		this.addChild(header);

		// Footer strip at the bottom, carrying the ATK/DEF/SPD/HP stats — black at 10%
		// opacity, matching the header. The location row is not part of it — it floats
		// transparently over the bottom of the colour square above.
		const footer = new Graphics();
		footer.rect(0, footerY, this.cardWidth, footerH);
		footer.fill({ color: 0x000000, alpha: 0.1 });
		this.addChild(footer);

		// The labels row (top half) and the values row (bottom half) each get their own
		// extra black band, layered on top of the shared footer band: 60% for the labels
		// row, 50% for the values row.
		const labelsBand = new Graphics();
		labelsBand.rect(0, footerY, this.cardWidth, footerH / 2);
		labelsBand.fill({ color: 0x000000, alpha: 0.6 });
		this.addChild(labelsBand);
		const valuesBand = new Graphics();
		valuesBand.rect(0, footerY + footerH / 2, this.cardWidth, footerH / 2);
		valuesBand.fill({ color: 0x000000, alpha: 0.5 });
		this.addChild(valuesBand);

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
		this.addChild(this.makeShowRow(artY, showRowH));
		this.addChild(this.makeMeta(footerY - metaH, metaH));
		this.addChild(this.makeStats(footerY, footerH));

		// Thick MTG-style frame around the whole card, in the rarity's quality colour
		// (the same colour as the rarity badge text). Outset beyond the card bounds so it
		// expands the card outward rather than eating into the content: its inner edge
		// sits on the card edge (corner radius matched) and the stroke extends outward.
		const borderColor =
			this.card.rarity != null ? (RARITY_COLOR[this.card.rarity] ?? 0xf2f2f2) : 0xf2f2f2;
		const borderWidth = cardBorderWidth(this.cardWidth);
		const border = new Graphics();
		border.roundRect(
			-borderWidth / 2,
			-borderWidth / 2,
			this.cardWidth + borderWidth,
			this.cardHeight + borderWidth,
			radius + borderWidth / 2
		);
		border.stroke({ width: borderWidth, color: borderColor, alpha: 1 });
		this.addChild(border);

		// A black overlay stroked over the frame only (same geometry and rounded corners),
		// at 30% opacity, to darken the rarity colour a touch.
		const borderOverlay = new Graphics();
		borderOverlay.roundRect(
			-borderWidth / 2,
			-borderWidth / 2,
			this.cardWidth + borderWidth,
			this.cardHeight + borderWidth,
			radius + borderWidth / 2
		);
		borderOverlay.stroke({ width: borderWidth, color: 0x000000, alpha: 0.3 });
		this.addChild(borderOverlay);

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
		// The colour field is now a full-width square, but the character keeps the size
		// it had before that change: scale it against the *pre-square* art height
		// (0.75·cardWidth, the old box) rather than the taller square, so squaring the
		// field never resizes the idle. The square is only used to centre it below.
		const boxH = this.cardWidth * 0.75 - pad * 2;

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
		// Draw the idle (and its shadow, which shares this scale) 30% larger than the
		// fitted size. Applied after the fit so every character grows by the same factor.
		this.idleFitScale = Math.min(sharedScale, heightCap, widthCap) * IDLE_SCALE_BOOST;

		// Horizontally, hug one side of the art box rather than centring: the unflipped
		// (rival) art sits against the left edge, the flipped (player) art against the
		// right, so on the board the two sides face inward. The body axis can sit
		// off-centre in the frame, and the flip mirrors each frame about that axis, so the
		// character's on-screen extent to the left/right of the axis depends on the flip.
		// Measure both (max across the whole cycle) and place the axis so the character
		// hugs the chosen edge — but only while it still fits inside the box. A boosted
		// sprite wider than the box can't hug one edge without spilling off the other, so
		// there it stays centred (overflowing evenly, never clipped hard against a side).
		const screenExtLeft =
			Math.max(...frames.map((f) => (this.flipped ? 1 - f.anchorX : f.anchorX) * f.width)) *
			this.idleFitScale;
		const screenExtRight =
			Math.max(...frames.map((f) => (this.flipped ? f.anchorX : 1 - f.anchorX) * f.width)) *
			this.idleFitScale;
		const axisMin = this.artArea.x + pad + screenExtLeft;
		const axisMax = this.artArea.x + this.artArea.w - pad - screenExtRight;
		this.idleCenterX =
			axisMin <= axisMax ? (this.flipped ? axisMax : axisMin) : (axisMin + axisMax) / 2;
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

		// Body axis horizontally (stable pivot across frames), feet at the bottom. A
		// negative x-scale mirrors the frame around that axis, so the character faces the
		// other way without drifting off its centre.
		const scaleX = this.flipped ? -this.idleFitScale : this.idleFitScale;
		this.artSprite.texture = frame.texture;
		this.artSprite.anchor.set(frame.anchorX, 1);
		this.artSprite.scale.set(scaleX, this.idleFitScale);
		this.artSprite.position.set(this.idleCenterX, this.idleFeetY);

		// The silhouette mirrors the art, offset down and *behind* it — to the bottom-left
		// unflipped, flipping to the bottom-right so the shadow always trails the side the
		// character faces away from.
		const dx = this.cardWidth * SHADOW_OFFSET_X_RATIO * (this.flipped ? -1 : 1);
		const dy = this.cardWidth * SHADOW_OFFSET_Y_RATIO;
		this.shadowSprite.texture = frame.texture;
		this.shadowSprite.anchor.set(frame.anchorX, 1);
		this.shadowSprite.scale.set(scaleX, this.idleFitScale);
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
		// Hug the same side as the idle art (left unflipped, right flipped) while it fits,
		// else centre it — mirroring the idle placement. The face is symmetric, so its
		// half-width is the extent on each side.
		const axisMin = this.artArea.x + pad + w / 2;
		const axisMax = this.artArea.x + this.artArea.w - pad - w / 2;
		const centerX =
			axisMin <= axisMax ? (this.flipped ? axisMax : axisMin) : (axisMin + axisMax) / 2;
		const y = this.artArea.y + (this.artArea.h - h) / 2;
		// Anchor on the horizontal centre (top edge) so a negative x-scale mirrors the
		// face in place, matching the flipped idle animation.
		const scaleX = this.flipped ? -scale : scale;
		this.artSprite.anchor.set(0.5, 0);
		this.artSprite.scale.set(scaleX, scale);
		this.artSprite.position.set(centerX, y);

		// The silhouette mirrors the face, offset down and behind — bottom-left unflipped,
		// bottom-right when flipped (matching the idle shadow).
		const dx = this.cardWidth * SHADOW_OFFSET_X_RATIO * (this.flipped ? -1 : 1);
		const dy = this.cardWidth * SHADOW_OFFSET_Y_RATIO;
		this.shadowSprite.texture = tex;
		this.shadowSprite.anchor.set(0.5, 0);
		this.shadowSprite.scale.set(scaleX, scale);
		this.shadowSprite.position.set(centerX + dx, y + dy);
	}

	/**
	 * The top title strip: the character name, centred. (The rarity badge no longer
	 * shares this row — the rarity now reads from the card's coloured frame.)
	 */
	private makeHeader(headerH: number): Container {
		const group = new Container();
		const centerY = headerH / 2;
		const nameSize = Math.max(9, Math.round(this.cardWidth * 0.072));

		const name = new Text({
			text: this.card.label,
			style: {
				fontFamily: 'sans-serif',
				fontSize: nameSize,
				fontWeight: '700',
				fill: 0xf2f2f2,
				align: 'center',
				wordWrap: true,
				wordWrapWidth: this.cardWidth * 0.9
			}
		});
		name.anchor.set(0.5, 0.5);
		name.position.set(this.cardWidth / 2, centerY);
		group.addChild(name);

		return group;
	}

	/**
	 * The row overlaid (with no background) on the top of the colour square: the show
	 * name centred. The show name is truncated to the row width. `topY` is the top edge
	 * of the colour square.
	 */
	private makeShowRow(topY: number, showRowH: number): Container {
		const group = new Container();
		const centerY = topY + showRowH / 2;

		// Show name, centred, truncated to the row width.
		if (this.card.showName) {
			const show = new Text({
				text: this.card.showName,
				style: {
					fontFamily: 'sans-serif',
					fontSize: Math.max(8, Math.round(this.cardWidth * 0.06)),
					fontWeight: '600',
					// Solid white with a black outline so it reads over the colour square.
					fill: 0xffffff,
					stroke: { color: 0x000000, width: Math.max(2, Math.round(this.cardWidth * 0.012)) }
				}
			});
			show.alpha = 1;
			this.ellipsize(show, this.card.showName, this.cardWidth * 0.9);
			show.anchor.set(0.5, 0.5);
			show.position.set(this.cardWidth / 2, centerY);
			group.addChild(show);
		}

		return group;
	}

	/**
	 * The location row overlaid (with no background) on the bottom of the colour
	 * square: the location label, with the spawn year as a two-digit suffix (e.g.
	 * `Barcelona '25`), centred in the row. Omitted when the card carries neither a
	 * location nor a spawn date. `metaY` is the top of the row (its bottom sits on the
	 * square's bottom edge).
	 */
	private makeMeta(metaY: number, metaH: number): Container {
		const group = new Container();
		const centerY = metaY + metaH / 2;
		const fontSize = Math.max(8, Math.round(this.cardWidth * 0.06));

		// Join the location and the two-digit spawn year into one label, centred in the
		// row and truncated to most of its width. Solid white with a black outline (like
		// the show name) so it reads over the colour square it sits on.
		const label = [this.card.locationName, spawnYearLabel(this.card.spawnedAt)]
			.filter(Boolean)
			.join(' ');
		if (label) {
			const loc = new Text({
				text: label,
				style: {
					fontFamily: 'sans-serif',
					fontSize,
					fontWeight: '600',
					fill: 0xffffff,
					stroke: { color: 0x000000, width: Math.max(2, Math.round(this.cardWidth * 0.012)) }
				}
			});
			loc.alpha = 1;
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
	 * The footer stat row: the four combat attributes the board fields — SPD, ATK, DEF
	 * and HP (SPD leads the row) — each a value under a small caption. (The rarity badge
	 * now lives in the show row under the name, not here.) The four sit in four
	 * evenly-spaced columns across the width; every caption is a small text label ('SPD',
	 * 'ATK', …). The ATK value trails a d10 die icon and HP a d4 (both the shared Skoll
	 * set, as on the roster/team cards), the DEF value trails a '+' sign, and SPD carries
	 * no suffix.
	 */
	private makeStats(footerY: number, footerH: number): Container {
		const group = new Container();
		// Two even rows: the labels centred in the top half, the values in the bottom.
		const captionY = footerY + footerH * 0.25;
		const valueY = footerY + footerH * 0.75;
		const captionSize = Math.max(7, Math.round(this.cardWidth * 0.05));
		const valueSize = Math.max(11, Math.round(this.cardWidth * 0.09));
		// The labels row (captions) sits at 95% opacity; the values row is fully opaque.
		const captionAlpha = 0.95;
		const valueAlpha = 1;

		// Cell centres: four evenly-spaced columns (each column's midpoint), so the
		// stats read as a 4-up row rather than the old 5-up layout that reserved the
		// middle for the rarity badge. SPD leads the row, then ATK, DEF, HP.
		const cells: { x: number; label: string; value: number; icon?: string; suffix?: string }[] = [
			{ x: this.cardWidth * 0.125, label: 'SPD', value: this.card.spd },
			{ x: this.cardWidth * 0.375, label: 'ATK', value: this.card.atk, icon: D10_ICON_URL },
			{ x: this.cardWidth * 0.625, label: 'DEF', value: this.card.def, suffix: '+' },
			{ x: this.cardWidth * 0.875, label: 'HP', value: this.card.hp, icon: D4_ICON_URL }
		];

		const gap = Math.max(2, Math.round(this.cardWidth * 0.02));

		for (const cell of cells) {
			const caption = new Text({
				text: cell.label,
				style: {
					fontFamily: 'sans-serif',
					fontSize: captionSize,
					fontWeight: '700',
					fill: 0xffffff
				}
			});
			caption.anchor.set(0.5, 0.5);
			caption.position.set(cell.x, captionY);
			caption.alpha = captionAlpha;
			group.addChild(caption);

			const value = new Text({
				text: `${cell.value}${cell.suffix ?? ''}`,
				style: { fontFamily: 'sans-serif', fontSize: valueSize, fontWeight: '700', fill: 0xffffff }
			});
			value.anchor.set(0.5, 0.5);
			value.position.set(cell.x, valueY);
			value.alpha = valueAlpha;
			group.addChild(value);

			if (cell.icon) {
				// The die icon loads async; it trails the number, the number+icon pair
				// re-centred on the column once it's ready.
				void textureCache.icon(cell.icon).then((tex) => {
					if (this.destroyed || group.destroyed || !tex) return;
					const iconH = valueSize;
					const iconW = tex.width * (iconH / tex.height);
					const total = value.width + gap + iconW;
					// Left-align the number, then hang the icon off its right edge, so the
					// combined pair stays centred on the column.
					value.anchor.set(0, 0.5);
					value.position.set(cell.x - total / 2, valueY);
					const icon = new Sprite(tex);
					icon.anchor.set(0, 0.5);
					icon.scale.set(iconH / tex.height);
					icon.position.set(cell.x - total / 2 + value.width + gap, valueY);
					icon.alpha = valueAlpha;
					group.addChild(icon);
				});
			}
		}

		return group;
	}
}
