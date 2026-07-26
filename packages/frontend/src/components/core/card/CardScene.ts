/**
 * CardScene
 *
 * A minimal, reusable Pixi canvas that draws one or more {@link CardSprite}s and
 * nothing else — no pack, no cut, no reveal animation. It owns its own
 * `Application`, mounts the canvas into a host element, fits the card(s) to the
 * container, keeps the looping idle animation running, and re-fits on resize.
 *
 * A single card is centred; several cards pack into a grid (`columns` wide,
 * capped at the card count). This is the drop-in primitive for rendering a
 * character card anywhere — the pack opener uses {@link ClaimPackScene} for its
 * bespoke reveal choreography, but any other surface (collection grid, profile,
 * preview) should reach for this.
 *
 * No Svelte interop — inputs come through the constructor; the hosting component
 * (`CardCanvas.svelte`) creates and destroys it.
 */

import { Application, Container } from 'pixi.js';
import { CardSprite } from './CardSprite';
import type { CardModel } from './card-model.type';

const CARD_ASPECT = 2 / 3; // portrait trading card (width / height)
const GRID_GAP = 12; // px between cards in a grid
// Fraction of the canvas the card grid is allowed to fill.
const FILL = 0.92;

export interface CardSceneOptions {
	/** The card(s) to draw. One is centred; several pack into a grid. */
	cards: CardModel[];
	/** Max cards per row when more than one is drawn (default 3). */
	columns?: number;
}

export class CardScene {
	readonly app: Application;
	private host: HTMLElement;
	private cards: CardModel[];
	private columns: number;

	private cardLayer: Container;
	private cardSprites: CardSprite[] = [];

	private isDestroyed = false;
	private resizeObserver: ResizeObserver | null = null;
	// Last built canvas size, so a resize that doesn't change dimensions is a no-op.
	private builtW = 0;
	private builtH = 0;

	constructor(host: HTMLElement, options: CardSceneOptions) {
		this.host = host;
		this.cards = options.cards;
		this.columns = Math.max(1, options.columns ?? 3);
		this.app = new Application();
		this.cardLayer = new Container();
		void this.init();
	}

	destroy(): void {
		this.isDestroyed = true;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
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

	/**
	 * (Re)create the card sprites sized to the current canvas. Sprites bake their
	 * layout in at construction, so a resize rebuilds them; the shared texture cache
	 * keeps this cheap (no re-fetch), at the cost of restarting the idle loop.
	 */
	private build(width: number, height: number): void {
		for (const sprite of this.cardSprites) sprite.destroy();
		this.cardSprites = [];
		this.builtW = width;
		this.builtH = height;
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

			const sprite = new CardSprite({
				card: this.cards[i],
				width: cardW,
				height: cardH,
				app: this.app
			});
			sprite.pivot.set(cardW / 2, cardH / 2);
			sprite.position.set(rowStartX + col * cellW, firstRowY + row * cellH);
			this.cardLayer.addChild(sprite);
			this.cardSprites.push(sprite);
		}
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
}
