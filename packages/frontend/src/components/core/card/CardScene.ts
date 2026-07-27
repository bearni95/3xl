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
 *  - `'grid'` — the `columns` cards per row always span the canvas width exactly
 *    (fit-to-width, so the zoom is fixed and re-fits when the column count
 *    changes), and the rows extend into a taller-than-canvas world. With
 *    `pannable` the world scrolls vertically — drag or wheel to move through the
 *    rows; there is no free zoom (the column count is the density control).
 *
 * This is the drop-in primitive for rendering character cards anywhere — the pack
 * opener uses {@link ClaimPackScene} for its bespoke reveal choreography, but any
 * other surface (the roster grid, a profile, a preview) should reach for this.
 *
 * No Svelte interop — inputs come through the constructor; the hosting component
 * (`CardCanvas.svelte`) creates and destroys it.
 */

import { Application, Container } from 'pixi.js';
import { captureGlContextDisposer } from '$utils/pixi/release-context';
import { CardSprite, cardBorderWidth } from '$utils/card/CardSprite';
import type { CardModel } from '$utils/card/card-model.type';

const CARD_ASPECT = 2 / 3; // portrait trading card (width / height)
const GRID_GAP = 12; // px between cards in a fit-layout grid
// Fraction of the canvas the fit-layout grid is allowed to fill.
const FILL = 0.92;

// --- Grid (map) layout constants -------------------------------------------
// Gap and outer padding of the navigable grid, matching the old DOM grid's
// `gap-4` (16px). Cards are sized to fill the container width at these columns.
const NAV_GAP = 16;
const NAV_PAD = 16;
// How far a pointer may travel between down and up and still count as a tap
// (rather than a pan), in screen pixels.
const TAP_SLOP = 6;
// A little overscroll past the grid edges, so panning feels springy, not walled.
const PAN_MARGIN = 48;

export type CardLayout = 'fit' | 'grid';

/**
 * Column count mirroring the old `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`
 * roster grid. Tailwind's responsive prefixes key off the *viewport* width (not
 * the element's), so callers pass `window.innerWidth`. Exposed so a host can seed
 * a column slider with the same breakpoints the DOM grid used before overriding
 * them.
 */
export function responsiveGridColumns(viewportWidth: number): number {
	if (viewportWidth >= 1280) return 3;
	if (viewportWidth >= 640) return 2;
	return 1;
}

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
	// Screen offset of the card layer: screen = world + pan. The grid is fit to the
	// canvas width (scale stays 1), so navigation is a pure vertical scroll.
	private pan = { x: 0, y: 0 };
	private scale = 1;
	// Baked grid geometry (world units), recomputed each (re)build. `border` is the
	// outset frame each card draws beyond its content; `cellW`/`cellH` are the full
	// per-card footprint (content + border on both sides) the grid tiles.
	private grid = {
		cols: 1,
		cardW: 0,
		cardH: 0,
		border: 0,
		cellW: 0,
		cellH: 0,
		contentW: 0,
		contentH: 0
	};
	// Whether the initial view has been framed (so a resize keeps the scroll offset).
	private framed = false;

	// In-flight drag gesture (a single pointer; the grid has no pinch/zoom).
	private dragPointerId: number | null = null;
	private dragMoved = false;
	private dragStart = { x: 0, y: 0 };
	private panStart = { x: 0, y: 0 };
	private downCardIndex: number | null = null;

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
		this.app.canvas?.removeEventListener('webglcontextlost', this.onContextLost);
		this.app.canvas?.removeEventListener('webglcontextrestored', this.onContextRestored);
		this.cardSprites = [];
		// Free the WebGL context immediately so navigating away doesn't leave an
		// orphaned context that later evicts a live canvas (see the helper's note).
		const disposeContext = captureGlContextDisposer(this.app);
		this.app.destroy(true, { children: true, texture: false });
		disposeContext();
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
		// If this canvas's GL context is ever lost (e.g. the browser evicts it under
		// context pressure), stop rendering so the idle ticker doesn't throw every
		// frame, then rebuild once it's restored.
		this.app.canvas.addEventListener('webglcontextlost', this.onContextLost);
		this.app.canvas.addEventListener('webglcontextrestored', this.onContextRestored);

		this.build(width, height);

		this.resizeObserver = new ResizeObserver(() => this.handleResize());
		this.resizeObserver.observe(this.host);
	}

	private onContextLost = (event: Event): void => {
		// preventDefault marks the context as restorable; without it the browser
		// won't fire `webglcontextrestored`.
		event.preventDefault();
		this.app.ticker?.stop();
	};

	private onContextRestored = (): void => {
		if (this.isDestroyed) return;
		this.app.ticker?.start();
		const { width, height } = this.measure();
		this.build(width, height);
	};

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
	 * Grid layout: the `columns` cards per row always fill the canvas width exactly
	 * (fit-to-width), so the zoom is fixed at 1:1 and simply re-fits when the slider
	 * changes the column count — a wider column count yields narrower cards, never a
	 * horizontal scroll. The rows extend downward into a taller-than-canvas world
	 * scrolled vertically. Cards are placed in world space (top-left pivot); the
	 * scroll lives entirely in the layer's position, so scrolling never rebuilds a
	 * sprite and the idle animations never restart.
	 */
	private buildGrid(width: number, height: number): void {
		if (this.cards.length === 0) {
			this.grid = { cols: 1, cardW: 0, cardH: 0, border: 0, cellW: 0, cellH: 0, contentW: 0, contentH: 0 };
			return;
		}

		// Columns are driven explicitly by the host (a slider, seeded with
		// `responsiveGridColumns`); cards are sized so the whole row spans the canvas
		// width, dynamically adapting as the slider changes the count.
		const cols = Math.max(1, this.columns);
		const availW = Math.max(1, width - NAV_PAD * 2);
		// Each card's full footprint (its content plus the outset border on both sides)
		// tiles the row with NAV_GAP between footprints, so neighbouring borders never
		// overlap. Since the border width itself depends on the card width, converge on
		// the content width with a couple of iterations.
		const cellW = (availW - NAV_GAP * (cols - 1)) / cols;
		let cardW = Math.max(1, cellW);
		let border = 0;
		for (let k = 0; k < 4; k++) {
			border = cardBorderWidth(cardW);
			cardW = Math.max(1, cellW - 2 * border);
		}
		const cardH = cardW / CARD_ASPECT;
		const cellH = cardH + 2 * border;
		const rows = Math.ceil(this.cards.length / cols);
		const contentW = NAV_PAD * 2 + cols * cellW + (cols - 1) * NAV_GAP;
		const contentH = NAV_PAD * 2 + rows * cellH + (rows - 1) * NAV_GAP;
		this.grid = { cols, cardW, cardH, border, cellW, cellH, contentW, contentH };

		for (let i = 0; i < this.cards.length; i++) {
			const row = Math.floor(i / cols);
			const col = i % cols;
			const sprite = this.makeSprite(i, cardW, cardH);
			// Inset the content by the border so the outset frame sits inside the cell.
			sprite.position.set(
				NAV_PAD + border + col * (cellW + NAV_GAP),
				NAV_PAD + border + row * (cellH + NAV_GAP)
			);
		}

		// Fixed fit-to-width: no zoom, ever. The first build starts scrolled to the
		// top; later rebuilds (a slider change or resize) keep the scroll offset,
		// re-clamped to the new content height.
		this.scale = 1;
		if (!this.framed) {
			this.pan = { x: 0, y: 0 };
			this.framed = true;
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
	 * Keep the grid within the canvas (plus a little overscroll margin). The grid is
	 * fit to the width, so the horizontal axis is always centred (no side scroll);
	 * the taller-than-canvas rows scroll vertically until an edge reaches the
	 * opposite side.
	 */
	private clampPan(): void {
		this.pan.x = this.clampAxis(this.pan.x, this.grid.contentW * this.scale, this.builtW);
		this.pan.y = this.clampAxis(this.pan.y, this.grid.contentH * this.scale, this.builtH);
	}

	private clampAxis(pan: number, content: number, viewport: number): number {
		if (content <= viewport) return (viewport - content) / 2; // centre when it fits
		return this.clamp(pan, viewport - content - PAN_MARGIN, PAN_MARGIN);
	}

	/** Screen point → the index of the card under it, or null if over a gap/empty. */
	private cardIndexAt(sx: number, sy: number): number | null {
		const { cols, cardW, cardH, border, cellW, cellH } = this.grid;
		if (cardW === 0) return null;
		const worldX = sx - this.pan.x;
		const worldY = sy - this.pan.y;
		const col = Math.floor((worldX - NAV_PAD) / (cellW + NAV_GAP));
		const row = Math.floor((worldY - NAV_PAD) / (cellH + NAV_GAP));
		if (col < 0 || col >= cols || row < 0) return null;
		// Card-local coords within the cell (past the border inset); reject points that
		// land on the border or in the gutter between cards.
		const localX = worldX - NAV_PAD - col * (cellW + NAV_GAP) - border;
		const localY = worldY - NAV_PAD - row * (cellH + NAV_GAP) - border;
		if (localX < 0 || localY < 0 || localX > cardW || localY > cardH) return null;
		const index = row * cols + col;
		return index >= 0 && index < this.cards.length ? index : null;
	}

	private localPoint(event: PointerEvent): { x: number; y: number } {
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

	/** The wheel scrolls the rows vertically (zoom is fixed — the slider is the
	 * density control). Line-mode deltas are scaled to roughly a row's worth. */
	private onWheel = (event: WheelEvent): void => {
		event.preventDefault();
		const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
		this.pan.y -= dy;
		this.clampPan();
		this.applyTransform();
	};

	private onPointerDown = (event: PointerEvent): void => {
		// One pointer drives the scroll; ignore extra fingers (there is no pinch).
		if (this.dragPointerId !== null) return;
		const { x, y } = this.localPoint(event);
		this.dragPointerId = event.pointerId;
		try {
			this.app.canvas.setPointerCapture(event.pointerId);
		} catch {
			// Capture is best-effort; navigation still works without it.
		}
		this.dragMoved = false;
		this.dragStart = { x, y };
		this.panStart = { ...this.pan };
		this.downCardIndex = this.cardIndexAt(x, y);
		this.app.canvas.style.cursor = 'grabbing';
	};

	private onPointerMove = (event: PointerEvent): void => {
		if (event.pointerId !== this.dragPointerId) return;
		const { x, y } = this.localPoint(event);
		const dx = x - this.dragStart.x;
		const dy = y - this.dragStart.y;
		if (Math.hypot(dx, dy) > TAP_SLOP) this.dragMoved = true;
		// Fit-to-width means the horizontal axis is clamped back to centre; the drag
		// still updates it so a diagonal gesture reads naturally.
		this.pan.x = this.panStart.x + dx;
		this.pan.y = this.panStart.y + dy;
		this.clampPan();
		this.applyTransform();
	};

	private onPointerUp = (event: PointerEvent): void => {
		if (event.pointerId !== this.dragPointerId) return;
		try {
			this.app.canvas.releasePointerCapture(event.pointerId);
		} catch {
			// ignore — capture may already be gone
		}
		// A clean tap (no meaningful movement) on a card selects it.
		if (!this.dragMoved && this.downCardIndex != null) {
			this.onCardTap?.(this.downCardIndex);
		}
		this.dragPointerId = null;
		this.downCardIndex = null;
		this.app.canvas.style.cursor = 'grab';
	};
}
