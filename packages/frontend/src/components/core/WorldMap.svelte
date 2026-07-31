<script lang="ts">
	import classNames from 'classnames';
	import { mount, onMount, onDestroy, unmount } from 'svelte';
	import type L from 'leaflet';
	import TeamLineup from '$components/core/TeamLineup.svelte';
	import TownChallenge from '$components/core/TownChallenge.svelte';
	import BoosterBox from '$components/core/pack/BoosterBox.svelte';
	import { iconMarkup } from '$components/core/icon-markup';
	import { showIconName } from '$utils/show/show-icon';
	import { levelIndexForView } from '$utils/geo/level-of-detail';
	import type { MapBoosterBox, MapCircle, MapLine, MapMarker, MapOverlay } from '$types/map.type';

	let {
		center = [20, 0] as [number, number],
		zoom = 2,
		minZoom = 2,
		maxZoom = 19,
		overlays = [],
		circles = [],
		lines = [],
		markers = [],
		markerLevels = null,
		boxes = [],
		highlightId = null,
		highlightStyle = null,
		selectedIds = new Set<string>(),
		selectedStyle = null,
		dimmedIds = new Set<string>(),
		hiddenLineUrls = new Set<string>(),
		focusBounds = null,
		zoomBounds = null,
		zoomStops = [],
		markersBlurred = false,
		currentZoom = $bindable(zoom),
		activeLevel = $bindable(0),
		currentCenter = $bindable(center),
		classes = ''
	}: {
		/** Initial map centre as [lat, lng]. */
		center?: [number, number];
		zoom?: number;
		minZoom?: number;
		maxZoom?: number;
		/**
		 * GeoJSON overlays drawn in array order (last = topmost). The data is fetched
		 * once at mount, but the array itself is read live: handing over a new array
		 * repaints every layer from its (possibly per-feature) `style`, so a caller
		 * can recolour the map as its state moves. Only the styles are re-read — the
		 * urls and their order must stay put, or a layer would be painted with
		 * another's style.
		 */
		overlays?: MapOverlay[];
		/** Standalone circular regions drawn above the overlays. */
		circles?: MapCircle[];
		/** Standalone straight lines drawn above the overlays. */
		lines?: MapLine[];
		/**
		 * Image-and-caption pins dropped above the overlays; rebuilt reactively.
		 * Treated as a single level of detail — for zoom-driven level-of-detail,
		 * pass `markerLevels` instead.
		 */
		markers?: MapMarker[];
		/**
		 * A stack of pin renderings, ordered coarsest → finest (e.g. territory
		 * pins, then province pins, …). At any view the map shows the finest level
		 * whose pins stay legible in the viewport and steps down to a coarser one
		 * as it zooms out, so a dense breakdown never forbids zooming out — it just
		 * falls back to the previous rendering. Takes precedence over `markers`.
		 */
		markerLevels?: MapMarker[][] | null;
		/**
		 * Booster boxes stood on individual points (the festa-major towns the booster
		 * window reaches) — a town keeps its pin and gets a box, drawn as one more block of
		 * that pin's column where it has one, and on the point itself where the tier gave
		 * it none. How one is marked is the reader's pick and not the zoom (see
		 * markKindForBox): the picked town's box is drawn whole, every other town is a disc
		 * of the box's own stock. The tier only says whether towns are marked at all —
		 * every tier but the coarsest (see marksTowns).
		 */
		boxes?: MapBoosterBox[];
		/** `properties.id` of the one feature to paint with `highlightStyle`. */
		highlightId?: string | null;
		/** Style merged over the highlighted feature's base style. */
		highlightStyle?: L.PathOptions | null;
		/**
		 * `properties.id`s of every feature that belongs to the selected region —
		 * painted with `selectedStyle` and kept painted (unlike the transient hover),
		 * so the whole selected location stays filled. Reactive: repaints when the
		 * selection changes.
		 */
		selectedIds?: Set<string>;
		/** Style merged over the base style of each feature in `selectedIds`. */
		selectedStyle?: L.PathOptions | null;
		/**
		 * `properties.id`s of every feature sitting clear of the selected region —
		 * painted with each overlay's own `dimmedStyle`, the polygon counterpart of a
		 * dimmed pin. Ids may name features of any overlay (each layer decides how it
		 * fades). A feature in `selectedIds` is never dimmed. Reactive: repaints when
		 * the selection changes.
		 */
		dimmedIds?: Set<string>;
		/**
		 * `url`s of the overlays whose stroke should be suppressed. A hidden overlay
		 * keeps its fill but drops its border, so sub-division lines don't crowd the
		 * tier the map is currently focused on. Reactive: repaints as the selection
		 * changes which tier is imaged.
		 */
		hiddenLineUrls?: Set<string>;
		/**
		 * When set, the map animates to frame this `[[south, west], [north, east]]`
		 * box (e.g. the selected region's polygons). A fresh array reference re-fits
		 * even to the same box, so re-selecting a region re-centres it.
		 */
		focusBounds?: [[number, number], [number, number]] | null;
		/**
		 * When set, the map zooms until this `[[south, west], [north, east]]` box stands whole
		 * in the canvas — and moves nothing else. The same fit `focusBounds` frames to, minus
		 * the framing: the view stays where it is looking and only the scale changes, which is
		 * what a caller asking for a *tier* rather than for a place wants, since the tier drawn
		 * is decided by the size of the region the centre is in and not by where it sits (see
		 * boundsFitAtZoom). A fresh array re-zooms even to the same box.
		 */
		zoomBounds?: [[number, number], [number, number]] | null;
		/**
		 * The boxes whose fits are the zooms a wheel comes to rest at, coarsest first — the
		 * ladder of regions the view is inside, which is the ladder the breadcrumb bar draws.
		 * A notch of the wheel is one step along it rather than an amount of zoom, so a spin
		 * settles where a tier stands whole in the canvas and never between two (see
		 * wheelStopZooms). Read live, so the ladder can be rebuilt as the view moves; empty
		 * leaves the wheel stepping the map's own whole zoom levels.
		 */
		zoomStops?: [[number, number], [number, number]][];
		/**
		 * Blur every pin and every box off the map, and bring them back when it goes false.
		 *
		 * For a full view raised over the map (see FullScreenModal): the terrain is still the
		 * ground the sheet is laid on, but the things standing *on* the terrain are furniture,
		 * and furniture read through a sheet is furniture nobody is reading. The polygons and
		 * the tiles are deliberately untouched — what blurs is what the map draws over them.
		 *
		 * The pins are Leaflet's DOM and not this component's, so this is the one thing here
		 * that cannot be a Svelte transition the way the plates over the map are: unmounting
		 * them is a rebuild of every pin and every statue in it. It is the two panes that blur
		 * instead, in the same amount and over the same time as those transitions, so the whole
		 * of what stands over the map goes at once (see BLUR_CLASSES).
		 */
		markersBlurred?: boolean;
		/** Live map zoom level, kept in sync with the map (bindable). */
		currentZoom?: number;
		/**
		 * Index into `markerLevels` of the rendering currently on screen (0 = the
		 * coarsest). Bindable, so the parent can mirror the zoom-driven tier in the
		 * rest of its UI (e.g. which polygon borders and sidebar level to show).
		 */
		activeLevel?: number;
		/** Live map centre as [lat, lng], kept in sync with the map (bindable). */
		currentCenter?: [number, number];
		/** Extra Tailwind classes for the map container. */
		classes?: string;
	} = $props();

	let mapContainer: HTMLDivElement;
	// The Leaflet module + map instance, captured at mount so the reactive
	// $effects (markers, focus, restyle) can drive the map after it exists.
	let Leaf: typeof import('leaflet') | null = null;
	let mapInstance: L.Map | null = null;
	// The geoJSON layer groups, in overlay order, captured at mount so the
	// highlight/hidden-stroke $effect can repaint reactively.
	let overlayGroups: L.GeoJSON[] = [];
	// The pins layer, rebuilt whenever the markers prop changes.
	let markerLayer: L.LayerGroup | null = null;
	// The sides standing on the pins on screen. A pin is plain DOM built by markerElement,
	// except for this one thing: clearing the layer only detaches a mounted component, and
	// a statue runs a frame timer of its own, so every rebuild unmounts the previous crop
	// first rather than leaving it animating for a pin no longer on the map.
	let pinMounts: Record<string, unknown>[] = [];
	// The festa-box layer, rebuilt whenever the boxes prop changes. Kept separate from the
	// region pins — it marks its towns its own way, and at the coarsest tier not at all
	// (see marksTowns) — and drawn under them.
	let boxLayer: L.LayerGroup | null = null;
	// The boxes are given a Leaflet pane of their own, and not for the stacking. The
	// marker pane is a place no <img> can be sized in: leaflet.css resets every image in
	// it to `width: auto` with `max-width` and `max-height` at none and !important
	// (`.leaflet-container .leaflet-marker-pane img`, a rule for map tiles), which two
	// class names cannot outrank — so a booster box came out correct in every part of
	// itself that is a div, while its cover and its wordmark drew at whatever pixel size
	// the file happens to be and hung off the box in every direction. Everything Leaflet
	// does with a marker it does in any pane, and that selector names one: in a pane of
	// its own the component's own widths are simply left standing.
	const BOX_PANE = 'festaBoxPane';
	// The BoosterBox components standing in that layer, tracked for the same reason the
	// pins' mounts are: clearing the layer only detaches their DOM, and a box left
	// mounted holds its poster and its logo for a town no longer on screen.
	let boxMounts: Record<string, unknown>[] = [];
	// Which pin tier is on screen and how many there are — the box layer marks a town only
	// where the pins have got fine enough for a town to be read off one (see marksTowns),
	// so it needs both the tier and the two ends of the stack. Set by rebuildMarkers, which is what decides the tier, and
	// read by rebuildBoxes, which runs right after it wherever the view changes (the
	// moveend handler, the resize observer, and the two $effects in that order).
	//
	// Plain variables and not $state on purpose: the box layer is rebuilt in the same
	// breath as the pins, so it wants the values and not a subscription to them — an effect
	// woken by the tier changing would rebuild a second time and remount every box's
	// pictures for nothing.
	let pinLevelIndex = 0;
	let pinLevelCount = 0;
	// Watches the map container so Leaflet re-projects when the container resizes
	// (e.g. a side panel opening reserves horizontal space). Torn down on destroy.
	let resizeObserver: ResizeObserver | null = null;
	// municipality `properties.id` → the featureIds of the pin region it currently
	// belongs to (at the tier on screen), rebuilt with the pins. Lets hovering
	// anywhere in a pinned region's polygons light that whole region, not just the pin.
	let regionByFeatureId = new Map<string, string[]>();
	// For every overlay that carries a hoverStyle, its group + hoverStyle + a
	// `properties.id → layer` lookup, so a pin can light up all of its region's
	// polygons with the same hover the polygons show on their own mouseover.
	let hoverLayers: { group: L.GeoJSON; hoverStyle: L.PathOptions; byId: Map<string, L.Path> }[] = [];
	// Flipped true once the map and overlays are on the map, so the reactive
	// $effects know the layers exist before they touch them.
	let ready = $state(false);
	// Whether the map is in the middle of a zoom — from the moment one starts to the moveend
	// that ends it. While it is, the map carries no pins at all (see clearMarkers). A plain
	// variable and not $state: it is read by the code that builds the pins, never by anything
	// drawn, and an effect woken by it would be the very rebuild it exists to refuse.
	let midZoom = false;
	// Each drawn pin's rendered size in pixels, keyed by marker id, written by rebuildMarkers
	// off the pins it has just put on the map and read by the framing (see viewForBounds).
	// A plain variable for the same reason `midZoom` is one: nothing is drawn from it, and an
	// effect woken by it would be woken by the very rebuild that fills it.
	let pinExtents = new Map<string, L.Point>();

	// A feature's base style, plus the highlight merged on when it's the chosen
	// one and its stroke dropped when its overlay is hidden. Called both at first
	// paint and by resetStyle, so reading the live props keeps both effects
	// through hover resets.
	function styleFor(overlay: MapOverlay, feature?: GeoJSON.Feature): L.PathOptions {
		// A layer may hand over one style for the whole tier or a function asked per
		// feature — the latter is how a region is painted in its own colour.
		let style = typeof overlay.style === 'function' ? overlay.style(feature) : overlay.style;
		if (highlightId != null && highlightStyle && feature?.properties?.id === highlightId) {
			style = { ...style, ...highlightStyle };
		}
		// Fade everything clear of the selection with this overlay's own dim style, the
		// polygon counterpart of a dimmed pin. Applied before the selected style so a
		// feature that is somehow in both still reads as selected.
		if (overlay.dimmedStyle && feature?.properties?.id != null && dimmedIds.has(String(feature.properties.id))) {
			style = { ...style, ...overlay.dimmedStyle };
		}
		// Keep every feature of the selected region painted with the selected style,
		// so the whole selected location's background stays filled (not just on hover).
		if (selectedStyle && feature?.properties?.id != null && selectedIds.has(String(feature.properties.id))) {
			style = { ...style, ...selectedStyle };
		}
		// Suppress the stroke of a hidden overlay while keeping its fill, so a
		// sub-division border no longer draws over a coarser tier's region.
		if (hiddenLineUrls.has(overlay.url)) {
			style = { ...style, opacity: 0 };
		}
		return style;
	}

	$effect(() => {
		// Repaint when the highlight or the hidden-stroke set changes: resetStyle
		// re-runs each group's style option, which now reflects the new state.
		// `overlays` is in there too: a caller that recolours its layers hands over a
		// fresh array, and each group reads its overlay back out of it by index (see
		// onMount), so the new styles land without refetching a single polygon.
		void overlays;
		void highlightId;
		void highlightStyle;
		void selectedIds;
		void selectedStyle;
		void dimmedIds;
		void hiddenLineUrls;
		for (const group of overlayGroups) group.resetStyle();
	});

	$effect(() => {
		// Rebuild the pins whenever the parent swaps the markers (e.g. the selection
		// changes which regions are imaged, or supplies a new level stack). Gated on
		// `ready` so a set passed before mount still applies once the layer exists.
		void markers;
		void markerLevels;
		if (ready) rebuildMarkers();
	});

	$effect(() => {
		// Rebuild the festa boxes whenever the parent swaps them (e.g. a new day's
		// festa-major towns arrive). Gated on `ready` so a set passed before mount
		// still applies once the layer exists. The pins go with them: at the town tier a
		// box is drawn inside the pin of the town it belongs to (see markerElement), so a
		// new day's boxes are a new set of pins as much as a new set of boxes.
		void boxes;
		if (ready) {
			rebuildMarkers();
			rebuildBoxes();
		}
	});

	$effect(() => {
		// Take the pins and the boxes out of focus while a full view is up over the map, and
		// bring them back when it goes (see `markersBlurred`). The two panes and nothing else:
		// the terrain and the region polygons are the ground the sheet is laid on and stay as
		// they are.
		//
		// Classes on Leaflet's own elements rather than a style written on them, because the
		// blur is a look and looks are Tailwind's here. The transition is added in the same
		// breath and never taken off: it names `filter` and `opacity` alone, so Leaflet is left
		// to move its panes by `transform` at its own speed, as a pane the browser is easing
		// would drag behind every pan.
		const blurred = markersBlurred;
		if (!ready || !mapInstance) return;
		for (const pane of [mapInstance.getPane('markerPane'), mapInstance.getPane(BOX_PANE)]) {
			if (!pane) continue;
			pane.classList.add('transition-[filter,opacity]', 'duration-[250ms]', 'ease-in-out');
			if (blurred) pane.classList.add('blur-sm', 'opacity-0');
			else pane.classList.remove('blur-sm', 'opacity-0');
		}
	});

	$effect(() => {
		// Frame the requested region. Gated on `ready` (a $state flag) so a focus set
		// before the map mounts still applies once the instance exists.
		void ready;
		if (!focusBounds || !mapInstance) return;

		// The zoom at which the box stands inside the canvas with the margin around it, and
		// the centre of the box in the centre of the canvas — so the region is framed whole,
		// with room on all four sides.
		//
		// That is also, and deliberately, the zoom at which the map unfolds the region into
		// its parts: "does this region stand inside the canvas" is the very question the tier
		// rule asks, against this very margin (see boundsFitAtZoom), and the tier it draws is
		// the children of the coarsest region that answers yes. So framing a place and opening
		// it are one movement rather than two rules kept in step by hand — a click frames what
		// it named and pins what is inside it, which is what can be clicked next. A leaf has
		// nothing to unfold into and simply comes to rest framed whole, which is all a town was
		// ever going to do.
		//
		// This used to be stepped one zoom deeper to force that unfolding, and the step was
		// dropped because a zoom was a doubling: the region it was framing came out at up to
		// twice the canvas, so picking a place could put its far side off the screen. Nothing
		// is stepped now and nothing needs to be — the zoom is fractional (see zoomSnap), so
		// the framing lands exactly on the fit rather than up to a doubling short of it, and
		// exactly on the fit is the side of the threshold the children are drawn on.
		//
		// What is actually framed, though, is the pins and not the box (see viewForBounds):
		// what a reader is brought to a place to look at is the marks the map makes on it,
		// and those are the thing that has to come out whole on the canvas.
		const view = viewForBounds(focusBounds);
		mapInstance.setView(view.centre, view.zoom, { animate: true });
	});

	$effect(() => {
		// Zoom to fit a box without going to it. The zoom is the region's own fit, against the
		// same margin the framing starts from, so a caller asking for the zoom at which a
		// region stands whole gets it — and, since the level-of-detail rule measures a region's
		// size and not its place (see boundsFitAtZoom), the tier the map draws lands where the
		// caller asked for it.
		//
		// Where the framing goes on to fit the pins as well (see viewForBounds), this stops at
		// the region: fitting pins is fitting them around a centre, and this is the one request
		// that deliberately leaves the centre alone. So a rung pressed on the ladder can land a
		// tenth of a level tighter than pressing the pin would have — the same tier, the same
		// place, read at the region's own fit rather than at its marks'.
		void ready;
		if (!zoomBounds || !mapInstance) return;
		mapInstance.setZoom(mapInstance.getBoundsZoom(zoomBounds, false, focusPadding()), {
			animate: true
		});
	});

	// The margin kept clear between a region and the edge of the canvas, per side: a share
	// of the canvas, capped in pixels, so a small map gives up a margin it can afford rather
	// than the same 24px a large one hardly notices.
	//
	// One margin, read by both halves of the same statement: the framing puts a region
	// inside it (focusPadding), and the level of detail asks whether a region is inside it
	// (boundsFitAtZoom). They were a 4% margin and a flat 85% of the canvas, two figures for
	// one idea — so a framed region measured as fitting or as overflowing depending on how far
	// `getBoundsZoom` had snapped down for it, and clicking a pin unfolded the map into the
	// region for some regions and left it pinning the region itself for others.
	const FOCUS_MARGIN = 24;
	const FOCUS_MARGIN_SHARE = 0.04;

	/** That margin against the canvas as it stands, in pixels, per side. */
	function focusMargin(): L.Point {
		const size = mapInstance!.getSize();
		return Leaf!.point(
			Math.min(FOCUS_MARGIN, size.x * FOCUS_MARGIN_SHARE),
			Math.min(FOCUS_MARGIN, size.y * FOCUS_MARGIN_SHARE)
		);
	}

	// The same margin in the form `getBoundsZoom` wants it: it takes the padding off the
	// canvas ONCE for the whole axis, so a margin wanted at both ends is handed over
	// doubled.
	function focusPadding(): L.Point {
		return focusMargin().multiplyBy(2);
	}

	// The geographic centre of a `[[south, west], [north, east]]` box.
	function focusBoundsCentre(
		bounds: [[number, number], [number, number]]
	): [number, number] {
		const [[south, west], [north, east]] = bounds;
		return [(south + north) / 2, (west + east) / 2];
	}

	// The most zoom a framing will give up to get its pins whole: one level, which halves how
	// far apart they land on the canvas. Bounded, rather than searched down to the map's own
	// floor, for two reasons. A pin that cannot be seated at any zoom — a picked town's column
	// is taller than a short window whatever the map does — would pull the view out to nothing
	// for no gain. And the tier the map draws is decided by what fits the canvas (see
	// levelForView), so a framing free to fly far enough out would fold the very pins it was
	// framing back into their parents. A level is far more than the overhang of a plate and
	// well short of the gap between one tier and the next.
	const PIN_FIT_BACKOFF = 1;

	// What a pin nobody has measured is taken to be: its plate, at the widest a plate goes
	// (`max-w-[15rem]`) and the height one comes out at (a `size-10` tile in `p-1.5`, under the
	// `mt-1` it hangs by). Every pin has a plate and most pins are nothing else, so a framing
	// that reaches a region whose pins are not on screen to be read is out by whatever statues
	// and a booster box would have added, rather than out by a whole pin.
	const PIN_PLATE_EXTENT: [number, number] = [240, 56];

	// The zoom and centre a framing settles on: the highest zoom at which every pin this view
	// is about to draw for the region stands whole on the canvas, centred on what those pins
	// cover rather than on the box around the region.
	//
	// The box is what used to be framed, and a box is not what is being looked at. A pin is
	// drawn in pixels and not in the projection — it is the same size whatever the map does
	// (see clearMarkers) — and the picked town's is some 700px of plate, statues, booster box
	// and siege bar centred on the town's point. Framing the polygon put the middle of the
	// polygon on the middle of the canvas, which is not even where the pin stands (a pin takes
	// the region's own centroid, not the centre of the box around it), and then zoomed until
	// the town filled the canvas — at which point the mark standing on the town hung off the
	// top of the screen and the bottom. So the pins are measured as they are drawn (see
	// rebuildMarkers), their boxes are what the canvas is fitted to, and the centre is the
	// middle of what they cover.
	//
	// Giving up zoom only helps a region that draws SEVERAL pins: it brings their points
	// together while each keeps its size. So that is the only case it happens in — a region
	// whose pins already fit is framed at the zoom it asked for, and a pin that fits at no
	// zoom is centred and left to clip equally at both ends, no zoom having been able to
	// help it.
	function viewForBounds(bounds: [[number, number], [number, number]]): {
		centre: [number, number];
		zoom: number;
	} {
		const fitZoom = mapInstance!.getBoundsZoom(bounds, false, focusPadding());
		const centre = focusBoundsCentre(bounds);
		const levels = markerLevelStack();
		// The tier this framing is about to draw, asked exactly as the map will ask it on
		// arrival (see levelForView): the children of the coarsest region that fits. Asked at
		// the zoom the region itself called for, since that is the zoom the answer is about —
		// the search below only ever gives zoom up, and giving zoom up makes more regions fit
		// rather than fewer, which is what PIN_FIT_BACKOFF is bounded for.
		const tier = levels.length
			? levelIndexForView(levels, centre, (box) => boundsFitAtZoom(box, fitZoom))
			: 0;
		const pins = (levels[tier] ?? []).filter((marker) => withinBounds(marker.position, bounds));
		if (!pins.length) return { centre, zoom: fitZoom };

		const floor = Math.max(fitZoom - PIN_FIT_BACKOFF, mapInstance!.getMinZoom());
		let zoom = fitZoom;
		// The pins' spread grows with the zoom while their own sizes do not, so "do they fit"
		// is answered no above some zoom and yes below it, and a few halvings between the two
		// ends land on it to a thousandth of a level — closer than a view can be looked at.
		// Only worth asking when the two ends disagree: fitting at the top means there is
		// nothing to gain, and fitting at neither end means there is nothing to gain either,
		// so the framing keeps the zoom the region asked for rather than pulling out for a pin
		// no zoom can seat.
		if (!pinsFitAtZoom(pins, fitZoom) && pinsFitAtZoom(pins, floor)) {
			let low = floor;
			let high = fitZoom;
			for (let step = 0; step < 10; step++) {
				const mid = (low + high) / 2;
				if (pinsFitAtZoom(pins, mid)) low = mid;
				else high = mid;
			}
			zoom = low;
		}
		return { centre: pinsCentre(pins, zoom), zoom };
	}

	// The pixel box these pins stand inside at a zoom: each one's point projected, then grown
	// by half its rendered size in every direction — a pin is centred on its point (see
	// classNamesFor), so it reaches as far above the point as below it.
	function pinsPixelBox(
		pins: MapMarker[],
		zoom: number
	): { minX: number; minY: number; maxX: number; maxY: number } {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const pin of pins) {
			const at = mapInstance!.project(pin.position, zoom);
			const extent = pinExtents.get(pin.id);
			const halfX = (extent ? extent.x : PIN_PLATE_EXTENT[0]) / 2;
			const halfY = (extent ? extent.y : PIN_PLATE_EXTENT[1]) / 2;
			minX = Math.min(minX, at.x - halfX);
			maxX = Math.max(maxX, at.x + halfX);
			minY = Math.min(minY, at.y - halfY);
			maxY = Math.max(maxY, at.y + halfY);
		}
		return { minX, minY, maxX, maxY };
	}

	// Whether that box stands inside the canvas, against the same margin and the same pixel of
	// slack a region's own box is measured with (see boundsFitAtZoom) — one rule for what
	// "fits" means, whether the thing being fitted is a region or the marks standing on it.
	function pinsFitAtZoom(pins: MapMarker[], zoom: number): boolean {
		const { minX, minY, maxX, maxY } = pinsPixelBox(pins, zoom);
		const size = mapInstance!.getSize();
		const margin = focusMargin();
		return (
			maxX - minX <= size.x - 2 * margin.x + FIT_TOLERANCE &&
			maxY - minY <= size.y - 2 * margin.y + FIT_TOLERANCE
		);
	}

	// The place to put on the middle of the canvas: the middle of what the pins cover, read
	// back out of the projection. For the one pin a municipality draws this is exactly its
	// point, so the column standing on it is centred — which is the whole of what a town
	// framing was getting wrong.
	function pinsCentre(pins: MapMarker[], zoom: number): [number, number] {
		const { minX, minY, maxX, maxY } = pinsPixelBox(pins, zoom);
		const middle = mapInstance!.unproject(
			Leaf!.point((minX + maxX) / 2, (minY + maxY) / 2),
			zoom
		);
		return [middle.lat, middle.lng];
	}

	/** Whether a point stands inside a `[[south, west], [north, east]]` box. */
	function withinBounds(
		position: [number, number],
		bounds: [[number, number], [number, number]]
	): boolean {
		const [[south, west], [north, east]] = bounds;
		const [lat, lng] = position;
		return lat >= south && lat <= north && lng >= west && lng <= east;
	}

	// Build a pin's DOM: the one plate that says what the pin is — the tile at its left end,
	// the place's name and its show's beside it — and, on the picked town, the side holding
	// it standing under that plate. The wrapper is translated so its bottom centre sits on
	// the point (the marker itself is zero-sized, see rebuildMarkers), giving a pin that
	// stands above its region.
	//
	// The plate is built the same way whether or not there is a side under it: a pin is the
	// map's mark on a place, and the place does not stop being named because somebody is
	// standing on it. So the statues are added to the pin rather than drawn in place of any
	// part of it, and they go BELOW the plate — the mark reads first and what is holding the
	// town stands on the point under it, with the way to fight them last of all.
	function markerElement(marker: MapMarker): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className = classNamesFor(marker);

		// A square tile in the region's colour carrying the show's glyph, standing at the
		// left end of the plate below. The glyph is inlined rather than pointed at by an
		// <img> so it inherits the tile's ink (see icon-markup) — which is why the fill and
		// the ink arrive together in `frameClasses`. Sized through a CSS rule, which outranks
		// the svg's own 1em width/height attributes. Decorative: the show is named in the
		// line right beside it, so announcing the glyph too would read it twice. A pin with
		// neither a colour nor a glyph is lettering alone and skips the tile entirely.
		let tile: HTMLElement | null = null;
		if (marker.iconSvg || marker.frameClasses) {
			tile = document.createElement('div');
			tile.className =
				'flex size-10 flex-none items-center justify-center rounded-lg [&>svg]:size-7 ' +
				(marker.frameClasses ?? 'bg-base-100 text-base-content') +
				// A pin clear of the selection recedes by its colour, not by its lettering:
				// the fade is on the tile alone (see classNamesFor).
				(marker.dimmed ? ' opacity-50' : '');
			tile.setAttribute('aria-hidden', 'true');
			if (marker.iconSvg) tile.innerHTML = marker.iconSvg;
		}

		// One plate for everything the pin says AND everything it offers: the tile, the place
		// and the show on its head row, and under them the siege standing — on every pin that
		// has one — with the one control that acts on it where the caller gave the pin a
		// control at all (the picked town). The three separate chips this replaces
		// each carried their own card, which put two rounded boxes and a bordered tile on a
		// town where one mark belongs. The place is the pin's own name and takes the ink; the
		// show is what it flies and is lettered under it.
		//
		// The siege is in here rather than in a card of its own at the foot of the column for
		// the same reason: what a town is called, whose colour it flies and how far it has been
		// taken are one reading about one place, and printing them on two surfaces made the bar
		// look like a second mark about a second thing. It also settles the bar's width, which
		// nothing else could — the plate is the only part of a pin with a width of its own (see
		// classNamesFor), so a bar inside it is as wide as the name above it.
		//
		// Which is why it now has a floor as well as a ceiling: shrink-to-fit alone, a town
		// with a short name gave the bar under it a stub to draw in and the button beneath a
		// line to wrap on. 200px is the plate's least width whatever it is carrying, so a
		// pin's bar and button never come out narrower than they can be read at; the 15rem
		// cap above it is still what a long name truncates against.
		// The breadcrumb bar's surface — base-100 at four fifths — and not the flat black these
		// were printed in: a pin's plate and the bar naming where the map is looking are the one
		// chrome, and a pin is the thing that bar's path is walked with. Four fifths still keeps
		// the lettering off the terrain, which is the whole of what the black was for, while
		// letting the ground the pin stands on read faintly through the mark standing on it.
		const plate = document.createElement('div');
		plate.className =
			'mt-1 flex min-w-[200px] max-w-[15rem] flex-col gap-1.5 rounded-lg bg-base-100/80 p-1.5 text-white shadow-lg';

		// The head row: the tile at the left end, the two lines beside it.
		const head = document.createElement('div');
		head.className = 'flex items-center gap-2';

		if (tile) head.appendChild(tile);

		// `min-w-0` is what lets a line longer than the plate's own width truncate rather
		// than push the plate wider: a flex item's floor is its content otherwise.
		const lines = document.createElement('div');
		lines.className = 'flex min-w-0 flex-col text-left leading-tight';

		if (marker.subtitle) {
			const location = document.createElement('span');
			location.textContent = marker.subtitle;
			location.className = 'truncate text-xs font-semibold';
			lines.appendChild(location);
		}

		const caption = document.createElement('span');
		caption.textContent = marker.title;
		caption.className = 'truncate text-xs font-medium text-white/70';
		lines.appendChild(caption);

		head.appendChild(lines);
		plate.appendChild(head);

		// What can be done about the place, on the plate that names it: the siege standing and
		// the one control that acts on it, under the head row. Mounted and tracked exactly as
		// the team is — it runs a clock of its own when it is counting down.
		if (marker.challenge) {
			const bar = document.createElement('div');
			// The controls are the pin's, not the map's: without this a click on the button
			// would go on up to the marker (re-opening the region, re-framing the view under
			// the reader) and a drag begun on it would pan the map. Leaflet's own way of
			// saying "this DOM is a widget, not terrain".
			Leaf!.DomEvent.disableClickPropagation(bar);
			Leaf!.DomEvent.disableScrollPropagation(bar);
			pinMounts.push(mount(TownChallenge, { target: bar, props: { ...marker.challenge } }));
			plate.appendChild(bar);
		}

		wrap.appendChild(plate);

		// The side sitting on the region, where there is one: the very statues the roster
		// draws a team with — floor, character, name, place and all — three across, standing
		// on the point with the plate above them. Which pins get one is the caller's to say
		// (today, the picked town alone); every other pin is the plate by itself. It is the
		// same component (see TeamLineup), mounted into the pin's DOM because this is
		// imperative code rather than a template, and tracked so the next rebuild can unmount
		// it.
		if (marker.team?.length) {
			const frame = document.createElement('div');
			// A fixed 500px for the side together, shared out by the row. Fixed, so the
			// statues come out the same size whichever town is picked, rather than tracking
			// anything about the map or the region under them — up to the width of the screen,
			// which is the one thing 500px cannot ignore: a phone is narrower than that, and the
			// pin is centred on its point, so a side that size hung off both edges of the
			// viewport at once with the outer two statues half in the sea. The cap is in viewport
			// units and not a percentage of the pin, because there is no pin to take a percentage
			// of: a marker's own box is zero-sized (see rebuildMarkers) and everything hung on it
			// overflows that box on purpose, which is what centres it on the point. It is in
			// viewport units rather than behind a breakpoint for the same reason the statues are
			// flex-1 of the row — it says the thing itself, and it is inert on any screen with
			// room for the 500px the side asked for.
			frame.className = 'mt-1 w-[500px] max-w-[100vw] drop-shadow-lg';
			pinMounts.push(
				mount(TeamLineup, {
					target: frame,
					// A town's team is somebody else's side, so it faces the viewer
					// unmirrored, as a rival side does on the board.
					props: { members: marker.team, flipped: false, classes: 'gap-1' }
				})
			);
			wrap.appendChild(frame);
		}

		// What the town is offering, where the booster window has anything for this place and
		// the tier on screen marks towns at all (see boxForMarker) — the box on the town the
		// reader picked, the disc on every other. Either way it stands INSIDE the pin, as the
		// last block of the column: the plate says what the place is and what may be done
		// about it, the side under it is who is holding it, and the offer waiting there is
		// what the column ends on.
		//
		// In the pin, and not hung on the point by the box layer. The layer hangs a mark on a
		// point by its own centre, which is where the pin now stands too (see classNamesFor),
		// so a town with both had its plate lying across its disc — two marks about one town,
		// the same size, in the same place, the upper pane deciding which of them a reader
		// ever saw. Stacked in the column they are the same two marks in the order they are
		// read in, which is what a column is for. The box layer keeps the towns this tier
		// gave no pin to (see rebuildBoxes); a town with a pin carries its own mark.
		//
		// Its click is the mark's own — the pack behind a box, the town behind a disc (see
		// boxAction) — and not the pin's (the region), so the pin's marker must not see it:
		// the same guard the challenge bar takes, for the same reason.
		const boosterBox = boxForMarker(marker);
		if (boosterBox) {
			const kind = markKindForBox(boosterBox);
			const holder =
				kind === 'box' ? boxElement(boosterBox, 'pin') : discElement(boosterBox, 'pin');
			Leaf!.DomEvent.disableClickPropagation(holder);
			Leaf!.DomEvent.disableScrollPropagation(holder);
			const action = boxAction(boosterBox, kind);
			if (action) holder.addEventListener('click', () => action());
			wrap.appendChild(holder);
		}

		return wrap;
	}

	// The pin wrapper's classes: a column centred on the point in BOTH directions, made
	// clickable when the marker carries an onClick.
	//
	// Centred rather than stood on the point. A pin used to be anchored by its bottom edge
	// and grow upwards, which is how a pin with a tip works — but this pin has no tip, and
	// what it carries is not a fixed mark: a plate alone on most towns, and on the picked
	// one a plate, three statues, a booster box and a siege bar, several hundred pixels of
	// it. Anchored at the foot, all of that height came off one side, so the more a town had
	// to say the further from the town its saying it went, and the plate naming the place
	// ended up nowhere near the place. Centred, the column grows both ways at once and the
	// point stays in the middle of whatever the town happens to be carrying — so a pin that
	// gains a side and a box moves half as far, and the ground the mark is about is under
	// the mark rather than below its bottom edge.
	//
	// Which spends the room under the point that the marks hung there (a disc, a box) used
	// to have to themselves. So a town with a pin no longer hangs one: the pin carries its
	// mark as a block of this column (see markerElement), and only the towns this tier left
	// unpinned still take the point directly — by their own centre, the same way the pin
	// does (see discElement and boxElement).
	//
	// The fade for a pin outside the selected area is NOT here: an
	// opacity on the wrapper groups everything under it, and no child can win its way back
	// to full — which took the plate's lettering down with the tile and left white type at
	// half strength over the terrain it is meant to be read against. It goes on the tile
	// instead (see markerElement), so a pin recedes without becoming unreadable.
	//
	// Nothing here caps the pin's width either, and nothing here can: the marker's box is
	// zero-sized, so every part of a pin overflows it — which is what `items-center` centres
	// on the point — and a cap on a box of no width caps nothing. Anything a pin hangs that
	// could come out wider than the screen says so in viewport units of its own (the plate's
	// 15rem never can; the side's 500px can, see markerElement).
	function classNamesFor(marker: MapMarker): string {
		let classes = 'flex -translate-x-1/2 -translate-y-1/2 flex-col items-center';
		if (marker.onClick) classes += ' cursor-pointer';
		return classes;
	}

	// Light up (or reset) a region's polygons as the pin standing for it is
	// hovered: apply each hoverable overlay's hoverStyle to the covered features,
	// exactly as their own mouseover does, so the whole region's fill shows.
	function highlightRegion(featureIds: string[] | undefined, on: boolean) {
		if (!featureIds?.length) return;
		for (const entry of hoverLayers) {
			for (const id of featureIds) {
				const layer = entry.byId.get(id);
				if (!layer) continue;
				if (on) layer.setStyle(entry.hoverStyle);
				else entry.group.resetStyle(layer);
			}
		}
	}

	// The available pin renderings, coarsest → finest. `markerLevels` (a stack of
	// breakdowns) wins; a plain `markers` array is treated as a single level.
	function markerLevelStack(): MapMarker[][] {
		if (markerLevels && markerLevels.length) return markerLevels;
		return markers.length ? [markers] : [];
	}

	// A pixel of slack on that comparison. The framing computes its zoom from this very
	// margin, so a region framed by it lands exactly on the boundary and is decided by the
	// last bit of a float — and the whole point of measuring both against one margin is that
	// a framed region is never the one that comes out too big by a rounding error.
	const FIT_TOLERANCE = 1;

	// Whether a region's box stands whole inside the canvas at a given zoom, margin and all —
	// the same question the framing answers by choosing a zoom (see focusMargin), asked here
	// of the zoom the map is at. This is the map's half of the level-of-detail rule: the
	// projection and the canvas are Leaflet's, and the rule itself (which tier that makes the
	// one to draw) is in @3xl/shared, knowing nothing of either.
	function boundsFitAtZoom(
		bounds: [[number, number], [number, number]],
		zoom: number
	): boolean {
		if (!mapInstance) return true;
		const [[south, west], [north, east]] = bounds;
		const topLeft = mapInstance.project([north, west], zoom);
		const bottomRight = mapInstance.project([south, east], zoom);
		const size = mapInstance.getSize();
		const margin = focusMargin();
		return (
			Math.abs(bottomRight.x - topLeft.x) <= size.x - 2 * margin.x + FIT_TOLERANCE &&
			Math.abs(bottomRight.y - topLeft.y) <= size.y - 2 * margin.y + FIT_TOLERANCE
		);
	}

	// The index of the tier to draw: the children of the coarsest region that stands whole in
	// the canvas (see levelIndexForView). That is what makes a click on a pin of any tier land
	// on that pin's subdivisions — the click frames its region whole, framed whole is what
	// "fits" means here, and what fits has its children pinned. Before, the tier drawn was the
	// fitting region's OWN, so opening a comarca framed it and marked it with the very pin
	// that had just been clicked, and its towns only appeared once the reader zoomed past the
	// comarca by hand.
	function levelForView(levels: MapMarker[][], centre: L.LatLng): number {
		const zoom = mapInstance!.getZoom();
		return levelIndexForView(levels, [centre.lat, centre.lng], (bounds) =>
			boundsFitAtZoom(bounds, zoom)
		);
	}

	// (Re)build the pins for the current view: clear the layer, pick the level of
	// detail whose regions are viewport-sized, keep only its markers inside the
	// (slightly padded) viewport, and drop a zero-sized divIcon marker at each (its
	// overflowing content is the visible card) with a hover tooltip and click.
	// Runs on every markers change and whenever the map pans or zooms, so both the
	// culling and the chosen level track what's actually on screen.
	function rebuildMarkers() {
		if (!mapInstance || !Leaf) return;
		// Not while the map is between two tiers (see clearMarkers). The pins are taken off at
		// the start of a zoom, and everything that would put a set back before the map has
		// stopped is refused here rather than at each of the several places that ask — the
		// moveend that ends the zoom is what lifts this, one line before it asks for the set the
		// new view calls for.
		if (midZoom) return;
		if (!markerLayer) markerLayer = Leaf.layerGroup().addTo(mapInstance);
		unmountPinMounts();
		markerLayer.clearLayers();

		const bounds = mapInstance.getBounds().pad(0.25);
		const levels = markerLevelStack();
		const index = levels.length ? levelForView(levels, mapInstance.getCenter()) : 0;
		// Publish the chosen tier so the parent can mirror it (polygons, sidebar).
		activeLevel = index;
		// Tell the box layer where the pins have got to, so it can mark its towns to match.
		pinLevelIndex = index;
		pinLevelCount = levels.length;
		const chosen = levels[index] ?? [];

		// Remap every municipality of the chosen tier to its region's featureIds (from
		// all of the tier's pins, not just the culled-in ones), so a polygon hover can
		// light the same whole region its pin does — wherever in the region you point.
		regionByFeatureId = new Map();
		for (const marker of chosen) {
			for (const id of marker.featureIds ?? []) regionByFeatureId.set(id, marker.featureIds!);
		}

		const visible = chosen.filter((marker) => bounds.contains(marker.position));

		// What each pin came out as, in pixels, read back off the DOM once it is standing.
		// Nothing about a pin's size can be worked out from the data behind it — a plate is
		// as wide as the place's name up to its cap, and a picked town's column is as tall as
		// three statues, a booster box and a siege bar happened to come out — so the pin
		// itself is the only honest source, and the framing needs it to put a whole pin on
		// the canvas (see viewForBounds). Cleared and refilled with the crop, so a town that
		// has just been folded back into a plate is never remembered at the height it stood
		// while it was the picked one.
		pinExtents = new Map();
		const drawn: [string, HTMLElement][] = [];

		// No pin outlives its tier, the picked town's included: it carries the side holding
		// it and the way to fight them, and a mark that size cannot be left standing over a
		// view of provinces where the town it belongs to is no longer drawn. Zooming out
		// folds a town into its comarca and takes everything hung on it away together.
		for (const marker of visible) {
			const element = markerElement(marker);
			const icon = Leaf.divIcon({
				html: element,
				className: '',
				iconSize: [0, 0]
			});
			const pin = Leaf.marker(marker.position, { icon, riseOnHover: true });
			if (marker.onClick) pin.on('click', () => marker.onClick!());
			// Hovering the pin highlights its whole region's fill, just like hovering
			// the polygons; leaving it resets them to their base style.
			pin.on('mouseover', () => highlightRegion(marker.featureIds, true));
			pin.on('mouseout', () => highlightRegion(marker.featureIds, false));
			pin.addTo(markerLayer!);
			drawn.push([marker.id, element]);
		}

		// Measured in one pass at the end and not inside the loop: asking an element for its
		// offsetWidth makes the browser settle the layout it is holding, so a read per pin
		// settles the whole crop once per pin. `offsetWidth`/`offsetHeight` are the untransformed
		// box, which is what is wanted — a pin is moved onto its point by a transform (see
		// classNamesFor) and its size is not what that transform changes.
		//
		// The height is the wrapper's, the width is its widest block's. The wrapper stands in a
		// marker box of no size at all (`iconSize: [0, 0]`, which is what lets a pin be centred
		// on a point rather than filling anything), so its own width resolves to that nothing
		// and every block in it overflows on purpose — the column measures 0 across while
		// carrying 500px of statues. Its height is honest, being the content's own. So the
		// width is read off the blocks that actually draw.
		for (const [id, element] of drawn) {
			let width = element.offsetWidth;
			for (const block of element.children) {
				width = Math.max(width, (block as HTMLElement).offsetWidth);
			}
			pinExtents.set(id, Leaf.point(width, element.offsetHeight));
		}
	}

	// The pins come off the map before it starts to zoom, and are built again where it stops.
	//
	// A pin is not drawn in the projection: it is a plate of a fixed size in pixels, standing
	// on a point, and everything about it that says which tier the map is showing was decided
	// at the zoom it was built at — which of them are on screen, and which breakdown they are
	// the pins of. So a zoom in progress carries a set of pins that belongs to the zoom it left
	// rather than the one it is going to: they slide across the view at a size that no longer
	// means anything, and the ones that ought to have folded into a coarser mark are still
	// standing when the map arrives. Taking them off is the honest reading of that — the map is
	// between two tiers and there is no set of pins for it — and the moveend at the far end
	// builds the set the new view actually calls for (see rebuildMarkers).
	//
	// Which is also why this raises a flag and does not merely empty the layer: the pins are
	// built from a prop, by an effect, and taking them off is a thing done to the map rather
	// than to that prop — so the next flush of anything at all put the whole set straight back,
	// in the same frame, and the layer was full again before it had been seen empty (measured:
	// 28 marks removed and 28 added in one batch). The flag says what the empty layer means,
	// and rebuildMarkers reads it.
	function clearMarkers() {
		midZoom = true;
		if (!markerLayer) return;
		unmountPinMounts();
		markerLayer.clearLayers();
	}

	/** Tear down everything mounted into a pin, so no detached timer keeps running. */
	function unmountPinMounts() {
		for (const mounted of pinMounts) void unmount(mounted);
		pinMounts = [];
	}

	/** The same, for the boxes: a box no longer on screen must not keep its images. */
	function unmountBoxMounts() {
		for (const mounted of boxMounts) void unmount(mounted);
		boxMounts = [];
	}

	// A festa box's DOM: the very component the Booster tab's grid draws its packs
	// with, mounted into the marker rather than re-drawn here — a town's box on the map
	// and its box in the panel are the same object, so they are the same component
	// printed on the same stock off the same cover, mark and place. Mounted (this is
	// imperative code, not a template) and tracked, so the next rebuild can take down
	// the ones that panned off screen.
	//
	// The width is fixed at 200px and the box's own 30:37 gives the height: it is a mark
	// on a town, so it stays the size it is whatever the map is showing, and it is the
	// cover a box is read by, at a size the cover can actually be read at.
	//
	// Where it is drawn decides how it is placed and who takes it down again, which is the
	// whole of what `into` says:
	//
	// - `'pin'` — inside the town's own pin, one more thing in a column already centred on
	//   the point, so it needs only the gap the pin's other parts take. The pin is what
	//   built it, so the pin's mounts are what unmount it.
	// - `'point'` — the box layer's own marker, centred on the point by its own middle, the
	//   same way a pin is (see classNamesFor) and for the same reason: a mark is about the
	//   ground under it, and 200px of cover reads as being about the town it is centred on
	//   rather than the one it hangs off. It is also what keeps the box and the disc one
	//   object seen at two sizes — both take the point by their centre, so folding a box up
	//   leaves the mark where the box was rather than moving it. This is what the picked
	//   town's box does at a tier that gave it no pin to stand in — see rebuildBoxes.
	function boxElement(box: MapBoosterBox, into: 'pin' | 'point'): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className =
			'w-[200px] ' + (into === 'pin' ? 'mt-1' : '-translate-x-1/2 -translate-y-1/2');
		if (box.onClick) wrap.className += ' cursor-pointer';
		const mounted = mount(BoosterBox, {
			target: wrap,
			props: {
				coverUrl: box.coverUrl ?? null,
				logoUrl: box.logoUrl ?? null,
				showId: box.showId ?? null,
				locationName: box.locationName ?? null,
				light: box.light ?? false
			}
		});
		(into === 'pin' ? pinMounts : boxMounts).push(mounted);
		return wrap;
	}

	// The mark this pin's town has waiting, or null — which asks two things: that the tier
	// on screen marks towns at all, and that the marker's id is a municipality's (only the
	// town tier's keys are, so no coarser pin can match a box). Which of the two marks it
	// comes out as is markKindForBox's to say, not this one's: a pin carries whatever its
	// town has, whole or folded, and it used to take only the picked town's box because
	// there was somewhere else for a disc to go. There is not — the point under the pin is
	// the pin's own middle now (see markerElement).
	function boxForMarker(marker: MapMarker): MapBoosterBox | null {
		if (!marksTowns()) return null;
		return boxes.find((entry) => entry.id === marker.id) ?? null;
	}

	// The ids the tier on screen draws a pin for. The picked town's pin carries its own box,
	// so the box layer must not stand a second one on the same point — which is all this
	// is for (see rebuildBoxes). Read off the same stack rebuildMarkers picked from, at the
	// level it settled on.
	function pinnedIds(): Set<string> {
		const levels = markerLevelStack();
		return new Set((levels[pinLevelIndex] ?? []).map((marker) => marker.id));
	}

	// The same town unpicked: a disc of the box's own stock — white card for a town de festa
	// today, black for the rest of the window — with the show's glyph printed on it in the
	// ink that stock is read in. Hung on the same point, by the same centre, so folding a box
	// up leaves the mark where the box was.
	//
	// It is the box reduced to the two things that are read at a glance: what it is printed
	// on and what show is inside it. That is what every town on screen gets, because the map
	// carries the whole booster window at once — a cover, a wordmark and a place across the
	// foot, per town, is reading matter overlapping its neighbours', which is less than one
	// mark that can be told apart. So the mark is what gets the room the box's picture and
	// its two lines of type had: the glyph is 36px and the disc 56px round it, nine
	// fourteenths of the diameter, which still leaves a square mark's corners inside the
	// circle (a side of 36 spans 51 across its diagonal). Well inside the box's own 200px:
	// the disc is not a badge stuck on the map, it is the same object with one mark on it
	// instead of four, drawn small enough that neighbouring towns in one comarca are still
	// separate marks — and picking the town is what unfolds it back into the box.
	//
	// And it is a disc, laid flat with no tilt: the box's lid is a square seen in
	// perspective because it is the top of a solid, and there is no solid here to be the
	// top of. A circle has no direction to be turned in, which is what makes it the shape
	// that survives losing the box's body.
	//
	// The glyph is inlined rather than pointed at with an <img> so it paints in the disc's
	// own ink (see icon-markup), and looked up from the same `showId` the box's lid stamps
	// itself with. A show with no glyph drawn for it leaves the disc bare rather than
	// taking a stand-in mark — the lid's rule, and every other surface that badges a show.
	// Decorative either way: the mark is what is being looked at, and nothing here is
	// named in text for it to read twice.
	//
	// Where it is drawn places it, exactly as it does the box (see boxElement), and for the
	// same reason — the two are one mark at two sizes and are placed by one rule:
	//
	// - `'pin'` — a block of the town's own pin, under the plate naming the place, needing
	//   only the gap the pin's other parts take. This is every festa town the tier gives a
	//   pin to, which is most of them: the disc used to be hung on the point instead, back
	//   when a pin grew upwards and left that room free. It no longer does (see
	//   classNamesFor), and a 56px disc centred on the same point as a 56px plate is one
	//   mark hidden behind another rather than two marks about one town.
	// - `'point'` — the box layer's own marker, centred on the point by its own middle, for
	//   the towns this tier drew no pin for at all.
	function discElement(box: MapBoosterBox, into: 'pin' | 'point'): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className =
			'flex size-14 items-center justify-center rounded-full shadow-md [&>svg]:size-9 ' +
			(into === 'pin' ? 'mt-1 flex-none ' : '-translate-x-1/2 -translate-y-1/2 ') +
			(box.light ? 'bg-white text-black' : 'bg-black text-white');
		if (boxAction(box, 'disc')) wrap.className += ' cursor-pointer';
		wrap.setAttribute('aria-hidden', 'true');
		const markup = iconMarkup(showIconName(box.showId));
		if (markup) wrap.innerHTML = markup;
		return wrap;
	}

	// What a click on this mark does, which is not the same question at both sizes: the box
	// is a cover and answers for the pack behind it, the disc is a town the reader has not
	// picked, so it answers for the town — and picking it is what draws its box, so the
	// smaller mark leads to the bigger one. A caller that names only `onClick` gets it at
	// both sizes.
	function boxAction(box: MapBoosterBox, kind: 'box' | 'disc'): (() => void) | null {
		if (kind === 'disc') return (box.onDiscClick ?? box.onClick) ?? null;
		return box.onClick ?? null;
	}

	// Whether the tier on screen marks towns at all. Every tier does but the coarsest — the
	// whole of the Països Catalans in one view, half a dozen territory pins for thousands of
	// towns — where there is no reading a town off a mark: the festa towns of a whole
	// territory land in one handful of pixels, so the marks merge into a blot over the
	// country that says only that somewhere in there are festes, which the map already says
	// with its pins. The window's towns are for finding once the reader has picked a corner
	// to look in.
	//
	// A stack with nothing to fold (no levels at all, or a single rendering) is at its finest
	// tier by definition and marks its towns — that test is made first for exactly that
	// reason, since level 0 is then both ends of the stack at once.
	function marksTowns(): boolean {
		if (pinLevelIndex >= pinLevelCount - 1) return true;
		return pinLevelIndex !== 0;
	}

	// How a town is marked, which the zoom no longer decides: the town the reader picked is
	// the box itself, and every other town on screen is the disc. Which is what keeps the map
	// readable at the tier where every town has a pin — a cover on each of them buried the
	// terrain — while the one town being looked at still shows what it is offering, whole,
	// exactly as it did.
	function markKindForBox(box: MapBoosterBox): 'box' | 'disc' {
		return box.selected ? 'box' : 'disc';
	}

	// (Re)build the festa boxes for the current view: unmount the last crop, clear the
	// layer, and — unless the tier on screen marks no towns at all — keep only the boxes
	// inside the (padded) viewport and drop a zero-sized divIcon at each, carrying whichever
	// mark that town calls for. Runs on every boxes change and whenever the map pans or
	// zooms, so the culling, the mark and the picked town all track what's on screen.
	function rebuildBoxes() {
		if (!mapInstance || !Leaf) return;
		if (!boxLayer) boxLayer = Leaf.layerGroup().addTo(mapInstance);
		unmountBoxMounts();
		boxLayer.clearLayers();

		if (!marksTowns()) return;

		// A town with a pin carries its own mark inside it, whichever of the two it is (see
		// markerElement), so the layer must not put a second one on the same point — which
		// with both centred on that point is not a mark beside a mark but one on top of the
		// other. So this draws the towns the tier left unpinned, and only those: at the town
		// tier that is none of them, and above it, the picked town whose box has no pin to
		// stand in.
		const pinned = pinnedIds();

		const bounds = mapInstance.getBounds().pad(0.25);
		for (const box of boxes) {
			if (pinned.has(box.id)) continue;
			const kind = markKindForBox(box);
			if (!bounds.contains(box.position)) continue;
			const html = kind === 'box' ? boxElement(box, 'point') : discElement(box, 'point');
			const icon = Leaf.divIcon({ html, className: '', iconSize: [0, 0] });
			const badge = Leaf.marker(box.position, { icon, riseOnHover: true, pane: BOX_PANE });
			// No tooltip: the box already carries the town's name across its foot, and a
			// hover label over a map this dense is a second thing to read where there was
			// one to look at.
			const action = boxAction(box, kind);
			if (action) badge.on('click', () => action());
			badge.addTo(boxLayer!);
		}
	}

	// The wheel is driven by hand, in the shape Leaflet drives a pinch: a gesture that moves
	// the view while it is happening, and a single settle at the end of it. Leaflet's own
	// wheel handler is off (see scrollWheelZoom below) because on a map zoomed fractionally
	// it loses most of what the reader pushes into it, in two ways that compound. It maps a
	// wheel's pixels through a sigmoid onto a zoom, and rounds that UP to the nearest whole
	// zoom step — except with zoomSnap at 0 there is no step to round to, so what a notch is
	// worth stays the raw fraction the sigmoid gave: a fraction of a level where a snapped
	// map moved a whole one. And what survives that is then dropped outright while a zoom
	// animation is in flight: every 40ms it asks the map to zoom by what has accumulated
	// since the last ask, each ask starts a 250ms animation, and an ask arriving inside one
	// is discarded by Leaflet along with the wheel that earned it — so roughly five ticks in
	// six of a continuous spin go nowhere. Hence the long spinning for a short movement.
	//
	// A pinch has neither problem because it is not a series of requests to zoom: it holds a
	// zoom of its own, moves the map towards it every frame with no animation to be swallowed
	// by, and redraws once when the fingers lift. That is what this is, with the wheel's
	// notches where the fingers' distance was.
	//
	// Towards, not to. A pinch can be moved straight onto the gesture's zoom because the
	// fingers are already moving smoothly and every frame is a small step; a notch is a jump,
	// and a map put on the far side of one instantly is the clunk this had at first. So the
	// notch moves a zoom the map is *heading for* and each frame takes a share of what is left
	// of the distance — a glide the length of a wheel animation, except that a notch landing
	// mid-glide extends the same glide rather than queueing a second one behind it.
	//
	// What the notch is heading for is a STOP and not an amount (see zoomStops). The map draws
	// a tier of the region hierarchy and the bar across the top names where in that hierarchy
	// the view is, so the zooms worth resting at are the ones where a tier stands whole in the
	// canvas — the same zooms the bar's own positions are pressed for. A notch is therefore one
	// step along that ladder rather than a zoom level: the wheel walks the tiers, and a spin
	// comes to rest on one instead of somewhere in the middle of it. What the pointer does is
	// unchanged — the place under it is what the gesture holds still.

	// What one detent of a wheel reports, in each of the three units a browser may report it
	// in. The pixel figure is what Chrome, Safari and Edge send per notch; Firefox reports
	// lines and sends three; pages are the fallback nothing modern uses. A trackpad sends the
	// same units in small amounts, so a two-finger push is read as the fraction of a notch it
	// covers, and moves the map when those fractions have added up to one.
	const WHEEL_NOTCH = { 0: 100, 1: 3, 2: 1 } as const;
	// The most a single event may be worth, against a mouse whose driver reports one flick as
	// hundreds of pixels: the gesture stays fast (the events keep coming) without one of them
	// crossing the whole ladder.
	const MAX_NOTCHES_PER_WHEEL = 2;
	// A pause long enough that the next push is a new gesture, and the part of a notch left
	// over from the last one is forgotten rather than counting towards it. The first push of
	// one is a step whatever it is worth (see onWheelZoom).
	const WHEEL_GESTURE_GAP = 400;
	// The least time between two steps. A trackpad goes on sending for a second after the
	// fingers have left it, and a ladder is six or seven rungs long: without this, the tail of
	// one flick is the whole of it. It is also what makes a spin readable — a tier at a time,
	// at a pace a reader can stop on the one they wanted.
	const WHEEL_STEP_GAP = 120;
	// Near enough to a stop to be standing on it, when working out which one a notch steps
	// from. Also what keeps two tiers that fit at the same zoom — a tier the place under the
	// view does not have has its parent's box — from being two stops with nothing between
	// them, which would be a notch that appeared to do nothing.
	const STOP_SLACK = 0.05;
	// The glide: how long the remaining distance takes to halve. Measured in time and not in
	// frames, so the movement lasts as long on a 120Hz screen as on a 60Hz one. At this figure
	// a notch is most of the way there in about a sixth of a second — near enough Leaflet's
	// own zoom animation, which is the movement a wheel used to make and the one a reader of
	// this map already knows.
	const WHEEL_HALF_LIFE = 55;
	// Close enough to be there. A hair under a hundredth of a zoom level: past this the glide
	// stops rather than crawling the last thousandths, and stopping is what redraws the map.
	const WHEEL_ARRIVED = 0.005;
	// How often, while the glide is still running, the tiles are re-cut for the level the map
	// has reached. A gesture scales the tiles it has rather than fetching new ones (which is
	// what keeps it smooth), so a long spin would otherwise be a long blur ending in a snap.
	const WHEEL_TILES_MS = 300;

	// Leaflet's pinch handler drives its gesture through these, so a wheel gesture is written
	// against the same ones. `_move` puts the map at a centre and a zoom with no animation;
	// told it is a pinch, the tiles scale in place instead of a fresh set being fetched for a
	// frame that is about to be replaced. `_resetView` is the redraw at the end that does
	// fetch them, and is what fires the moveend the pins and boxes are re-culled on.
	// `_animatingZoom` is Leaflet's own flag, read only where an animation and this gesture
	// would otherwise be moving the same map (see below).
	type GestureMap = L.Map & {
		_move(center: L.LatLng, zoom: number, data?: { pinch?: boolean; round?: boolean }): void;
		_resetView(center: L.LatLng, zoom: number): void;
		_onZoomTransitionEnd(): void;
		_stop(): void;
		_animatingZoom?: boolean;
	};

	// The zoom the gesture is heading for, held apart from the map's own for two reasons: the
	// map is behind it by design, gliding towards it, and events arriving faster than the
	// screen redraws all count, since what accumulates between two frames accumulates here
	// rather than on a zoom that has not caught up yet. Null between gestures.
	let wheelZoom: number | null = null;
	// The point on the canvas the zoom is anchored to — the place under the pointer stays
	// under the pointer, so a reader zooms into what they are looking at rather than into the
	// middle of the map.
	let wheelAnchor: L.Point | null = null;
	let wheelFrame = 0;
	// When the last frame was drawn, and when the tiles were last re-cut.
	let wheelLast = 0;
	let wheelTiles = 0;
	// The part of a notch pushed but not yet spent. A wheel with detents sends whole notches
	// and steps a stop each time; a trackpad sends a stream of small fractions, and this is
	// where they add up until they are worth a step. Cleared when a gesture has been over long
	// enough that the next push is a new one.
	let wheelPush = 0;
	let wheelPushAt = 0;
	let wheelStepAt = 0;
	// Whether this gesture has yet to move the map. The first push of one steps whatever it is
	// worth, so a device that reports a flick as a handful of pixels is not a device this map
	// ignores; it is only *inside* a gesture that a step costs a whole notch.
	let wheelFresh = false;

	// The zooms a gesture may come to rest at, coarsest first: each box that the ladder is made
	// of, at the zoom it stands whole in the canvas at — computed here rather than handed over
	// ready-made because the fit depends on the canvas and the projection, which are the map's.
	// The margin is the framing's own, so a stop is exactly where a click on that region would
	// have put the map, and the tier drawn there is the tier that region contains.
	//
	// Two stops closer together than the slack are one stop: a tier the place under the view
	// does not have is handed the box of the tier above it, and a notch between two zooms that
	// are the same zoom is a notch that does nothing. The map's own deepest zoom closes the
	// ladder, so the imagery can still be read at the detail it holds — past the last tier is
	// not between two tiers.
	//
	// A map given no ladder at all (the polygons never loaded) falls back to its whole zoom
	// levels, which is a notch a level: the wheel a map without a hierarchy would have had.
	function wheelStopZooms(map: L.Map): number[] {
		const min = map.getMinZoom();
		const max = map.getMaxZoom();
		const found: number[] = [];
		if (zoomStops.length) {
			const padding = focusPadding();
			for (const box of zoomStops) found.push(map.getBoundsZoom(box, false, padding));
			found.push(max);
		} else {
			for (let zoom = Math.ceil(min); zoom <= max; zoom++) found.push(zoom);
		}

		const stops: number[] = [];
		for (const zoom of found.sort((a, b) => a - b)) {
			const clamped = Math.max(min, Math.min(max, zoom));
			if (!stops.length || clamped - stops[stops.length - 1] > STOP_SLACK) stops.push(clamped);
		}
		return stops;
	}

	// The stop a number of steps away from a zoom. Counted from where the zoom stands in the
	// ladder rather than from the nearest stop, so a first notch out of a view that is between
	// two stops (a click has framed a region, or the ladder has changed under a pan) lands on
	// the one it is heading towards rather than skipping it.
	function stopAfter(stops: number[], zoom: number, steps: number): number {
		if (steps > 0) {
			const next = stops.findIndex((stop) => stop > zoom + STOP_SLACK);
			if (next < 0) return stops[stops.length - 1];
			return stops[Math.min(next + steps - 1, stops.length - 1)];
		}
		let previous = -1;
		for (let i = stops.length - 1; i >= 0; i--) {
			if (stops[i] < zoom - STOP_SLACK) {
				previous = i;
				break;
			}
		}
		if (previous < 0) return stops[0];
		return stops[Math.max(previous + steps + 1, 0)];
	}

	function onWheelZoom(event: WheelEvent) {
		if (!mapInstance) return;
		// The page must not scroll and the browser must not zoom under us: over the canvas a
		// wheel means this and nothing else.
		event.preventDefault();

		// A sideways push is a wheel event with nothing on the axis that means zoom. Nothing
		// on this map reads one, so it is refused a gesture rather than given one worth no
		// zoom, which would still cost the redraw at the end of it.
		if (!event.deltaY) return;

		const now = performance.now();
		// A gesture is a run of pushes with no real pause in it. A new one forgets whatever
		// part-notch the last one ended on, and is owed a step for its first push.
		if (now - wheelPushAt > WHEEL_GESTURE_GAP) {
			wheelPush = 0;
			wheelFresh = true;
		}
		wheelPushAt = now;

		const notch = WHEEL_NOTCH[(event.deltaMode as 0 | 1 | 2) ?? 0] ?? WHEEL_NOTCH[0];
		wheelPush += Math.max(
			-MAX_NOTCHES_PER_WHEEL,
			Math.min(MAX_NOTCHES_PER_WHEEL, -event.deltaY / notch)
		);

		// One step at a time, and one to a step gap. What earns it is a whole notch of pushing
		// — a detent of a wheel, or as much of a trackpad — except for the push that opens a
		// gesture, which earns one whatever it is worth: a device that reports a flick as a few
		// pixels is asking for the same thing as a device that reports it as a hundred, and a
		// map that waits for the hundred does nothing at all on the first.
		if (now - wheelStepAt < WHEEL_STEP_GAP) return;
		if (!wheelFresh && Math.abs(wheelPush) < 1) return;
		const steps = wheelPush > 0 ? 1 : -1;
		// Spent, along with anything pushed while the gap was closed: a step is a step, and the
		// tail of a trackpad's flick is not a queue of them waiting to be taken.
		wheelPush = 0;
		wheelFresh = false;
		wheelStepAt = now;

		// Before the map has moved a pixel of this step — the gesture's first frame is still an
		// animation frame away. A step landing mid-glide clears an already empty layer.
		clearMarkers();

		const map = mapInstance as GestureMap;
		// A wheel overtakes whatever the map was doing on its own. A pan or a fly is stopped
		// outright; a zoom animation cannot be, so it is landed at its destination now —
		// otherwise it would finish 250ms later by putting the map back where it had been
		// going, over the top of the gesture the reader has started since.
		//
		// `_stop` and not the public `stop`, which is what Leaflet's own wheel handler calls
		// here and for the reason found by measuring this: `stop` sets the zoom to the zoom the
		// map is already at, and a move of no distance still ends — it fires a moveend. Which is
		// this map's "the view has settled, build the pins for it", one line after the pins were
		// taken off for the zoom about to start, so the set came straight back and stood through
		// the whole glide. `_stop` cancels the animations and says nothing.
		map._stop();
		if (map._animatingZoom) map._onZoomTransitionEnd();

		wheelAnchor = map.mouseEventToContainerPoint(event);
		wheelZoom = stopAfter(wheelStopZooms(map), wheelZoom ?? map.getZoom(), steps);

		if (!wheelFrame) {
			wheelLast = now;
			wheelTiles = now;
			wheelFrame = requestAnimationFrame(stepWheelZoom);
		}
	}

	// One frame of the glide: take a share of what is left of the way to the gesture's zoom,
	// and put the map there keeping the anchored point where it is. That centre is the one
	// `setZoomAround` computes — the offset from the middle of the canvas to the anchor, grown
	// by how much the scale is about to change, taken off the middle again — and it is
	// recomputed per frame, so the anchor holds across a glide of any length.
	function stepWheelZoom(now: number) {
		wheelFrame = 0;
		if (!mapInstance || wheelZoom === null || !wheelAnchor) return;

		const map = mapInstance as GestureMap;
		// The map has been sent somewhere else mid-glide — a region framed by a click. That
		// movement is the newer of the two and knows where it is going; this one drops.
		if (map._animatingZoom) {
			wheelZoom = null;
			wheelAnchor = null;
			return;
		}

		const from = map.getZoom();
		const gap = wheelZoom - from;
		const arrived = Math.abs(gap) < WHEEL_ARRIVED;
		const share = 1 - Math.pow(2, -(now - wheelLast) / WHEEL_HALF_LIFE);
		wheelLast = now;

		const next = arrived ? wheelZoom : from + gap * share;
		const scale = map.getZoomScale(next, from);
		const half = map.getSize().divideBy(2);
		const offset = wheelAnchor.subtract(half).multiplyBy(1 - 1 / scale);
		const centre = map.containerPointToLatLng(half.add(offset));

		if (arrived) {
			// The end of the gesture, and the one full redraw of it: the tiles, the polygons and
			// the pins all at the zoom the map came to rest at.
			wheelZoom = null;
			wheelAnchor = null;
			map._resetView(centre, next);
			return;
		}

		// Every so often through a long glide, let the tiles be re-cut for the level reached
		// (a frame that is not called a pinch is one the tile layer reloads for) — the pins and
		// the polygons are left alone until the map stops, since those are rebuilt rather than
		// transformed and a rebuild per frame is the jerk this is avoiding.
		const recut = now - wheelTiles >= WHEEL_TILES_MS;
		if (recut) wheelTiles = now;

		map._move(centre, next, { pinch: !recut, round: false });
		wheelFrame = requestAnimationFrame(stepWheelZoom);
	}

	onMount(async () => {
		// Leaflet touches `window` at import time, so it must be loaded
		// dynamically in the browser — never during SSR.
		Leaf = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		mapInstance = Leaf.map(mapContainer, {
			minZoom,
			maxZoom,
			worldCopyJump: true,
			// Any zoom, not the whole ones a tile pyramid is cut at. Two things want it, and
			// the second is why it is here. A wheel or a pinch moves the view by the amount it
			// was pushed rather than by a doubling, which is what a map that changes what it
			// draws as it is zoomed wants: the tier gives way when the region on screen has
			// grown past the canvas, and the reader can stop on either side of that. And the
			// framing can land exactly on the fit — a whole-numbered zoom can only land at or
			// under it, by up to a factor of two, so a region opened by a click came to rest
			// anywhere between filling the canvas and taking a quarter of it, and whether its
			// children were pinned or it was pinned by itself came down to where that fell
			// (see the focus effect and levelIndexForView).
			zoomSnap: 0,
			// The wheel is handled here instead (see onWheelZoom): Leaflet's own handler and a
			// zoom with no steps in it are the pair that made a spin of the wheel move the map
			// by almost nothing.
			scrollWheelZoom: false,
			// No +/- zoom buttons — the map is driven by scroll/pinch only.
			zoomControl: false,
			// The badge carries the Esri credit the imagery licence requires, so it
			// stays on for as long as the satellite basemap is there.
			attributionControl: true
		});

		// The pane the festa boxes hang in (see BOX_PANE), made before anything is added to
		// it. Under the region pins (600) rather than over them: the map is dense and these
		// marks are large, so where one reaches a pin the pin is the thing that must not be
		// covered — a box gives up its corner instead. Only ever a NEIGHBOUR's pin, mind: a
		// town's own mark is inside its pin (see markerElement) and nothing here stands on a
		// point a pin already has.
		mapInstance.createPane(BOX_PANE).style.zIndex = '590';

		// Not passive: the handler's first act is to refuse the page the scroll.
		mapContainer.addEventListener('wheel', onWheelZoom, { passive: false });

		// Esri World Imagery: pure satellite tiles, no labels or roads.
		// Note the {z}/{y}/{x} order — ArcGIS swaps y and x vs the OSM scheme.
		Leaf.tileLayer(
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			{
				attribution:
					'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
				maxZoom: 19
			}
		).addTo(mapInstance);

		mapInstance.setView(center, zoom);
		// Keep the bindable zoom and centre in sync so callers can render a live
		// readout and tell which region the view is focused on.
		const syncView = () => {
			currentZoom = mapInstance!.getZoom();
			const c = mapInstance!.getCenter();
			currentCenter = [c.lat, c.lng];
		};
		syncView();
		// The other way a zoom begins: a region framed by a click, or a tier asked for from the
		// bar. The wheel clears the pins itself, since a gesture moves the map without ever
		// telling Leaflet a zoom has started (see onWheelZoom) — this is for the ones that do.
		// A pan is not one of them and keeps its pins: a pin carried sideways is still the pin
		// that view calls for, at the size it was drawn at.
		mapInstance.on('zoomstart', clearMarkers);
		// Re-cull the pins and re-sync the view after any pan or zoom settles. This is the far
		// end of a zoom as well as of a pan, so it is where the map stops being between two
		// tiers and may carry pins again.
		mapInstance.on('moveend zoomend', () => {
			midZoom = false;
			syncView();
			rebuildMarkers();
			rebuildBoxes();
		});

		// Keep Leaflet's cached viewport in sync with its container: when the parent
		// shrinks the map to reserve room for an open side panel, invalidateSize
		// re-projects the map (so markers/boxes slide out from under the panel and
		// stay clickable) and we re-cull to the new box. Without this, Leaflet keeps
		// the stale size and the reserved gutter still overlaps live pins.
		resizeObserver = new ResizeObserver(() => {
			mapInstance?.invalidateSize({ animate: false });
			syncView();
			rebuildMarkers();
			rebuildBoxes();
		});
		resizeObserver.observe(mapContainer);

		// Fetch all overlays in parallel, then add them in array order so
		// z-stacking is deterministic regardless of network timing.
		const datasets = await Promise.all(
			overlays.map(async (overlay) => {
				const response = await fetch(overlay.url);
				return (await response.json()) as GeoJSON.FeatureCollection;
			})
		);

		// Guard against the component unmounting while fetches were in flight.
		if (!mapInstance) return;

		overlays.forEach((overlay, index) => {
			// A `properties.id → layer` lookup for this overlay, populated below when
			// the overlay has a hoverStyle so pins can highlight their region.
			const byId = new Map<string, L.Path>();
			const layerGroup = Leaf!.geoJSON(datasets[index], {
				interactive: overlay.interactive ?? true,
				// Read the overlay back out of the live prop by its position rather than
				// closing over the one mounted with, so a repaint picks up the styles the
				// caller is handing over now (the mounted one is the fallback for a
				// caller that later passes a shorter array).
				style: (feature) => styleFor(overlays[index] ?? overlay, feature),
				onEachFeature: (feature, layer) => {
					if (overlay.interactive === false) return;

					const label = overlay.label?.(feature);
					if (label) {
						layer.bindTooltip(label, { sticky: true });
					}

					// Record each feature's layer so a pin can light up its whole region.
					// Hovering the polygon lights the SAME whole region its pin does (never
					// the single municipality on its own) — so the hover works across the
					// pinned area, not just on the tiny pin icon.
					if (overlay.hoverStyle) {
						const id = feature.properties?.id;
						if (id != null) {
							const key = String(id);
							byId.set(key, layer as L.Path);
							layer.on('mouseover', () => highlightRegion(regionByFeatureId.get(key), true));
							layer.on('mouseout', () => highlightRegion(regionByFeatureId.get(key), false));
						}
					}

					layer.on('click', () => overlay.onClick?.(feature));
				}
			}).addTo(mapInstance!);
			overlayGroups.push(layerGroup);
			if (overlay.hoverStyle) {
				hoverLayers.push({ group: layerGroup, hoverStyle: overlay.hoverStyle, byId });
			}
		});

		// Standalone straight lines, drawn above every overlay (e.g. the portal
		// axis running from the mainland out across the Mediterranean).
		for (const line of lines) {
			const shape = Leaf.polyline(line.points, line.style).addTo(mapInstance!);
			if (line.label) {
				shape.bindTooltip(line.label, {
					permanent: true,
					direction: 'center',
					className: 'bg-transparent! border-none! shadow-none! font-bold text-white!'
				});
			}
		}

		// Standalone circular regions, drawn above every overlay with a permanent
		// centred label (e.g. the "Portal" out at sea).
		for (const circle of circles) {
			const shape = Leaf.circle(circle.center, { radius: circle.radius, ...circle.style }).addTo(
				mapInstance!
			);
			if (circle.label) {
				shape.bindTooltip(circle.label, {
					permanent: true,
					direction: 'center',
					className: 'bg-transparent! border-none! shadow-none! font-bold text-white!'
				});
			}
			if (circle.onClick) {
				shape.on('click', () => circle.onClick!());
			}
		}

		// Now the layers exist: let the reactive $effects build the pins (and
		// rebuild them whenever the markers prop later changes). Any highlight set
		// before mount was already painted by styleFor; changes go through its effect.
		ready = true;
	});

	onDestroy(() => {
		mapContainer?.removeEventListener('wheel', onWheelZoom);
		if (wheelFrame) cancelAnimationFrame(wheelFrame);
		resizeObserver?.disconnect();
		unmountPinMounts();
		unmountBoxMounts();
		mapInstance?.remove();
	});
</script>

<!-- bg-transparent! overrides Leaflet's default grey container fill, so the page
	background (not a grey block) is what shows while the satellite tiles stream in.
	Nothing transforms this box. A CSS transform on the Leaflet container leaves the map
	drawn as its polygons on the page's background — the imagery goes and does not come
	back — so the board is never tipped, leaned or scaled: what a full view over the map
	moves is the map's furniture (see `markersBlurred`), never the map. -->
<div
	bind:this={mapContainer}
	class={`bg-transparent! ${classes}`}
	role="application"
	aria-label="World map"
></div>
