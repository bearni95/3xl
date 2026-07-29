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
 *    `pannable` the world scrolls vertically — the wheel moves through the rows;
 *    there is no dragging and no free zoom (the column count is the density
 *    control).
 *
 * This is the drop-in primitive for rendering character cards anywhere — the pack
 * opener uses {@link ClaimPackScene} for its bespoke reveal choreography, but any
 * other surface (the roster grid, a profile, a preview) should reach for this.
 *
 * No Svelte interop — inputs come through the constructor; the hosting component
 * (`CardCanvas.svelte`) creates and destroys it.
 */

import { Application, Container, Graphics, Text } from 'pixi.js';
import { destroyPixiApp } from '$utils/pixi/release-context';
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
// A little overscroll past the grid edges, so scrolling feels springy, not walled.
const PAN_MARGIN = 48;
// Vertical room between the leading slot band and the roster below it, with a rule
// drawn down its middle — enough that the two read as separate sections.
const SLOT_SEPARATION = 40;

/**
 * Baked grid geometry (world units), recomputed on each (re)build. `border` is the
 * outset frame each card draws beyond its content; `cellW`/`cellH` are the full
 * per-card footprint (content + border on both sides) the grid tiles. The `band*`
 * and `button*` fields describe the leading team band, which is laid out on its own
 * terms: how many cells it holds (the summary plus one per slot), how wide and tall
 * those cells are, and the total height it pushes the roster down by (its row, the
 * Remove buttons and the separating rule).
 */
const EMPTY_GRID = {
	cols: 1,
	cardW: 0,
	cardH: 0,
	border: 0,
	cellW: 0,
	cellH: 0,
	contentW: 0,
	contentH: 0,
	bandCells: 0,
	bandCellW: 0,
	bandCardW: 0,
	bandCardH: 0,
	bandBorder: 0,
	bandRowH: 0,
	slotBandH: 0,
	buttonH: 0,
	buttonGap: 0
};

export type CardLayout = 'fit' | 'grid';

/**
 * The three facts about a team drawn in the cell at the head of the slot band —
 * the same summary the roster's side panel lists for the active team. Any field may
 * be null (a team with no lead yet has none of them), and reads as an em-dash.
 */
export interface SlotSummary {
	/** The lead's colour, by name (e.g. `'red'`). */
	color: string | null;
	/** That colour as 24-bit RGB, drawn as a dot beside the name. */
	colorHex: number | null;
	/** The show(s) the lead belongs to. */
	showName: string | null;
	/** Where the lead was claimed. */
	regionName: string | null;
}

export interface CardSceneOptions {
	/** The card(s) to draw. */
	cards: CardModel[];
	/**
	 * Fixed cells drawn *before* the cards, in `'grid'` layout only — the roster puts
	 * the active team's slots here. A filled slot draws its card, a null one a
	 * card-sized empty frame; they are display-only and never tappable. Empty (the
	 * default) starts the grid straight on the cards.
	 */
	slots?: (CardModel | null)[];
	/**
	 * Drawn in a card-sized cell at the head of the slot band, before the slots
	 * themselves. Null (the default) starts the band on the first slot.
	 */
	summary?: SlotSummary | null;
	/**
	 * Called with a slot's index when its Remove button is tapped. Without it the
	 * buttons are still drawn but do nothing, so pass it wherever slots are shown.
	 */
	onSlotRemove?: (index: number) => void;
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
	/** Enable wheel scrolling and card clicks (only meaningful in `'grid'`). */
	pannable?: boolean;
	/**
	 * Horizontally mirror each card's idle art (default `true` — the normal look
	 * everywhere the player's own cards show). Pass `false` for the board's rival
	 * variant, the original unmirrored art so the character faces the other way.
	 */
	flipped?: boolean;
}

export class CardScene {
	readonly app: Application;
	private host: HTMLElement;
	private cards: CardModel[];
	// Fixed cells laid out before the cards — the active team's slots. A null entry is
	// an empty slot, drawn as a card-sized outline.
	private slots: (CardModel | null)[];
	// Drawn in the band's first cell, ahead of the slots.
	private summary: SlotSummary | null;
	private columns: number;
	private onCardTap?: (index: number) => void;
	private onSlotRemove?: (index: number) => void;
	private layout: CardLayout;
	private pannable: boolean;
	private flipped: boolean;

	private cardLayer: Container;
	private cardSprites: CardSprite[] = [];
	// The leading slot row's cards, kept apart from `cardSprites` — that array is
	// indexed by card index for the selection overlay, and slots are not cards — plus
	// the empty frames standing in for the unfilled ones. Both are tracked so the row
	// can be redrawn on its own.
	private slotSprites: CardSprite[] = [];
	// Everything in the band that isn't a card: the summary cell, the empty frames and
	// the Remove buttons.
	private slotDecor: Container[] = [];

	// Recycle-style selection overlay: when active, cards whose index isn't in
	// `selectedIndices` are dimmed so the selected ones stand out. Kept as scene
	// state (not a rebuild) so toggling a card never restarts the idle animations,
	// and re-applied after a rebuild (a filter change) reuses the same indices.
	private selectionActive = false;
	private selectedIndices: Set<number> = new Set();

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
	// Baked grid geometry (world units) — see EMPTY_GRID.
	private grid = { ...EMPTY_GRID };
	// Whether the initial view has been framed (so a resize keeps the scroll offset).
	private framed = false;


	constructor(host: HTMLElement, options: CardSceneOptions) {
		this.host = host;
		this.cards = options.cards;
		this.slots = options.slots ?? [];
		this.summary = options.summary ?? null;
		this.columns = Math.max(1, options.columns ?? 3);
		this.onCardTap = options.onCardTap;
		this.onSlotRemove = options.onSlotRemove;
		this.layout = options.layout ?? 'fit';
		this.pannable = Boolean(options.pannable) && this.layout === 'grid';
		this.flipped = options.flipped ?? true;
		this.app = new Application();
		this.cardLayer = new Container();
		void this.init();
	}

	/**
	 * Replace the drawn cards (and optionally the column count, the leading slot row
	 * and its summary cell) and rebuild. Cards often arrive asynchronously after the
	 * host mounts (a roster loads its spawns), so the hosting component calls this
	 * reactively; before init completes it only stages them for the initial build. All
	 * of it arrives in one call so a change to any part costs a single rebuild.
	 */
	setCards(
		cards: CardModel[],
		columns?: number,
		slots?: (CardModel | null)[],
		summary?: SlotSummary | null
	): void {
		const cardsChanged = cards !== this.cards;
		const columnsChanged = columns != null && Math.max(1, columns) !== this.columns;
		const bandChanged =
			(slots != null && slots !== this.slots) ||
			(summary !== undefined && summary !== this.summary);
		this.cards = cards;
		if (columns != null) this.columns = Math.max(1, columns);
		if (slots != null) this.slots = slots;
		if (summary !== undefined) this.summary = summary;
		if (!this.ready || this.isDestroyed) return;

		// Only the band moved, and it still occupies the same rows: redraw it on its
		// own. A full rebuild here would restart the idle animation of every card on the
		// page each time a pick joins or leaves the team.
		if (
			bandChanged &&
			!cardsChanged &&
			!columnsChanged &&
			this.layout === 'grid' &&
			this.grid.cardW > 0 &&
			this.slotCellCount() === this.grid.bandCells
		) {
			this.rebuildSlots();
			return;
		}

		const { width, height } = this.measure();
		this.build(width, height);
	}

	/** How many cells the band holds: the summary, if any, then one per slot. */
	private slotCellCount(): number {
		return this.slots.length + (this.summary ? 1 : 0);
	}


	destroy(): void {
		this.isDestroyed = true;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.detachNavigation();
		this.app.canvas?.removeEventListener('webglcontextlost', this.onContextLost);
		this.app.canvas?.removeEventListener('webglcontextrestored', this.onContextRestored);
		this.cardSprites = [];
		this.slotSprites = [];
		this.slotDecor = [];
		// Never `destroy(true)` — see the helper: it would release Pixi's shared pools
		// and break every other canvas still on the page.
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
		for (const sprite of this.slotSprites) sprite.destroy();
		this.cardSprites = [];
		this.slotSprites = [];
		this.slotDecor = [];
		// The summary, slot frames, buttons and the divider are plain display objects; clear
		// whatever is left on the layer so rebuilds don't stack them up.
		for (const child of this.cardLayer.removeChildren()) child.destroy();
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
			// Fit canvases tap per sprite; the grid hit-tests its own geometry instead.
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
		if (this.cards.length === 0 && this.slotCellCount() === 0) {
			this.grid = { ...EMPTY_GRID };
			return;
		}

		// Columns are driven explicitly by the host (a slider); cards are sized so the
		// whole row spans the canvas width, dynamically adapting as the slider changes
		// the count.
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

		// The team band is one row, always: its cells (the summary, then one per slot)
		// share the width between them rather than following the column slider, so the
		// summary stays beside the picks whatever the roster's density is. Its cards are
		// therefore sized on their own, and its row is taller than a roster row by the
		// Remove button under each filled slot.
		const bandCells = this.slotCellCount();
		let bandCellW = 0;
		let bandCardW = 0;
		let bandCardH = 0;
		let bandBorder = 0;
		let buttonH = 0;
		let buttonGap = 0;
		let bandRowH = 0;
		let slotBandH = 0;
		if (bandCells > 0) {
			bandCellW = (availW - NAV_GAP * (bandCells - 1)) / bandCells;
			bandCardW = Math.max(1, bandCellW);
			for (let k = 0; k < 4; k++) {
				bandBorder = cardBorderWidth(bandCardW);
				bandCardW = Math.max(1, bandCellW - 2 * bandBorder);
			}
			bandCardH = bandCardW / CARD_ASPECT;
			buttonH = Math.max(16, Math.round(bandCardW * 0.14));
			buttonGap = Math.max(4, Math.round(bandCardW * 0.04));
			bandRowH = bandCardH + 2 * bandBorder + buttonGap + buttonH;
			// Plus the gap and rule that separate the band from the roster below.
			slotBandH = bandRowH + NAV_GAP + SLOT_SEPARATION;
		}

		const cardRows = Math.ceil(this.cards.length / cols);
		const cardsH = cardRows === 0 ? 0 : cardRows * cellH + (cardRows - 1) * NAV_GAP;
		const contentW = NAV_PAD * 2 + cols * cellW + (cols - 1) * NAV_GAP;
		const contentH = NAV_PAD * 2 + slotBandH + cardsH;
		this.grid = {
			cols,
			cardW,
			cardH,
			border,
			cellW,
			cellH,
			contentW,
			contentH,
			bandCells,
			bandCellW,
			bandCardW,
			bandCardH,
			bandBorder,
			bandRowH,
			slotBandH,
			buttonH,
			buttonGap
		};

		this.layoutSlots();

		// The rule between the team band and the roster, centred in the gap the band
		// leaves below itself — so that row reads as its own section rather than as
		// three more cards.
		if (bandCells > 0 && cardRows > 0) {
			const divider = new Graphics();
			const y = NAV_PAD + bandRowH + NAV_GAP + SLOT_SEPARATION / 2;
			divider.moveTo(NAV_PAD, y).lineTo(contentW - NAV_PAD, y);
			divider.stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
			this.cardLayer.addChild(divider);
		}

		for (let i = 0; i < this.cards.length; i++) {
			const sprite = this.makeSprite(i, cardW, cardH);
			// Inset the content by the border so the outset frame sits inside the cell.
			sprite.position.set(this.cellX(i % cols), this.cardCellY(Math.floor(i / cols)));
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

	/**
	 * Scroll the grid back to its first row. Rebuilds deliberately keep the scroll
	 * offset (a resize or a column change shouldn't lose the player's place), so a
	 * host that swaps the cards for a different *set* — the roster's pager turning a
	 * page — calls this to open the new page at its top.
	 */
	scrollToTop(): void {
		if (this.layout !== 'grid') return;
		this.pan.y = 0;
		this.clampPan();
		this.applyTransform();
	}

	/**
	 * Toggle a recycle-style selection overlay: when `active`, every card whose
	 * index isn't in `indices` is dimmed and the selected ones stay at full opacity.
	 * Applied to the live sprites without a rebuild, so the idle animations keep
	 * running as the player taps cards on and off.
	 */
	setSelection(active: boolean, indices: Set<number>): void {
		this.selectionActive = active;
		this.selectedIndices = indices;
		for (let i = 0; i < this.cardSprites.length; i++) {
			this.cardSprites[i].alpha = this.selectionAlpha(i);
		}
	}

	/** A card's opacity under the current selection overlay: dimmed unless selected. */
	private selectionAlpha(index: number): number {
		return !this.selectionActive || this.selectedIndices.has(index) ? 1 : 0.3;
	}

	/** Cell origin (the content's top-left, past the outset border inset) by column. */
	private cellX(col: number): number {
		return NAV_PAD + this.grid.border + col * (this.grid.cellW + NAV_GAP);
	}

	/** Left edge of a band cell's content (past its border inset). */
	private bandCellX(cell: number): number {
		return NAV_PAD + this.grid.bandBorder + cell * (this.grid.bandCellW + NAV_GAP);
	}

	/** Top of the band's cards (past the border inset). The band is one row. */
	private bandCardTop(): number {
		return NAV_PAD + this.grid.bandBorder;
	}

	/** Top of the Remove buttons, directly under the band's cards. */
	private bandButtonTop(): number {
		const { bandCardH, bandBorder, buttonGap } = this.grid;
		return NAV_PAD + bandCardH + 2 * bandBorder + buttonGap;
	}

	/** Cell origin of a roster card's row — below the whole slot band. */
	private cardCellY(row: number): number {
		return (
			NAV_PAD + this.grid.slotBandH + this.grid.border + row * (this.grid.cellH + NAV_GAP)
		);
	}

	/**
	 * Draw the team band from the current geometry: the summary cell, then a card where
	 * a slot is filled — with a Remove button beneath it — and a card-sized empty frame
	 * where it isn't. Split out from the grid build so the band changing (a pick joining
	 * the team) can redraw it alone.
	 */
	private layoutSlots(): void {
		const { bandCardW, bandCardH } = this.grid;
		if (bandCardW === 0) return;

		const y = this.bandCardTop();
		// The summary takes the first cell of the band, so the picks start one along.
		const leading = this.summary ? 1 : 0;
		if (this.summary) {
			this.addDecor(
				this.makeSummaryCell(this.bandCellX(0), y, bandCardW, bandCardH, this.summary)
			);
		}

		for (let i = 0; i < this.slots.length; i++) {
			const slot = this.slots[i];
			const x = this.bandCellX(i + leading);
			if (slot) {
				this.makeSlotSprite(slot, bandCardW, bandCardH).position.set(x, y);
				this.addDecor(this.makeRemoveButton(x, this.bandButtonTop(), bandCardW));
			} else {
				this.addDecor(this.makeEmptySlot(x, y, bandCardW, bandCardH));
			}
		}
	}

	/** Add a non-card piece of the slot band to the layer and track it for teardown. */
	private addDecor(decor: Container): void {
		this.cardLayer.addChild(decor);
		this.slotDecor.push(decor);
	}

	/** Redraw just the slot row, leaving every card sprite (and its running idle
	 * animation) alone. Only valid while the row count and geometry hold. */
	private rebuildSlots(): void {
		for (const sprite of this.slotSprites) sprite.destroy();
		for (const decor of this.slotDecor) decor.destroy();
		this.slotSprites = [];
		this.slotDecor = [];
		this.layoutSlots();
	}

	/**
	 * The Remove button under a filled slot: a card-wide pill with a centred label.
	 * Drawn, not interactive — the grid hit-tests clicks against its own geometry, and
	 * {@link slotButtonIndexAt} matches this geometry.
	 */
	private makeRemoveButton(x: number, y: number, cardW: number): Container {
		const { buttonH } = this.grid;
		const group = new Container();
		const pill = new Graphics();
		pill.roundRect(x, y, cardW, buttonH, buttonH / 2);
		pill.fill({ color: 0x000000, alpha: 0.55 });
		pill.stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
		group.addChild(pill);

		const label = new Text({
			text: 'Remove',
			style: {
				fontFamily: 'sans-serif',
				fontSize: Math.max(9, Math.round(buttonH * 0.55)),
				fontWeight: '600',
				fill: 0xffffff
			}
		});
		label.anchor.set(0.5, 0.5);
		label.position.set(x + cardW / 2, y + buttonH / 2);
		group.addChild(label);
		return group;
	}

	/**
	 * The team's summary, in a card-sized cell at the head of the band: the colour it
	 * is led by, the show that lead belongs to and the region it was claimed in — the
	 * same three facts the side panel lists, so the canvas doesn't send the player back
	 * to the sidebar to read them. Values are em-dashes until the team has a lead.
	 */
	private makeSummaryCell(
		x: number,
		y: number,
		cardW: number,
		cardH: number,
		summary: SlotSummary
	): Container {
		const group = new Container();
		const radius = Math.max(6, cardW * 0.05);
		const panel = new Graphics();
		panel.roundRect(x, y, cardW, cardH, radius);
		panel.fill({ color: 0x000000, alpha: 0.35 });
		panel.stroke({ width: Math.max(1, cardBorderWidth(cardW) / 2), color: 0xffffff, alpha: 0.25 });
		group.addChild(panel);

		const pad = Math.round(cardW * 0.09);
		const labelSize = Math.max(8, Math.round(cardW * 0.062));
		const valueSize = Math.max(10, Math.round(cardW * 0.082));
		const rows: { label: string; value: string; swatch: number | null }[] = [
			{ label: 'COLOUR', value: summary.color ?? '—', swatch: summary.colorHex },
			{ label: 'SHOW', value: summary.showName ?? '—', swatch: null },
			{ label: 'REGION', value: summary.regionName ?? '—', swatch: null }
		];
		// Three evenly-spaced blocks down the cell, each a caption over its value.
		const blockH = (cardH - pad * 2) / rows.length;
		const maxTextW = cardW - pad * 2;

		rows.forEach((row, index) => {
			const top = y + pad + index * blockH;
			const caption = new Text({
				text: row.label,
				style: {
					fontFamily: 'sans-serif',
					fontSize: labelSize,
					fontWeight: '700',
					fill: 0xffffff
				}
			});
			caption.alpha = 0.5;
			caption.position.set(x + pad, top);
			group.addChild(caption);

			// The colour row leads with a dot of the colour itself, so it reads without
			// having to know the names.
			const swatchR = row.swatch != null ? valueSize * 0.42 : 0;
			const valueX = x + pad + (swatchR > 0 ? swatchR * 2 + Math.round(cardW * 0.03) : 0);
			const valueY = top + labelSize * 1.5;
			if (row.swatch != null) {
				const dot = new Graphics();
				dot.circle(x + pad + swatchR, valueY + valueSize * 0.6, swatchR);
				dot.fill(row.swatch);
				group.addChild(dot);
			}

			const value = new Text({
				text: row.value,
				style: {
					fontFamily: 'sans-serif',
					fontSize: valueSize,
					fontWeight: '600',
					fill: 0xffffff
				}
			});
			// Trim to the cell so a long show or place name can't spill out of it.
			const limit = maxTextW - (valueX - (x + pad));
			let trimmed = row.value;
			while (trimmed.length > 1 && value.width > limit) {
				trimmed = trimmed.slice(0, -1);
				value.text = `${trimmed.trimEnd()}…`;
			}
			value.position.set(valueX, valueY);
			group.addChild(value);
		});

		return group;
	}

	/** Build one card sprite, add it to the layer, and track it. */
	private makeSprite(index: number, cardW: number, cardH: number): CardSprite {
		const sprite = new CardSprite({
			card: this.cards[index],
			width: cardW,
			height: cardH,
			app: this.app,
			flipped: this.flipped
		});
		// Preserve any active selection dimming across a rebuild (e.g. a filter change).
		sprite.alpha = this.selectionAlpha(index);
		this.cardLayer.addChild(sprite);
		this.cardSprites.push(sprite);
		return sprite;
	}

	/** Build one filled slot's card. Never dimmed — the selection overlay is the
	 * roster's, and the slots aren't part of it. */
	private makeSlotSprite(card: CardModel, cardW: number, cardH: number): CardSprite {
		const sprite = new CardSprite({
			card,
			width: cardW,
			height: cardH,
			app: this.app,
			flipped: this.flipped
		});
		this.cardLayer.addChild(sprite);
		this.slotSprites.push(sprite);
		return sprite;
	}

	/**
	 * An empty slot: a card-sized, card-shaped outline standing in for the pick that
	 * isn't there yet. Matched to {@link CardSprite}'s corner radius so a filled and an
	 * empty slot read as the same object in two states.
	 */
	private makeEmptySlot(x: number, y: number, cardW: number, cardH: number): Graphics {
		const radius = Math.max(6, cardW * 0.05);
		const slot = new Graphics();
		slot.roundRect(x, y, cardW, cardH, radius);
		slot.fill({ color: 0x000000, alpha: 0.15 });
		slot.stroke({ width: Math.max(1, cardBorderWidth(cardW) / 2), color: 0xffffff, alpha: 0.25 });
		return slot;
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
		const { cols, cardW, cardH, border, cellW, cellH, slotBandH } = this.grid;
		if (cardW === 0) return null;
		const worldX = sx - this.pan.x;
		const worldY = sy - this.pan.y;
		// The roster starts below the slot band; a point above it is over the team
		// section, and must not fall through to whatever card index sits there.
		const cardsTop = NAV_PAD + slotBandH;
		if (worldY < cardsTop) return null;
		const col = Math.floor((worldX - NAV_PAD) / (cellW + NAV_GAP));
		const row = Math.floor((worldY - cardsTop) / (cellH + NAV_GAP));
		if (col < 0 || col >= cols || row < 0) return null;
		// Card-local coords within the cell (past the border inset); reject points that
		// land on the border or in the gutter between cards.
		const localX = worldX - NAV_PAD - col * (cellW + NAV_GAP) - border;
		const localY = worldY - cardsTop - row * (cellH + NAV_GAP) - border;
		if (localX < 0 || localY < 0 || localX > cardW || localY > cardH) return null;
		const index = row * cols + col;
		return index >= 0 && index < this.cards.length ? index : null;
	}

	/**
	 * Screen point → the index of the slot whose Remove button is under it, or null.
	 * Mirrors the geometry {@link makeRemoveButton} draws; only filled slots have one.
	 */
	private slotButtonIndexAt(sx: number, sy: number): number | null {
		const { bandCells, bandCellW, bandCardW, bandBorder, buttonH } = this.grid;
		if (bandCells === 0 || bandCardW === 0) return null;
		const worldX = sx - this.pan.x;
		const worldY = sy - this.pan.y;
		const top = this.bandButtonTop();
		if (worldY < top || worldY > top + buttonH) return null;
		const cell = Math.floor((worldX - NAV_PAD) / (bandCellW + NAV_GAP));
		if (cell < 0 || cell >= bandCells) return null;
		const localX = worldX - NAV_PAD - cell * (bandCellW + NAV_GAP) - bandBorder;
		if (localX < 0 || localX > bandCardW) return null;
		// The summary, when present, holds the band's first cell — so the slots are one
		// along, and the summary itself has no button.
		const index = cell - (this.summary ? 1 : 0);
		return index >= 0 && index < this.slots.length && this.slots[index] ? index : null;
	}

	private localPoint(event: MouseEvent): { x: number; y: number } {
		const rect = this.app.canvas.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	private attachNavigation(): void {
		const canvas = this.app.canvas;
		canvas.addEventListener('wheel', this.onWheel, { passive: false });
		canvas.addEventListener('click', this.onClick);
	}

	private detachNavigation(): void {
		const canvas = this.app.canvas;
		if (!canvas) return;
		canvas.removeEventListener('wheel', this.onWheel);
		canvas.removeEventListener('click', this.onClick);
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

	/**
	 * A click selects the card under it, or — when it lands on a slot's Remove button
	 * — drops that pick. The button wins: it is drawn over no card. With no drag to
	 * disambiguate against, a click is a click.
	 */
	private onClick = (event: MouseEvent): void => {
		const { x, y } = this.localPoint(event);
		const slotButton = this.slotButtonIndexAt(x, y);
		if (slotButton != null) {
			this.onSlotRemove?.(slotButton);
			return;
		}
		const cardIndex = this.cardIndexAt(x, y);
		if (cardIndex != null) this.onCardTap?.(cardIndex);
	};
}
