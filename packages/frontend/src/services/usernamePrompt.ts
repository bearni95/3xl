import { writable } from 'svelte/store';

/**
 * A request to put the profile modal's username field in front of the player:
 * raise the modal if it is down, and switch the name over to its input.
 *
 * There is no modal of its own for naming an account — the profile card is where
 * a player's name lives, so that is where it is typed. The "set username" button
 * on the card flips this; the profile modal also raises the field by itself for an
 * account Supabase holds no name for. The modal clears the flag once it has acted
 * on it.
 */
export const usernameEditRequested = writable(false);
