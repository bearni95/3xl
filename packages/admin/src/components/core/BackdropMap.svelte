<script lang="ts">
	import classNames from 'classnames';
	import { onDestroy, onMount } from 'svelte';
	import type L from 'leaflet';

	/**
	 * The game's map, as a background and nothing else.
	 *
	 * The same two things the player app's `/profile/[id]` stands its reading on: Esri's
	 * satellite imagery, and the dissolved GeoJSON layers drawn over it in white — the coarser
	 * a division, the thicker its line. What it does *not* take from the map at the root is
	 * everything that makes that map a map: no pins, no colour wash, no panel, and no way in.
	 * Every handler is off, so it cannot be dragged, zoomed, tabbed to or clicked; it is a
	 * picture that happens to be drawn by Leaflet.
	 *
	 * **It frames itself on what it drew.** Nothing outside has to know where the Països
	 * Catalans are: the layers are fetched, added, and the union of their own bounds is what
	 * the view is fitted to — so every polygon on it stands inside the box, whatever shape the
	 * box is. `zoomSnap: 0` is what makes that exact rather than up to a doubling short of it,
	 * which matters most in a square box, where the fit is decided by whichever of the two
	 * dimensions the country is worse at filling. The fit is asked again whenever the box
	 * changes size, since a zoom that held the country in a wide box holds rather less of it
	 * in a narrow one.
	 */

	/** A layer to draw, and how. Order is bottom-up, as Leaflet adds them. */
	export let overlays: { url: string; style: L.PathOptions }[] = [];
	export let classes: string = '';

	let host: HTMLDivElement;
	let map: L.Map | null = null;
	let Leaf: typeof L | null = null;
	let extent: L.LatLngBounds | null = null;
	let observer: ResizeObserver | null = null;
	let destroyed = false;

	$: hostClasses = classNames('isolate', classes);

	function fit(): void {
		if (!map || !extent) return;
		map.invalidateSize({ animate: false });
		map.fitBounds(extent, { animate: false });
	}

	onMount(async () => {
		// Leaflet reads `window` as it loads, so it can only be imported in the browser —
		// never while the static fallback is being rendered.
		Leaf = await import('leaflet');
		await import('leaflet/dist/leaflet.css');
		if (destroyed) return;

		map = Leaf.map(host, {
			// Nothing about this map answers to anybody: it is drawn, framed, and left.
			dragging: false,
			touchZoom: false,
			scrollWheelZoom: false,
			doubleClickZoom: false,
			boxZoom: false,
			keyboard: false,
			inertia: false,
			zoomControl: false,
			// Any zoom rather than the whole ones a tile pyramid is cut at, so the framing can
			// land exactly on the fit.
			zoomSnap: 0,
			// The badge carries the Esri credit the imagery licence requires; it stays for as
			// long as the satellite basemap does.
			attributionControl: true
		});

		// Esri World Imagery: pure satellite tiles, no labels or roads. Note the {z}/{y}/{x}
		// order — ArcGIS swaps y and x against the OSM scheme.
		Leaf.tileLayer(
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			{
				attribution:
					'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
				maxZoom: 19
			}
		).addTo(map);

		// The polygons, and the box they all stand in. Fetched in parallel and added in the
		// order they were given, so a coarser tier's line is drawn over the finer ones inside
		// it. A layer that will not load is left out rather than failing the backdrop — the
		// wall in front of it is what the screen is for.
		const datasets = await Promise.all(
			overlays.map(async (overlay) => {
				try {
					const response = await fetch(overlay.url);
					if (!response.ok) return null;
					return (await response.json()) as GeoJSON.FeatureCollection;
				} catch {
					return null;
				}
			})
		);
		if (destroyed || !map) return;

		overlays.forEach((overlay, index) => {
			const data = datasets[index];
			if (!data) return;
			const group = Leaf!.geoJSON(data, { style: () => overlay.style, interactive: false });
			group.addTo(map!);
			const bounds = group.getBounds();
			if (!bounds.isValid()) return;
			// Cloned before it is extended: `extend` writes into the box it is called on, and
			// that box belongs to the layer group.
			extent = extent
				? extent.extend(bounds)
				: Leaf!.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
		});

		fit();
		// A window that changes shape changes the box, and the fit with it.
		observer = new ResizeObserver(() => fit());
		observer.observe(host);
	});

	onDestroy(() => {
		destroyed = true;
		observer?.disconnect();
		observer = null;
		map?.remove();
		map = null;
	});
</script>

<div bind:this={host} class={hostClasses}></div>
