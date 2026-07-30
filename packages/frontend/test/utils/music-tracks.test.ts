import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { MUSIC_TRACKS } from '$utils/music/tracks';
import { showIconName } from '$utils/show/show-icon';

// The same tree the app serves at /assets, which is where a track's `src` points.
const ASSETS = join(__dirname, '../../../assets/public');

describe('MUSIC_TRACKS', () => {
	it('names a file that is actually vendored', () => {
		// The player has nothing to fall back to: a src naming a file that is not there
		// is a play button that does nothing, and the only place that can be caught is
		// here — the list is hand-maintained and the browser only finds out on a click.
		for (const track of MUSIC_TRACKS) {
			expect(track.src.startsWith('/assets/music/')).toBe(true);
			expect(existsSync(join(ASSETS, track.src.slice('/assets/'.length)))).toBe(true);
		}
	});

	it('keys each track by its own file', () => {
		// The id is the asset's basename, so the list can be read against the folder.
		for (const track of MUSIC_TRACKS) {
			expect(track.id).toBe(basename(track.src, '.mp3'));
		}
		expect(new Set(MUSIC_TRACKS.map((track) => track.id)).size).toBe(MUSIC_TRACKS.length);
	});

	it('has a title and a stepping order to play', () => {
		// A track with no title is a plate with an empty line on it, and one track alone
		// would leave the player's next button with nowhere to go.
		expect(MUSIC_TRACKS.length).toBeGreaterThan(1);
		for (const track of MUSIC_TRACKS) expect(track.title.trim()).not.toBe('');
	});

	it('belongs to a show the corner plate can badge', () => {
		// Both themes open a show that is in the game and has a glyph drawn, so each
		// track is tiled the way the town panel below it is. A future track for a show
		// with no glyph is allowed by the type — it would simply be lettered by title —
		// but neither of today's is that case.
		expect(MUSIC_TRACKS.map((track) => showIconName(track.showId))).toEqual([
			'shows/straw-hat',
			'shows/bow-and-arrow'
		]);
	});
});
