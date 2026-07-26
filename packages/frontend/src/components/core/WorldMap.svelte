<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type L from 'leaflet';
	import type { MapCircle, MapLine, MapMarker, MapOverlay } from '$types/map.type';

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
		// re-runs each group's style option, which now reflects the new state.
		void highlightId;
		void highlightStyle;
		void hiddenLineUrls;
		for (const group of overlayGroups) group.resetStyle();
	});

	$effect(() => {
		// Rebuild the pins whenever the parent swaps the markers array (e.g. the
		// selection changes which regions are imaged). Gated on `ready` so a set
		// passed before mount still applies once the layer exists.
		void markers;
		if (ready) rebuildMarkers();
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
	// fill highlight while the pointer is over it.
	function hoverOn(overlay: MapOverlay, layer: L.Path) {
		if (overlay.hoverStyle) layer.setStyle(overlay.hoverStyle);
	}

	// Leave a feature: reset it to its base style.
	function hoverOff(group: L.GeoJSON, layer: L.Path) {
		group.resetStyle(layer);
	}

	// Build a pin's DOM: a poster thumbnail in a rounded frame with the show name
	// captioned beneath. The wrapper is translated so its bottom centre sits on the
	// point (the marker itself is zero-sized, see rebuildMarkers), giving a pin
	// that stands above its region.
	function markerElement(marker: MapMarker): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className = classNamesFor(marker);

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
			'mt-1 max-w-[7rem] truncate rounded bg-neutral px-1.5 py-0.5 text-center text-xs font-semibold text-neutral-content shadow';
		wrap.appendChild(caption);

		return wrap;
	}

	// The pin wrapper's classes: a bottom-centred column, made clickable when the
	// marker carries an onClick.
	function classNamesFor(marker: MapMarker): string {
		const base = 'flex -translate-x-1/2 -translate-y-full flex-col items-center';
		return marker.onClick ? `${base} cursor-pointer` : base;
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

	// Above this many pins in view the layer is left empty until the map zooms in —
	// a map-wide fine breakdown (e.g. every municipality) would otherwise drop
	// thousands of image markers at once. The pins reappear tier by tier as the
	// visible count drops below the cap.
	const MAX_VISIBLE_MARKERS = 250;

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
