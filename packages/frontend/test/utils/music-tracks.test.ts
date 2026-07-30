import { describe, it, expect } from 'vitest';
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
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

/** Container magics that are not an MPEG stream, however the file is named. */
const CONTAINERS = ['RIFF', 'OggS', 'fLaC', 'FORM', 'ftyp', '<!DO', '<htm'];

/**
 * Where the first MPEG frame of `path` starts, or null if there is none — the file is
 * some other container, or an error page, or a stub.
 *
 * An ID3v2 tag is skipped by its own header (a syncsafe length, plus a footer if the
 * flags say so), and the frame sync is looked for just past it rather than exactly at
 * it: some of these carry a little padding between the tag and the audio, and one of
 * them 155 bytes of it, which is a tagger being sloppy and not a broken song.
 */
function firstFrameOffset(path: string): number | null {
	const handle = openSync(path, 'r');
	try {
		const header = Buffer.alloc(10);
		readSync(handle, header, 0, 10, 0);

		let start = 0;
		if (header.subarray(0, 3).toString('latin1') === 'ID3') {
			const size =
				((header[6] & 0x7f) << 21) |
				((header[7] & 0x7f) << 14) |
				((header[8] & 0x7f) << 7) |
				(header[9] & 0x7f);
			start = 10 + size + (header[5] & 0x10 ? 10 : 0);
		}

		const window = Buffer.alloc(2048);
		const read = readSync(handle, window, 0, window.length, start);
		if (CONTAINERS.includes(window.subarray(0, 4).toString('latin1'))) return null;
		for (let i = 0; i < read - 1; i++) {
			if (window[i] === 0xff && (window[i + 1] & 0xe0) === 0xe0) return start + i;
		}
		return null;
	} finally {
		closeSync(handle);
	}
}

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

	it('names songs that are audio, not what a failed download left behind', () => {
		// The archive answers a miss with an HTML page, and it answers it with a 200: a
		// curated-in copy of one is 140 kB of <!DOCTYPE under an .mp3 name, which exists,
		// plays nothing and has no length to print. The pull script refuses those on the
		// way in (`verify`); this is the same check applied to what actually got kept,
		// because a file can also arrive here by hand, and one did.
		//
		// It goes one step further than the pull's, because the other way a file lies
		// about being an mp3 is subtler: an ID3 tag glued in front of a RIFF/WAVE
		// container holding the very same MPEG data. It passes any check made at byte
		// zero, and no browser will tell you how long it is. So what is asserted is what
		// follows the tag: MPEG frames, and not the header of some other container.
		for (const track of music.tracks) {
			const path = join(ASSETS, 'music', track.file);
			expect(statSync(path).size, `${track.file} is a stub`).toBeGreaterThan(64 * 1024);
			expect(firstFrameOffset(path), `${track.file} is not an MPEG stream`).not.toBeNull();
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
