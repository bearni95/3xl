/**
 * ClaimPackScene
 *
 * Owns the Pixi application for the pack-opening experience.
 *
 * Flow:
 *  - load → renders the pack (show poster cover), listens for a click on it
 *  - click → flashes a slash, splits the pack at the click Y into two halves
 *  - the booster is rolled against Supabase (the `claim` callback) and the reveal
 *    cards are built behind the still-closed pack — we wait until their art has
 *    loaded, so a slow network can't slide the pack open onto empty space
 *  - only once the cards are ready: the top half flies up off-screen and the
 *    bottom half flies down (both rotating), while the cards pop in at the cut
 *  - the claimed character card(s) then fan into a grid
 *
 * The scene exposes no Svelte interop — inputs come through the constructor,
 * outputs go through the callbacks. The hosting component creates/destroys it.
 *
 * Ported from the yugioh-duel-sim booster opener; the pack cover is a show
 * poster and the revealed cards are claimed characters.
 */

import {
	Application,
	Container,
	Graphics,
	Sprite,
	type FederatedPointerEvent
} from 'pixi.js';
import { PackSprite } from './PackSprite';
import { destroyPixiApp } from '$utils/pixi/release-context';
import { CardSprite, cardBorderWidth } from '$utils/card/CardSprite';
import type { ClaimPull } from './pull.type';

export interface ClaimPackSceneCallbacks {
	/** Fires once the pack is open and its cards have fanned out, with how many were
	 * revealed — zero when the roll was refused, which a host may want to explain. */
	onOpenComplete?: (revealed: number) => void;
	onCardClick?: (pull: ClaimPull, index: number) => void;
	/**
	 * Fires when the canvas lost its GPU context and the browser did not hand one back.
	 * The renderer never draws again after that, so the host must rebuild the scene.
	 */
	onContextLost?: () => void;
}

export interface ClaimPackInput {
	/** Show poster URL used as the pack cover, or null for a plain frame. */
	coverUrl: string | null;
	/** Full name of the place the pack belongs to, overlaid on the poster's top. */
	locationName: string | null;
}

/**
 * Rolls the booster against Supabase and resolves the cards to reveal. Invoked
 * once, when the player slices the pack open — so the spawn is persisted at open
 * time. A rejection or empty result simply reveals no cards.
 */
export type ClaimBooster = () => Promise<ClaimPull[]>;

type SceneState =
	| 'loading'
	| 'idle'
	| 'cutting'
	| 'revealing'
	| 'fanned'
	| 'focused'
	| 'unfocusing';

// How long to wait for the browser to restore a lost GPU context before giving up on
// it and asking the host to rebuild the scene.
const CONTEXT_RESTORE_GRACE = 1200;
const PACK_ASPECT = 5 / 8; // width / height (portrait)
const CARD_ASPECT = 2 / 3; // portrait trading card

export class ClaimPackScene {
	readonly app: Application;
	private host: HTMLElement;
	private callbacks: ClaimPackSceneCallbacks;
	private input: ClaimPackInput;
	private claim: ClaimBooster;
	// The cards this open revealed — empty until the pack is cut and `claim` resolves.
	private pulls: ClaimPull[] = [];

	private rootLayer: Container;
	private cardLayer: Container;
	private packLayer: Container;
	private uiLayer: Container;
	private cutIndicator: Graphics;

	private packSprite: PackSprite | null = null;
	private topHalf: Sprite | null = null;
	private bottomHalf: Sprite | null = null;
	private cardSprites: CardSprite[] = [];
	// The 2-column grid slots the revealed cards rest in (their fanned targets), kept
	// so a focused card can animate back to its own slot. The base card size (scale 1)
	// sets how far a focused card zooms up to fill the width.
	private cardTargets: Array<{ x: number; y: number; rotation: number; scale: number }> = [];
	private cardBaseSize = { cardW: 0, cardH: 0 };
	// The card currently lifted to full width above the others on tap, and its grid
	// index — or null/-1 when the reveal is resting in its 2-column grid.
	private focusedCard: CardSprite | null = null;
	private focusedIndex = -1;

	private state: SceneState = 'loading';
	private isDestroyed = false;
	// True between losing the GPU context and getting one back.
	private contextLost = false;
	private resizeObserver: ResizeObserver | null = null;
	// Current cut Y in pack-local coordinates (0 = top edge of pack).
	private cutY: number = 0;

	constructor(
		host: HTMLElement,
		input: ClaimPackInput,
		claim: ClaimBooster,
		callbacks: ClaimPackSceneCallbacks = {}
	) {
		this.host = host;
		this.callbacks = callbacks;
		this.input = input;
		this.claim = claim;
		this.app = new Application();

		this.rootLayer = new Container();
		this.cardLayer = new Container();
		this.packLayer = new Container();
		this.uiLayer = new Container();
		this.cutIndicator = new Graphics();

		void this.init();
	}

	destroy(): void {
		this.isDestroyed = true;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.detachContextGuards();
		try {
			this.app.stage.off('pointermove', this.onPointerMove);
			this.app.stage.off('pointerdown', this.onPointerDown);
			this.app.stage.off('pointerleave', this.onPointerLeave);
		} catch {
			// stage may already be torn down
		}

		// The halves reference the pack's render-texture source, so destroy them
		// before the pack.
		this.topHalf?.destroy();
		this.bottomHalf?.destroy();
		this.topHalf = null;
		this.bottomHalf = null;

		this.packSprite?.destroy();
		this.packSprite = null;

		this.cardSprites = [];
		destroyPixiApp(this.app, { children: true, texture: false });
	}

	private async init(): Promise<void> {
		const { width, height } = this.measure();
		await this.app.init({
			width,
			height,
			backgroundAlpha: 0,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true
		});

		if (this.isDestroyed) {
			destroyPixiApp(this.app, { children: true, texture: false });
			return;
		}

		this.host.appendChild(this.app.canvas);
		this.app.canvas.style.touchAction = 'none';
		this.attachContextGuards();

		this.app.stage.addChild(this.rootLayer);
		this.rootLayer.addChild(this.cardLayer);
		this.rootLayer.addChild(this.packLayer);
		this.rootLayer.addChild(this.uiLayer);
		this.uiLayer.addChild(this.cutIndicator);

		const { packW, packH } = this.computePackDimensions(width, height);
		this.packSprite = new PackSprite({
			coverUrl: this.input.coverUrl,
			locationName: this.input.locationName,
			app: this.app,
			width: packW,
			height: packH
		});
		await this.packSprite.load();
		if (this.isDestroyed) return;

		this.packLayer.addChild(this.packSprite);
		this.positionPack();

		this.state = 'idle';

		// Seed the cut at the pack's centre.
		this.cutY = this.packSprite.packHeight / 2;
		this.redrawCutAtLocal(this.cutY);

		this.app.stage.eventMode = 'static';
		this.app.stage.hitArea = this.app.screen;
		this.app.stage.on('pointermove', this.onPointerMove);
		this.app.stage.on('pointerdown', this.onPointerDown);
		this.app.stage.on('pointerleave', this.onPointerLeave);

		if (!this.resizeObserver) {
			this.resizeObserver = new ResizeObserver(() => this.handleResize());
			this.resizeObserver.observe(this.host);
		}
	}

	// --- Surviving a lost GPU context ------------------------------------------
	// The browser caps how many WebGL contexts live at once and takes them back when
	// it has to — this canvas shares a page with the map's others. Pixi frees its GPU
	// resources on the loss but its ticker keeps calling render, which then throws on a
	// half-torn-down batcher every frame and leaves the canvas blank for good. Park the
	// ticker while the context is gone; Pixi rebuilds on restore, so the scene resumes.

	private attachContextGuards(): void {
		this.app.canvas.addEventListener('webglcontextlost', this.onContextLost);
		this.app.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
	}

	private detachContextGuards(): void {
		this.app.canvas?.removeEventListener('webglcontextlost', this.onContextLost);
		this.app.canvas?.removeEventListener('webglcontextrestored', this.onContextRestored);
	}

	private onContextLost = (event: Event): void => {
		// Without preventDefault the browser never fires `webglcontextrestored`.
		event.preventDefault();
		this.contextLost = true;
		this.app.ticker?.stop();
		// If the browser doesn't hand one back, a parked ticker is just a blank canvas
		// without the error spam — so hand the problem to the host, which can rebuild.
		window.setTimeout(() => {
			if (this.isDestroyed || !this.contextLost) return;
			this.callbacks.onContextLost?.();
		}, CONTEXT_RESTORE_GRACE);
	};

	private onContextRestored = (): void => {
		if (this.isDestroyed) return;
		this.contextLost = false;
		this.app.ticker?.start();
	};

	private measure(): { width: number; height: number } {
		const rect = this.host.getBoundingClientRect();
		const width = Math.max(320, Math.floor(rect.width || 600));
		const height = Math.max(320, Math.floor(rect.height || 600));
		return { width, height };
	}

	private computePackDimensions(w: number, h: number): { packW: number; packH: number } {
		// The pack spans the canvas's full width (a small breathing margin), so it fills
		// the narrow side panel — unless that would make it taller than the canvas, in
		// which case it's capped by height instead.
		const maxW = w * 0.96;
		const maxH = h * 0.96;
		const byWidth = { packW: maxW, packH: maxW / PACK_ASPECT };
		if (byWidth.packH <= maxH) return byWidth;
		return { packW: maxH * PACK_ASPECT, packH: maxH };
	}

	private positionPack(): void {
		if (!this.packSprite) return;
		const cx = this.app.screen.width / 2;
		const cy = this.app.screen.height / 2;
		this.packSprite.position.set(
			cx - this.packSprite.packWidth / 2,
			cy - this.packSprite.packHeight / 2
		);
	}

	private packBounds(): { x: number; y: number; w: number; h: number } | null {
		if (!this.packSprite) return null;
		return {
			x: this.packSprite.x,
			y: this.packSprite.y,
			w: this.packSprite.packWidth,
			h: this.packSprite.packHeight
		};
	}

	private isInsidePack(globalX: number, globalY: number): boolean {
		const b = this.packBounds();
		if (!b) return false;
		return globalX >= b.x && globalX <= b.x + b.w && globalY >= b.y && globalY <= b.y + b.h;
	}

	private onPointerMove = (e: FederatedPointerEvent): void => {
		if (this.state !== 'idle' || !this.packSprite) return;
		const inside = this.isInsidePack(e.global.x, e.global.y);
		this.app.canvas.style.cursor = inside ? 'row-resize' : 'default';
		if (inside) {
			this.cutY = e.global.y - this.packSprite.y;
			this.drawCutIndicator(e.global.y);
		} else {
			this.redrawCutAtLocal(this.cutY);
		}
	};

	private onPointerLeave = (): void => {
		if (this.state === 'idle') this.redrawCutAtLocal(this.cutY);
		else this.cutIndicator.clear();
		this.app.canvas.style.cursor = 'default';
	};

	private onPointerDown = (e: FederatedPointerEvent): void => {
		// While a card is held full width, a click anywhere on the canvas sends it back
		// to the 2-column grid.
		if (this.state === 'focused') {
			this.unfocusCard();
			return;
		}
		if (this.state !== 'idle' || !this.packSprite) return;
		if (!this.isInsidePack(e.global.x, e.global.y)) return;
		const localY = e.global.y - this.packSprite.y;
		this.cutY = localY;
		void this.performCut(localY);
	};

	private drawCutIndicator(globalY: number): void {
		const b = this.packBounds();
		if (!b) return;
		this.cutIndicator.clear();
		this.cutIndicator.moveTo(b.x - 24, globalY);
		this.cutIndicator.lineTo(b.x + b.w + 24, globalY);
		this.cutIndicator.stroke({ width: 2, color: 0xfde047, alpha: 0.9 });
		this.cutIndicator.moveTo(b.x - 32, globalY - 7);
		this.cutIndicator.lineTo(b.x - 22, globalY);
		this.cutIndicator.lineTo(b.x - 32, globalY + 7);
		this.cutIndicator.stroke({ width: 2, color: 0xfde047, alpha: 0.9 });
	}

	private redrawCutAtLocal(localY: number): void {
		const b = this.packBounds();
		if (!b) return;
		this.drawCutIndicator(b.y + localY);
	}

	private async performCut(localY: number): Promise<void> {
		if (!this.packSprite) return;
		this.state = 'cutting';
		this.cutIndicator.clear();
		this.app.canvas.style.cursor = 'default';

		const b = this.packBounds()!;
		const globalCutY = b.y + localY;

		await this.playSlashFlash(globalCutY, b.x, b.w);
		if (this.isDestroyed || !this.packSprite) return;

		const { top, bottom } = this.packSprite.split(localY);

		// The halves share the original RenderTexture's source, so we can't
		// destroy the pack yet. Hide it; dispose after the halves are gone.
		this.packSprite.visible = false;

		this.placeHalf(top, b.x, b.y);
		this.placeHalf(bottom, b.x, b.y + localY);

		this.packLayer.addChild(top);
		this.packLayer.addChild(bottom);
		this.topHalf = top;
		this.bottomHalf = bottom;

		this.state = 'revealing';
		// Roll the booster against Supabase now, while the sliced-but-closed pack
		// still covers the reveal. The spawn is persisted at open time; a failure
		// reveals no cards.
		try {
			this.pulls = await this.claim();
		} catch {
			this.pulls = [];
		}
		if (this.isDestroyed) return;

		// Build the reveal cards behind the still-closed pack and wait until their
		// art has actually loaded. This is the fix for slow networks: the pack must
		// not slide open onto empty space, so we hold the halves in place — the pack
		// simply sits cut open — until there is something rendered behind it.
		await this.prepareCards();
		if (this.isDestroyed) return;

		const screenH = this.app.screen.height;
		const screenW = this.app.screen.width;

		// Cards are ready — now slide the halves apart and pop the cards in together.
		const halvesPromise = Promise.all([
			this.flyAway(top, {
				dx: -screenW * 0.15,
				dy: -screenH * 0.9 - top.height,
				rot: -Math.PI * 0.5,
				duration: 780
			}),
			this.flyAway(bottom, {
				dx: screenW * 0.15,
				dy: screenH * 0.9 + bottom.height,
				rot: Math.PI * 0.5,
				duration: 780
			})
		]);

		await this.revealCards();

		await halvesPromise;
		if (this.isDestroyed) return;

		// Halves first — they reference the pack's render-texture source.
		this.topHalf?.destroy();
		this.bottomHalf?.destroy();
		this.topHalf = null;
		this.bottomHalf = null;

		if (this.packSprite) {
			this.packLayer.removeChild(this.packSprite);
			this.packSprite.destroy();
			this.packSprite = null;
		}

		this.state = 'fanned';
		this.callbacks.onOpenComplete?.(this.pulls.length);
	}

	private placeHalf(half: Sprite, originX: number, originY: number): void {
		const w = half.width;
		const h = half.height;
		half.pivot.set(w / 2, h / 2);
		half.position.set(originX + w / 2, originY + h / 2);
	}

	private playSlashFlash(globalY: number, packX: number, packW: number): Promise<void> {
		return new Promise((resolve) => {
			const flash = new Graphics();
			flash.moveTo(packX - 40, globalY);
			flash.lineTo(packX + packW + 40, globalY);
			flash.stroke({ width: 5, color: 0xffffff, alpha: 1 });
			this.uiLayer.addChild(flash);

			const start = performance.now();
			const duration = 180;
			const tick = () => {
				if (this.isDestroyed || flash.destroyed) {
					flash.destroy();
					resolve();
					return;
				}
				const t = Math.min(1, (performance.now() - start) / duration);
				flash.alpha = 1 - t;
				if (t < 1) {
					requestAnimationFrame(tick);
				} else {
					flash.destroy();
					resolve();
				}
			};
			requestAnimationFrame(tick);
		});
	}

	private flyAway(
		sprite: Sprite,
		opts: { dx: number; dy: number; rot: number; duration: number }
	): Promise<void> {
		return new Promise((resolve) => {
			const startX = sprite.position.x;
			const startY = sprite.position.y;
			const startRot = sprite.rotation;
			const start = performance.now();
			const tick = () => {
				if (this.isDestroyed || sprite.destroyed) {
					resolve();
					return;
				}
				const t = Math.min(1, (performance.now() - start) / opts.duration);
				const e = easeInCubic(t);
				sprite.position.set(startX + opts.dx * e, startY + opts.dy * e);
				sprite.rotation = startRot + opts.rot * e;
				sprite.alpha = 1 - t * 0.3;
				if (t < 1) {
					requestAnimationFrame(tick);
				} else {
					sprite.alpha = 0;
					resolve();
				}
			};
			requestAnimationFrame(tick);
		});
	}

	/**
	 * Create the reveal cards stacked at the pack centre — behind the still-closed
	 * pack — and wait until every card's art (idle animation or face fallback) has
	 * loaded. The cards start hidden (alpha 0, shrunk), ready for {@link revealCards}
	 * to pop them in once the caller has slid the pack open. Waiting here is what
	 * keeps a slow network from opening the pack onto nothing.
	 */
	private async prepareCards(): Promise<void> {
		if (this.pulls.length === 0) return;

		const { cardW, cardH } = this.computeRevealCardSize(this.pulls.length);
		const centerX = this.app.screen.width / 2;
		const centerY = this.app.screen.height / 2;

		for (let i = 0; i < this.pulls.length; i++) {
			const pull = this.pulls[i];
			const sprite = new CardSprite({ card: pull, width: cardW, height: cardH, app: this.app });
			sprite.pivot.set(cardW / 2, cardH / 2);
			sprite.position.set(centerX + i * 0.7, centerY + i * 0.7);
			sprite.rotation = 0;
			sprite.alpha = 0;
			sprite.scale.set(0.3);
			sprite.eventMode = 'static';
			sprite.cursor = 'pointer';
			const idx = i;
			sprite.on('pointertap', () => {
				// A tap on a resting card lifts it to full width above the others; the
				// callback (when wired) still fires for any external listener.
				if (this.state === 'fanned') {
					this.callbacks.onCardClick?.(pull, idx);
					this.focusCard(idx);
				}
			});
			this.cardLayer.addChild(sprite);
			this.cardSprites.push(sprite);
		}

		// Hold until every card has something to render before the pack opens.
		await Promise.all(this.cardSprites.map((sp) => sp.whenReady()));
	}

	/**
	 * Pop the (already-prepared) cards in at the cut, then fan them into a grid.
	 * {@link prepareCards} must have run first, so the cards are loaded and staged.
	 */
	private async revealCards(): Promise<void> {
		if (this.cardSprites.length === 0) return;

		const { cardW, cardH } = this.computeRevealCardSize(this.cardSprites.length);
		const centerX = this.app.screen.width / 2;
		const centerY = this.app.screen.height / 2;

		await Promise.all(this.cardSprites.map((sp, i) => this.popIn(sp, i * 35)));
		if (this.isDestroyed) return;

		const targets = this.computeRevealTargets(centerX, centerY, cardW, cardH);
		// Remember the grid slots + base card size so tapping a card can zoom it up and
		// a canvas click can send it back to exactly where it sat.
		this.cardTargets = targets;
		this.cardBaseSize = { cardW, cardH };
		await Promise.all(
			this.cardSprites.map((sp, i) =>
				this.tweenSprite(sp, targets[i], 520, i * 55, easeOutCubic)
			)
		);
	}

	/**
	 * Lift a revealed card to full width, centred above the others. It scales up from
	 * its grid slot and is moved to the top of the card layer so it overlaps the rest;
	 * a click anywhere on the canvas ({@link onPointerDown}) sends it back.
	 */
	private focusCard(index: number): void {
		const sprite = this.cardSprites[index];
		if (!sprite) return;
		this.state = 'focused';
		this.focusedCard = sprite;
		this.focusedIndex = index;
		// Draw it above every other card.
		this.cardLayer.setChildIndex(sprite, this.cardLayer.children.length - 1);
		void this.tweenSprite(sprite, this.focusTarget(), 360, 0, easeOutCubic);
	}

	/**
	 * Send the focused card back to its grid slot, then re-arm tap-to-focus. Runs on a
	 * canvas click while a card is focused.
	 */
	private unfocusCard(): void {
		const sprite = this.focusedCard;
		const index = this.focusedIndex;
		if (!sprite || index < 0) {
			this.state = 'fanned';
			return;
		}
		// A transient state so this same click's card `pointertap` can't immediately
		// re-focus it — tap-to-focus only re-arms once the card is home in its slot.
		this.state = 'unfocusing';
		const target = this.cardTargets[index] ?? { x: sprite.x, y: sprite.y, rotation: 0, scale: 1 };
		void this.tweenSprite(sprite, target, 320, 0, easeOutCubic).then(() => {
			if (this.isDestroyed) return;
			this.focusedCard = null;
			this.focusedIndex = -1;
			this.state = 'fanned';
		});
	}

	/**
	 * The zoom target for a focused card: the canvas centre, scaled so the card (with
	 * its outset border) spans the full width — capped by height so a tall card still
	 * fits, and never shrinking below its grid size.
	 */
	private focusTarget(): { x: number; y: number; rotation: number; scale: number } {
		const { cardW, cardH } = this.cardBaseSize;
		const border = cardBorderWidth(cardW);
		const footW = cardW + 2 * border;
		const footH = cardH + 2 * border;
		const availW = this.app.screen.width * 0.92;
		const availH = this.app.screen.height * 0.92;
		const scale = Math.max(1, Math.min(availW / footW, availH / footH));
		return { x: this.app.screen.width / 2, y: this.app.screen.height / 2, rotation: 0, scale };
	}

	// The reveal fans the cards into a two-column grid.
	private static readonly REVEAL_COLS = 2;

	// The column/row split for a given pull: two columns (one when a single card is
	// pulled), rows stacking downward from there.
	private revealDims(n: number): { cols: number; rows: number } {
		const cols = Math.min(ClaimPackScene.REVEAL_COLS, Math.max(1, n));
		return { cols, rows: Math.ceil(n / cols) };
	}

	private computeRevealCardSize(n: number): { cardW: number; cardH: number } {
		const { cols, rows } = this.revealDims(n);
		const gap = 12;
		const availW = this.app.screen.width * 0.92;
		const availH = this.app.screen.height * 0.96;
		// Each card fills its column's full width; its height then follows the card
		// aspect. If that many rows would overrun the viewport, it's capped by height so
		// the whole reveal still fits. The full footprint (content + outset border on both
		// sides) must fit the slot — the border depends on the width, so converge on it.
		const colW = (availW - gap * (cols - 1)) / cols;
		const slotH = (availH - gap * (rows - 1)) / rows;
		let cardW = Math.max(1, Math.min(colW, slotH * CARD_ASPECT));
		for (let k = 0; k < 4; k++) {
			const border = cardBorderWidth(cardW);
			cardW = Math.max(1, Math.min(colW - 2 * border, (slotH - 2 * border) * CARD_ASPECT));
		}
		return { cardW, cardH: cardW / CARD_ASPECT };
	}

	private computeRevealTargets(
		centerX: number,
		centerY: number,
		cardW: number,
		cardH: number
	): Array<{ x: number; y: number; rotation: number; scale: number }> {
		const n = this.cardSprites.length;
		if (n === 0) return [];

		const { cols, rows } = this.revealDims(n);
		const gap = 12;
		// Space the card centres by each card's full footprint (content + outset border on
		// both sides) plus the gap, so neighbouring borders never overlap. A short final
		// row is centred, not left-packed.
		const border = cardBorderWidth(cardW);
		const footW = cardW + 2 * border;
		const footH = cardH + 2 * border;
		const cellW = footW + gap;
		const cellH = footH + gap;
		const totalH = rows * footH + (rows - 1) * gap;
		const firstRowY = centerY - totalH / 2 + footH / 2;

		const targets: Array<{ x: number; y: number; rotation: number; scale: number }> = [];
		for (let i = 0; i < n; i++) {
			const row = Math.floor(i / cols);
			const col = i % cols;
			const cardsInRow = Math.min(cols, n - row * cols);
			const rowWidth = cardsInRow * footW + (cardsInRow - 1) * gap;
			const rowStartX = centerX - rowWidth / 2 + footW / 2;
			targets.push({ x: rowStartX + col * cellW, y: firstRowY + row * cellH, rotation: 0, scale: 1 });
		}
		return targets;
	}

	private popIn(sprite: CardSprite, delayMs: number): Promise<void> {
		return new Promise((resolve) => {
			const startTime = performance.now() + delayMs;
			const duration = 260;
			const tick = () => {
				if (this.isDestroyed || sprite.destroyed) {
					resolve();
					return;
				}
				const now = performance.now();
				if (now < startTime) {
					requestAnimationFrame(tick);
					return;
				}
				const t = Math.min(1, (now - startTime) / duration);
				sprite.alpha = Math.min(1, t * 1.6);
				const s = 0.3 + easeOutBack(t) * 0.7;
				sprite.scale.set(s);
				if (t < 1) {
					requestAnimationFrame(tick);
				} else {
					sprite.alpha = 1;
					sprite.scale.set(1);
					resolve();
				}
			};
			requestAnimationFrame(tick);
		});
	}

	private tweenSprite(
		sprite: CardSprite,
		target: { x: number; y: number; rotation: number; scale: number },
		durationMs: number,
		delayMs: number,
		easing: (t: number) => number
	): Promise<void> {
		return new Promise((resolve) => {
			const startTime = performance.now() + delayMs;
			const startX = sprite.position.x;
			const startY = sprite.position.y;
			const startRot = sprite.rotation;
			const startScale = sprite.scale.x;
			const tick = () => {
				if (this.isDestroyed || sprite.destroyed) {
					resolve();
					return;
				}
				const now = performance.now();
				if (now < startTime) {
					requestAnimationFrame(tick);
					return;
				}
				const t = Math.min(1, (now - startTime) / durationMs);
				const e = easing(t);
				sprite.position.set(
					startX + (target.x - startX) * e,
					startY + (target.y - startY) * e
				);
				sprite.rotation = startRot + (target.rotation - startRot) * e;
				const s = startScale + (target.scale - startScale) * e;
				sprite.scale.set(s);
				if (t < 1) {
					requestAnimationFrame(tick);
				} else {
					resolve();
				}
			};
			requestAnimationFrame(tick);
		});
	}

	private handleResize(): void {
		if (this.isDestroyed) return;
		const { width, height } = this.measure();
		this.app.renderer.resize(width, height);
		if (this.state === 'idle' && this.packSprite) {
			this.positionPack();
			this.redrawCutAtLocal(this.cutY);
		}
	}
}

function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
	return t * t * t;
}

function easeOutBack(t: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
