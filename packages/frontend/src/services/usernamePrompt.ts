import { writable } from 'svelte/store';

/**
 * Whether the "choose a username" modal is forced open. The modal also opens
 * itself on first sign-in when the account has no username yet; the profile
 * card's "edit username" button flips this to open the same modal on demand.
 */
export const usernamePromptOpen = writable(false);
