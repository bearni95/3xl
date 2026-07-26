/**
 * ClaimPackScene
 *
 * Owns the Pixi application for the pack-opening experience.
 *
 * Flow:
 *  - load → renders the pack (show poster cover), listens for a click on it
 *  - click → flashes a slash, splits the pack at the click Y into two halves
 *  - top half flies up off-screen, bottom half flies down (both rotating)
 *  - the claimed character card(s) appear stacked at the cut, fan into a grid
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
import { RevealCardSprite } from './RevealCardSprite';
import { textureCache } from './texture-cache';
import type { ClaimPull } from './pull.type';

export interface ClaimPackSceneCallbacks {
	onOpenComplete?: () => void;
	onCardClick?: (pull: ClaimPull, index: number) => void;
}

export interface ClaimPackInput {
	/** Show poster URL used as the pack cover, or null for a plain frame. */
	coverUrl: string | null;
	/** Pack label — the show name. */
	label: string;
}

type SceneState = 'loading' | 'idle' | 'cutting' | 'revealing' | 'fanned';

const PACK_ASPECT = 5 / 8; // width / height (portrait)
const CARD_ASPECT = 2 / 3; // portrait trading card

export class ClaimPackScene {
	readonly app: Application;
	private host: HTMLElement;
	private callbacks: ClaimPackSceneCallbacks;
	private input: ClaimPackInput;
	private pulls: ClaimPull[];

	private rootLayer: Container;
	private cardLayer: Container;
	private packLayer: Container;
	private uiLayer: Container;
	private cutIndicator: Graphics;

	private packSprite: PackSprite | null = null;
	private topHalf: Sprite | null = null;
	private bottomHalf: Sprite | null = null;
	private cardSprites: RevealCardSprite[] = [];

	private state: SceneState = 'loading';
	private isDestroyed = false;
	private resizeObserver: ResizeObserver | null = null;
	// Current cut Y in pack-local coordinates (0 = top edge of pack).
	private cutY: number = 0;

	constructor(
		host: HTMLElement,
		input: ClaimPackInput,
		pulls: ClaimPull[],
		callbacks: ClaimPackSceneCallbacks = {}
	) {
		this.host = host;
		this.callbacks = callbacks;
		this.input = input;
		this.pulls = pulls;
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
		this.rootLayer.addChild(this.packLayer);
		this.rootLayer.addChild(this.uiLayer);
		this.uiLayer.addChild(this.cutIndicator);

		const { packW, packH } = this.computePackDimensions(width, height);
		this.packSprite = new PackSprite({
			coverUrl: this.input.coverUrl,
			label: this.input.label,
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

		// Warm the face textures while the player decides where to cut.
		void Promise.all(this.pulls.map((p) => textureCache.face(p.faceUrl).catch(() => null)));

		if (!this.resizeObserver) {
			this.resizeObserver = new ResizeObserver(() => this.handleResize());
			this.resizeObserver.observe(this.host);
		}
	}

	private measure(): { width: number; height: number } {
		const rect = this.host.getBoundingClientRect();
		const width = Math.max(320, Math.floor(rect.width || 600));
		const height = Math.max(320, Math.floor(rect.height || 600));
		return { width, height };
	}

	private computePackDimensions(w: number, h: number): { packW: number; packH: number } {
		// Pack fits within ~82% of canvas height and ~45% of canvas width.
		const maxH = h * 0.82;
		const maxW = w * 0.45;
		const byHeight = { packW: maxH * PACK_ASPECT, packH: maxH };
		const byWidth = { packW: maxW, packH: maxW / PACK_ASPECT };
		return byHeight.packW <= maxW ? byHeight : byWidth;
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

		this.state = 'revealing';
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

	private async revealCards(): Promise<void> {
		if (this.pulls.length === 0) return;

		const screenW = this.app.screen.width;
		const screenH = this.app.screen.height;

		const { cardW, cardH } = this.computeGridCardSize(this.pulls.length);

		const centerX = screenW / 2;
		const centerY = screenH / 2;

		for (let i = 0; i < this.pulls.length; i++) {
			const pull = this.pulls[i];
			const sprite = new RevealCardSprite({ pull, width: cardW, height: cardH });
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

		await Promise.all(this.cardSprites.map((sp, i) => this.popIn(sp, i * 35)));
		if (this.isDestroyed) return;

		const targets = this.computeGridTargets(centerX, centerY, cardW, cardH);
		await Promise.all(
			this.cardSprites.map((sp, i) =>
				this.tweenSprite(sp, targets[i], 520, i * 55, easeOutCubic)
			)
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

	private popIn(sprite: RevealCardSprite, delayMs: number): Promise<void> {
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
		sprite: RevealCardSprite,
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
