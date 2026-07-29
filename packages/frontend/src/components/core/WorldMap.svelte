<script lang="ts">
	import { mount, onMount, onDestroy, unmount } from 'svelte';
	import type L from 'leaflet';
	import TeamLineup from '$components/core/TeamLineup.svelte';
	import PinChallenge from '$components/core/PinChallenge.svelte';
	import type { MapCircle, MapDot, MapLine, MapMarker, MapOverlay } from '$types/map.type';

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
		dots = [],
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
		 * Dots dropped on individual points (e.g. the festa-major towns the booster
		 * window reaches), drawn above the region pins and always shown regardless of
		 * zoom tier.
		 */
		dots?: MapDot[];
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
	// The pins layer, rebuilt whenever the markers prop changes.
	let markerLayer: L.LayerGroup | null = null;
	// The components mounted into the pins on screen — the teams standing on them and
	// the challenge bars under those. Clearing the layer only detaches their DOM, and
	// each of them runs a timer of its own (a sprite's frames, a countdown's seconds),
	// so every rebuild unmounts the previous crop first.
	let pinMounts: Record<string, unknown>[] = [];
	// The festa-dot layer, rebuilt whenever the dots prop changes. Kept separate from
	// the region pins so it always shows, with no level-of-detail folding, and sits
	// above them.
	let dotLayer: L.LayerGroup | null = null;
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
		// Rebuild the festa dots whenever the parent swaps them (e.g. a new day's
		// festa-major towns arrive). Gated on `ready` so a set passed before mount
		// still applies once the layer exists.
		void dots;
		if (ready) rebuildDots();
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

	// Build a pin's DOM: the region's location name, then the show's glyph in a
	// rounded frame, with the full show name captioned beneath (never truncated).
	// The wrapper is translated so its bottom centre sits on the point (the marker
	// itself is zero-sized, see rebuildMarkers), giving a pin that stands above its
	// region.
	function markerElement(marker: MapMarker): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className = classNamesFor(marker);

		if (marker.subtitle) {
			const location = document.createElement('span');
			location.textContent = marker.subtitle;
			location.className =
				'mb-1 rounded bg-base-100 px-1.5 py-0.5 text-center text-xs font-semibold text-base-content shadow';
			wrap.appendChild(location);
		}

		// The side sitting on the region, where there is one: the very cards the sidebar
		// draws a team with — floor, character, name, place and all — three across, in
		// place of the tile. Which pins get one is the caller's to say (today, the
		// selected town alone); every other pin falls through to its glyph below. It is
		// the same component (see TeamLineup), mounted into the pin's DOM because this
		// is imperative code rather than a template, and tracked so the next rebuild can
		// unmount it: each sprite runs a frame timer, and a pin merely detached from the
		// map would go on animating for nothing.
		if (marker.team?.length) {
			const frame = document.createElement('div');
			// A fixed 500px for the side together, shared out by the row. Fixed, so the
			// statues come out the same size whichever town is selected, rather than
			// tracking anything about the map or the region under them.
			frame.className = 'w-[500px] drop-shadow-lg';
			pinMounts.push(
				mount(TeamLineup, {
					target: frame,
					// A town's team is somebody else's side, so it faces the viewer
					// unmirrored, as a rival side does on the board.
					props: { members: marker.team, flipped: false, classes: 'gap-1' }
				})
			);
			wrap.appendChild(frame);
		} else if (marker.iconSvg || marker.frameClasses) {
			// A square tile in the region's colour carrying the show's glyph. The glyph is
			// inlined rather than pointed at by an <img> so it inherits the tile's ink
			// (see icon-markup) — which is why the fill and the ink arrive together
			// in `frameClasses`. Sized through a CSS rule, which outranks the svg's own
			// 1em width/height attributes. Decorative: the show is named in the caption
			// right below, so announcing the glyph too would read it twice. A pin with
			// neither a colour nor a glyph is caption-only and skips the tile entirely.
			const frame = document.createElement('div');
			frame.className =
				'flex size-12 items-center justify-center rounded-lg border-2 border-base-100 shadow-lg [&>svg]:size-8 ' +
				(marker.frameClasses ?? 'bg-base-100 text-base-content');
			frame.setAttribute('aria-hidden', 'true');
			if (marker.iconSvg) frame.innerHTML = marker.iconSvg;
			wrap.appendChild(frame);
		}

		// What can be done about the region, right under the side holding it: the siege
		// standing and the one control that acts on it. Mounted and tracked exactly as
		// the team is — it runs a clock of its own when it is counting down.
		if (marker.challenge) {
			const bar = document.createElement('div');
			bar.className = 'mt-1';
			// The controls are the pin's, not the map's: without this a click on the
			// button would go on up to the marker (re-opening the region, re-framing the
			// view under the reader) and a drag begun on it would pan the map. Leaflet's
			// own way of saying "this DOM is a widget, not terrain".
			Leaf!.DomEvent.disableClickPropagation(bar);
			Leaf!.DomEvent.disableScrollPropagation(bar);
			pinMounts.push(mount(PinChallenge, { target: bar, props: { ...marker.challenge } }));
			wrap.appendChild(bar);
		}

		const caption = document.createElement('span');
		caption.textContent = marker.title;
		caption.className =
			'mt-1 max-w-[10rem] whitespace-normal rounded bg-primary px-1.5 py-0.5 text-center text-xs font-semibold text-primary-content shadow';
		wrap.appendChild(caption);

		return wrap;
	}

	// The pin wrapper's classes: a bottom-centred column, made clickable when the
	// marker carries an onClick and faded when it sits outside the selected area.
	function classNamesFor(marker: MapMarker): string {
		let classes = 'flex -translate-x-1/2 -translate-y-full flex-col items-center';
		if (marker.onClick) classes += ' cursor-pointer';
		if (marker.dimmed) classes += ' opacity-50';
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
		unmountPinMounts();
		markerLayer.clearLayers();

		const bounds = mapInstance.getBounds().pad(0.25);
		const levels = markerLevelStack();
		const index = levels.length ? levelIndexForView(levels, mapInstance.getCenter()) : 0;
		// Publish the chosen tier so the parent can mirror it (polygons, sidebar).
		activeLevel = index;
		const chosen = levels[index] ?? [];

		// Remap every municipality of the chosen tier to its region's featureIds (from
		// all of the tier's pins, not just the culled-in ones), so a polygon hover can
		// light the same whole region its pin does — wherever in the region you point.
		regionByFeatureId = new Map();
		for (const marker of chosen) {
			for (const id of marker.featureIds ?? []) regionByFeatureId.set(id, marker.featureIds!);
		}

		const visible = chosen.filter((marker) => bounds.contains(marker.position));

		for (const marker of visible) {
			const icon = Leaf.divIcon({
				html: markerElement(marker),
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

	/** Tear down everything mounted into a pin, so no detached timer keeps running. */
	function unmountPinMounts() {
		for (const mounted of pinMounts) void unmount(mounted);
		pinMounts = [];
	}

	// A festa dot's DOM: a filled circle centred on its point, white or black — the
	// two stocks the booster boxes are printed on. Each carries a rule in the other
	// colour, since neither white nor black alone survives every satellite tile
	// underneath it, and the drop shadow lifts the whole dot off whatever it lands on.
	function dotElement(dot: MapDot): HTMLElement {
		const span = document.createElement('span');
		span.className =
			'block h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]';
		span.className += dot.light ? ' border-black bg-white' : ' border-white bg-black';
		if (dot.onClick) span.className += ' cursor-pointer';
		return span;
	}

	// (Re)build the festa dots for the current view: clear the layer, keep only the
	// dots inside the (padded) viewport, and drop a zero-sized divIcon at each. Runs
	// on every dots change and whenever the map pans or zooms, so the culling tracks
	// what's on screen. Unlike the region pins there's no level-of-detail — every
	// festa-major town keeps its dot at every zoom.
	function rebuildDots() {
		if (!mapInstance || !Leaf) return;
		if (!dotLayer) dotLayer = Leaf.layerGroup().addTo(mapInstance);
		dotLayer.clearLayers();

		const bounds = mapInstance.getBounds().pad(0.25);
		for (const dot of dots) {
			if (!bounds.contains(dot.position)) continue;
			const icon = Leaf.divIcon({ html: dotElement(dot), className: '', iconSize: [0, 0] });
			const badge = Leaf.marker(dot.position, { icon, riseOnHover: true });
			if (dot.label) badge.bindTooltip(dot.label, { direction: 'top' });
			if (dot.onClick) badge.on('click', () => dot.onClick!());
			badge.addTo(dotLayer!);
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
			syncView();
			rebuildMarkers();
			rebuildDots();
		});

		// Keep Leaflet's cached viewport in sync with its container: when the parent
		// shrinks the map to reserve room for an open side panel, invalidateSize
		// re-projects the map (so markers/dots slide out from under the panel and
		// stay clickable) and we re-cull to the new box. Without this, Leaflet keeps
		// the stale size and the reserved gutter still overlaps live pins.
		resizeObserver = new ResizeObserver(() => {
			mapInstance?.invalidateSize({ animate: false });
			syncView();
			rebuildMarkers();
			rebuildDots();
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
		unmountPinMounts();
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
