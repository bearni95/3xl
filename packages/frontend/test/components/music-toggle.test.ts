import { describe, it, expect, vi } from 'vitest';
import type { MusicCollection } from '$types/music.type';

/**
 * The play/pause on the bar over the map. It is the plate's button standing somewhere
 * else — same component, same store — so what is asserted here is the part that is
 * only true of this copy: that it is what asks for the music on a page where nobody
 * opens the menu the plate lives in, that it draws nothing when there is nothing to
 * play, and that pressing it reaches the radio.
 *
 * Sound is the browser's and happy-dom has none, so what proves the press landed is
 * what the service wrote down about it: the radio remembers being turned on.
 */

const COLLECTION: MusicCollection = {
	tracks: [{ file: 'first-song.mp3', title: 'First song', showId: 37854 }]
};

/**
 * Mount the button over a collection, with a radio that has read nothing yet.
 *
 * The registry is reset per test so the service singleton is a new one, and the
 * testing library is imported after that reset rather than at the top of the file: a
 * reset registry builds a second copy of the Svelte runtime, and a component mounted
 * through the first copy would have its effects running outside any component at all.
 */
async function mount(collection: MusicCollection | null) {
	vi.stubGlobal(
		'fetch',
		vi.fn(() =>
			collection
				? Promise.resolve({ ok: true, json: async () => collection })
				: Promise.resolve({ ok: false, status: 500 })
		)
	);
	vi.resetModules();
	// The library's own cleanup belongs to the copy that mounted, and the copy that
	// mounted the last test is not this one — so the page is cleared here rather than
	// by an afterEach that only knows about one of them. A query is bound to the body,
	// so a button left standing from the test before would answer for this one.
	document.body.innerHTML = '';
	const library = await import('@testing-library/svelte');
	const { default: MusicToggle } = await import('$components/core/MusicToggle.svelte');
	// The render's queries, which are bound to what it mounted, plus the two helpers
	// that are not queries — never the library's own unbound queries over the top.
	return {
		...library.render(MusicToggle, { props: { classes: 'btn' } }),
		waitFor: library.waitFor,
		fireEvent: library.fireEvent
	};
}

describe('the music toggle', () => {
	it('reads the collection itself, and offers the play', async () => {
		// Nobody has opened the menu, so nothing else on the page has asked for the
		// songs: a control that is always up is what makes the radio load with the map.
		const { getByLabelText, waitFor } = await mount(COLLECTION);
		await waitFor(() => expect(getByLabelText('Play music')).toBeTruthy());
	});

	it('draws nothing at all when there is nothing to play', async () => {
		const { queryByLabelText, waitFor } = await mount(null);
		await waitFor(() => expect(queryByLabelText('Play music')).toBeNull());
	});

	it('turns the radio on, and the radio remembers it', async () => {
		const { getByLabelText, waitFor, fireEvent } = await mount(COLLECTION);
		await waitFor(() => expect(getByLabelText('Play music')).toBeTruthy());

		await fireEvent.click(getByLabelText('Play music'));
		expect(JSON.parse(localStorage.getItem('music-player') ?? '{}').on).toBe(true);
	});
});
