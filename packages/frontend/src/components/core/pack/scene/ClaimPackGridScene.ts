/**
 * ClaimPackGridScene
 *
 * Owns the Pixi application for the today's-festes pack grid. It lays out every
 * booster pack the day offers in a 3-column grid (one {@link PackSprite} per
 * celebrating place), each already rendered with its show poster cover. Picking a
 * pack — by tapping it, or via {@link ClaimPackGridScene.selectPack} driven from the
 * DOM list — centres it, zooms it up to full size while the rest fade away, and then
 * hands off to the same click-to-cut open flow as the single-pack opener.
 *
 * Flow:
 *  - load    → bakes each pack and arranges them in the grid; waits for a selection
 *  - select  → the chosen pack tweens to the centre at full size, the others fade out
 *  - idle    → identical to the single-pack scene: hover shows the cut line
 *  - click   → flashes a slash, splits the pack, rolls its booster, reveals the cards
 *  - the claimed character card(s) fan into a grid
 *
 * The cut/reveal internals mirror {@link ClaimPackScene}; the grid + zoom phases are
 * the addition. Inputs come through the constructor, outputs through callbacks.
 */

import {
	Application,
	Container,
	Graphics,
	Rectangle,
	Sprite,
	Text,
	type FederatedPointerEvent
} from 'pixi.js';
import { PackSprite } from './PackSprite';
import { CardSprite } from '$utils/card/CardSprite';
import restoreCatalanArticle from '$utils/string/restore-catalan-article';
import type { ClaimPull } from './pull.type';
import type { OpenerPack } from './opener-view.type';

export interface ClaimPackGridSceneCallbacks {
	/** Fires when a pack is picked (from a tap or {@link selectPack}), before the zoom. */
	onSelect?: (pack: OpenerPack) => void;
	/** Fires once the selected pack is fully sliced and its cards have fanned out. */
	onOpenComplete?: () => void;
	onCardClick?: (pull: ClaimPull, index: number) => void;
}

type SceneState = 'loading' | 'grid' | 'zooming' | 'idle' | 'cutting' | 'revealing' | 'fanned';

const CARD_ASPECT = 2 / 3; // portrait trading card
const GRID_COLS = 3;
const GRID_GAP = 16; // px between grid cells
const HOVER_SCALE = 1.06; // grid pack bump on hover

/** One pack laid out in the grid: its descriptor, baked sprite + caption, and the
 * cell centre / rest scale it sits at while the grid is shown. */
interface GridEntry {
	pack: OpenerPack;
	sprite: PackSprite;
	caption: Text;
	cellX: number;
	cellY: number;
	restScale: number;
}

export class ClaimPackGridScene {
	readonly app: Application;
	private host: HTMLElement;
	private callbacks: ClaimPackGridSceneCallbacks;
	private packs: OpenerPack[];

	private rootLayer: Container;
	private cardLayer: Container;
	private gridLayer: Container;
	private uiLayer: Container;
	private cutIndicator: Graphics;

	private entries: GridEntry[] = [];
	// The pack currently being opened — set on selection, drives the cut/reveal.
	private packSprite: PackSprite | null = null;
	private activeClaim: OpenerPack['claim'] | null = null;
	private pulls: ClaimPull[] = [];
	private topHalf: Sprite | null = null;
	private bottomHalf: Sprite | null = null;
	private cardSprites: CardSprite[] = [];

	private state: SceneState = 'loading';
	private isDestroyed = false;
	private resizeObserver: ResizeObserver | null = null;
	// Current cut Y in pack-local coordinates (0 = top edge of the selected pack).
	private cutY: number = 0;

	constructor(
		host: HTMLElement,
		packs: OpenerPack[],
		callbacks: ClaimPackGridSceneCallbacks = {}
	) {
		this.host = host;
		this.callbacks = callbacks;
		this.packs = packs;
		this.app = new Application();

		this.rootLayer = new Container();
		this.cardLayer = new Container();
		this.gridLayer = new Container();
		this.uiLayer = new Container();
		this.cutIndicator = new Graphics();

		void this.init();
	}

	destroy(): void {
		this.isDestroyed = true;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		try {
			this.app.stage.off('pointermove', this.onPointerMove);
			this.app.stage.off('pointerdown', this.onPointerDown);
			this.app.stage.off('pointerleave', this.onPointerLeave);
		} catch {
			// stage may already be torn down
		}

		// The halves reference the selected pack's render-texture source, so destroy
		// them before the packs.
		this.topHalf?.destroy();
		this.bottomHalf?.destroy();
		this.topHalf = null;
		this.bottomHalf = null;

		for (const entry of this.entries) {
			entry.sprite.destroy();
			entry.caption.destroy();
		}
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

		this.app.stage.addChild(this.rootLayer);
		this.rootLayer.addChild(this.cardLayer);
		this.rootLayer.addChild(this.gridLayer);
		this.rootLayer.addChild(this.uiLayer);
		this.uiLayer.addChild(this.cutIndicator);

		// Bake every pack at the full centred size, so a pack is crisp both scaled
		// down into its grid cell and zoomed up to fill the canvas when selected.
		const { packW, packH } = this.computePackDimensions(width, height);
		await Promise.all(
			this.packs.map(async (pack) => {
				const sprite = new PackSprite({
					coverUrl: pack.coverUrl,
					locationName: pack.locationName,
					app: this.app,
					width: packW,
					height: packH
				});
				await sprite.load();
				if (this.isDestroyed) {
					sprite.destroy();
					return;
				}
				const caption = new Text({
					text: restoreCatalanArticle(pack.label),
					style: {
						fontFamily: 'sans-serif',
						fontSize: 13,
						fontWeight: '600',
						fill: 0xffffff,
						align: 'center',
						wordWrap: true,
						wordWrapWidth: packW
					}
				});
				caption.anchor.set(0.5, 0);
				sprite.eventMode = 'static';
				sprite.cursor = 'pointer';
				// Tap anywhere over the pack's footprint, notches included (the hit area is
				// local, so it scales with the pack in its cell).
				sprite.hitArea = new Rectangle(0, 0, sprite.packWidth, sprite.packHeight);
				sprite.on('pointertap', () => this.selectPack(pack.id));
				sprite.on('pointerover', () => this.onPackHover(pack.id, true));
				sprite.on('pointerout', () => this.onPackHover(pack.id, false));
				this.gridLayer.addChild(sprite);
				this.uiLayer.addChild(caption);
				this.entries.push({ pack, sprite, caption, cellX: 0, cellY: 0, restScale: 1 });
			})
		);
		if (this.isDestroyed) return;

		this.state = 'grid';
		this.layoutGrid();

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

	/**
	 * Pick a pack by id — the entry point for both a canvas tap and the DOM festes
	 * list. Only fires from the grid state (ignored mid-open). Zooms the chosen pack
	 * to the centre at full size, fades the rest away, then arms the cut flow.
	 */
	selectPack(id: string): void {
		if (this.state !== 'grid') return;
		const entry = this.entries.find((e) => e.pack.id === id);
		if (!entry) return;

		this.state = 'zooming';
		this.callbacks.onSelect?.(entry.pack);
		this.cutIndicator.clear();
		this.app.canvas.style.cursor = 'default';

		// The selected pack drives the cut/reveal from here on.
		this.packSprite = entry.sprite;
		this.activeClaim = entry.pack.claim;
		entry.sprite.eventMode = 'none';
		entry.sprite.cursor = 'default';
		// Lift it above the fading siblings.
		this.gridLayer.setChildIndex(entry.sprite, this.gridLayer.children.length - 1);

		const cx = this.app.screen.width / 2;
		const cy = this.app.screen.height / 2;

		const others = this.entries.filter((e) => e !== entry);
		void Promise.all([
			this.zoomToCentre(entry, cx, cy),
			...others.map((other) => this.fadeOut(other))
		]).then(() => {
			if (this.isDestroyed) return;
			// Remove the faded siblings so only the opening pack remains.
			for (const other of others) {
				other.sprite.destroy();
				other.caption.destroy();
			}
			this.entries = [entry];
			this.enterIdle();
		});
	}

	/** Arm the click-to-cut flow on the centred, full-size selected pack. */
	private enterIdle(): void {
		if (!this.packSprite) return;
		this.state = 'idle';
		this.cutY = this.packSprite.packHeight / 2;
		this.redrawCutAtLocal(this.cutY);
	}

	private onPackHover(id: string, over: boolean): void {
		if (this.state !== 'grid') return;
		const entry = this.entries.find((e) => e.pack.id === id);
		if (!entry) return;
		const scale = over ? entry.restScale * HOVER_SCALE : entry.restScale;
		this.placeAtCentre(entry.sprite, entry.cellX, entry.cellY, scale);
		this.app.canvas.style.cursor = over ? 'pointer' : 'default';
	}

	private measure(): { width: number; height: number } {
		const rect = this.host.getBoundingClientRect();
		const width = Math.max(320, Math.floor(rect.width || 600));
		const height = Math.max(320, Math.floor(rect.height || 600));
		return { width, height };
	}

	/** The full, centred footprint one pack occupies when zoomed in — the same box
	 * {@link ClaimPackScene} fits a single pack into. */
	private computePackDimensions(w: number, h: number): { packW: number; packH: number } {
		const PACK_ASPECT = 5 / 8;
		const maxH = h * 0.82;
		const maxW = w * 0.45;
		const byHeight = { packW: maxH * PACK_ASPECT, packH: maxH };
		const byWidth = { packW: maxW, packH: maxW / PACK_ASPECT };
		return byHeight.packW <= maxW ? byHeight : byWidth;
	}

	/**
	 * Arrange the packs in a centred grid of up to {@link GRID_COLS} columns. Each
	 * pack fills the full width of its cell — the column width sets the scale — with
	 * the show caption tucked just beneath it. The whole block is only shrunk below
	 * full-width if the rows would otherwise overflow the canvas height, so nothing
	 * ever clips.
	 */
	private layoutGrid(): void {
		const n = this.entries.length;
		if (n === 0) return;

		const cols = Math.min(GRID_COLS, n);
		const rows = Math.ceil(n / cols);
		const screenW = this.app.screen.width;
		const screenH = this.app.screen.height;

		// The baked pack footprint (same for every pack).
		const packW = this.entries[0].sprite.packWidth;
		const packH = this.entries[0].sprite.packHeight;
		const captionH = 22;

		const availW = screenW * 0.94;
		const availH = screenH * 0.94;
		const cellW = (availW - GRID_GAP * (cols - 1)) / cols;

		// Width drives the scale: each pack spans its full column. Only clamp it down
		// if the resulting rows would overflow the available height.
		let scale = cellW / packW;
		const fullBlockH = rows * (packH * scale + captionH) + (rows - 1) * GRID_GAP;
		if (fullBlockH > availH) scale *= availH / fullBlockH;

		const dispH = packH * scale;
		const blockH = dispH + captionH;
		const gridH = rows * blockH + (rows - 1) * GRID_GAP;
		const originY = (screenH - gridH) / 2;

		for (let i = 0; i < n; i++) {
			const entry = this.entries[i];
			const row = Math.floor(i / cols);
			const col = i % cols;
			// Cells in the last (possibly short) row are centred under the grid.
			const inRow = Math.min(cols, n - row * cols);
			const rowW = inRow * cellW + (inRow - 1) * GRID_GAP;
			const rowStartX = (screenW - rowW) / 2;

			const cellCX = rowStartX + col * (cellW + GRID_GAP) + cellW / 2;
			const rowTop = originY + row * (blockH + GRID_GAP);
			const cellCY = rowTop + dispH / 2;

			entry.cellX = cellCX;
			entry.cellY = cellCY;
			entry.restScale = scale;
			this.placeAtCentre(entry.sprite, cellCX, cellCY, scale);

			entry.caption.style.fontSize = Math.min(15, Math.max(10, Math.round(packW * scale * 0.09)));
			entry.caption.style.wordWrapWidth = packW * scale;
			entry.caption.position.set(cellCX, rowTop + dispH + 4);
			entry.caption.scale.set(1);
		}
	}

	/** Position a top-left-origin pack so its centre lands at (cx, cy) at `scale`. */
	private placeAtCentre(sprite: PackSprite, cx: number, cy: number, scale: number): void {
		sprite.scale.set(scale);
		sprite.position.set(cx - (sprite.packWidth * scale) / 2, cy - (sprite.packHeight * scale) / 2);
	}

	private zoomToCentre(entry: GridEntry, cx: number, cy: number): Promise<void> {
		entry.caption.visible = false;
		const startScale = entry.sprite.scale.x;
		const startCX = entry.cellX;
		const startCY = entry.cellY;
		const duration = 460;
		const start = performance.now();
		return new Promise((resolve) => {
			const tick = () => {
				if (this.isDestroyed || entry.sprite.destroyed) {
					resolve();
					return;
				}
				const t = Math.min(1, (performance.now() - start) / duration);
				const e = easeOutCubic(t);
				const scale = startScale + (1 - startScale) * e;
				const curCX = startCX + (cx - startCX) * e;
				const curCY = startCY + (cy - startCY) * e;
				this.placeAtCentre(entry.sprite, curCX, curCY, scale);
				if (t < 1) requestAnimationFrame(tick);
				else {
					// Land exactly on the single-pack layout (scale 1, centred).
					this.placeAtCentre(entry.sprite, cx, cy, 1);
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
				entry.caption.alpha = 1 - t;
				if (t < 1) requestAnimationFrame(tick);
				else resolve();
			};
			requestAnimationFrame(tick);
		});
	}

	// ---- Cut / reveal (mirrors ClaimPackScene) --------------------------------

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

		// The halves share the original RenderTexture's source, so we can't destroy
		// the pack yet. Hide it; dispose after the halves are gone.
		this.packSprite.visible = false;

		this.placeHalf(top, b.x, b.y);
		this.placeHalf(bottom, b.x, b.y + localY);

		this.gridLayer.addChild(top);
		this.gridLayer.addChild(bottom);
		this.topHalf = top;
		this.bottomHalf = bottom;

		this.state = 'revealing';
		// Roll the booster against Supabase now, while the sliced-but-closed pack
		// still covers the reveal. A failure reveals no cards.
		try {
			this.pulls = this.activeClaim ? await this.activeClaim() : [];
		} catch {
			this.pulls = [];
		}
		if (this.isDestroyed) return;

		// Build the reveal cards behind the still-closed pack and wait until their art
		// has actually loaded, so a slow network can't slide the pack open onto empty
		// space.
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

		// Halves first — they reference the pack's render-texture source.
		this.topHalf?.destroy();
		this.bottomHalf?.destroy();
		this.topHalf = null;
		this.bottomHalf = null;

		if (this.packSprite) {
			this.gridLayer.removeChild(this.packSprite);
			this.packSprite.destroy();
			this.packSprite = null;
		}
		for (const entry of this.entries) entry.caption.destroy();
		this.entries = [];

		this.state = 'fanned';
		this.callbacks.onOpenComplete?.();
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
		const cols = Math.min(3, Math.max(1, n));
		const rows = Math.ceil(n / cols);
		return { cols, rows };
	}

	private computeGridCardSize(n: number): { cardW: number; cardH: number } {
		const { cols, rows } = this.gridDims(n);
		const gap = 12;
		const availW = this.app.screen.width * 0.92;
		const availH = this.app.screen.height * 0.92;
		const maxCardW = (availW - gap * (cols - 1)) / cols;
		const maxCardH = (availH - gap * (rows - 1)) / rows;
		const cardWFromH = maxCardH * CARD_ASPECT;
		if (cardWFromH <= maxCardW) {
			return { cardW: cardWFromH, cardH: maxCardH };
		}
		return { cardW: maxCardW, cardH: maxCardW / CARD_ASPECT };
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
		const cellW = cardW + gap;
		const cellH = cardH + gap;
		const totalH = rows * cardH + (rows - 1) * gap;
		const firstRowY = centerY - totalH / 2 + cardH / 2;

		const targets: Array<{ x: number; y: number; rotation: number; scale: number }> = [];
		for (let i = 0; i < n; i++) {
			const row = Math.floor(i / cols);
			const col = i % cols;
			const cardsInRow = Math.min(cols, n - row * cols);
			const rowWidth = cardsInRow * cardW + (cardsInRow - 1) * gap;
			const rowStartX = centerX - rowWidth / 2 + cardW / 2;
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
		this.app.renderer.resize(width, height);
		if (this.state === 'grid') {
			this.layoutGrid();
		} else if (this.state === 'idle' && this.packSprite) {
			this.placeAtCentre(this.packSprite, width / 2, height / 2, 1);
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
