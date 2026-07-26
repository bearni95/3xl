<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type L from 'leaflet';
	import type { ImageFill, MapCircle, MapLine, MapMarker, MapOverlay } from '$types/map.type';

	let {
		center = [20, 0] as [number, number],
		zoom = 2,
		minZoom = 2,
		maxZoom = 19,
		overlays = [],
		circles = [],
		lines = [],
		markers = [],
		highlightId = null,
		highlightStyle = null,
		hiddenLineUrls = new Set<string>(),
		focusBounds = null,
		currentZoom = $bindable(zoom),
		classes = ''
	}: {
		/** Initial map centre as [lat, lng]. */
		center?: [number, number];
		zoom?: number;
		minZoom?: number;
		maxZoom?: number;
		/** GeoJSON overlays drawn in array order (last = topmost). */
		overlays?: MapOverlay[];
		/** Standalone circular regions drawn above the overlays. */
		circles?: MapCircle[];
		/** Standalone straight lines drawn above the overlays. */
		lines?: MapLine[];
		/** Image-and-caption pins dropped above the overlays; rebuilt reactively. */
		markers?: MapMarker[];
		/** `properties.id` of the one feature to paint with `highlightStyle`. */
		highlightId?: string | null;
		/** Style merged over the highlighted feature's base style. */
		highlightStyle?: L.PathOptions | null;
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
	// The current image-fill groups (rebuilt whenever the overlays prop changes),
	// each a set of polygons sharing one image stretched across their union.
	let imageFillGroups: ImageFillGroup[] = [];
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
		let style = overlay.style;
		if (highlightId != null && highlightStyle && feature?.properties?.id === highlightId) {
			style = { ...style, ...highlightStyle };
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
		// re-runs each group's style option, which now reflects the new state, then
		// the image fills are re-applied since resetStyle repaints their fillColor.
		void highlightId;
		void highlightStyle;
		void hiddenLineUrls;
		for (const group of overlayGroups) group.resetStyle();
		refreshImageFills();
	});

	$effect(() => {
		// Re-derive the image fills whenever the parent swaps the overlays array
		// (e.g. the selection changes which region carries its show's backdrop).
		// The layers themselves stay put; only their fills are regrouped. Gated on
		// `ready` so an overlays prop set before mount still applies once they exist.
		void overlays;
		if (ready) buildImageFills();
	});

	$effect(() => {
		// Rebuild the pins whenever the parent swaps the markers array (e.g. the
		// selection changes which regions are imaged). Gated on `ready` so a set
		// passed before mount still applies once the layer exists. Recomputing the
		// zoom-out floor here means it re-derives for every cut: whatever set of
		// pins is currently shown, the map can't zoom out to where they'd blank.
		void markers;
		if (ready) {
			rebuildMarkers();
			updateMinZoom();
		}
	});

	$effect(() => {
		// Frame the requested region: fit the map to its bounding box with a little
		// breathing room. Gated on `ready` (a $state flag) so a focus set before the
		// map mounts still applies once the instance exists.
		void ready;
		if (!focusBounds || !mapInstance) return;
		mapInstance.fitBounds(focusBounds, { padding: [32, 32] });
	});

	// Enter a feature: apply the overlay's hoverStyle so the polygon's border and
	// fill highlight while the pointer is over it. setStyle repaints the base
	// fillColor, so re-apply the image (fading it to full opacity) for a polygon
	// that carries a fill — reading its live pattern id, set after a selection.
	function hoverOn(overlay: MapOverlay, layer: L.Path) {
		if (overlay.hoverStyle) layer.setStyle(overlay.hoverStyle);
		applyImageFill(layer, IMAGE_FILL_HOVER_OPACITY);
	}

	// Leave a feature: reset it to its base style, then re-apply the image at its
	// resting opacity since resetStyle repaints the base fillColor.
	function hoverOff(group: L.GeoJSON, layer: L.Path) {
		group.resetStyle(layer);
		applyImageFill(layer);
	}

	const SVG_NS = 'http://www.w3.org/2000/svg';
	const XLINK_NS = 'http://www.w3.org/1999/xlink';
	let imageFillId = 0;

	// Image-filled polygons sit a touch under full strength so the satellite base
	// reads through, and fade to full opacity while hovered. Groups outside the
	// selected area rest dimmed — the same 50%/full split the pins use.
	const IMAGE_FILL_OPACITY = 0.85;
	const IMAGE_FILL_DIMMED_OPACITY = 0.4;
	const IMAGE_FILL_HOVER_OPACITY = 1;

	// A set of vector layers that share a single image fill: the image is
	// stretched across their combined bounding box (not each polygon's own), so
	// adjacent features assemble into one picture. Grouped by the key each
	// overlay's `imageFill` returns; `dimmed` sets the group's resting opacity.
	type ImageFillGroup = { url: string; patternId: string; dimmed: boolean; layers: L.Path[] };

	// Reposition every group's pattern over its (reprojected) union box.
	function refreshImageFills() {
		imageFillGroups.forEach(updateImageFillGroup);
	}

	// A bare string is shorthand for a group keyed by its own URL.
	function normalizeFill(fill: ImageFill | string | null | undefined): ImageFill | null {
		if (!fill) return null;
		if (typeof fill === 'string') return { key: fill, url: fill };
		return fill.url ? fill : null;
	}

	// A layer's resting fill-opacity: dimmed groups (outside the selection) rest
	// fainter, matching the pins' 50%/full split.
	function restingOpacity(layer: L.Path): number {
		return (layer as L.Path & { _imageFillDimmed?: boolean })._imageFillDimmed
			? IMAGE_FILL_DIMMED_OPACITY
			: IMAGE_FILL_OPACITY;
	}

	// The union of the group's path bounding boxes, in SVG user coordinates — the
	// same space a `userSpaceOnUse` pattern is measured in, so getBBox() values
	// can be used directly.
	function groupBoundingBox(group: ImageFillGroup) {
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		let found = false;
		for (const layer of group.layers) {
			const el = layer.getElement() as SVGGraphicsElement | null;
			if (!el) continue;
			const box = el.getBBox();
			if (box.width === 0 && box.height === 0) continue;
			found = true;
			minX = Math.min(minX, box.x);
			minY = Math.min(minY, box.y);
			maxX = Math.max(maxX, box.x + box.width);
			maxY = Math.max(maxY, box.y + box.height);
		}
		return found ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null;
	}

	// Create (once) the group's shared <pattern>/<image>, size it to the group's
	// current union box, and point every member path's fill at it. Re-run on
	// zoom/pan since the paths reproject and the box moves with them.
	function updateImageFillGroup(group: ImageFillGroup) {
		const firstEl = group.layers[0]?.getElement() as SVGElement | null;
		const svg = firstEl?.ownerSVGElement;
		if (!svg) return;

		let defs = svg.querySelector('defs');
		if (!defs) {
			defs = document.createElementNS(SVG_NS, 'defs');
			svg.insertBefore(defs, svg.firstChild);
		}

		let pattern = svg.querySelector<SVGPatternElement>(`#${group.patternId}`);
		let image: SVGImageElement;
		if (!pattern) {
			pattern = document.createElementNS(SVG_NS, 'pattern');
			pattern.setAttribute('id', group.patternId);
			pattern.setAttribute('patternUnits', 'userSpaceOnUse');
			image = document.createElementNS(SVG_NS, 'image');
			image.setAttributeNS(XLINK_NS, 'href', group.url);
			image.setAttribute('href', group.url);
			// Cover the combined shape's full extent, keeping the image's aspect
			// ratio (scale to fill the outermost box, crop the overflow) so no part
			// of any polygon is ever left without image behind it.
			image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
			pattern.appendChild(image);
			defs.appendChild(pattern);
		} else {
			image = pattern.querySelector('image')!;
		}

		const box = groupBoundingBox(group);
		if (box) {
			// One tile the size of the union box, anchored at its top-left, so the
			// image lands over the assembled shape exactly once.
			pattern.setAttribute('x', String(box.x));
			pattern.setAttribute('y', String(box.y));
			pattern.setAttribute('width', String(box.width));
			pattern.setAttribute('height', String(box.height));
			image.setAttribute('width', String(box.width));
			image.setAttribute('height', String(box.height));
		}

		for (const layer of group.layers) applyImageFill(layer);
	}

	// Point a member path's fill at its group pattern (set when the group is built)
	// at the given opacity. Used on first paint and to restore the fill after a
	// setStyle/resetStyle repaints the base fillColor on hover. fill-opacity is
	// driven through the CSS property (not the attribute) with a transition, so the
	// hover change fades rather than snapping. No-ops for an unfilled polygon.
	function applyImageFill(layer: L.Path, opacity: number = restingOpacity(layer)) {
		const patternId = (layer as L.Path & { _imageFillPatternId?: string })._imageFillPatternId;
		const el = layer.getElement() as SVGElement | undefined;
		if (!patternId || !el) return;
		el.setAttribute('fill', `url(#${patternId})`);
		el.style.transition = 'fill-opacity 200ms ease';
		el.style.fillOpacity = String(opacity);
	}

	// (Re)build the image-fill groups from the current overlays: reset every
	// previously filled path to its base style, drop the old <pattern> defs, then
	// re-evaluate each feature's imageFill and group the paths by the key it
	// returns — one shared image per key, spanning that group's combined shape.
	function buildImageFills() {
		if (!mapInstance) return;

		for (const group of imageFillGroups) {
			for (const layer of group.layers) {
				delete (layer as L.Path & { _imageFillPatternId?: string })._imageFillPatternId;
			}
		}
		overlays.forEach((overlay, index) => {
			if (overlay.imageFill) overlayGroups[index]?.resetStyle();
		});
		for (const svg of mapContainer.querySelectorAll('svg')) {
			svg.querySelectorAll('pattern[id^="map-image-fill-"]').forEach((pattern) => pattern.remove());
		}

		const grouped = new Map<string, { url: string; dimmed: boolean; layers: L.Path[] }>();
		overlays.forEach((overlay, index) => {
			const group = overlayGroups[index];
			if (!overlay.imageFill || !group) return;
			group.eachLayer((layer) => {
				const feature = (layer as L.Layer & { feature?: GeoJSON.Feature }).feature;
				if (!feature) return;
				const fill = normalizeFill(overlay.imageFill!(feature));
				if (!fill) return;
				const entry = grouped.get(fill.key) ?? { url: fill.url, dimmed: !!fill.dimmed, layers: [] };
				entry.layers.push(layer as L.Path);
				grouped.set(fill.key, entry);
			});
		});

		imageFillGroups = [...grouped.values()].map(({ url, dimmed, layers }) => {
			const patternId = `map-image-fill-${imageFillId++}`;
			for (const layer of layers) {
				const path = layer as L.Path & { _imageFillPatternId?: string; _imageFillDimmed?: boolean };
				path._imageFillPatternId = patternId;
				path._imageFillDimmed = dimmed;
			}
			return { url, patternId, dimmed, layers };
		});
		refreshImageFills();
	}

	// Build a pin's DOM: the region's location name, then a poster thumbnail in a
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

		if (marker.imageUrl) {
			const frame = document.createElement('div');
			frame.className = 'overflow-hidden rounded-lg border-2 border-base-100 bg-base-100 shadow-lg';
			const img = document.createElement('img');
			img.src = marker.imageUrl;
			img.alt = marker.title;
			img.className = 'block h-24 w-16 object-cover';
			frame.appendChild(img);
			wrap.appendChild(frame);
		}

		const caption = document.createElement('span');
		caption.textContent = marker.title;
		caption.className =
			'mt-1 max-w-[10rem] whitespace-normal rounded bg-neutral px-1.5 py-0.5 text-center text-xs font-semibold text-neutral-content shadow';
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
				// setStyle/resetStyle repaint the base fillColor, so restore a filled
				// polygon's image (full opacity while lit, its resting opacity when reset).
				if (on) applyImageFill(layer, IMAGE_FILL_HOVER_OPACITY);
				else applyImageFill(layer);
			}
		}
	}

	// Above this many pins in view the layer is left empty until the map zooms in —
	// a map-wide fine breakdown (e.g. every municipality) would otherwise drop
	// thousands of image markers at once. The pins reappear tier by tier as the
	// visible count drops below the cap.
	const MAX_VISIBLE_MARKERS = 250;

	// How many of the current markers would fall inside the viewport at a
	// hypothetical zoom, using the same padded bounds rebuildMarkers culls with.
	// Projecting the current centre at `zoom` lets us ask "how crowded would the
	// map be down there?" without actually zooming.
	function visibleCountAtZoom(zoom: number): number {
		if (!mapInstance || !Leaf) return 0;
		const half = mapInstance.getSize().divideBy(2);
		const centre = mapInstance.project(mapInstance.getCenter(), zoom);
		const nw = mapInstance.unproject(centre.subtract(half), zoom);
		const se = mapInstance.unproject(centre.add(half), zoom);
		const bounds = Leaf.latLngBounds(nw, se).pad(0.25);
		return markers.reduce((count, marker) => count + (bounds.contains(marker.position) ? 1 : 0), 0);
	}

	// Constrain how far the map may zoom out to the lowest zoom at which the
	// currently-shown pins still stay under the cap — below that they'd blank out
	// (see rebuildMarkers), so we forbid reaching it instead. Recomputed for every
	// cut: a coarse breakdown (few pins) leaves the floor at the base minZoom and
	// full zoom-out stays available; a dense one (a whole tier of municipalities)
	// raises it so those pins are always visible while the map is zoomed in past it.
	function updateMinZoom() {
		if (!mapInstance) return;
		let floor = minZoom;
		while (floor < maxZoom && visibleCountAtZoom(floor) > MAX_VISIBLE_MARKERS) floor++;
		mapInstance.setMinZoom(floor);
	}

	// (Re)build the pins for the current view: clear the layer, keep only the
	// markers inside the (slightly padded) viewport, and — unless there are too
	// many to stay legible — drop a zero-sized divIcon marker at each (its
	// overflowing content is the visible card) with a hover tooltip and click.
	// Runs on every markers change and whenever the map pans or zooms, so the
	// whole-map breakdown is culled to what's actually on screen.
	function rebuildMarkers() {
		if (!mapInstance || !Leaf) return;
		if (!markerLayer) markerLayer = Leaf.layerGroup().addTo(mapInstance);
		markerLayer.clearLayers();

		const bounds = mapInstance.getBounds().pad(0.25);
		const visible = markers.filter((marker) => bounds.contains(marker.position));
		if (visible.length > MAX_VISIBLE_MARKERS) return;

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

	onMount(async () => {
		// Leaflet touches `window` at import time, so it must be loaded
		// dynamically in the browser — never during SSR.
		Leaf = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		mapInstance = Leaf.map(mapContainer, {
			minZoom,
			maxZoom,
			worldCopyJump: true
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
		// Keep the bindable zoom in sync so callers can render a live readout.
		currentZoom = mapInstance.getZoom();
		mapInstance.on('zoomend', () => {
			currentZoom = mapInstance!.getZoom();
		});
		// Re-cull the pins to the viewport after any pan or zoom settles.
		mapInstance.on('moveend zoomend', rebuildMarkers);
		// Keep every group's image aligned as the map reprojects.
		mapInstance.on('zoomend viewreset moveend', refreshImageFills);

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
				style: (feature) => styleFor(overlay, feature),
				onEachFeature: (feature, layer) => {
					if (overlay.interactive === false) return;

					const label = overlay.label?.(feature);
					if (label) {
						layer.bindTooltip(label, { sticky: true });
					}

					if (overlay.hoverStyle) {
						const id = feature.properties?.id;
						if (id != null) byId.set(String(id), layer as L.Path);
						layer.on('mouseover', () => hoverOn(overlay, layer as L.Path));
						layer.on('mouseout', () => hoverOff(layerGroup, layer as L.Path));
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
		mapInstance?.remove();
	});
</script>

<div bind:this={mapContainer} class={classes} role="application" aria-label="World map"></div>
