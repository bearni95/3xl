<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import ShowIcon from '$components/core/ShowIcon.svelte';
	import { musicService } from '$services/music.service';
	import { showLogos, loadShowLogos } from '$services/shows.service';
	import { showIconName } from '$utils/show/show-icon';

	// The map's music: the songs vendored in @3xl/assets, one plate in the corner with
	// the three things a player needs — what is loaded, a play/pause, and the step to
	// the next song.
	//
	// It reads as the town panel below it does — the same black plate, the same glyph
	// tile at the left end with two lines of text beside it — because the two stand in
	// one corner and are one stack of plates, not two kinds of thing. The plate is
	// black for the town panel's reason: it sits over satellite imagery, and the
	// lettering has to be read off the plate rather than off the terrain.
	//
	// No state of its own: which song is loaded and whether it is running belong to
	// musicService, which owns the audio element so that the sound outlives anything
	// that happens on screen, and which reads the authored collection itself.

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

		<button
			type="button"
			class="btn btn-circle btn-ghost btn-sm flex-none text-white"
			aria-label="Next song"
			on:click={() => musicService.next()}
		>
			<svg viewBox="0 0 24 24" fill="currentColor" class="size-5" aria-hidden="true">
				<path d="M6 18l8.5-6L6 6v12zM16 6h2.5v12H16z" />
			</svg>
		</button>
	</div>
{/if}
