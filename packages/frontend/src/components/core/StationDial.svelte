<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import { musicService } from '$services/music.service';
	import { showLogos, loadShowLogos } from '$services/shows.service';

	// The dial: which station the radio is tuned to, and the way to turn it — one thing and
	// not two, because on a radio the station's name and the way to change it are the same
	// mark. So it is a select stripped of its own box, left with the caret: the line it
	// replaced, plus the only thing that says the line can be opened.
	//
	// It is the select itself when there is a choice to make and a plain line when there is
	// not — a select with one option is an affordance that lies about what it can do.
	//
	// Split out because both surfaces that draw the radio are the same statement about the
	// same store: the plate in the burger menu (MusicPlayer) and the crumb on the bar over
	// the map (MusicCrumb). Only the ink differs, and ink belongs to where a thing stands,
	// so that is the caller's.

	/** The line's ink and size — whatever the surface holding it letters its second line in. */
	export let classes: string = '';

	// The names on the dial come from the baked shows.json, the same read the statues and
	// the plate make. Idempotent: every mount shares the one fetch.
	onMount(() => void loadShowLogos());

	const music = musicService.state;

	/** A station's value in the select: an id, and the one word that is not an id. */
	const NO_SHOW = 'none';

	function stationKey(showId: number | null): string {
		return showId === null ? NO_SHOW : String(showId);
	}

	$: state = $music;
	// The songs that open no show are the dash the town panel leaves for anything unnameable;
	// a show that file has nothing for is lettered by its id instead, since two stations
	// reading the same dash would be a dial that cannot be turned by looking at it.
	$: stations = state.stations.map((showId) => ({
		showId,
		key: stationKey(showId),
		name: showId === null ? '—' : ($showLogos.get(showId)?.name ?? `#${showId}`)
	}));
	$: tunedName = stations.find((station) => station.showId === state.station)?.name ?? '—';
</script>

{#if stations.length > 1}
	<select
		class={classNames(
			'select select-ghost h-5 min-h-0 w-full max-w-full truncate rounded-none border-0 bg-transparent p-0 pe-5 focus:outline-none',
			classes
		)}
		aria-label="Station"
		value={stationKey(state.station)}
		on:change={(event) =>
			musicService.tuneTo(
				event.currentTarget.value === NO_SHOW ? null : Number(event.currentTarget.value)
			)}
	>
		{#each stations as station (station.key)}
			<option value={station.key}>{station.name}</option>
		{/each}
	</select>
{:else}
	<span class={classNames('truncate', classes)}>{tunedName}</span>
{/if}
