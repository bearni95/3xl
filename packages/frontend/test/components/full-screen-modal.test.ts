import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import FullScreenModal from '$components/core/FullScreenModal.svelte';

/**
 * The sheet the roster and the achievements are both drawn on. What it owns is the
 * surround — the dialog it is, its title, and the two ways out — and every one of
 * those is something a host leans on: the modal never closes itself (the store it
 * would set is the host's), so a ✕ or an Escape that failed to say so would be a
 * view with no way out at all.
 */
describe('the full-view modal', () => {
	it('is a modal dialog carrying its title', () => {
		const { getByRole } = render(FullScreenModal, { props: { title: 'Roster' } });
		const dialog = getByRole('dialog');
		expect(dialog.getAttribute('aria-modal')).toBe('true');
		expect(dialog.textContent).toContain('Roster');
	});

	it('says so when the ✕ is pressed, by the name the host gave it', async () => {
		const close = vi.fn();
		const { getByLabelText } = render(FullScreenModal, {
			props: { title: 'Achievements', closeLabel: 'Close achievements' },
			events: { close }
		});
		await fireEvent.click(getByLabelText('Close achievements'));
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('says so on Escape, and on nothing else', async () => {
		const close = vi.fn();
		render(FullScreenModal, { props: { title: 'Roster' }, events: { close } });
		await fireEvent.keyDown(window, { key: 'Enter' });
		expect(close).not.toHaveBeenCalled();
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(close).toHaveBeenCalledTimes(1);
	});
});
