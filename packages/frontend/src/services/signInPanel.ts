import { writable } from 'svelte/store';

/**
 * Whether the navbar sign-in panel is forced open. Hovering the navbar entry
 * opens it via CSS; inline "Sign in" prompts elsewhere in the app flip this to
 * open the same panel programmatically.
 */
export const signInPanelOpen = writable(false);
