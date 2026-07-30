<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import MusicToggle from '$components/core/MusicToggle.svelte';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import { musicService } from '$services/music.service';
	import { showLogos, loadShowLogos } from '$services/shows.service';
	import { showIconName } from '$utils/show/show-icon';

	// The radio, whole: one plate in the burger menu with the three things a listener
	// needs — what is on air, a play/pause, and the dial that picks the station.
	//
	// It stood in the map's top-left corner, which is a corner of the map: a plate that
	// is always up is a plate that is always in the way, and the one thing on it a
	// player reaches for often is the pause — which is on the bar over the map now (see
	// MusicToggle), where it costs nothing. What is left here is what is only wanted
	// when it is wanted: which station, and what is on it. The menu is where everything
	// that is not the map already lives.
	//
	// A station is a show, and what is playing on it is decided by the clock rather
	// than by this plate: the song and the second of it come from musicService, which
	// folds the time of day into the show's day order (see there). So there is no step
	// to the next song here — a listener picks another station, they do not skip what a
	// station is playing.
	//
	// The dial is the second line rather than a control beside it, because that line
	// was already naming the show: on a radio the station's name and the way to change
	// it are one thing, and the plate has no room to say it twice. It is the select
	// itself when there is a choice to make and the plain line when there is not — a
	// select with one option is an affordance that lies about what it can do.
	//
	// It is a base-100 plate with a border, not the black one it was over the terrain:
	// black was for being read off satellite imagery, and inside the menu there is no
	// terrain to be read off — the surface it stands on is the page's own, and the block
	// of buttons above it is bordered base-100 for the same reason.
	//
	// No state of its own: what is on air, whether it is running and which station it
	// is on belong to musicService, which owns the audio element so that the sound
	// outlives anything that happens on screen, and which reads the authored
	// collection itself.

	export let classes: string = '';

	// The two reads the plate is drawn from: the songs (@3xl/data's music.json, by way
	// of the service) and the shows, for the names on the dial — the same baked
	// shows.json the statues read, so this is a no-op on a page that has already asked
	// for it. The music read is asked for again here because the menu is a place that
	// can be opened before anything else has; it is one shared fetch either way. A
	// failed read leaves no song loaded, and the plate is then not drawn at all rather
	// than standing there empty.
	onMount(() => {
		void musicService.load().catch(() => undefined);
		void loadShowLogos();
	});

	const music = musicService.state;

	/** A station's value in the select: an id, and the one word that is not an id. */
	const NO_SHOW = 'none';

	function stationKey(showId: number | null): string {
		return showId === null ? NO_SHOW : String(showId);
	}

	$: state = $music;
	$: showIcon = showIconName(state.track?.showId ?? null);
	// The stations to choose between, named from the same baked shows.json the statues
	// read. The songs that open no show are the dash the town panel leaves for anything
	// unnameable; a show that file has nothing for is lettered by its id instead, since
	// two stations reading the same dash would be a dial that cannot be turned by
	// looking at it.
	$: stations = state.stations.map((showId) => ({
		showId,
		key: stationKey(showId),
		name: showId === null ? '—' : ($showLogos.get(showId)?.name ?? `#${showId}`)
	}));
	$: tunedName = stations.find((station) => station.showId === state.station)?.name ?? '—';
</script>

{#if state.track}
	<div
		class={classNames(
			'flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 p-2 text-base-content',
			classes
		)}
	>
		<!-- The show the song opens, on the same 40px tile at the same 28px glyph the town
			panel and the pins draw. Decorative: the show is named in the line beside it. -->
		{#if showIcon}
			<div
				class="flex size-10 flex-none items-center justify-center rounded-lg bg-base-200 text-base-content"
				aria-hidden="true"
			>
				<ShowIcon name={showIcon} classes="[&>svg]:size-7" />
			</div>
		{/if}

		<!-- `min-w-0` is what lets a long title truncate instead of widening the plate. -->
		<div class="flex min-w-0 flex-1 flex-col text-left leading-tight">
			<span class="truncate text-sm font-semibold">{state.track.title}</span>
			{#if stations.length > 1}
				<!-- The dial: stripped of the select's own box so it reads as the line it
					replaced, and left with the caret, which is the only thing that says it can
					be opened. -->
				<select
					class="select select-ghost h-5 min-h-0 w-full max-w-full truncate rounded-none border-0 bg-transparent p-0 pe-5 text-xs font-medium text-base-content/70 focus:outline-none"
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
				<span class="truncate text-xs font-medium text-base-content/70">{tunedName}</span>
			{/if}
		</div>

		<!-- The same button as the one on the bar over the map, and the same store behind
			it: a ghost circle here because the plate is a quiet object among the menu's
			outlined ones, and a filled button on it would read louder than any of them. -->
		<MusicToggle classes="btn btn-circle btn-ghost btn-sm flex-none" />
	</div>
{/if}
