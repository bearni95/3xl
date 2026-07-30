// The order a show's songs come up in today.
//
// A show has several themes vendored for it — InuYasha alone has a dozen — and
// playing them in the order `music.json` happens to list them means the same one
// opens every session for ever. So each show's songs are put in a different order
// every day, and the order is not rolled: it is a pure function of *which show* and
// *which day*, so anything that asks gets the same answer without a shuffle having
// to be stored, sent or agreed on. Two shows on the same day are ordered
// independently, and at the day's turn every show's order changes.
//
// The day here is a **UTC** day and its seed is that day's midnight as a Unix
// timestamp — the number is the day, and it is the one reading of "a new day" that
// needs no zone table to reproduce. Note this is deliberately *not* the Catalan day
// boundary the game's daily rules turn on (see `festes/catalan-day`): nothing is
// claimed or awarded off this ordering, so it does not have to agree with the
// server about when a day ends.
//
// The arithmetic is the same shape as the daily-badge draw's (FNV-1a for the seed,
// a 32-bit LCG for the draw), written out again here rather than shared with it: that
// one is a rule mirrored in PL/pgSQL and pinned by parity tests, and a change made
// there to keep Postgres happy must not silently reshuffle the music.

import type { MusicTrack } from '../../types/music.type';

/** 2^32: the ring the seed arithmetic is done in. */
const RING = 4294967296;

/** Milliseconds in a day, the step between two days' seeds. */
const DAY_MS = 86400000;

/** `at` as a `YYYY-MM-DD` UTC day (now by default). */
export function utcDayIso(at: Date = new Date()): string {
	return at.toISOString().slice(0, 10);
}

/**
 * Midnight UTC of a `YYYY-MM-DD` day, as a Unix timestamp in milliseconds — the
 * number that stands for the day in every seed below. NaN for a string that is not
 * a date, which the seed turns into no shuffle rather than a wrong one.
 */
export function utcMidnightMs(day: string): number {
	const [year, month, date] = day.split('-').map(Number);
	if (!year || !month || !date) return NaN;
	return Date.UTC(year, month - 1, date);
}

/** Midnight UTC of the day after `day`, i.e. the instant this ordering turns over. */
export function nextUtcMidnightMs(day: string): number {
	return utcMidnightMs(day) + DAY_MS;
}

/**
 * The seed for one show on one day: FNV-1a (32-bit) over
 * `<show id>:<the day's UTC midnight>`. `Math.imul` is what keeps the multiply
 * exact — a plain `*` on two 32-bit values overflows a double's 53 bits.
 *
 * A song linked to no show is not left out: those are a group of their own, keyed
 * `none`, so every vendored song is in exactly one ordering.
 */
export function musicShuffleSeed(showId: number | null, day: string): number {
	const midnight = utcMidnightMs(day);
	const text = `${showId ?? 'none'}:${Number.isFinite(midnight) ? midnight : ''}`;
	let hash = 2166136261;
	for (let i = 0; i < text.length; i++) {
		hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
	}
	return hash;
}

/** The next value of the 32-bit LCG (Numerical Recipes' multiplier) the draw walks. */
function nextSeed(seed: number): number {
	return (1664525 * (seed % RING) + 1013904223) % RING;
}

/**
 * `files` in the order `seed` puts them: sorted first, then drawn one at a time from
 * what is left. Sorting first is what makes the ordering a function of the *set* of
 * songs — the order `music.json` happens to list them in, or the order the assets
 * folder was read in, cannot change today's answer.
 */
export function shuffleFiles(files: readonly string[], seed: number): string[] {
	const remaining = [...files].sort();
	const drawn: string[] = [];
	let state = seed;
	while (remaining.length > 0) {
		state = nextSeed(state);
		drawn.push(remaining.splice(state % remaining.length, 1)[0]);
	}
	return drawn;
}

/** One show's songs, in the order they come up on a given day. */
export interface ShowShuffle {
	/** TMDB show id, or null for the songs that open no show. */
	showId: number | null;
	/** The seed the order below was drawn with — the same number a reader recomputes. */
	seed: number;
	/** That show's tracks, in the day's order. */
	tracks: MusicTrack[];
}

/**
 * Every show's songs in the day's order — the whole collection regrouped, one entry
 * per show that has a song, shows first by id and the unlinked songs last, so the
 * list itself is stable while the order inside each entry is the day's.
 */
export function dailyShowShuffles(
	tracks: readonly MusicTrack[],
	day: string = utcDayIso()
): ShowShuffle[] {
	const byShow = new Map<number | null, MusicTrack[]>();
	for (const track of tracks) {
		const group = byShow.get(track.showId);
		if (group) group.push(track);
		else byShow.set(track.showId, [track]);
	}

	return [...byShow.entries()]
		.sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
		.map(([showId, group]) => {
			const seed = musicShuffleSeed(showId, day);
			const byFile = new Map(group.map((track) => [track.file, track]));
			return {
				showId,
				seed,
				tracks: shuffleFiles([...byFile.keys()], seed).map((file) => byFile.get(file)!)
			};
		});
}
