import { writable } from 'svelte/store';

/**
 * Whether the way in is up as a modal.
 *
 * The door at the foot of the map is one button and nothing else (see SignInButton):
 * the gate's two boxes, the four documents and the provider button are a form, and a
 * form standing open in a corner of the map is a form being read by nobody — it took
 * the height of the corner to say what a visitor could have been told in a word. So
 * the corner asks, and everything that has to be answered before there is an account
 * is answered on the sheet this raises (see SignInModal).
 *
 * It lives out here, and the modal is mounted at the layout root, for the reason every
 * other modal in this app is: raised from inside the map's pinned panel it would be
 * trapped in that panel's stacking context. This one especially, since the prompts that
 * send a player to it are themselves inside modals — the roster and the arena, which is
 * why each of those puts its own sheet away first.
 */
export const signInModalOpen = writable(false);

/** Raise the way in. */
export function openSignIn(): void {
	signInModalOpen.set(true);
}

/** Put it away. */
export function closeSignIn(): void {
	signInModalOpen.set(false);
}
