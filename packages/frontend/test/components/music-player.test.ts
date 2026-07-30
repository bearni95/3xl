import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MusicPlayer from '$components/core/MusicPlayer.svelte';
import { MUSIC_TRACKS } from '$utils/music/tracks';

/**
 * The plate in the map's corner. It owns none of the music — which track is loaded
 * and whether it is running are musicService's, because the sound has to outlive
 * anything that happens on screen — so what is asserted here is that the plate says
 * what the service holds, and that its two controls reach the service at all.
 *
 * The audio element itself is the browser's, and happy-dom does not play sound: a
 * `play()` here neither starts nor is expected to. The swap is what can be seen
 * without it, and it is the whole of "change between the two songs".
 */
describe('the music player', () => {
	// The plate asks for the shows on mount, to name the one the song opens. Answered
	// with nothing, so the read is settled rather than left in flight — what the
	// player does with a show it cannot name is asserted below.
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, json: async () => ({ shows: [] }) })
		);
	});

	it('letters the loaded track, and swaps to the next on the next button', async () => {
		const { getByText, getByLabelText } = render(MusicPlayer);

		expect(getByText(MUSIC_TRACKS[0].title)).toBeTruthy();

		await fireEvent.click(getByLabelText('Next song'));
		expect(getByText(MUSIC_TRACKS[1].title)).toBeTruthy();

		// The list wraps, so the second press comes back to the first track — which is
		// what makes one button enough to move between two songs.
		await fireEvent.click(getByLabelText('Next song'));
		expect(getByText(MUSIC_TRACKS[0].title)).toBeTruthy();
	});

	it('offers a play control while nothing is running', () => {
		// Nothing plays until it is asked to: no autoplay, so the button a player first
		// sees is Play rather than Pause however the service was left.
		const { getByLabelText } = render(MusicPlayer);
		expect(getByLabelText('Play music')).toBeTruthy();
	});

	it('holds the show line open when the show cannot be named', () => {
		// The second line is the show, read from the same shows.json the statues read. A
		// show that is not in it leaves the dash the town panel leaves, so the plate keeps
		// its two lines rather than changing height on a failed read.
		const { getByText } = render(MusicPlayer);
		expect(getByText('—')).toBeTruthy();
	});
});
