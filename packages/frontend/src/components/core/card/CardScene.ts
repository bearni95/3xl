/**
 * CardScene
 *
 * A reusable Pixi canvas that draws one or more {@link CardSprite}s and nothing
 * else — no pack, no cut, no reveal animation. It owns its own `Application`,
 * mounts the canvas into a host element, keeps the looping idle animations
 * running, and re-lays-out on resize.
 *
 * Two layouts:
 *  - `'fit'` (default) — a single card is centred; several pack into a grid
 *    (`columns` wide) scaled to fit the whole canvas. Static, no navigation.
 *  - `'grid'` — cards are laid out at a natural, responsive size (1/2/3 columns
 *    by container width, mirroring the old DOM roster grid) into a world that can
 *    be larger than the canvas. With `pannable`, the world can be dragged and
 *    zoomed like a map (drag to pan, wheel/pinch to zoom about the cursor).
 *
 * This is the drop-in primitive for rendering character cards anywhere — the pack
 * opener uses {@link ClaimPackScene} for its bespoke reveal choreography, but any
 * other surface (the roster grid, a profile, a preview) should reach for this.
 *
 * No Svelte interop — inputs come through the constructor; the hosting component
 * (`CardCanvas.svelte`) creates and destroys it.
 */

import { Application, Container } from 'pixi.js';
import { CardSprite } from './CardSprite';
import type { CardModel } from './card-model.type';

const CARD_ASPECT = 2 / 3; // portrait trading card (width / height)
const GRID_GAP = 12; // px between cards in a fit-layout grid
// Fraction of the canvas the fit-layout grid is allowed to fill.
const FILL = 0.92;

// --- Grid (map) layout constants -------------------------------------------
// Gap and outer padding of the navigable grid, matching the old DOM grid's
// `gap-4` (16px). Cards are sized to fill the container width at these columns.
const NAV_GAP = 16;
const NAV_PAD = 16;
// Zoom bounds and per-notch wheel step. The lower bound is further clamped so a
// fully zoomed-out view can always frame the whole grid.
const MAX_SCALE = 3;
const MIN_SCALE = 0.15;
const WHEEL_STEP = 1.12;
// How far a pointer may travel between down and up and still count as a tap
// (rather than a pan), in screen pixels.
const TAP_SLOP = 6;
// A little overscroll past the grid edges, so panning feels springy, not walled.
const PAN_MARGIN = 48;

export type CardLayout = 'fit' | 'grid';

export interface CardSceneOptions {
	/** The card(s) to draw. */
	cards: CardModel[];
	/** Max cards per row in `'fit'` layout (default 3). Ignored in `'grid'`. */
	columns?: number;
	/**
	 * Optional per-card tap handler, firing with the tapped card's index into
	 * `cards`. In `'grid'` layout a tap is distinguished from a pan by movement.
	 * Omit for a display-only canvas.
	 */
	onCardTap?: (index: number) => void;
	/** Layout mode (default `'fit'`). */
	layout?: CardLayout;
	/** Enable map-style pan/zoom navigation (only meaningful in `'grid'`). */
	pannable?: boolean;
}

export class CardScene {
	readonly app: Application;
	private host: HTMLElement;
	private cards: CardModel[];
	private columns: number;
	private onCardTap?: (index: number) => void;
	private layout: CardLayout;
	private pannable: boolean;

	private cardLayer: Container;
	private cardSprites: CardSprite[] = [];

	private isDestroyed = false;
	// True once the Pixi app is initialised and the canvas is mounted, so that
	// `setCards` calls arriving before init completes just stage the new cards
	// (init builds them) rather than rendering against an uninitialised app.
	private ready = false;
	private resizeObserver: ResizeObserver | null = null;
	// Last built canvas size, so a resize that doesn't change dimensions is a no-op.
	private builtW = 0;
	private builtH = 0;

	// --- Grid layout + navigation state ---
	// Current world→screen transform of the card layer: screen = world * scale + pan.
	private pan = { x: 0, y: 0 };
	private scale = 1;
	private minScale = MIN_SCALE;
	// Baked grid geometry (world units), recomputed each (re)build.
	private grid = { cols: 1, cardW: 0, cardH: 0, contentW: 0, contentH: 0 };
	// Whether the initial view has been framed (so a resize keeps the user's zoom).
	private framed = false;

	// Active pointers (by id) for drag/pinch, plus the in-flight gesture state.
	private pointers = new Map<number, { x: number; y: number }>();
	private dragging = false;
	private dragMoved = false;
	private dragStart = { x: 0, y: 0 };
	private panStart = { x: 0, y: 0 };
	private downCardIndex: number | null = null;
	private pinchStartDist = 0;

	constructor(host: HTMLElement, options: CardSceneOptions) {
		this.host = host;
		this.cards = options.cards;
		this.columns = Math.max(1, options.columns ?? 3);
		this.onCardTap = options.onCardTap;
		this.layout = options.layout ?? 'fit';
		this.pannable = Boolean(options.pannable) && this.layout === 'grid';
		this.app = new Application();
		this.cardLayer = new Container();
		void this.init();
	}

	/**
	 * Replace the drawn cards (and optionally the fit-layout column count) and
	 * rebuild. Cards often arrive asynchronously after the host mounts (a roster
	 * loads its spawns), so the hosting component calls this reactively; before init
	 * completes it only stages the cards for the initial build.
	 */
	setCards(cards: CardModel[], columns?: number): void {
		this.cards = cards;
		if (columns != null) this.columns = Math.max(1, columns);
		if (!this.ready || this.isDestroyed) return;
		const { width, height } = this.measure();
		this.build(width, height);
	}

	destroy(): void {
		this.isDestroyed = true;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.detachNavigation();
		this.cardSprites = [];
		this.app.destroy(true, { children: true, texture: false });
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
			this.app.destroy(true, { children: true, texture: false });
			return;
		}

		this.host.appendChild(this.app.canvas);
		this.app.stage.addChild(this.cardLayer);
		this.ready = true;
		if (this.pannable) this.attachNavigation();

		this.build(width, height);

		this.resizeObserver = new ResizeObserver(() => this.handleResize());
		this.resizeObserver.observe(this.host);
	}

	private measure(): { width: number; height: number } {
		const rect = this.host.getBoundingClientRect();
		const width = Math.max(120, Math.floor(rect.width || 320));
		const height = Math.max(120, Math.floor(rect.height || 320));
		return { width, height };
	}

	private build(width: number, height: number): void {
		for (const sprite of this.cardSprites) sprite.destroy();
		this.cardSprites = [];
		this.builtW = width;
		this.builtH = height;
		if (this.layout === 'grid') this.buildGrid(width, height);
		else this.buildFit(width, height);
	}

	/**
	 * Fit layout: one card centred, several packed into a `columns`-wide grid, the
	 * whole thing scaled to sit inside the canvas. The card layer carries no
	 * transform — sprites are positioned in screen space directly.
	 */
	private buildFit(width: number, height: number): void {
		this.cardLayer.position.set(0, 0);
		this.cardLayer.scale.set(1);
		if (this.cards.length === 0) return;

		const { cols, rows } = this.gridDims(this.cards.length);
		const { cardW, cardH } = this.cardSize(width, height, cols, rows);
		const cellW = cardW + GRID_GAP;
		const cellH = cardH + GRID_GAP;
		const totalH = rows * cardH + (rows - 1) * GRID_GAP;
		const firstRowY = height / 2 - totalH / 2 + cardH / 2;

		for (let i = 0; i < this.cards.length; i++) {
			const row = Math.floor(i / cols);
			const col = i % cols;
			const cardsInRow = Math.min(cols, this.cards.length - row * cols);
			const rowWidth = cardsInRow * cardW + (cardsInRow - 1) * GRID_GAP;
			const rowStartX = width / 2 - rowWidth / 2 + cardW / 2;

			const sprite = this.makeSprite(i, cardW, cardH);
			sprite.pivot.set(cardW / 2, cardH / 2);
			sprite.position.set(rowStartX + col * cellW, firstRowY + row * cellH);
			// Display-only fit canvases still support a simple per-sprite tap (no pan
			// to disambiguate against); grid layout does its own tap-vs-pan handling.
			if (this.onCardTap && !this.pannable) {
				const index = i;
				sprite.eventMode = 'static';
				sprite.cursor = 'pointer';
				sprite.on('pointertap', () => this.onCardTap?.(index));
			}
		}
	}

	/**
	 * Grid (map) layout: cards at a natural, responsive size laid out top-to-bottom
	 * into a world that can exceed the canvas. The card layer is then translated and
	 * scaled to navigate it. Columns follow the old DOM roster grid's breakpoints
	 * (1 / 2 / 3 by container width). Cards are placed in world space (pivot at their
	 * top-left); pan/zoom lives entirely in the layer transform, so neither panning
	 * nor zooming rebuilds a sprite — the idle animations never restart.
	 */
	private buildGrid(width: number, height: number): void {
		if (this.cards.length === 0) {
			this.grid = { cols: 1, cardW: 0, cardH: 0, contentW: 0, contentH: 0 };
			return;
		}

		const cols = this.responsiveColumns();
		const availW = Math.max(1, width - NAV_PAD * 2);
		const cardW = Math.max(80, (availW - NAV_GAP * (cols - 1)) / cols);
		const cardH = cardW / CARD_ASPECT;
		const rows = Math.ceil(this.cards.length / cols);
		const contentW = NAV_PAD * 2 + cols * cardW + (cols - 1) * NAV_GAP;
		const contentH = NAV_PAD * 2 + rows * cardH + (rows - 1) * NAV_GAP;
		this.grid = { cols, cardW, cardH, contentW, contentH };

		for (let i = 0; i < this.cards.length; i++) {
			const row = Math.floor(i / cols);
			const col = i % cols;
			const sprite = this.makeSprite(i, cardW, cardH);
			sprite.position.set(NAV_PAD + col * (cardW + NAV_GAP), NAV_PAD + row * (cardH + NAV_GAP));
		}

		// The smallest zoom is whatever frames the whole grid (never above 1:1), so
		// you can always pull back to see everything.
		const fitAll = Math.min(width / contentW, height / contentH);
		this.minScale = Math.max(MIN_SCALE, Math.min(1, fitAll));

		if (!this.framed) {
			// First view: 1:1 from the top-left, so cards open at their natural size.
			this.scale = Math.min(1, Math.max(this.minScale, fitAll >= 1 ? 1 : fitAll));
			this.pan = { x: 0, y: 0 };
			this.framed = true;
		} else {
			this.scale = this.clamp(this.scale, this.minScale, MAX_SCALE);
		}
		this.clampPan();
		this.applyTransform();
	}

	/** Build one card sprite, add it to the layer, and track it. */
	private makeSprite(index: number, cardW: number, cardH: number): CardSprite {
		const sprite = new CardSprite({
			card: this.cards[index],
			width: cardW,
			height: cardH,
			app: this.app
		});
		this.cardLayer.addChild(sprite);
		this.cardSprites.push(sprite);
		return sprite;
	}

	/**
	 * Column count mirroring the old `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`
	 * roster grid. Tailwind's responsive prefixes key off the *viewport* width, not
	 * the element's, so this reads `window.innerWidth` (the canvas container is
	 * narrower — it shares its row with the team-panel aside — and keying off it
	 * would drop to 2 columns on an xl screen). Cards are still *sized* to the
	 * container width; only the column count follows the viewport breakpoints.
	 */
	private responsiveColumns(): number {
		const vw = typeof window !== 'undefined' ? window.innerWidth : this.builtW;
		if (vw >= 1280) return 3;
		if (vw >= 640) return 2;
		return 1;
	}

	private gridDims(n: number): { cols: number; rows: number } {
		const cols = Math.min(this.columns, Math.max(1, n));
		const rows = Math.ceil(n / cols);
		return { cols, rows };
	}

	private cardSize(w: number, h: number, cols: number, rows: number): { cardW: number; cardH: number } {
		const availW = w * FILL;
		const availH = h * FILL;
		const maxCardW = (availW - GRID_GAP * (cols - 1)) / cols;
		const maxCardH = (availH - GRID_GAP * (rows - 1)) / rows;
		const cardWFromH = maxCardH * CARD_ASPECT;
		if (cardWFromH <= maxCardW) return { cardW: cardWFromH, cardH: maxCardH };
		return { cardW: maxCardW, cardH: maxCardW / CARD_ASPECT };
	}

	private handleResize(): void {
		if (this.isDestroyed) return;
		const { width, height } = this.measure();
		if (width === this.builtW && height === this.builtH) return;
		this.app.renderer.resize(width, height);
		this.build(width, height);
	}

	// --- Navigation -----------------------------------------------------------

	private applyTransform(): void {
		this.cardLayer.position.set(this.pan.x, this.pan.y);
		this.cardLayer.scale.set(this.scale);
	}

	private clamp(v: number, lo: number, hi: number): number {
		return Math.min(hi, Math.max(lo, v));
	}

	/**
	 * Keep the grid within the canvas (plus a little overscroll margin): when the
	 * scaled content is larger than the canvas on an axis it may be dragged until an
	 * edge reaches the opposite side; when it's smaller it's centred.
	 */
	private clampPan(): void {
		this.pan.x = this.clampAxis(this.pan.x, this.grid.contentW * this.scale, this.builtW);
		this.pan.y = this.clampAxis(this.pan.y, this.grid.contentH * this.scale, this.builtH);
	}

	private clampAxis(pan: number, content: number, viewport: number): number {
		if (content <= viewport) return (viewport - content) / 2; // centre when it fits
		return this.clamp(pan, viewport - content - PAN_MARGIN, PAN_MARGIN);
	}

	/** Zoom about a screen point, keeping the world point under it fixed. */
	private zoomAt(sx: number, sy: number, factor: number): void {
		const next = this.clamp(this.scale * factor, this.minScale, MAX_SCALE);
		if (next === this.scale) return;
		const worldX = (sx - this.pan.x) / this.scale;
		const worldY = (sy - this.pan.y) / this.scale;
		this.scale = next;
		this.pan.x = sx - worldX * next;
		this.pan.y = sy - worldY * next;
		this.clampPan();
		this.applyTransform();
	}

	/** Screen point → the index of the card under it, or null if over a gap/empty. */
	private cardIndexAt(sx: number, sy: number): number | null {
		const { cols, cardW, cardH } = this.grid;
		if (cardW === 0) return null;
		const worldX = (sx - this.pan.x) / this.scale;
		const worldY = (sy - this.pan.y) / this.scale;
		const col = Math.floor((worldX - NAV_PAD) / (cardW + NAV_GAP));
		const row = Math.floor((worldY - NAV_PAD) / (cardH + NAV_GAP));
		if (col < 0 || col >= cols || row < 0) return null;
		// Reject points that land in the gutter between cards.
		const localX = worldX - NAV_PAD - col * (cardW + NAV_GAP);
		const localY = worldY - NAV_PAD - row * (cardH + NAV_GAP);
		if (localX > cardW || localY > cardH) return null;
		const index = row * cols + col;
		return index >= 0 && index < this.cards.length ? index : null;
	}

	private localPoint(event: PointerEvent | WheelEvent): { x: number; y: number } {
		const rect = this.app.canvas.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	private attachNavigation(): void {
		const canvas = this.app.canvas;
		canvas.style.touchAction = 'none';
		canvas.style.cursor = 'grab';
		canvas.addEventListener('wheel', this.onWheel, { passive: false });
		canvas.addEventListener('pointerdown', this.onPointerDown);
		canvas.addEventListener('pointermove', this.onPointerMove);
		canvas.addEventListener('pointerup', this.onPointerUp);
		canvas.addEventListener('pointercancel', this.onPointerUp);
		canvas.addEventListener('pointerleave', this.onPointerUp);
	}

	private detachNavigation(): void {
		const canvas = this.app.canvas;
		if (!canvas) return;
		canvas.removeEventListener('wheel', this.onWheel);
		canvas.removeEventListener('pointerdown', this.onPointerDown);
		canvas.removeEventListener('pointermove', this.onPointerMove);
		canvas.removeEventListener('pointerup', this.onPointerUp);
		canvas.removeEventListener('pointercancel', this.onPointerUp);
		canvas.removeEventListener('pointerleave', this.onPointerUp);
	}

	private onWheel = (event: WheelEvent): void => {
		event.preventDefault();
		const { x, y } = this.localPoint(event);
		this.zoomAt(x, y, event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP);
	};

	private onPointerDown = (event: PointerEvent): void => {
		const { x, y } = this.localPoint(event);
		this.pointers.set(event.pointerId, { x, y });
		try {
			this.app.canvas.setPointerCapture(event.pointerId);
		} catch {
			// Capture is best-effort; navigation still works without it.
		}
		if (this.pointers.size === 1) {
			this.dragging = true;
			this.dragMoved = false;
			this.dragStart = { x, y };
			this.panStart = { ...this.pan };
			this.downCardIndex = this.cardIndexAt(x, y);
			this.app.canvas.style.cursor = 'grabbing';
		} else if (this.pointers.size === 2) {
			// A second finger starts a pinch; the drag/tap in progress is abandoned.
			this.dragging = false;
			this.dragMoved = true;
			this.pinchStartDist = this.pointerDistance();
		}
	};

	private onPointerMove = (event: PointerEvent): void => {
		if (!this.pointers.has(event.pointerId)) return;
		const { x, y } = this.localPoint(event);
		this.pointers.set(event.pointerId, { x, y });

		if (this.pointers.size >= 2) {
			this.handlePinch();
			return;
		}
		if (!this.dragging) return;
		const dx = x - this.dragStart.x;
		const dy = y - this.dragStart.y;
		if (Math.hypot(dx, dy) > TAP_SLOP) this.dragMoved = true;
		this.pan.x = this.panStart.x + dx;
		this.pan.y = this.panStart.y + dy;
		this.clampPan();
		this.applyTransform();
	};

	private onPointerUp = (event: PointerEvent): void => {
		if (!this.pointers.has(event.pointerId)) return;
		this.pointers.delete(event.pointerId);
		try {
			this.app.canvas.releasePointerCapture(event.pointerId);
		} catch {
			// ignore — capture may already be gone
		}

		if (this.pointers.size === 0) {
			// A clean tap (no meaningful movement) on a card selects it.
			if (this.dragging && !this.dragMoved && this.downCardIndex != null) {
				this.onCardTap?.(this.downCardIndex);
			}
			this.dragging = false;
			this.downCardIndex = null;
			this.app.canvas.style.cursor = 'grab';
		} else if (this.pointers.size === 1) {
			// Dropped from a pinch back to one finger — resume panning from where the
			// remaining finger now is, without counting it as a tap.
			const remaining = this.pointers.values().next().value;
			if (remaining) {
				this.dragging = true;
				this.dragMoved = true;
				this.dragStart = { ...remaining };
				this.panStart = { ...this.pan };
			}
		}
	};

	private pointerDistance(): number {
		const pts = [...this.pointers.values()];
		if (pts.length < 2) return 0;
		return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
	}

	private handlePinch(): void {
		const pts = [...this.pointers.values()];
		if (pts.length < 2 || this.pinchStartDist === 0) return;
		const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
		const midX = (pts[0].x + pts[1].x) / 2;
		const midY = (pts[0].y + pts[1].y) / 2;
		this.zoomAt(midX, midY, dist / this.pinchStartDist);
		this.pinchStartDist = dist;
	}
}
