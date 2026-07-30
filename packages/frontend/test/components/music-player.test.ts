import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import MusicPlayer from '$components/core/MusicPlayer.svelte';
import type { MusicCollection } from '$types/music.type';

/**
 * The plate in the map's corner. It owns none of the music — the collection, what is
 * on air and whether it is running are all musicService's, because the sound has to
 * outlive anything that happens on screen — so what is asserted here is that the
 * plate says what the service holds, and that its two controls reach it.
 *
 * The audio element itself is the browser's, and happy-dom neither plays sound nor
 * reports how long a file is: no length ever arrives, so the stations here cannot be
 * placed on a clock and each falls back to its day order from the top. That is the
 * fallback being exercised, and it is what leaves the dial something visible to do.
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

	it('letters what is on air, and picks the station it comes from', async () => {
		const { getByText, getByLabelText } = render(MusicPlayer);

		// Nothing is drawn until the collection has been read: the plate is what the
		// service holds, and before the read it holds no song.
		await waitFor(() => expect(getByText('First song')).toBeTruthy());

		// A station is a show, so these two songs are two stations — the one their show
		// opens, and the one for the songs that open none. Both are on the dial.
		const dial = getByLabelText('Station') as HTMLSelectElement;
		expect([...dial.options].map((option) => option.value)).toEqual(['37854', 'none']);

		await fireEvent.change(dial, { target: { value: 'none' } });
		expect(getByText('Second song')).toBeTruthy();

		await fireEvent.change(dial, { target: { value: '37854' } });
		expect(getByText('First song')).toBeTruthy();
	});

	it('offers a play control while nothing is running', async () => {
		// Nothing plays until it is asked to: no autoplay, so the button a player first
		// sees is Play rather than Pause however the service was left.
		const { getByLabelText } = render(MusicPlayer);
		await waitFor(() => expect(getByLabelText('Play music')).toBeTruthy());
	});

	it('names the stations it cannot name apart', async () => {
		// A station is named from the same shows.json the statues read. The one for the
		// songs that open no show has no name to read — it is the dash the town panel
		// leaves — and a show that file has nothing for is lettered by its id, because
		// two stations reading the same dash could not be told apart on the dial.
		const { getByText, getByLabelText } = render(MusicPlayer);
		await waitFor(() => expect(getByLabelText('Station')).toBeTruthy());
		expect((getByText('—') as HTMLOptionElement).value).toBe('none');
		expect((getByText('#37854') as HTMLOptionElement).value).toBe('37854');
	});
});
