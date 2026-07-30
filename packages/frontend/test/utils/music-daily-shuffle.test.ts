import { describe, it, expect } from 'vitest';
import type { MusicTrack } from '$types/music.type';
import {
	dailyShowShuffles,
	musicShuffleSeed,
	nextUtcMidnightMs,
	shuffleFiles,
	utcDayIso,
	utcMidnightMs
} from '$utils/music/daily-shuffle';

const track = (file: string, showId: number | null = 35610): MusicTrack => ({
	file,
	title: file.replace('.mp3', ''),
	showId
});

const FILES = ['a.mp3', 'b.mp3', 'c.mp3', 'd.mp3', 'e.mp3', 'f.mp3'];

describe('the day a shuffle is drawn for', () => {
	it('is the UTC day, whatever the device thinks', () => {
		expect(utcDayIso(new Date('2026-07-30T23:30:00Z'))).toBe('2026-07-30');
		// Half an hour later it is a new day in UTC, even though it is still the 30th
		// in half the world and already the 31st in the other half.
		expect(utcDayIso(new Date('2026-07-31T00:30:00Z'))).toBe('2026-07-31');
	});

	it('stands for itself as its midnight timestamp', () => {
		expect(utcMidnightMs('2026-07-30')).toBe(Date.parse('2026-07-30T00:00:00Z'));
		expect(nextUtcMidnightMs('2026-07-30')).toBe(Date.parse('2026-07-31T00:00:00Z'));
		// A summer-time switch is not a day here: every day is exactly 24 hours long.
		expect(nextUtcMidnightMs('2026-03-28') - utcMidnightMs('2026-03-28')).toBe(86400000);
	});

	it('yields no seed for something that is not a day', () => {
		expect(utcMidnightMs('not-a-day')).toBeNaN();
	});
});

describe('a show`s seed', () => {
	it('is the same number every time it is asked for', () => {
		expect(musicShuffleSeed(35610, '2026-07-30')).toBe(musicShuffleSeed(35610, '2026-07-30'));
	});

	it('is a different number tomorrow, and for another show today', () => {
		expect(musicShuffleSeed(35610, '2026-07-30')).not.toBe(musicShuffleSeed(35610, '2026-07-31'));
		expect(musicShuffleSeed(35610, '2026-07-30')).not.toBe(musicShuffleSeed(37854, '2026-07-30'));
	});

	it('stays inside 32 bits', () => {
		for (let day = 1; day <= 28; day++) {
			const seed = musicShuffleSeed(37854, `2026-02-${String(day).padStart(2, '0')}`);
			expect(Number.isInteger(seed)).toBe(true);
			expect(seed).toBeGreaterThanOrEqual(0);
			expect(seed).toBeLessThan(4294967296);
		}
	});
});

describe('the order a day puts a show`s songs in', () => {
	it('is every song, once', () => {
		const order = shuffleFiles(FILES, musicShuffleSeed(35610, '2026-07-30'));
		expect(order).toHaveLength(FILES.length);
		expect([...order].sort()).toEqual([...FILES].sort());
	});

	it('does not depend on the order they were handed over in', () => {
		const seed = musicShuffleSeed(35610, '2026-07-30');
		expect(shuffleFiles([...FILES].reverse(), seed)).toEqual(shuffleFiles(FILES, seed));
	});

	it('is not the same order every day', () => {
		// The point of the whole thing: over a month, the song that opens is not one
		// song. (Two distinct openers is enough to prove it moves; there are far more.)
		const openers = new Set(
			Array.from({ length: 30 }, (_, index) => {
				const day = `2026-06-${String(index + 1).padStart(2, '0')}`;
				return shuffleFiles(FILES, musicShuffleSeed(35610, day))[0];
			})
		);
		expect(openers.size).toBeGreaterThan(1);
	});

	it('is drawn independently of the other shows`', () => {
		const day = '2026-07-30';
		const differ = [35610, 37854, 12971, 1, 2, 3].filter(
			(showId) =>
				shuffleFiles(FILES, musicShuffleSeed(showId, day))[0] !==
				shuffleFiles(FILES, musicShuffleSeed(35610, day))[0]
		);
		expect(differ.length).toBeGreaterThan(0);
	});

	it('handles a show with one song, and with none', () => {
		expect(shuffleFiles(['only.mp3'], musicShuffleSeed(35610, '2026-07-30'))).toEqual(['only.mp3']);
		expect(shuffleFiles([], musicShuffleSeed(35610, '2026-07-30'))).toEqual([]);
	});
});

describe('the whole collection, regrouped', () => {
	const collection = [
		track('inuyasha-a.mp3'),
		track('one-piece-a.mp3', 37854),
		track('loose.mp3', null),
		track('inuyasha-b.mp3'),
		track('one-piece-b.mp3', 37854),
		track('inuyasha-c.mp3')
	];

	it('keeps every song, in exactly one show', () => {
		const shuffles = dailyShowShuffles(collection, '2026-07-30');
		const files = shuffles.flatMap((shuffle) => shuffle.tracks.map((entry) => entry.file));
		expect([...files].sort()).toEqual(collection.map((entry) => entry.file).sort());
	});

	it('lists the shows by id, and the songs that open none last', () => {
		const shuffles = dailyShowShuffles(collection, '2026-07-30');
		expect(shuffles.map((shuffle) => shuffle.showId)).toEqual([35610, 37854, null]);
	});

	it('reports the seed each order was drawn with', () => {
		for (const shuffle of dailyShowShuffles(collection, '2026-07-30')) {
			expect(shuffle.seed).toBe(musicShuffleSeed(shuffle.showId, '2026-07-30'));
			expect(shuffle.tracks.map((entry) => entry.file)).toEqual(
				shuffleFiles(
					shuffle.tracks.map((entry) => entry.file),
					shuffle.seed
				)
			);
		}
	});

	it('orders the songs with no show as a group of their own', () => {
		// They are not left in file order just because they are unlinked: `none` is a
		// key like any other, so those songs move day to day as well.
		const many = ['w.mp3', 'x.mp3', 'y.mp3', 'z.mp3'].map((file) => track(file, null));
		const openers = new Set(
			Array.from({ length: 30 }, (_, index) => {
				const day = `2026-06-${String(index + 1).padStart(2, '0')}`;
				return dailyShowShuffles(many, day)[0].tracks[0].file;
			})
		);
		expect(openers.size).toBeGreaterThan(1);
	});
});
