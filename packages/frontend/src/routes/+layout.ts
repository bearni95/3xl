import { waitLocale } from 'svelte-i18n';
// Registers the app's one locale and calls init() as a side effect — must run before
// waitLocale() so there is an active locale to wait on.
import '$services/i18n';

// Ensure the dictionary is loaded before the layout renders, so no component formats a
// message before svelte-i18n is ready (which throws during hydration). Nothing is chosen
// here: the language is the game's rather than the reader's, and `$services/i18n` has
// already set it. This used to adopt `navigator.language` on the client, which is exactly
// the thing a one-language app must not do.
export const load = async () => {
	await waitLocale();
};
