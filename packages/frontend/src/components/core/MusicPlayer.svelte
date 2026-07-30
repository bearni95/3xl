<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import { musicService } from '$services/music.service';
	import { showLogos, loadShowLogos } from '$services/shows.service';
	import { showIconName } from '$utils/show/show-icon';

	// The map's radio: one plate in the corner with the three things a listener needs —
	// what is on air, a play/pause, and the turn of the dial to the next station.
	//
	// A station is a show, and what is playing on it is decided by the clock rather
	// than by this plate: the song and the second of it come from musicService, which
	// folds the time of day into the show's day order (see there). So there is no step
	// to the next song here — a listener turns to another station, they do not skip
	// what a station is playing. The dial is drawn only when there is more than one
	// station to turn to.
	//
	// It reads as the town panel below it does — the same black plate, the same glyph
	// tile at the left end with two lines of text beside it — because the two stand in
	// one corner and are one stack of plates, not two kinds of thing. The plate is
	// black for the town panel's reason: it sits over satellite imagery, and the
	// lettering has to be read off the plate rather than off the terrain.
	//
	// No state of its own: what is on air, whether it is running and which station it
	// is on belong to musicService, which owns the audio element so that the sound
	// outlives anything that happens on screen, and which reads the authored
	// collection itself.

	export let classes: string = '';

	// The two reads the plate is drawn from: the songs (@3xl/data's music.json, by way
	// of the service) and the shows, for the name on the second line — the same baked
	// shows.json the statues read, so this is a no-op on a page that has already asked
	// for it. A failed music read leaves no song loaded, and the plate is then not
	// drawn at all rather than standing there empty.
	onMount(() => {
		void musicService.load().catch(() => undefined);
		void loadShowLogos();
	});

	const music = musicService.state;

	$: state = $music;
	$: showIcon = showIconName(state.track?.showId ?? null);
	$: showName = state.track?.showId ? ($showLogos.get(state.track.showId)?.name ?? null) : null;
</script>

{#if state.track}
	<div
		class={classNames(
			'flex items-center gap-2 rounded-lg bg-black p-2 text-white shadow-xl',
			classes
		)}
	>
		<!-- The show the song opens, on the same 40px tile at the same 28px glyph the town
			panel and the pins draw. Decorative: the show is named in the line beside it. -->
		{#if showIcon}
			<div
				class="flex size-10 flex-none items-center justify-center rounded-lg bg-base-100 text-base-content"
				aria-hidden="true"
			>
				<ShowIcon name={showIcon} classes="[&>svg]:size-7" />
			</div>
		{/if}

		<!-- `min-w-0` is what lets a long title truncate instead of widening the plate. -->
		<div class="flex min-w-0 flex-1 flex-col text-left leading-tight">
			<span class="truncate text-sm font-semibold">{state.track.title}</span>
			<span class="truncate text-xs font-medium text-white/70">{showName ?? '—'}</span>
		</div>

		<!-- Ghost circles: the plate is already a dark object, and two filled buttons on it
			would read louder than the town's Challenge control one plate below. -->
		<button
			type="button"
			class="btn btn-circle btn-ghost btn-sm flex-none text-white"
			aria-label={state.playing ? 'Pause music' : 'Play music'}
			on:click={() => musicService.toggle()}
		>
			{#if state.playing}
				<svg viewBox="0 0 24 24" fill="currentColor" class="size-5" aria-hidden="true">
					<path d="M6 5h4v14H6zM14 5h4v14h-4z" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" fill="currentColor" class="size-5" aria-hidden="true">
					<path d="M8 5v14l11-7z" />
				</svg>
			{/if}
		</button>

		<!-- The dial. A turn, not a skip: it leaves this station playing what it is
			playing and joins the next one wherever that one has got to. Drawn only when
			the collection makes more than one station — a dial with one stop on it would
			be a button that does nothing. -->
		{#if state.stations > 1}
			<button
				type="button"
				class="btn btn-circle btn-ghost btn-sm flex-none text-white"
				aria-label="Next station"
				on:click={() => musicService.nextStation()}
			>
				<svg viewBox="0 0 24 24" fill="currentColor" class="size-5" aria-hidden="true">
					<path
						d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
					/>
				</svg>
			</button>
		{/if}
	</div>
{/if}
