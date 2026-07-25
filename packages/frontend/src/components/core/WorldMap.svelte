<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type L from 'leaflet';
	import type { MapOverlay } from '$types/map.type';

	let {
		center = [20, 0] as [number, number],
		zoom = 2,
		minZoom = 2,
		maxZoom = 19,
		overlays = [],
		classes = ''
	}: {
		/** Initial map centre as [lat, lng]. */
		center?: [number, number];
		zoom?: number;
		minZoom?: number;
		maxZoom?: number;
		/** GeoJSON overlays drawn in array order (last = topmost). */
		overlays?: MapOverlay[];
		/** Extra Tailwind classes for the map container. */
		classes?: string;
	} = $props();

	let mapContainer: HTMLDivElement;
	let mapInstance: L.Map | null = null;

	const SVG_NS = 'http://www.w3.org/2000/svg';
	const XLINK_NS = 'http://www.w3.org/1999/xlink';
	let imageFillId = 0;

	// Paint a vector layer's SVG path with an image, stretched to its bounding
	// box via an SVG <pattern>. The pattern is created once per layer and reused
	// so a mouseout/resetStyle can re-apply the fill without leaking <defs> nodes.
	function applyImageFill(layer: L.Path, url: string) {
		const el = layer.getElement() as (SVGPathElement & { _imageFillId?: string }) | null;
		const svg = el?.ownerSVGElement;
		if (!el || !svg) return;

		let defs = svg.querySelector('defs');
		if (!defs) {
			defs = document.createElementNS(SVG_NS, 'defs');
			svg.insertBefore(defs, svg.firstChild);
		}

		let patternId = el._imageFillId;
		if (!patternId) {
			patternId = `map-image-fill-${imageFillId++}`;
			el._imageFillId = patternId;

			const pattern = document.createElementNS(SVG_NS, 'pattern');
			pattern.setAttribute('id', patternId);
			pattern.setAttribute('patternContentUnits', 'objectBoundingBox');
			pattern.setAttribute('width', '1');
			pattern.setAttribute('height', '1');

			const image = document.createElementNS(SVG_NS, 'image');
			image.setAttributeNS(XLINK_NS, 'href', url);
			image.setAttribute('href', url);
			image.setAttribute('width', '1');
			image.setAttribute('height', '1');
			image.setAttribute('preserveAspectRatio', 'none');

			pattern.appendChild(image);
			defs.appendChild(pattern);
		}

		el.setAttribute('fill', `url(#${patternId})`);
		el.setAttribute('fill-opacity', '1');
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
			// Layers whose fill is an image; painted after the group is added to
			// the map, since their SVG paths don't exist until then.
			const imageFills: Array<{ layer: L.Path; url: string }> = [];

			const layerGroup = Leaf.geoJSON(datasets[index], {
				interactive: overlay.interactive ?? true,
				style: () => overlay.style,
				onEachFeature: (feature, layer) => {
					if (overlay.interactive === false) return;

					const label = overlay.label?.(feature);
					if (label) {
						layer.bindTooltip(label, { sticky: true });
					}

					const imageUrl = overlay.imageFill?.(feature) ?? null;
					if (imageUrl) imageFills.push({ layer: layer as L.Path, url: imageUrl });

					if (overlay.hoverStyle) {
						layer.on('mouseover', () => {
							(layer as L.Path).setStyle(overlay.hoverStyle!);
							// setStyle repaints the base fillColor, so re-apply the image
							// (kept opaque rather than dimmed to the hover fillOpacity).
							if (imageUrl) applyImageFill(layer as L.Path, imageUrl);
						});
						layer.on('mouseout', () => {
							layerGroup.resetStyle(layer);
							// resetStyle repaints the base fillColor, so re-apply the image.
							if (imageUrl) applyImageFill(layer as L.Path, imageUrl);
						});
					}

					layer.on('click', () => overlay.onClick?.(feature));
				}
			}).addTo(mapInstance!);

			for (const { layer, url } of imageFills) applyImageFill(layer, url);
		});
	});

	onDestroy(() => {
		mapInstance?.remove();
	});
</script>

<div bind:this={mapContainer} class={classes} role="application" aria-label="World map"></div>
