import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import MusicPlayer from '$components/core/MusicPlayer.svelte';
import type { MusicCollection } from '$types/music.type';

/**
 * The plate in the map's corner. It owns none of the music — the collection, which
 * song is loaded and whether it is running are all musicService's, because the sound
 * has to outlive anything that happens on screen — so what is asserted here is that
 * the plate says what the service holds, and that its two controls reach it.
 *
 * The audio element itself is the browser's, and happy-dom does not play sound: a
 * `play()` here neither starts nor is expected to. The swap is what can be seen
 * without it, and it is the whole of "change between the songs".
 */

const COLLECTION: MusicCollection = {
	tracks: [
		{ file: 'first-song.mp3', title: 'First song', showId: 37854 },
		{ file: 'second-song.mp3', title: 'Second song', showId: null }
	]
};

// Both reads the plate makes on mount: the authored songs, and the shows it letters
// the second line from. Answered from here rather than over the network, so the test
// is about the plate and not about what is currently in @3xl/data.
function stubFetch(collection: MusicCollection | null): void {
	vi.stubGlobal(
		'fetch',
		vi.fn((input: string) => {
			if (input === '/data/music.json') {
				if (!collection) return Promise.resolve({ ok: false, status: 500 });
				return Promise.resolve({ ok: true, json: async () => collection });
			}
			return Promise.resolve({ ok: true, json: async () => ({ shows: [] }) });
		})
	);
}

describe('the music player', () => {
	beforeEach(() => stubFetch(COLLECTION));

	it('letters the loaded song, and steps to the next one', async () => {
		const { getByText, getByLabelText } = render(MusicPlayer);

		// Nothing is drawn until the collection has been read: the plate is what the
		// service holds, and before the read it holds no song.
		await waitFor(() => expect(getByText('First song')).toBeTruthy());

		await fireEvent.click(getByLabelText('Next song'));
		expect(getByText('Second song')).toBeTruthy();

		// The collection wraps, so the next press comes back to the first song — which is
		// what makes one button enough to move between two of them.
		await fireEvent.click(getByLabelText('Next song'));
		expect(getByText('First song')).toBeTruthy();
	});

	it('offers a play control while nothing is running', async () => {
		// Nothing plays until it is asked to: no autoplay, so the button a player first
		// sees is Play rather than Pause however the service was left.
		const { getByLabelText } = render(MusicPlayer);
		await waitFor(() => expect(getByLabelText('Play music')).toBeTruthy());
	});

	it('holds the show line open when the show cannot be named', async () => {
		// The second line is the show, read from the same shows.json the statues read. A
		// song linked to no show — or to one the file has nothing for — leaves the dash
		// the town panel leaves, so the plate keeps its two lines either way.
		const { getByText } = render(MusicPlayer);
		await waitFor(() => expect(getByText('—')).toBeTruthy());
	});
});
