import { describe, it, expect } from 'vitest';
import type { MusicTrack } from '$types/music.type';
import { stationCycleMs, stationPositionAt } from '$utils/music/station';

/**
 * Where a station is at a given moment. This is what makes the player a radio: the
 * clock picks the song and the second of it, so nothing has to be stored or agreed on
 * for two listeners to be on the same bar of the same song.
 */

const track = (file: string): MusicTrack => ({ file, title: file, showId: 35610 });

const TRACKS = [track('a.mp3'), track('b.mp3'), track('c.mp3')];

/** Lengths as the audio element yields them: seconds, and often not whole ones. */
const lengths = (...seconds: (number | undefined)[]): Map<string, number> =>
	new Map(
		TRACKS.map((entry, index) => [entry.file, seconds[index]] as const).filter(
			(pair): pair is readonly [string, number] => pair[1] !== undefined
		)
	);

// 90s + 200s + 60s: the order runs for five minutes and fifty seconds, then again.
const LENGTHS = lengths(90, 200, 60);

describe('how long a station takes to come round', () => {
	it('is the whole order end to end', () => {
		expect(stationCycleMs(TRACKS, LENGTHS)).toBe(350_000);
	});

	it('is nothing knowable while a length is missing', () => {
		// One song nobody knows the length of is not one song that cannot be placed: the
		// sum is what the day is folded into, so every song after it is at an unknown
		// time too.
		expect(stationCycleMs(TRACKS, lengths(90, undefined, 60))).toBeNull();
		expect(stationCycleMs(TRACKS, lengths(90, 200, undefined))).toBeNull();
		expect(stationCycleMs([], LENGTHS)).toBeNull();
	});
});

describe('what a station is playing at a given moment', () => {
	it('opens the day on the first song of the order', () => {
		expect(stationPositionAt(TRACKS, LENGTHS, 0)).toEqual({
			index: 0,
			offsetMs: 0,
			remainingMs: 90_000
		});
	});

	it('is the song the clock has got to, at the second it has got to', () => {
		expect(stationPositionAt(TRACKS, LENGTHS, 30_000)).toEqual({
			index: 0,
			offsetMs: 30_000,
			remainingMs: 60_000
		});
		expect(stationPositionAt(TRACKS, LENGTHS, 100_000)).toEqual({
			index: 1,
			offsetMs: 10_000,
			remainingMs: 190_000
		});
	});

	it('hands a boundary to the song that is starting, not the one that ended', () => {
		expect(stationPositionAt(TRACKS, LENGTHS, 90_000)).toEqual({
			index: 1,
			offsetMs: 0,
			remainingMs: 200_000
		});
		expect(stationPositionAt(TRACKS, LENGTHS, 290_000)).toEqual({
			index: 2,
			offsetMs: 0,
			remainingMs: 60_000
		});
	});

	it('starts the order again when it runs out, for the whole of the day', () => {
		// An order of three songs is minutes long and a day is not, so a station that
		// stopped when its songs ran out would be silent from ten past midnight. The
		// cycle repeats: five minutes fifty in is the top of the order again.
		expect(stationPositionAt(TRACKS, LENGTHS, 350_000)).toEqual({
			index: 0,
			offsetMs: 0,
			remainingMs: 90_000
		});
		expect(stationPositionAt(TRACKS, LENGTHS, 350_000 + 100_000)).toEqual({
			index: 1,
			offsetMs: 10_000,
			remainingMs: 190_000
		});
		// Late in the evening it is still the same order, in the same place in it.
		const evening = 20 * 3_600_000;
		expect(stationPositionAt(TRACKS, LENGTHS, evening)).toEqual(
			stationPositionAt(TRACKS, LENGTHS, evening % 350_000)
		);
	});

	it('folds a clock from before the day the same way', () => {
		// A reader whose clock disagrees about the date is placed inside the cycle rather
		// than refused — the order repeats backwards as readily as forwards.
		// Seventy seconds before midnight is seventy seconds before the end of the cycle,
		// which is ten seconds from the end of the second song.
		expect(stationPositionAt(TRACKS, LENGTHS, -70_000)).toEqual({
			index: 1,
			offsetMs: 190_000,
			remainingMs: 10_000
		});
	});

	it('keeps the part-seconds the lengths came with', () => {
		// Songs are not a whole number of seconds long, and a station that dropped the
		// fractions would be a few seconds early by the end of the day — which is
		// exactly the drift a listener would hear against another listener.
		const parts = lengths(90.4, 200.6, 60);
		expect(stationCycleMs(TRACKS, parts)).toBe(351_000);
		expect(stationPositionAt(TRACKS, parts, 91_000)).toEqual({
			index: 1,
			offsetMs: 600,
			remainingMs: 200_000
		});
	});

	it('cannot place a station whose lengths are not all in', () => {
		// The caller has to decide what to do about that; there is no honest answer
		// here, since every song after an unknown length is at an unknown time.
		expect(stationPositionAt(TRACKS, lengths(90, undefined, 60), 30_000)).toBeNull();
		// Not even the song that would obviously be first: a station that cannot be
		// placed is not a station, it is an order.
		expect(stationPositionAt(TRACKS, lengths(90, undefined, 60), 0)).toBeNull();
		expect(stationPositionAt(TRACKS, new Map(), 0)).toBeNull();
	});

	it('cannot place one against a clock that is not a number', () => {
		expect(stationPositionAt(TRACKS, LENGTHS, NaN)).toBeNull();
	});

	it('is nothing at all for a station with no songs', () => {
		expect(stationPositionAt([], LENGTHS, 30_000)).toBeNull();
	});

	it('places every listener on the same song at the same instant', () => {
		// The whole point: nothing is stored, sent or rolled, so two readers asking about
		// the same moment get the same answer — and one asking a second later is a second
		// further into the same song, not at the top of another one.
		const now = 1_234_567;
		expect(stationPositionAt(TRACKS, LENGTHS, now)).toEqual(
			stationPositionAt(TRACKS, LENGTHS, now)
		);
		const later = stationPositionAt(TRACKS, LENGTHS, now + 1_000)!;
		const earlier = stationPositionAt(TRACKS, LENGTHS, now)!;
		expect(later.index).toBe(earlier.index);
		expect(later.offsetMs - earlier.offsetMs).toBe(1_000);
	});
});
