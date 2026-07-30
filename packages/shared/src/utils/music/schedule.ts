// When each song comes up.
//
// A station's running order (see `daily-shuffle`) says what follows what; the songs'
// own lengths say when. Put together they are a schedule: the first song starts at
// the day's midnight, and every one after it starts when the one before it ends. So
// a station is not just an order but a time of day per song, which is what makes it
// a station rather than a playlist.
//
// Lengths are the files' and nobody authors them — they are read off the audio
// itself, one at a time, and a reader may be looking before they have all arrived.
// So a length that is not known yet stops the clock rather than being guessed at: a
// song whose start cannot be worked out says so, and so does every song behind it,
// because an offset built on a guess would be wrong for the whole of the rest of the
// day.

import type { MusicTrack } from '../../types/music.type';

/** One song, and the moment it comes up. */
export interface ScheduledTrack {
	track: MusicTrack;
	/**
	 * Milliseconds after the day's midnight that this song starts, or null when a
	 * length at or before it is still unknown — the one thing that cannot be answered
	 * with a number. The first song is always 0: it starts at midnight whether or not
	 * anything is known about how long it is.
	 */
	startsAt: number | null;
}

/**
 * `tracks`, in the order they are given, each with the moment it comes up.
 *
 * `lengths` is how long each song is **in seconds**, by file — the shape
 * `HTMLMediaElement.duration` yields, since that is where a length comes from. A file
 * missing from it, or one whose length is not a finite positive number, is a song of
 * unknown length: it still starts when the song before it ended, but nothing after it
 * can be placed.
 */
export function stationSchedule(
	tracks: readonly MusicTrack[],
	lengths: ReadonlyMap<string, number>
): ScheduledTrack[] {
	let clock: number | null = 0;
	return tracks.map((track) => {
		const startsAt = clock;
		const length = lengths.get(track.file);
		// The part-seconds a length comes with are kept, not dropped: a song is not a
		// whole number of seconds long, and twenty of them rounded down is a station
		// running a quarter of a minute early by the end of the day.
		clock =
			clock === null || length === undefined || !Number.isFinite(length) || length <= 0
				? null
				: clock + Math.round(length * 1000);
		return { track, startsAt };
	});
}
