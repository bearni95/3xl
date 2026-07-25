<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { locationService, hasLocation } from '$services/location.service';
	import { locationAdapter } from '$adapters/classes/location.adapter';

	const store = locationService.store;

	let loading = false;
	let error = '';
	// The municipality polygons (name/prov/territory) used to resolve a reading.
	let municipalities: GeoJSON.FeatureCollection | null = null;

	$: location = $store;
	$: hasReading = hasLocation(location);
	$: region = hasReading && municipalities ? locationAdapter.toRegion(location, municipalities) : null;

	onMount(async () => {
		try {
			const response = await fetch('/data/geo/municipis.json');
			municipalities = await response.json();
		} catch {
			// Coordinates still show; region simply stays unresolved.
		}
	});

	function requestLocation() {
		error = '';

		if (!('geolocation' in navigator)) {
			error = 'Geolocation is not supported by this browser.';
			return;
		}

		loading = true;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				locationService.set(locationAdapter.fromBrowser(position));
				loading = false;
			},
			(positionError) => {
				error = positionError.message || 'Unable to retrieve your location.';
				loading = false;
			},
			{ enableHighAccuracy: true }
		);
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-6 bg-base-200 p-8">
	<div class="card w-full max-w-md bg-base-100 shadow-xl">
		<div class="card-body gap-4">
			<h1 class="card-title">Claim your location</h1>

			{#if hasReading}
				<div class="stats stats-vertical bg-base-200">
					<div class="stat">
						<div class="stat-title">Coordinates</div>
						<div class="stat-value text-2xl">{locationAdapter.toCoordinates(location)}</div>
						<div class="stat-desc">Accuracy ±{Math.round(location.accuracy)} m</div>
					</div>
					<div class="stat">
						<div class="stat-title">Last updated</div>
						<div class="stat-desc text-sm">{locationAdapter.toCapturedAt(location)}</div>
					</div>
				</div>

				{#if region}
					<div class="flex flex-col gap-1 text-sm">
						<div class="flex justify-between">
							<span class="opacity-70">Municipality</span>
							<span class="font-medium">{region.municipality}</span>
						</div>
						<div class="flex justify-between">
							<span class="opacity-70">Province</span>
							<span class="font-medium">{region.province}</span>
						</div>
						<div class="flex justify-between">
							<span class="opacity-70">Country</span>
							<span class="font-medium">{region.country}</span>
						</div>
					</div>
				{:else if hasReading}
					<div class="flex items-center gap-2 text-sm opacity-70">
						<span class="loading loading-spinner loading-xs"></span>
						Resolving area…
					</div>
				{/if}
			{:else}
				<p class="text-sm opacity-70">
					No location has been claimed yet. Share your position to get started.
				</p>
			{/if}

			{#if error}
				<div class="alert alert-error text-sm">{error}</div>
			{/if}

			<button
				class={classNames('btn btn-primary', { 'btn-disabled': loading })}
				on:click={requestLocation}
			>
				{#if loading}
					<span class="loading loading-spinner loading-sm"></span>
					Locating…
				{:else if hasReading}
					Update location
				{:else}
					Get my location
				{/if}
			</button>
		</div>
	</div>
</div>
