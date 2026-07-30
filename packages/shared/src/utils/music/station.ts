// What a station is playing right now.
//
// A day's order says what follows what (`daily-shuffle`) and the songs' lengths say
// when each comes up (`schedule`). A clock says which of those moments is this one —
// and that is the whole of a radio: nobody is choosing a song, the time of day is,
// so two players opening the game at the same second are on the same song at the same
// second of it without either of them having been told anything.
//
// A station's order is far shorter than the day it runs over — eighteen themes is
// half an hour — so it repeats: the songs run end to end from the day's midnight and
// start again when they run out. The moment now is therefore the time since midnight
// folded into that cycle, which is why a station cannot be placed until *every* one
// of its lengths is known: the fold is over the sum of all of them, so one missing
// length is not one song that cannot be placed but the whole of the rest of the day.
//
// The day is the shuffle's UTC day, the same one its seed is hashed from — see
// `daily-shuffle` for why this ordering deliberately does not turn over when the
// game's Catalan day does.

import type { MusicTrack } from '../../types/music.type';
import { stationSchedule, trackLengthMs, type ScheduledTrack } from './schedule';

/** Where a station is: which song, and how far into it. */
export interface StationPosition {
	/** The song's place in the day's order. */
	index: number;
	/** How far into that song the moment asked about is, in milliseconds. */
	offsetMs: number;
	/** How much of it is left, in milliseconds — when the next song comes up. */
	remainingMs: number;
}

/**
 * How long the whole order takes to play through once, in milliseconds, or null when
 * any of its lengths is unknown (and for a station with no songs, which takes no
 * time and cannot be folded into).
 */
export function stationCycleMs(
	tracks: readonly MusicTrack[],
	lengths: ReadonlyMap<string, number>
): number | null {
	return cycleOf(stationSchedule(tracks, lengths), lengths);
}

/**
 * The song a station is on `sinceMidnightMs` milliseconds into its day, and how far
 * into it — with the order repeating for as long as the day lasts.
 *
 * Null when the station cannot be placed at all: no songs, a length still on its way
 * or one that would not decode, or a clock that is not a number. A caller with a
 * radio to run has to decide what to do about that; there is no honest answer here,
 * since every song after an unknown length is at an unknown time.
 *
 * A moment before the day's midnight (a clock that disagrees about the date) folds
 * the same way rather than being refused — the cycle repeats backwards as readily as
 * forwards.
 */
export function stationPositionAt(
	tracks: readonly MusicTrack[],
	lengths: ReadonlyMap<string, number>,
	sinceMidnightMs: number
): StationPosition | null {
	const schedule = stationSchedule(tracks, lengths);
	const cycle = cycleOf(schedule, lengths);
	if (cycle === null || !Number.isFinite(sinceMidnightMs)) return null;

	// Two modulos, so a negative clock lands inside the cycle rather than before it.
	const elapsed = ((sinceMidnightMs % cycle) + cycle) % cycle;

	// The last song that had started by then. Walked backwards because that is the
	// question — the first song whose start is *after* elapsed is one too far.
	for (let index = schedule.length - 1; index >= 0; index--) {
		const startsAt = schedule[index].startsAt as number;
		if (startsAt > elapsed) continue;
		const length = trackLengthMs(lengths.get(schedule[index].track.file)) as number;
		return { index, offsetMs: elapsed - startsAt, remainingMs: startsAt + length - elapsed };
	}
	// Unreachable: the first song starts at 0 and `elapsed` is never below it.
	return null;
}

/**
 * The schedule's whole length: where the last song starts plus how long it is. Null
 * if anything in it is unplaced — `stationSchedule` stops its clock at the first
 * unknown length and leaves it stopped, so a placed last song means every one before
 * it was placed too.
 */
function cycleOf(
	schedule: readonly ScheduledTrack[],
	lengths: ReadonlyMap<string, number>
): number | null {
	const last = schedule[schedule.length - 1];
	if (!last || last.startsAt === null) return null;
	const length = trackLengthMs(lengths.get(last.track.file));
	return length === null ? null : last.startsAt + length;
}
