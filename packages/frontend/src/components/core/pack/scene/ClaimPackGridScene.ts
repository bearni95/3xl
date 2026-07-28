/**
 * ClaimPackGridScene
 *
 * Owns the Pixi application for the today's-festes pack grid. It lays out every
 * booster pack the day offers in a fit-to-width, vertically-scrolling grid (one
 * {@link PackSprite} per celebrating place), each already rendered with its show
 * poster cover — the same navigation model the roster's {@link CardScene} uses: the
 * columns always span the canvas width, and rows that overflow the viewport scroll
 * (drag or wheel) rather than shrinking to fit. Picking a pack — by tapping it —
 * centres it, zooms it up while the rest fade away, and then hands off to the same
 * click-to-cut open flow as the single-pack opener.
 *
 * Flow:
 *  - load    → bakes each pack at the column width and arranges the grid; scrollable
 *  - select  → the chosen pack lifts out, tweens to the centre, the others fade out
 *  - idle    → hover shows the cut line (identical to the single-pack scene)
 *  - click   → flashes a slash, splits the pack, rolls its booster, reveals the cards
 *  - the claimed character card(s) fan into a grid
 *
 * The cut/reveal internals mirror the single-pack opener but are scale-aware, since
 * the focused pack sits at a fitted zoom rather than 1:1. Inputs come through the
 * constructor, outputs through callbacks.
 */

import {
	Application,
	Container,
	Graphics,
	Sprite,
	type FederatedPointerEvent
} from 'pixi.js';
import { PackSprite } from './PackSprite';
import { CardSprite, cardBorderWidth } from '$utils/card/CardSprite';
import type { ClaimPull } from './pull.type';
import type { OpenerPack } from './opener-view.type';

export interface ClaimPackGridSceneCallbacks {
	/** Fires once every pack is baked and the grid is laid out — i.e. ready to show. */
	onReady?: () => void;
	/** Fires when a pack is picked, before the zoom. */
	onSelect?: (pack: OpenerPack) => void;
	/** Fires once the selected pack is fully sliced and its cards have fanned out,
	 * with how many were revealed — zero when the roll was refused. */
	onOpenComplete?: (revealed: number) => void;
	onCardClick?: (pull: ClaimPull, index: number) => void;
	/**
	 * Fires when the canvas lost its GPU context and the browser did not hand one
	 * back — the renderer will never draw again, so the host has to rebuild the scene
	 * from scratch if it wants a working canvas.
	 */
	onContextLost?: () => void;
}

/** Layout and interaction knobs the host sets once, at construction. */
export interface ClaimPackGridSceneOptions {
	/** Packs per row in the grid. Defaults to {@link GRID_COLS}. */
	columns?: number;
	/** Columns the opened pack's cards fan into. Defaults to {@link REVEAL_COLS}. */
	revealColumns?: number;
	/**
	 * Whether a pack can be picked at all. False lays the grid out as a read-only
	 * display — it still scrolls, but no tap opens anything. Used for the days the
	 * map's booster panel browses to that are not today, whose packs no player can
	 * claim.
	 */
	interactive?: boolean;
}

type SceneState = 'loading' | 'grid' | 'zooming' | 'idle' | 'cutting' | 'revealing' | 'fanned';

const CARD_ASPECT = 2 / 3; // portrait trading card (reveal cards)
// How many packs a row holds by default — right for the claim page's full-width
// canvas. A narrower host (the map's side panel) passes its own count instead.
const GRID_COLS = 3;
// How many columns the revealed cards fan into by default, likewise overridable.
const REVEAL_COLS = 3;
// Grid navigation geometry, matching the roster grid: gap + outer padding, the tap
// slop that separates a tap from a pan, and a little springy overscroll.
// How long to wait for the browser to restore a lost GPU context before giving up on
// it and asking the host to rebuild the scene.
const CONTEXT_RESTORE_GRACE = 1200;
const NAV_GAP = 16;
const NAV_PAD = 16;
const TAP_SLOP = 6;
const PAN_MARGIN = 48;

/** One pack laid out in the grid: its descriptor, baked sprite, its cell (col,row),
 * and the baked height (all packs share the baked column width). */
interface GridEntry {
	pack: OpenerPack;
	sprite: PackSprite;
	col: number;
	row: number;
	bakedH: number;
}

export class ClaimPackGridScene {
	readonly app: Application;
	private host: HTMLElement;
	private callbacks: ClaimPackGridSceneCallbacks;
	private packs: OpenerPack[];

	private rootLayer: Container;
	private cardLayer: Container; // reveal cards (screen space)
	private gridLayer: Container; // the grid of packs (panned)
	private focusLayer: Container; // the selected pack while opening (screen space)
	private uiLayer: Container; // cut indicator + slash flash (screen space)
	private cutIndicator: Graphics;

	private entries: GridEntry[] = [];

	// --- Grid layout + navigation (mirrors CardScene) ---
	// The baked column width every pack was rendered at; the layer is scaled by
	// gridScale = currentColumnWidth / bakedCardW so a resize re-fits without
	// re-baking. World positions are in baked units.
	private bakedCardW = 0;
	private maxBakedH = 0;
	private cols = 1;
	// The widest a row is allowed to get (the caller's column count); the actual `cols`
	// is this capped to how many packs there are.
	private maxCols = GRID_COLS;
	// Columns the revealed cards fan into, and whether a pack can be picked at all.
	private revealCols = REVEAL_COLS;
	private interactive = true;
	private rows = 1;
	private gridScale = 1;
	private contentW = 0;
	private contentH = 0;
	private pan = { x: 0, y: 0 };
	private framed = false;
	private navAttached = false;
	private dragPointerId: number | null = null;
	private dragMoved = false;
	private dragStart = { x: 0, y: 0 };
	private panStart = { x: 0, y: 0 };
	private downIndex: number | null = null;

	// --- Selected pack / cut (scale-aware) ---
	private packSprite: PackSprite | null = null;
	private activeClaim: OpenerPack['claim'] | null = null;
	// Display scale of the focused pack (fitted zoom, not 1:1).
	private selScale = 1;
	private pulls: ClaimPull[] = [];
	private topHalf: Sprite | null = null;
	private bottomHalf: Sprite | null = null;
	private cardSprites: CardSprite[] = [];
	// Current cut Y in baked pack-local units (0 = top edge of the focused pack).
	private cutY = 0;

	private state: SceneState = 'loading';
	private isDestroyed = false;
	// True between losing the GPU context and getting one back.
	private contextLost = false;
	private resizeObserver: ResizeObserver | null = null;
	private builtW = 0;
	private builtH = 0;

	constructor(
		host: HTMLElement,
		packs: OpenerPack[],
		callbacks: ClaimPackGridSceneCallbacks = {},
		options: ClaimPackGridSceneOptions = {}
	) {
		this.host = host;
		this.callbacks = callbacks;
		this.packs = packs;
		this.maxCols = Math.max(1, Math.round(options.columns ?? GRID_COLS));
		this.revealCols = Math.max(1, Math.round(options.revealColumns ?? REVEAL_COLS));
		this.interactive = options.interactive ?? true;
		this.app = new Application();

		this.rootLayer = new Container();
		this.cardLayer = new Container();
		this.gridLayer = new Container();
		this.focusLayer = new Container();
		this.uiLayer = new Container();
		this.cutIndicator = new Graphics();

		void this.init();
	}

	destroy(): void {
		this.isDestroyed = true;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.detachNavigation();
		this.detachContextGuards();
		try {
			this.app.stage.off('pointermove', this.onStagePointerMove);
			this.app.stage.off('pointerdown', this.onStagePointerDown);
			this.app.stage.off('pointerleave', this.onStagePointerLeave);
		} catch {
			// stage may already be torn down
		}

		// The halves reference the focused pack's render-texture source, so destroy
		// them before the packs.
		this.topHalf?.destroy();
		this.bottomHalf?.destroy();
		this.topHalf = null;
		this.bottomHalf = null;

		for (const entry of this.entries) entry.sprite.destroy();
		this.entries = [];
		this.packSprite = null;

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
		this.app.canvas.style.touchAction = 'none';
		this.attachContextGuards();

		this.app.stage.addChild(this.rootLayer);
		this.rootLayer.addChild(this.cardLayer);
		this.rootLayer.addChild(this.gridLayer);
		this.rootLayer.addChild(this.focusLayer);
		this.rootLayer.addChild(this.uiLayer);
		this.uiLayer.addChild(this.cutIndicator);

		this.builtW = width;
		this.builtH = height;

		// Bake each pack at the column width, so a full-width pack in the grid is
		// pixel-crisp (no upscaling). Columns fit the canvas width; the poster's aspect
		// sets each pack's height.
		this.cols = Math.min(this.maxCols, Math.max(1, this.packs.length));
		this.bakedCardW = this.columnWidth(width, this.cols);
		await Promise.all(
			this.packs.map(async (pack, i) => {
				const sprite = new PackSprite({
					coverUrl: pack.coverUrl,
					locationName: pack.locationName,
					app: this.app,
					width: this.bakedCardW,
					// A tall box so the fit is width-bound: every pack bakes to bakedCardW wide.
					height: this.bakedCardW * 8
				});
				await sprite.load();
				if (this.isDestroyed) {
					sprite.destroy();
					return;
				}
				this.gridLayer.addChild(sprite);
				this.entries.push({
					pack,
					sprite,
					col: i % this.cols,
					row: Math.floor(i / this.cols),
					bakedH: sprite.packHeight
				});
			})
		);
		if (this.isDestroyed) return;

		this.state = 'grid';
		this.layoutGrid(width, height);
		this.attachNavigation();
		// Every pack is baked and placed — the host can now hide its loading spinner.
		this.callbacks.onReady?.();

		// Stage-level pointer handlers drive the cut once a pack is focused; they are
		// dormant (early-return) while the grid is shown.
		this.app.stage.eventMode = 'static';
		this.app.stage.hitArea = this.app.screen;
		this.app.stage.on('pointermove', this.onStagePointerMove);
		this.app.stage.on('pointerdown', this.onStagePointerDown);
		this.app.stage.on('pointerleave', this.onStagePointerLeave);

		this.resizeObserver = new ResizeObserver(() => this.handleResize());
		this.resizeObserver.observe(this.host);
	}

	private measure(): { width: number; height: number } {
		const rect = this.host.getBoundingClientRect();
		const width = Math.max(320, Math.floor(rect.width || 600));
		const height = Math.max(320, Math.floor(rect.height || 600));
		return { width, height };
	}

	// --- Surviving a lost GPU context ------------------------------------------
	// The browser can take a canvas's WebGL context away at any time — it has a hard
	// cap on how many live at once, and this canvas shares a page with the map's other
	// ones. Pixi frees its GPU resources on the loss, but its ticker keeps calling
	// render, which then throws on a half-torn-down batcher every single frame: the
	// canvas goes blank permanently and takes whatever it was mid-way through (an open
	// pack's reveal, say) with it. Park the ticker for as long as the context is gone,
	// and start it again when the browser hands one back — Pixi rebuilds its resources
	// on restore, so the scene simply carries on.

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
		// Give the browser its chance to hand a context back. When it doesn't, parking
		// the ticker has only made the canvas quietly blank instead of noisily blank —
		// so tell the host, which can rebuild the scene on a fresh context.
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

	/** The width one column gets at the given canvas width — a full-width pack. */
	private columnWidth(width: number, cols: number): number {
		const availW = Math.max(1, width - NAV_PAD * 2);
		return Math.max(1, (availW - NAV_GAP * (cols - 1)) / cols);
	}

	/**
	 * Lay the packs out in world (baked) units and fit the column width to the current
	 * canvas via `gridScale` — no re-baking. Rows extend downward into a
	 * taller-than-canvas world scrolled vertically; a full row always spans the width.
	 */
	private layoutGrid(width: number, height: number): void {
		const n = this.entries.length;
		if (n === 0) return;

		this.rows = Math.ceil(n / this.cols);
		this.maxBakedH = this.entries.reduce((m, e) => Math.max(m, e.bakedH), 0);
		const rowPitch = this.maxBakedH + NAV_GAP;

		for (const entry of this.entries) {
			const packX = NAV_PAD + entry.col * (this.bakedCardW + NAV_GAP);
			// Centre the pack vertically within its (uniform, maxBakedH-tall) row cell,
			// so a pack shorter than the tallest in the grid sits centred, not top-aligned.
			const packY = NAV_PAD + entry.row * rowPitch + (this.maxBakedH - entry.bakedH) / 2;
			entry.sprite.scale.set(1);
			entry.sprite.position.set(packX, packY);
		}

		this.contentW = NAV_PAD * 2 + this.cols * this.bakedCardW + (this.cols - 1) * NAV_GAP;
		this.contentH = NAV_PAD * 2 + this.rows * this.maxBakedH + (this.rows - 1) * NAV_GAP;

		// Fit the columns to the current width (a resize re-fits without re-baking).
		this.gridScale = this.columnWidth(width, this.cols) / this.bakedCardW;
		if (!this.framed) {
			this.pan = { x: 0, y: 0 };
			this.framed = true;
		}
		this.clampPan(width, height);
		this.applyGridTransform();
	}

	private applyGridTransform(): void {
		this.gridLayer.scale.set(this.gridScale);
		this.gridLayer.position.set(this.pan.x, this.pan.y);
	}

	private clamp(v: number, lo: number, hi: number): number {
		return Math.min(hi, Math.max(lo, v));
	}

	private clampPan(width: number, height: number): void {
		this.pan.x = this.clampAxis(this.pan.x, this.contentW * this.gridScale, width);
		this.pan.y = this.clampAxis(this.pan.y, this.contentH * this.gridScale, height);
	}

	private clampAxis(pan: number, content: number, viewport: number): number {
		if (content <= viewport) return (viewport - content) / 2; // centre when it fits
		return this.clamp(pan, viewport - content - PAN_MARGIN, PAN_MARGIN);
	}

	// --- Grid navigation (DOM pointer events, tap-vs-pan) -----------------------

	private attachNavigation(): void {
		if (this.navAttached) return;
		const canvas = this.app.canvas;
		canvas.style.cursor = 'grab';
		canvas.addEventListener('wheel', this.onWheel, { passive: false });
		canvas.addEventListener('pointerdown', this.onNavPointerDown);
		canvas.addEventListener('pointermove', this.onNavPointerMove);
		canvas.addEventListener('pointerup', this.onNavPointerUp);
		canvas.addEventListener('pointercancel', this.onNavPointerUp);
		canvas.addEventListener('pointerleave', this.onNavPointerUp);
		this.navAttached = true;
	}

	private detachNavigation(): void {
		const canvas = this.app.canvas;
		if (!canvas || !this.navAttached) return;
		canvas.removeEventListener('wheel', this.onWheel);
		canvas.removeEventListener('pointerdown', this.onNavPointerDown);
		canvas.removeEventListener('pointermove', this.onNavPointerMove);
		canvas.removeEventListener('pointerup', this.onNavPointerUp);
		canvas.removeEventListener('pointercancel', this.onNavPointerUp);
		canvas.removeEventListener('pointerleave', this.onNavPointerUp);
		canvas.style.cursor = 'default';
		this.navAttached = false;
	}

	private onWheel = (event: WheelEvent): void => {
		if (this.state !== 'grid') return;
		event.preventDefault();
		const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
		this.pan.y -= dy;
		this.clampPan(this.builtW, this.builtH);
		this.applyGridTransform();
	};

	private localPoint(event: PointerEvent): { x: number; y: number } {
		const rect = this.app.canvas.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	private onNavPointerDown = (event: PointerEvent): void => {
		if (this.state !== 'grid' || this.dragPointerId !== null) return;
		const { x, y } = this.localPoint(event);
		this.dragPointerId = event.pointerId;
		try {
			this.app.canvas.setPointerCapture(event.pointerId);
		} catch {
			// best-effort
		}
		this.dragMoved = false;
		this.dragStart = { x, y };
		this.panStart = { ...this.pan };
		this.downIndex = this.entryIndexAt(x, y);
		this.app.canvas.style.cursor = 'grabbing';
	};

	private onNavPointerMove = (event: PointerEvent): void => {
		if (event.pointerId !== this.dragPointerId) return;
		const { x, y } = this.localPoint(event);
		const dx = x - this.dragStart.x;
		const dy = y - this.dragStart.y;
		if (Math.hypot(dx, dy) > TAP_SLOP) this.dragMoved = true;
		this.pan.x = this.panStart.x + dx;
		this.pan.y = this.panStart.y + dy;
		this.clampPan(this.builtW, this.builtH);
		this.applyGridTransform();
	};

	private onNavPointerUp = (event: PointerEvent): void => {
		if (event.pointerId !== this.dragPointerId) return;
		try {
			this.app.canvas.releasePointerCapture(event.pointerId);
		} catch {
			// ignore
		}
		const tappedIndex = this.downIndex;
		const moved = this.dragMoved;
		this.dragPointerId = null;
		this.downIndex = null;
		this.app.canvas.style.cursor = 'grab';
		// A clean tap (no meaningful movement) on a pack opens it.
		if (!moved && tappedIndex != null) {
			const entry = this.entries[tappedIndex];
			if (entry) this.selectPack(entry.pack.id);
		}
	};

	/** Screen point → the index of the pack under it, or null over a gap. */
	private entryIndexAt(sx: number, sy: number): number | null {
		if (this.bakedCardW === 0) return null;
		const worldX = (sx - this.pan.x) / this.gridScale;
		const worldY = (sy - this.pan.y) / this.gridScale;
		const rowPitch = this.maxBakedH + NAV_GAP;
		const col = Math.floor((worldX - NAV_PAD) / (this.bakedCardW + NAV_GAP));
		const row = Math.floor((worldY - NAV_PAD) / rowPitch);
		if (col < 0 || col >= this.cols || row < 0) return null;
		const localX = worldX - NAV_PAD - col * (this.bakedCardW + NAV_GAP);
		const localY = worldY - NAV_PAD - row * rowPitch;
		if (localX > this.bakedCardW || localY > this.maxBakedH) return null; // gutter
		// Match by cell, not array position: entries are pushed in load-completion order
		// (a Promise.all over async bakes), so their array index is not their grid slot.
		const index = this.entries.findIndex((e) => e.col === col && e.row === row);
		return index >= 0 ? index : null;
	}

	/**
	 * Pick a pack by id — the entry point for both a canvas tap and the DOM festes
	 * list. Only fires from the grid state. Lifts the chosen pack out of the scrolling
	 * grid into screen space, zooms it to a centred fit, fades the rest away, then arms
	 * the cut flow.
	 */
	selectPack(id: string): void {
		// A read-only grid still scrolls, but nothing in it opens.
		if (!this.interactive || this.state !== 'grid') return;
		const entry = this.entries.find((e) => e.pack.id === id);
		if (!entry) return;

		this.state = 'zooming';
		this.callbacks.onSelect?.(entry.pack);
		this.detachNavigation();
		this.cutIndicator.clear();

		this.packSprite = entry.sprite;
		this.activeClaim = entry.pack.claim;

		// Move the selected pack into the (unpanned) focus layer at its current
		// on-screen spot, so the zoom is a clean screen-space tween.
		const screenX = entry.sprite.x * this.gridScale + this.pan.x;
		const screenY = entry.sprite.y * this.gridScale + this.pan.y;
		this.gridLayer.removeChild(entry.sprite);
		this.focusLayer.addChild(entry.sprite);
		entry.sprite.scale.set(this.gridScale);
		entry.sprite.position.set(screenX, screenY);

		const width = this.builtW;
		const height = this.builtH;
		const focusScale = Math.min(
			(width * 0.9) / entry.sprite.packWidth,
			(height * 0.92) / entry.sprite.packHeight
		);
		const targetX = width / 2 - (entry.sprite.packWidth * focusScale) / 2;
		const targetY = height / 2 - (entry.sprite.packHeight * focusScale) / 2;

		// Compose a second copy of the pack at the size the zoom lands on, while the zoom
		// itself plays — so the pack that comes to rest is drawn 1:1 rather than upscaled.
		const sharper = this.bakeFocusPack(entry.pack, entry.sprite.packWidth * focusScale, focusScale);

		const others = this.entries.filter((e) => e !== entry);
		void Promise.all([
			this.tweenPackFocus(entry.sprite, screenX, screenY, this.gridScale, targetX, targetY, focusScale),
			...others.map((other) => this.fadeOut(other))
		]).then(async () => {
			if (this.isDestroyed) return;
			for (const other of others) other.sprite.destroy();
			this.entries = [entry];
			this.selScale = focusScale;

			const sharp = await sharper;
			if (this.isDestroyed) {
				sharp?.destroy();
				return;
			}
			if (sharp) this.swapFocusPack(entry, sharp, targetX, targetY);
			this.enterIdle();
		});
	}

	/**
	 * Compose one more copy of a pack, this time at the width the focus zoom lands on.
	 * The grid bakes every pack at the column width, which is right for the grid but two
	 * or three times smaller than a focused pack is drawn — and a render texture stretched
	 * that far is exactly the soft text, furry teeth and smeared poster you'd expect. The
	 * cover bitmap is already loaded by then, so this is pure drawing and no network, and
	 * only ever one pack is held at this size, so the grid's memory doesn't move. Null when
	 * the pack is already drawn at (or above) its baked size, or the scene went away mid-bake.
	 */
	private async bakeFocusPack(
		pack: OpenerPack,
		width: number,
		scale: number
	): Promise<PackSprite | null> {
		if (scale <= 1.01) return null;
		const sprite = new PackSprite({
			coverUrl: pack.coverUrl,
			locationName: pack.locationName,
			app: this.app,
			width,
			// A tall box so the fit is width-bound, exactly as the grid bake does it —
			// the pack comes out `width` wide at the poster's own aspect.
			height: width * 8
		});
		await sprite.load();
		if (this.isDestroyed) {
			sprite.destroy();
			return null;
		}
		return sprite;
	}

	/** Put the sharply-baked copy in the focused pack's place and drop the stretched one. */
	private swapFocusPack(entry: GridEntry, sharp: PackSprite, x: number, y: number): void {
		this.focusLayer.removeChild(entry.sprite);
		entry.sprite.destroy();

		sharp.position.set(x, y);
		sharp.scale.set(1);
		this.focusLayer.addChild(sharp);

		entry.sprite = sharp;
		entry.bakedH = sharp.packHeight;
		this.packSprite = sharp;
		// Drawn 1:1 now, so the focused pack's local units are screen pixels and the cut
		// geometry below (which is all selScale-relative) needs no scaling at all.
		this.selScale = 1;
	}

	private tweenPackFocus(
		sprite: PackSprite,
		fromX: number,
		fromY: number,
		fromScale: number,
		toX: number,
		toY: number,
		toScale: number
	): Promise<void> {
		const duration = 460;
		const start = performance.now();
		return new Promise((resolve) => {
			const tick = () => {
				if (this.isDestroyed || sprite.destroyed) {
					resolve();
					return;
				}
				const t = Math.min(1, (performance.now() - start) / duration);
				const e = easeOutCubic(t);
				sprite.position.set(fromX + (toX - fromX) * e, fromY + (toY - fromY) * e);
				sprite.scale.set(fromScale + (toScale - fromScale) * e);
				if (t < 1) requestAnimationFrame(tick);
				else {
					sprite.position.set(toX, toY);
					sprite.scale.set(toScale);
					resolve();
				}
			};
			requestAnimationFrame(tick);
		});
	}

	private fadeOut(entry: GridEntry): Promise<void> {
		const duration = 320;
		const start = performance.now();
		return new Promise((resolve) => {
			const tick = () => {
				if (this.isDestroyed || entry.sprite.destroyed) {
					resolve();
					return;
				}
				const t = Math.min(1, (performance.now() - start) / duration);
				entry.sprite.alpha = 1 - t;
				if (t < 1) requestAnimationFrame(tick);
				else resolve();
			};
			requestAnimationFrame(tick);
		});
	}

	/** Arm the click-to-cut flow on the centred, focused pack. */
	private enterIdle(): void {
		if (!this.packSprite) return;
		this.state = 'idle';
		this.cutY = this.packSprite.packHeight / 2;
		this.redrawCutAtLocal(this.cutY);
	}

	// --- Cut / reveal (scale-aware) --------------------------------------------

	/** Screen-space bounds of the focused pack (baked size × selScale). */
	private packBounds(): { x: number; y: number; w: number; h: number } | null {
		if (!this.packSprite) return null;
		return {
			x: this.packSprite.x,
			y: this.packSprite.y,
			w: this.packSprite.packWidth * this.selScale,
			h: this.packSprite.packHeight * this.selScale
		};
	}

	private isInsidePack(globalX: number, globalY: number): boolean {
		const b = this.packBounds();
		if (!b) return false;
		return globalX >= b.x && globalX <= b.x + b.w && globalY >= b.y && globalY <= b.y + b.h;
	}

	private onStagePointerMove = (e: FederatedPointerEvent): void => {
		if (this.state !== 'idle' || !this.packSprite) return;
		const inside = this.isInsidePack(e.global.x, e.global.y);
		this.app.canvas.style.cursor = inside ? 'row-resize' : 'default';
		if (inside) {
			this.cutY = (e.global.y - this.packSprite.y) / this.selScale;
			this.drawCutIndicator(e.global.y);
		} else {
			this.redrawCutAtLocal(this.cutY);
		}
	};

	private onStagePointerLeave = (): void => {
		if (this.state === 'idle') this.redrawCutAtLocal(this.cutY);
		else this.cutIndicator.clear();
		this.app.canvas.style.cursor = 'default';
	};

	private onStagePointerDown = (e: FederatedPointerEvent): void => {
		if (this.state !== 'idle' || !this.packSprite) return;
		if (!this.isInsidePack(e.global.x, e.global.y)) return;
		const localY = (e.global.y - this.packSprite.y) / this.selScale;
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

	/** Redraw the cut line from a baked-local Y. */
	private redrawCutAtLocal(localY: number): void {
		const b = this.packBounds();
		if (!b) return;
		this.drawCutIndicator(b.y + localY * this.selScale);
	}

	private async performCut(localY: number): Promise<void> {
		if (!this.packSprite) return;
		this.state = 'cutting';
		this.cutIndicator.clear();
		this.app.canvas.style.cursor = 'default';

		const b = this.packBounds()!;
		const globalCutY = b.y + localY * this.selScale;

		await this.playSlashFlash(globalCutY, b.x, b.w);
		if (this.isDestroyed || !this.packSprite) return;

		const { top, bottom } = this.packSprite.split(localY);
		const topH = top.texture.frame.height; // baked
		this.packSprite.visible = false;

		this.placeHalf(top, b.x, b.y);
		this.placeHalf(bottom, b.x, b.y + topH * this.selScale);

		this.focusLayer.addChild(top);
		this.focusLayer.addChild(bottom);
		this.topHalf = top;
		this.bottomHalf = bottom;

		this.state = 'revealing';
		// Roll the booster against Supabase now, while the sliced-but-closed pack still
		// covers the reveal. A failure reveals no cards.
		try {
			this.pulls = this.activeClaim ? await this.activeClaim() : [];
		} catch {
			this.pulls = [];
		}
		if (this.isDestroyed) return;

		// Build the reveal cards behind the still-closed pack and wait until their art
		// has loaded, so a slow network can't slide the pack open onto empty space.
		await this.prepareCards();
		if (this.isDestroyed) return;

		const screenH = this.app.screen.height;
		const screenW = this.app.screen.width;

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

		this.topHalf?.destroy();
		this.bottomHalf?.destroy();
		this.topHalf = null;
		this.bottomHalf = null;

		if (this.packSprite) {
			this.focusLayer.removeChild(this.packSprite);
			this.packSprite.destroy();
			this.packSprite = null;
		}
		this.entries = [];

		this.state = 'fanned';
		this.callbacks.onOpenComplete?.(this.pulls.length);
	}

	/** Place a baked half at the given screen top-left, rendered at selScale. */
	private placeHalf(half: Sprite, screenX: number, screenY: number): void {
		const bw = half.texture.frame.width;
		const bh = half.texture.frame.height;
		half.scale.set(this.selScale);
		half.pivot.set(bw / 2, bh / 2);
		half.position.set(screenX + (bw * this.selScale) / 2, screenY + (bh * this.selScale) / 2);
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

	private async prepareCards(): Promise<void> {
		if (this.pulls.length === 0) return;

		const { cardW, cardH } = this.computeGridCardSize(this.pulls.length);
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
				if (this.state === 'fanned') this.callbacks.onCardClick?.(pull, idx);
			});
			this.cardLayer.addChild(sprite);
			this.cardSprites.push(sprite);
		}

		await Promise.all(this.cardSprites.map((sp) => sp.whenReady()));
	}

	private async revealCards(): Promise<void> {
		if (this.cardSprites.length === 0) return;

		const { cardW, cardH } = this.computeGridCardSize(this.cardSprites.length);
		const centerX = this.app.screen.width / 2;
		const centerY = this.app.screen.height / 2;

		await Promise.all(this.cardSprites.map((sp, i) => this.popIn(sp, i * 35)));
		if (this.isDestroyed) return;

		const targets = this.computeGridTargets(centerX, centerY, cardW, cardH);
		await Promise.all(
			this.cardSprites.map((sp, i) => this.tweenSprite(sp, targets[i], 520, i * 55, easeOutCubic))
		);
	}

	private gridDims(n: number): { cols: number; rows: number } {
		const cols = Math.min(this.revealCols, Math.max(1, n));
		const rows = Math.ceil(n / cols);
		return { cols, rows };
	}

	private computeGridCardSize(n: number): { cardW: number; cardH: number } {
		const { cols, rows } = this.gridDims(n);
		const gap = 12;
		const availW = this.app.screen.width * 0.92;
		const availH = this.app.screen.height * 0.92;
		// Each card's full footprint (content plus the outset border on both sides) must
		// fit its slot, so neighbouring borders never overlap. The border width depends
		// on the card width, so converge on it with a couple of iterations.
		const slotW = (availW - gap * (cols - 1)) / cols;
		const slotH = (availH - gap * (rows - 1)) / rows;
		let cardW = Math.max(1, Math.min(slotW, slotH * CARD_ASPECT));
		for (let k = 0; k < 4; k++) {
			const border = cardBorderWidth(cardW);
			cardW = Math.max(1, Math.min(slotW - 2 * border, (slotH - 2 * border) * CARD_ASPECT));
		}
		return { cardW, cardH: cardW / CARD_ASPECT };
	}

	private computeGridTargets(
		centerX: number,
		centerY: number,
		cardW: number,
		cardH: number
	): Array<{ x: number; y: number; rotation: number; scale: number }> {
		const n = this.cardSprites.length;
		if (n === 0) return [];

		const { cols, rows } = this.gridDims(n);
		const gap = 12;
		// Space the card centres by each card's full footprint (content + outset border
		// on both sides) plus the gap, so neighbouring borders never overlap.
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
			targets.push({
				x: rowStartX + col * cellW,
				y: firstRowY + row * cellH,
				rotation: 0,
				scale: 1
			});
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
				sprite.position.set(startX + (target.x - startX) * e, startY + (target.y - startY) * e);
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
		if (width === this.builtW && height === this.builtH) return;
		this.builtW = width;
		this.builtH = height;
		this.app.renderer.resize(width, height);
		if (this.state === 'grid') {
			this.layoutGrid(width, height);
		} else if (this.state === 'idle' && this.packSprite) {
			// Re-fit the focused pack to the new canvas and redraw the cut line.
			this.selScale = Math.min(
				(width * 0.9) / this.packSprite.packWidth,
				(height * 0.92) / this.packSprite.packHeight
			);
			this.packSprite.scale.set(this.selScale);
			this.packSprite.position.set(
				width / 2 - (this.packSprite.packWidth * this.selScale) / 2,
				height / 2 - (this.packSprite.packHeight * this.selScale) / 2
			);
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
