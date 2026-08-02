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
	// Split out when the radio stood in two places and both drew this line off the one store,
	// the ink being all that differed — which is why the ink is still the caller's. The plate
	// in the burger menu (MusicPlayer) is the only one that draws it now: the radio's other
	// standing is on the head of the column beside the map, where the station is not a line at
	// all but the show that row already names, and the dial is the map itself (see
	// musicService.follow). So this is where a listener goes to hear something other than
	// where they are standing.

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
