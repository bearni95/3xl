import { describe, it, expect } from 'vitest';
import type { MusicTrack } from '$types/music.type';
import { stationSchedule } from '$utils/music/schedule';

const track = (file: string): MusicTrack => ({ file, title: file, showId: 35610 });

const TRACKS = [track('a.mp3'), track('b.mp3'), track('c.mp3')];

/** Lengths as the audio element yields them: seconds, and often not whole ones. */
const lengths = (...seconds: (number | undefined)[]): Map<string, number> =>
	new Map(
		TRACKS.map((entry, index) => [entry.file, seconds[index]] as const).filter(
			(pair): pair is readonly [string, number] => pair[1] !== undefined
		)
	);

describe('when a station`s songs come up', () => {
	it('starts at midnight and stacks each song on the one before it', () => {
		const schedule = stationSchedule(TRACKS, lengths(90, 200, 60));
		expect(schedule.map((entry) => entry.startsAt)).toEqual([0, 90_000, 290_000]);
	});

	it('keeps the order it was given — the shuffle decided it, not this', () => {
		const reversed = [...TRACKS].reverse();
		const schedule = stationSchedule(reversed, lengths(90, 200, 60));
		expect(schedule.map((entry) => entry.track.file)).toEqual(['c.mp3', 'b.mp3', 'a.mp3']);
		// c is 60s, so b starts a minute in, not a minute and a half.
		expect(schedule.map((entry) => entry.startsAt)).toEqual([0, 60_000, 260_000]);
	});

	it('carries the part-seconds a length comes with', () => {
		// Songs are not a whole number of seconds long and the clock is the real one, so
		// the fractions are kept and add up rather than being dropped a song at a time —
		// twenty songs rounded down is a station running a quarter of a minute early.
		const schedule = stationSchedule(TRACKS, lengths(90.4, 200.6, 60));
		expect(schedule.map((entry) => entry.startsAt)).toEqual([0, 90_400, 291_000]);
	});

	it('stops the clock at a length it does not know, and leaves it stopped', () => {
		// The second song's length has not arrived; the third cannot be placed either,
		// and neither can anything behind it — a guess would be wrong for the rest of
		// the day, not just for that one row.
		const schedule = stationSchedule(TRACKS, lengths(90, undefined, 60));
		expect(schedule.map((entry) => entry.startsAt)).toEqual([0, 90_000, null]);
	});

	it('places the first song at midnight even knowing nothing about it', () => {
		const schedule = stationSchedule(TRACKS, new Map());
		expect(schedule.map((entry) => entry.startsAt)).toEqual([0, null, null]);
	});

	it('treats a length that is not a length as one it has not got', () => {
		// A file that would not decode reports NaN, and a zero-length song would put two
		// songs on the same second.
		expect(stationSchedule(TRACKS, lengths(NaN, 10, 10)).map((e) => e.startsAt)).toEqual([
			0,
			null,
			null
		]);
		expect(stationSchedule(TRACKS, lengths(0, 10, 10)).map((e) => e.startsAt)).toEqual([
			0,
			null,
			null
		]);
	});

	it('is nothing at all for a station with no songs', () => {
		expect(stationSchedule([], lengths(90))).toEqual([]);
	});
});
