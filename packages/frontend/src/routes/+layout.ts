import { browser } from '$app/environment';
import { locale, waitLocale } from 'svelte-i18n';
// Registers the locales and calls init() as a side effect — must run before
// waitLocale() so there is an active locale to wait on.
import { pinnedLocale } from '$services/i18n';

// Ensure the active locale's dictionary is loaded before the layout renders, so no
// component formats a message before svelte-i18n is ready (which throws during
// hydration). On the client, adopt the browser language; on the server the
// initialLocale fallback ('en') stands in. A pinned build (`pnpm dev:qq`) is the
// exception: it registered one dictionary and this is the other place that would
// have walked out of it.
export const load = async () => {
	if (browser && !pinnedLocale) {
		locale.set(window.navigator.language);
	}
	await waitLocale();
};
