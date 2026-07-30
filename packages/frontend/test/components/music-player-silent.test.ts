import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import MusicPlayer from '$components/core/MusicPlayer.svelte';

/**
 * The player with nothing to play, which is a file of its own rather than a case in
 * music-player.test.ts: the service is a singleton that reads the collection once and
 * keeps it, so a test that needs the read to have failed needs a module graph where it
 * has not already succeeded — and that is what a separate test file is.
 */
describe('the music player with nothing to play', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn((input: string) =>
				input === '/data/music.json'
					? Promise.resolve({ ok: false, status: 500 })
					: Promise.resolve({ ok: true, json: async () => ({ shows: [] }) })
			)
		);
	});

	it('draws no plate', async () => {
		// A failed read leaves the service with no song, so there is nothing to letter and
		// no file to load: the corner stays empty rather than carrying a plate whose
		// buttons could not do anything. The stack above the map is a column, so the town
		// panel simply moves up into the space.
		const { queryByLabelText } = render(MusicPlayer);
		await waitFor(() => expect(queryByLabelText('Next song')).toBeNull());
		expect(queryByLabelText('Play music')).toBeNull();
	});
});
