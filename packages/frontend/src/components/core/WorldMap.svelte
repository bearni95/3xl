<script lang="ts">
	import { mount, onMount, onDestroy, unmount } from 'svelte';
	import type L from 'leaflet';
	import BoosterBox from '$components/core/pack/BoosterBox.svelte';
	import { iconMarkup } from '$components/core/icon-markup';
	import { showIconName } from '$utils/show/show-icon';
	import type {
		MapBoosterBox,
		MapCircle,
		MapLine,
		MapMarker,
		MapOverlay,
		MapTether
	} from '$types/map.type';

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
		pinnedId = null,
		tether = null,
		boxes = [],
		highlightId = null,
		highlightStyle = null,
		selectedIds = new Set<string>(),
		selectedStyle = null,
		dimmedIds = new Set<string>(),
		hiddenLineUrls = new Set<string>(),
		focusBounds = null,
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
		 * The one marker id that is drawn whatever the view is doing: it is added to the
		 * pins on screen even when the tier it belongs to is not the one being drawn, and
		 * even when it falls outside the culling box. That is what lets the open town keep
		 * its pin at every zoom — the map folds its towns up into comarques and provinces
		 * as it zooms out, and the town being looked at is the one whose mark must survive
		 * that. Searched for through the whole level stack, so the caller need only name
		 * it. Null draws exactly the tier the view calls for.
		 */
		pinnedId?: string | null;
		/**
		 * A line from a point on the map to the centre of a DOM element over it — the open
		 * town tied to the panel that talks about it. Re-projected on every pan, zoom and
		 * resize; null draws nothing.
		 */
		tether?: MapTether | null;
		/**
		 * Booster boxes stood on individual points (the festa-major towns the booster
		 * window reaches), hung under the same points the region pins stand on — a town
		 * keeps its pin and gets a box. How one is marked follows the pin tier on screen
		 * (see markKindForLevel): the box itself at the finest tier, a disc of the box's
		 * own stock at the tiers between, and nothing at the coarsest.
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
	// The pins layer, rebuilt whenever the markers prop changes. Nothing is *mounted* into
	// a pin any more — a pin is plain DOM built by markerElement, so a rebuild has only its
	// own markup to clear, and the components that used to stand on the selected town's pin
	// (its side, its challenge bar) live in the page's own panel over the map.
	let markerLayer: L.LayerGroup | null = null;
	// The leader tying the open town to the panel over the map, kept as one polyline and
	// re-pointed rather than redrawn: only its screen end moves, and a line taken off the
	// map and put back on it every frame of a drag is a line that flickers.
	let tetherLine: L.Polyline | null = null;
	// The festa-box layer, rebuilt whenever the boxes prop changes. Kept separate from the
	// region pins — it follows their tier but marks its towns its own way, and at the
	// coarsest tier not at all (see markKindForLevel) — and drawn under them.
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
	// Which pin tier is on screen and how many there are — the box layer marks a town by
	// where the pins have got to (see markKindForLevel), so it needs both the tier and the
	// two ends of the stack. Set by rebuildMarkers, which is what decides the tier, and
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
	// Watches the tether's anchor for the same reason, one element at a time: the panel's
	// centre is where the leader ends, and the panel resizes itself without the map moving.
	let anchorObserver: ResizeObserver | null = null;
	// The pinned pin's wrapper, kept from the last rebuild: the leader ends at the middle of
	// that pin, and how tall it is is a question only the drawn element can answer (a plate's
	// height is its type and its padding). Null when no pin is pinned or none is on screen,
	// which lands the leader on the point the pin stands on.
	let pinnedPinElement: HTMLElement | null = null;
	// True for the length of an animated zoom — between `zoomanim` and the `zoomend` that
	// closes it. While it is up, the view the map reports is the one it is leaving, not the
	// one being drawn, so the leader is pointed from the animation's own target instead.
	let zoomAnimating = false;
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
		// `pinnedId` is in here too: which town outlives its tier is part of what the pins
		// are, and naming another one must redraw them.
		void markers;
		void markerLevels;
		void pinnedId;
		if (ready) rebuildMarkers();
	});

	$effect(() => {
		// Re-point the leader whenever the parent hands over another one — a different town,
		// a different colour, or the panel element arriving once it is mounted — and watch
		// that element's own box while it is the anchor. The panel changes height on its own
		// account (a challenge bar arriving, a countdown taking a button's place, a name that
		// wraps), and its centre moves with it while nothing about the map or the props has
		// changed; the map's own resize observer would never see it.
		void tether;
		if (!ready) return;
		rebuildTether();

		anchorObserver?.disconnect();
		anchorObserver = null;
		if (tether?.anchor) {
			anchorObserver = new ResizeObserver(() => rebuildTether());
			anchorObserver.observe(tether.anchor);
		}
	});

	$effect(() => {
		// Rebuild the festa boxes whenever the parent swaps them (e.g. a new day's
		// festa-major towns arrive). Gated on `ready` so a set passed before mount
		// still applies once the layer exists.
		void boxes;
		if (ready) rebuildBoxes();
	});

	$effect(() => {
		// Frame the requested region. Gated on `ready` (a $state flag) so a focus set
		// before the map mounts still applies once the instance exists.
		void ready;
		if (!focusBounds || !mapInstance) return;

		// `fitBounds` snaps down to the largest integer zoom at which the region still
		// fits the (padded) viewport — which is often a zoom where the region is still
		// within the level-of-detail fit factor, so its OWN pin tier stays on screen and
		// clicking it reveals no new subdivisions until you zoom in again. Step one zoom
		// deeper in that case so the region overflows the factor and its child tier
		// becomes the active level right on click. Capped at maxZoom so a tiny leaf
		// region (no children) just frames tighter instead of looping to the max.
		let target = mapInstance.getBoundsZoom(focusBounds, false, [32, 32]);
		if (target < maxZoom && boundsFitAtZoom(focusBounds, target)) target += 1;
		const centre = focusBoundsCentre(focusBounds);
		mapInstance.setView(centre, target, { animate: true });
	});

	// The geographic centre of a `[[south, west], [north, east]]` box.
	function focusBoundsCentre(
		bounds: [[number, number], [number, number]]
	): [number, number] {
		const [[south, west], [north, east]] = bounds;
		return [(south + north) / 2, (west + east) / 2];
	}

	// Build a pin's DOM: one plate saying what the pin is — the show's glyph on a tile at
	// its left end, the place's name and its show's beside it. The wrapper is translated so
	// its bottom centre sits on the point (the marker itself is zero-sized, see
	// rebuildMarkers), giving a pin that stands above its region.
	//
	// Every pin is built exactly the same way, the selected town's included: picking a town
	// changes nothing about how the map draws it. What used to stand on that one pin — the
	// side holding the town, and the siege line and challenge button under them — is drawn
	// in the panel over the map's top-left corner now (see TownPanel), so the map says the
	// same thing everywhere and the selection is answered off it.
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

		// One plate for everything the pin says: the tile at its left end, and to the right
		// of it the place on top of the show it flies, a line each across the plate's width.
		// Black, so the lettering is read off the plate and not off whatever terrain the pin
		// happens to stand on — the three separate chips this replaces each carried their own
		// card, which put two rounded boxes and a bordered tile on a town where one mark
		// belongs. The place is the pin's own name and takes the ink; the show is what it
		// flies and is lettered under it.
		const plate = document.createElement('div');
		plate.className =
			'mt-1 flex max-w-[15rem] items-center gap-2 rounded-lg bg-black p-1.5 text-white shadow-lg';

		if (tile) plate.appendChild(tile);

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

		plate.appendChild(lines);
		wrap.appendChild(plate);

		return wrap;
	}

	// The pin wrapper's classes: a bottom-centred column, made clickable when the marker
	// carries an onClick. The fade for a pin outside the selected area is NOT here: an
	// opacity on the wrapper groups everything under it, and no child can win its way back
	// to full — which took the plate's lettering down with the tile and left white type at
	// half strength over the terrain it is meant to be read against. It goes on the tile
	// instead (see markerElement), so a pin recedes without becoming unreadable.
	function classNamesFor(marker: MapMarker): string {
		let classes = 'flex -translate-x-1/2 -translate-y-full flex-col items-center';
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

	// A grouping tier is drawn while its regions are no bigger than this fraction of
	// the viewport. Once the region you're over grows past it (zooming in), the map
	// unfolds to its children; once its parent shrinks back under it (zooming out),
	// the map folds up a tier — so every step, coarse or fine, switches on zoom.
	const LEVEL_FIT_FACTOR = 0.85;

	// The available pin renderings, coarsest → finest. `markerLevels` (a stack of
	// breakdowns) wins; a plain `markers` array is treated as a single level.
	function markerLevelStack(): MapMarker[][] {
		if (markerLevels && markerLevels.length) return markerLevels;
		return markers.length ? [markers] : [];
	}

	// The pin of a level nearest the map centre — the region the view is focused on
	// (zoom centres on the pointer), used to decide the tier by that region's size.
	function focusedMarker(level: MapMarker[], centre: L.LatLng): MapMarker | null {
		let nearest: MapMarker | null = null;
		let best = Infinity;
		for (const marker of level) {
			const dLat = marker.position[0] - centre.lat;
			const dLng = marker.position[1] - centre.lng;
			const distance = dLat * dLat + dLng * dLng;
			if (distance < best) {
				best = distance;
				nearest = marker;
			}
		}
		return nearest;
	}

	// Whether a bounding box projects small enough to sit within the viewport (times
	// the fit factor) at a given zoom — i.e. this tier is the right size to show
	// rather than unfolding into its children.
	function boundsFitAtZoom(
		bounds: [[number, number], [number, number]],
		zoom: number
	): boolean {
		if (!mapInstance) return true;
		const [[south, west], [north, east]] = bounds;
		const topLeft = mapInstance.project([north, west], zoom);
		const bottomRight = mapInstance.project([south, east], zoom);
		const size = mapInstance.getSize();
		return (
			Math.abs(bottomRight.x - topLeft.x) <= size.x * LEVEL_FIT_FACTOR &&
			Math.abs(bottomRight.y - topLeft.y) <= size.y * LEVEL_FIT_FACTOR
		);
	}

	// Whether a marker's region still fits at the current zoom. Markers without
	// bounds always "fit".
	function regionFits(marker: MapMarker): boolean {
		if (!marker.bounds || !mapInstance) return true;
		return boundsFitAtZoom(marker.bounds, mapInstance.getZoom());
	}

	// The index of the tier to draw: the COARSEST level whose focused region still
	// fits the viewport. Region size shrinks as the level gets finer, so the first
	// (coarsest) level that fits is the right one; if even the finest region
	// overflows (zoomed in hard), the finest level is shown. This switches on every
	// zoom step — including the coarse ones the old pin-count cap never triggered.
	function levelIndexForView(levels: MapMarker[][], centre: L.LatLng): number {
		for (let i = 0; i < levels.length; i++) {
			const focus = focusedMarker(levels[i], centre);
			if (focus && regionFits(focus)) return i;
		}
		return levels.length - 1;
	}

	// (Re)build the pins for the current view: clear the layer, pick the level of
	// detail whose regions are viewport-sized, keep only its markers inside the
	// (slightly padded) viewport, and drop a zero-sized divIcon marker at each (its
	// overflowing content is the visible card) with a hover tooltip and click.
	// Runs on every markers change and whenever the map pans or zooms, so both the
	// culling and the chosen level track what's actually on screen.
	function rebuildMarkers() {
		if (!mapInstance || !Leaf) return;
		if (!markerLayer) markerLayer = Leaf.layerGroup().addTo(mapInstance);
		markerLayer.clearLayers();

		const bounds = mapInstance.getBounds().pad(0.25);
		const levels = markerLevelStack();
		const index = levels.length ? levelIndexForView(levels, mapInstance.getCenter()) : 0;
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

		// The open town's pin, added whether or not this tier is the one it belongs to and
		// whether or not it is inside the culling box. Zooming out folds towns up into their
		// comarca and then their province, which would take the mark off the very town the
		// panel is about at the moment the reader pulls back to see where it is — so that one
		// pin outlives its tier, and the leader running to the panel has something to leave
		// from at every zoom. Taken from the finest level that carries it (a municipality is a
		// leaf, so every tier from its own downwards repeats it, and they are all the same pin).
		if (pinnedId != null && !visible.some((marker) => marker.id === pinnedId)) {
			for (let i = levels.length - 1; i >= 0; i--) {
				const found = levels[i].find((marker) => marker.id === pinnedId);
				if (found) {
					visible.push(found);
					break;
				}
			}
		}

		// The pinned pin's own markup is dropped here and picked up again below, because the
		// leader is drawn to the middle of it and only the element knows how tall it is. A
		// rebuild detaches the last one, so the reference is dropped with it.
		pinnedPinElement = null;

		for (const marker of visible) {
			const element = markerElement(marker);
			if (marker.id === pinnedId) pinnedPinElement = element;
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
		}
	}

	// (Re)point the leader between the middle of the open town's pin and the middle of the
	// panel over the map. Both ends are worked out in the container's own pixels — one is a
	// box on the page, the other a point on the map raised by half a pin — and unprojected
	// back into latlngs, from where Leaflet carries the line like any other. Re-running it on
	// every move is what keeps the screen end where the panel is while the map end travels
	// with the terrain.
	//
	// Drawn in the overlay pane with the polygons, so it passes UNDER the pins and the
	// boxes (their panes are 600 and 590): the line is what joins two things, and it must
	// not be drawn over either of them. Non-interactive for the same reason the washes are
	// — a leader is not something to click, and it crosses a great deal of clickable map.
	//
	// `view` is the view to measure both ends against, for the one case where that is not the
	// view the map is in right now: a zoom animation (see the zoomanim handler).
	function rebuildTether(view?: { center: L.LatLng; zoom: number }) {
		if (!mapInstance || !Leaf) return;
		if (!tether?.anchor) {
			tetherLine?.remove();
			tetherLine = null;
			return;
		}

		// The anchor's centre in the map container's own pixels: both boxes are read live, so
		// a panel that has grown (a longer name, a challenge bar arriving) or a map that has
		// been resized is measured as it is now rather than as it was when the line was drawn.
		const anchorBox = tether.anchor.getBoundingClientRect();
		const mapBox = mapContainer.getBoundingClientRect();
		const centre = Leaf.point(
			anchorBox.left - mapBox.left + anchorBox.width / 2,
			anchorBox.top - mapBox.top + anchorBox.height / 2
		);

		// The map end is the middle of the pin's mark, not the point it stands on. A pin is
		// anchored by its bottom edge and grows upwards out of its point, so a line to the
		// point alone arrived under the plate and touched its bottom edge: the leader reads as
		// joining two panels, and it should meet this one where it meets the other, in the
		// middle. Half the drawn pin's height, measured live off the element — a plate is as
		// tall as its type and padding make it — and taken off in pixels at the view being
		// drawn, since the same rise is a different distance on the ground at every zoom. The
		// horizontal centre needs no such correction: a pin is already centred on its point.
		const rise = (pinnedPinElement?.getBoundingClientRect().height ?? 0) / 2;
		const town = pointAtLatLng(tether.position, view).subtract(Leaf.point(0, rise));

		const ends: L.LatLngExpression[] = [latLngAtPoint(town, view), latLngAtPoint(centre, view)];

		const style = { color: tether.color, weight: tether.weight ?? 5, opacity: 1 };
		if (!tetherLine) {
			tetherLine = Leaf.polyline(ends, { ...style, interactive: false }).addTo(mapInstance);
		} else {
			tetherLine.setLatLngs(ends);
			tetherLine.setStyle(style);
		}
	}

	// Which latlng a point in the container currently sits over — or would sit over in the
	// view passed in. Leaflet's own `containerPointToLatLng` answers the first and has no way
	// to ask the second, so the projection is done the way it does it: the container's
	// top-left in projected pixels is the centre's projection less half the container, and a
	// point in the container is that plus its own offset, unprojected at the same zoom.
	function latLngAtPoint(point: L.Point, view?: { center: L.LatLng; zoom: number }): L.LatLng {
		if (!view) return mapInstance!.containerPointToLatLng(point);
		return mapInstance!.unproject(containerTopLeft(view).add(point), view.zoom);
	}

	/** The same in reverse: where a latlng falls in the container, in that same view. */
	function pointAtLatLng(
		latlng: L.LatLngExpression,
		view?: { center: L.LatLng; zoom: number }
	): L.Point {
		if (!view) return mapInstance!.latLngToContainerPoint(latlng);
		return mapInstance!.project(latlng, view.zoom).subtract(containerTopLeft(view));
	}

	/** A view's top-left corner in projected pixels: its centre less half the container. */
	function containerTopLeft(view: { center: L.LatLng; zoom: number }): L.Point {
		return mapInstance!.project(view.center, view.zoom).subtract(mapInstance!.getSize().divideBy(2));
	}

	/** The boxes' teardown: a box no longer on screen must not keep its images. */
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
	// The width is fixed at 80px and the box's own 30:37 gives the height: it is a mark
	// on a town, so it stays the size it is whatever the map is showing, and a box small
	// enough not to bury the town it stands on is a box read by its cover.
	//
	// It hangs *below* its point rather than standing on it: a region pin is anchored by
	// its bottom edge and grows upwards out of the point, so everything under the point
	// is free and a box put there shares the town with its pin instead of covering it.
	// Both are anchored on the same centre, which is what keeps them one object seen as
	// two — the pin above the point, the box under it, meeting at the town.
	function boxElement(box: MapBoosterBox): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className = 'w-20 -translate-x-1/2 translate-y-1';
		if (box.onClick) wrap.className += ' cursor-pointer';
		boxMounts.push(
			mount(BoosterBox, {
				target: wrap,
				props: {
					coverUrl: box.coverUrl ?? null,
					logoUrl: box.logoUrl ?? null,
					showId: box.showId ?? null,
					locationName: box.locationName ?? null,
					light: box.light ?? false
				}
			})
		);
		return wrap;
	}

	// The same town above the town tier: a disc of the box's own stock — white card for a
	// town de festa today, black for the rest of the window — with the show's glyph
	// printed on it in the ink that stock is read in. Hung on the same point, by the same
	// centre, so folding up a tier leaves the mark where the box was.
	//
	// It is the box reduced to the two things that are read at a glance: what it is printed
	// on and what show is inside it. A box above this tier stands for a whole comarca's
	// worth of towns at once — its cover, its wordmark and the place across its foot are
	// reading matter overlapping its neighbours', which is less than one mark that can be
	// told apart at that distance. So the mark is what gets the room the box's picture and
	// its two lines of type had: the glyph is 36px and the disc 56px round it, nine
	// fourteenths of the diameter, which still leaves a square mark's corners inside the
	// circle (a side of 36 spans 51 across its diagonal). Two thirds of the box's own 80px:
	// the disc is not a badge stuck on the map, it is the same object with one mark on it
	// instead of four, drawn small enough that neighbouring towns in one comarca are still
	// separate marks.
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
	function discElement(box: MapBoosterBox): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className =
			'flex size-14 -translate-x-1/2 translate-y-1 items-center justify-center rounded-full shadow-md [&>svg]:size-9 ' +
			(box.light ? 'bg-white text-black' : 'bg-black text-white');
		if (box.onClick) wrap.className += ' cursor-pointer';
		wrap.setAttribute('aria-hidden', 'true');
		const markup = iconMarkup(showIconName(box.showId));
		if (markup) wrap.innerHTML = markup;
		return wrap;
	}

	// How a town is marked at the pin tier on screen — the box layer says the same thing the
	// pins do, at the size that tier has room for:
	//
	// - the finest tier, where every town is its own pin, gets the box itself;
	// - the tiers between get the disc, the same town in the space a smaller mark has;
	// - the coarsest tier — the whole of the Països Catalans in one view, half a dozen
	//   territory pins for thousands of towns — gets nothing at all. There is no reading a
	//   town off a mark at that zoom: the festa towns of a whole territory land in one
	//   handful of pixels, so the discs merge into a blot over the country that says only
	//   that somewhere in there are festes, which the map already says with its pins. The
	//   window's towns are for finding once the reader has picked a corner to look in.
	//
	// A stack with nothing to fold (no levels at all, or a single rendering) is at its
	// finest tier by definition, and so keeps its boxes — the finest test is made first for
	// exactly that reason, since level 0 is then both ends of the stack at once.
	function markKindForLevel(): 'box' | 'disc' | null {
		if (pinLevelIndex >= pinLevelCount - 1) return 'box';
		if (pinLevelIndex === 0) return null;
		return 'disc';
	}

	// (Re)build the festa boxes for the current view: unmount the last crop, clear the
	// layer, and — unless the tier on screen marks no towns at all — keep only the boxes
	// inside the (padded) viewport and drop a zero-sized divIcon at each, carrying whichever
	// mark that tier calls for. Runs on every boxes change and whenever the map pans or
	// zooms, so both the culling and the mark track what's on screen.
	function rebuildBoxes() {
		if (!mapInstance || !Leaf) return;
		if (!boxLayer) boxLayer = Leaf.layerGroup().addTo(mapInstance);
		unmountBoxMounts();
		boxLayer.clearLayers();

		const kind = markKindForLevel();
		if (!kind) return;

		const bounds = mapInstance.getBounds().pad(0.25);
		for (const box of boxes) {
			if (!bounds.contains(box.position)) continue;
			const html = kind === 'box' ? boxElement(box) : discElement(box);
			const icon = Leaf.divIcon({ html, className: '', iconSize: [0, 0] });
			const badge = Leaf.marker(box.position, { icon, riseOnHover: true, pane: BOX_PANE });
			// No tooltip: the box already carries the town's name across its foot, and a
			// hover label over a map this dense is a second thing to read where there was
			// one to look at.
			if (box.onClick) badge.on('click', () => box.onClick!());
			badge.addTo(boxLayer!);
		}
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
			// No +/- zoom buttons — the map is driven by scroll/pinch only.
			zoomControl: false,
			// The badge carries the Esri credit the imagery licence requires, so it
			// stays on for as long as the satellite basemap is there.
			attributionControl: true
		});

		// The pane the festa boxes hang in (see BOX_PANE), made before anything is added to
		// it. Under the region pins (600) rather than over them: the box is hung clear of
		// its own town's pin, but a box is 80px tall and the map is dense, so where one does
		// reach a neighbour's pin the pin is the thing that must not be covered — a box
		// gives up its corner instead.
		mapInstance.createPane(BOX_PANE).style.zIndex = '590';

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
		// Re-cull the pins and re-sync the view after any pan or zoom settles.
		mapInstance.on('moveend zoomend', () => {
			zoomAnimating = false;
			syncView();
			rebuildMarkers();
			rebuildBoxes();
			rebuildTether();
		});

		// The leader alone follows the map continuously rather than waiting for it to settle:
		// one of its ends is a fixed place on the screen, so a line left until moveend would
		// come unstuck from the panel for the whole of a drag and snap back at the end of it.
		// Re-pointing a single polyline is a couple of projections, which is cheap enough to
		// do on every frame of a pan — the pins and boxes, which are DOM, are not, and they
		// go on waiting for the view to settle.
		//
		// Not while a zoom animation is running, though: that is the one case where the view
		// the map reports is not the view being drawn, and re-pointing off it would put the
		// screen end back where the panel was before the zoom began. The zoomanim handler
		// below has already pointed the line for the view the animation is heading into.
		mapInstance.on('move zoom', () => {
			if (!zoomAnimating) rebuildTether();
		});

		// A zoom is animated by transitioning a transform on the panes, so for its whole
		// quarter-second the paths hold the coordinates they were projected in and the browser
		// slides them into place. A line pointed at the panel in the old view therefore rides
		// the terrain out of position and only reaches the panel on the next projection, which
		// read as the line halting for the length of every zoom.
		//
		// zoomanim carries the view the animation is heading into, and fires before a frame of
		// it is drawn. Pointing the screen end at where the panel WILL be and letting the same
		// transform carry it there is what makes the transition land the line on the panel: it
		// moves with the map, as everything in that pane must, and arrives pointing at the
		// panel rather than snapping to it once the zoom is over.
		//
		// The flag goes up at zoomstart as well, which is what a pinch raises: mid-pinch the
		// map reports a fractional view its panes have not been re-projected to, so a line
		// re-pointed off it would be transformed twice. A pinch therefore rides the terrain
		// while the fingers are down and is landed on the panel by the zoomanim its release
		// fires — the same arrival, one gesture later.
		mapInstance.on('zoomstart', () => {
			zoomAnimating = true;
		});
		mapInstance.on('zoomanim', (event) => {
			zoomAnimating = true;
			rebuildTether({ center: event.center, zoom: event.zoom });
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
			rebuildTether();
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
		resizeObserver?.disconnect();
		anchorObserver?.disconnect();
		unmountBoxMounts();
		mapInstance?.remove();
	});
</script>

<!-- bg-transparent! overrides Leaflet's default grey container fill, so the page
	background (not a grey block) is what shows while the satellite tiles stream in. -->
<div
	bind:this={mapContainer}
	class={`bg-transparent! ${classes}`}
	role="application"
	aria-label="World map"
></div>
