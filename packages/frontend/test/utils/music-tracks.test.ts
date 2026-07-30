import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MUSIC_FILE_PATTERN, MUSIC_TITLE_MAX_LENGTH } from '$types/music.type';
import type { MusicCollection } from '$types/music.type';
import type { ShowsCollection } from '$types/show.type';
import { musicTrackSrc } from '$utils/music/tracks';

// The two halves the player puts together: the songs vendored in @3xl/assets, and the
// authored collection in @3xl/data that says what each of them is. Both are read off
// disk here, exactly as the admin `/music` screen reads them through the backend.
const ASSETS = join(__dirname, '../../../assets/public');
const DATA = join(__dirname, '../../../data/public');

const music = JSON.parse(readFileSync(join(DATA, 'music.json'), 'utf-8')) as MusicCollection;
const shows = JSON.parse(readFileSync(join(DATA, 'shows.json'), 'utf-8')) as ShowsCollection;

describe('the authored music collection', () => {
	it('names songs that are actually vendored', () => {
		// A definition for a file that is not there is a play button that does nothing.
		// The admin screen reports it — it lists the assets and answers them — but the
		// collection is what the game reads, so the invariant is checked here too.
		expect(music.tracks.length).toBeGreaterThan(0);
		for (const track of music.tracks) {
			expect(track.file).toMatch(MUSIC_FILE_PATTERN);
			expect(existsSync(join(ASSETS, 'music', track.file))).toBe(true);
		}
	});

	it('says one thing about each song', () => {
		// The collection is keyed by file: two entries for one song would make which of
		// them is playing depend on the order they happen to be listed in.
		const files = music.tracks.map((track) => track.file);
		expect(new Set(files).size).toBe(files.length);
	});

	it('gives every song a title that fits the plate', () => {
		for (const track of music.tracks) {
			expect(track.title.trim()).not.toBe('');
			expect(track.title.length).toBeLessThanOrEqual(MUSIC_TITLE_MAX_LENGTH);
		}
	});

	it('links only to shows the game holds', () => {
		// The link is what puts a show's glyph and name on the plate, both of which are
		// looked up by this id — a song linked to a show that is not in the collection
		// would be lettered as though it opened nothing.
		const saved = new Set(shows.shows.map((entry) => entry.show.id));
		for (const track of music.tracks) {
			if (track.showId !== null) expect(saved.has(track.showId)).toBe(true);
		}
	});

	it('serves each song from the assets mount', () => {
		for (const track of music.tracks) {
			expect(musicTrackSrc(track.file)).toBe(`/assets/music/${track.file}`);
		}
	});
});
