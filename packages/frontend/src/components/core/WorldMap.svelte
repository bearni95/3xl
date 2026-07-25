<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type L from 'leaflet';
	import type { ImageFill, MapCircle, MapLine, MapOverlay } from '$types/map.type';

	let {
		center = [20, 0] as [number, number],
		zoom = 2,
		minZoom = 2,
		maxZoom = 19,
		overlays = [],
		circles = [],
		lines = [],
		highlightId = null,
		highlightStyle = null,
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
		/** `properties.id` of the one feature to paint with `highlightStyle`. */
		highlightId?: string | null;
		/** Style merged over the highlighted feature's base style. */
		highlightStyle?: L.PathOptions | null;
		/** Live map zoom level, kept in sync with the map (bindable). */
		currentZoom?: number;
		/** Extra Tailwind classes for the map container. */
		classes?: string;
	} = $props();

	let mapContainer: HTMLDivElement;
	let mapInstance: L.Map | null = null;
	// The geoJSON layer groups, in overlay order, captured at mount so the
	// highlight and overlay $effects can repaint reactively.
	let overlayGroups: L.GeoJSON[] = [];
	// The current image-fill groups (rebuilt whenever the overlays prop changes).
	let imageFillGroups: ImageFillGroup[] = [];
	// Flipped true once the overlays are on the map, so the rebuild $effect knows
	// the layers exist before it evaluates any imageFill.
	let ready = $state(false);

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

	// A feature's base style, plus the highlight merged on when it's the chosen
	// one. Called both at first paint and by resetStyle, so reading the live
	// `highlightId`/`highlightStyle` keeps the highlight through hover resets.
	function styleFor(overlay: MapOverlay, feature?: GeoJSON.Feature): L.PathOptions {
		if (highlightId != null && highlightStyle && feature?.properties?.id === highlightId) {
			return { ...overlay.style, ...highlightStyle };
		}
		return overlay.style;
	}

	$effect(() => {
		// Repaint when the highlighted feature changes: resetStyle re-runs each
		// group's style option (which now reflects the new highlightId), then the
		// image fills are re-applied since resetStyle repaints their fillColor.
		void highlightId;
		void highlightStyle;
		for (const group of overlayGroups) group.resetStyle();
		refreshImageFills();
	});

	$effect(() => {
		// Re-derive the image fills whenever the parent swaps the overlays array
		// (e.g. the sidebar opens a region, changing which poster each polygon
		// shows). The layers themselves stay put; only their fills are regrouped.
		void overlays;
		if (ready) buildImageFills();
	});

	const SVG_NS = 'http://www.w3.org/2000/svg';
	const XLINK_NS = 'http://www.w3.org/1999/xlink';
	let imageFillId = 0;

	// A set of vector layers that share a single image fill: the image is
	// stretched across their combined bounding box (not each polygon's own), so
	// adjacent features assemble into one picture. Features are grouped by the
	// URL their overlay's `imageFill` returns.
	type ImageFillGroup = { url: string; patternId: string; layers: L.Path[] };

	// The union of the group's path bounding boxes, in SVG user coordinates —
	// the same space a `userSpaceOnUse` pattern is measured in, so getBBox()
	// values can be used directly.
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
			// Cover the combined shape's full extent, keeping the poster's aspect
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

	// Image-filled polygons sit at half strength so the satellite base reads
	// through, and fade to full opacity while hovered.
	const IMAGE_FILL_OPACITY = 0.5;
	const IMAGE_FILL_HOVER_OPACITY = 1;

	// Point a member path's fill at its group pattern (set when the group is
	// built) at the given opacity. Used on first paint and to restore the fill
	// after a setStyle/resetStyle repaints the base fillColor on hover.
	// fill-opacity is driven through the CSS property (not the attribute) with a
	// transition, so the hover change fades rather than snapping.
	function applyImageFill(layer: L.Path, opacity: number = IMAGE_FILL_OPACITY) {
		const patternId = (layer as L.Path & { _imageFillPatternId?: string })._imageFillPatternId;
		const el = layer.getElement() as SVGElement | undefined;
		if (!patternId || !el) return;
		el.setAttribute('fill', `url(#${patternId})`);
		el.style.transition = 'fill-opacity 200ms ease';
		el.style.fillOpacity = String(opacity);
	}

	onMount(async () => {
		// Leaflet touches `window` at import time, so it must be loaded
		// dynamically in the browser — never during SSR.
		const Leaf = await import('leaflet');
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
			const layerGroup = Leaf.geoJSON(datasets[index], {
				interactive: overlay.interactive ?? true,
				style: (feature) => styleFor(overlay, feature),
				onEachFeature: (feature, layer) => {
					if (overlay.interactive === false) return;

					const label = overlay.label?.(feature);
					if (label) {
						layer.bindTooltip(label, { sticky: true });
					}

					// Whether this feature currently carries an image fill, so hover can
					// re-apply it after setStyle repaints the base fillColor. Its group
					// membership is (re)built in buildImageFills, not here.
					const hasImageFill = normalizeFill(overlay.imageFill?.(feature)) !== null;

					if (overlay.hoverStyle) {
						layer.on('mouseover', () => {
							(layer as L.Path).setStyle(overlay.hoverStyle!);
							// setStyle repaints the base fillColor, so re-apply the image —
							// fading it to full opacity while hovered.
							if (hasImageFill) applyImageFill(layer as L.Path, IMAGE_FILL_HOVER_OPACITY);
						});
						layer.on('mouseout', () => {
							layerGroup.resetStyle(layer);
							// resetStyle repaints the base fillColor, so re-apply the image
							// at its resting half opacity.
							if (hasImageFill) applyImageFill(layer as L.Path);
						});
					}

					layer.on('click', () => overlay.onClick?.(feature));
				}
			}).addTo(mapInstance!);
			overlayGroups.push(layerGroup);
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
		}

		// Keep every group's image aligned as the map reprojects.
		mapInstance.on('zoomend viewreset moveend', refreshImageFills);
		// Now the paths exist: let the rebuild $effect build the fills (and rebuild
		// them whenever the overlays prop later changes). Any highlight set before
		// mount was already painted by styleFor; changes go through its $effect.
		ready = true;
	});

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

		const grouped = new Map<string, { url: string; layers: L.Path[] }>();
		overlays.forEach((overlay, index) => {
			const group = overlayGroups[index];
			if (!overlay.imageFill || !group) return;
			group.eachLayer((layer) => {
				const feature = (layer as L.Layer & { feature?: GeoJSON.Feature }).feature;
				if (!feature) return;
				const fill = normalizeFill(overlay.imageFill!(feature));
				if (!fill) return;
				const entry = grouped.get(fill.key) ?? { url: fill.url, layers: [] };
				entry.layers.push(layer as L.Path);
				grouped.set(fill.key, entry);
			});
		});

		imageFillGroups = [...grouped.values()].map(({ url, layers }) => {
			const patternId = `map-image-fill-${imageFillId++}`;
			for (const layer of layers) {
				(layer as L.Path & { _imageFillPatternId?: string })._imageFillPatternId = patternId;
			}
			return { url, patternId, layers };
		});
		refreshImageFills();
	}

	onDestroy(() => {
		mapInstance?.remove();
	});
</script>

<div bind:this={mapContainer} class={classes} role="application" aria-label="World map"></div>
