import { browser } from '$app/environment';
import { locale, waitLocale } from 'svelte-i18n';
// Registers the locales and calls init() as a side effect — must run before
// waitLocale() so there is an active locale to wait on.
import '$services/i18n';

// Ensure the active locale's dictionary is loaded before the layout renders, so no
// component formats a message before svelte-i18n is ready (which throws during
// hydration). On the client, adopt the browser language; on the server the
// initialLocale fallback ('en') stands in.
export const load = async () => {
	if (browser) {
		locale.set(window.navigator.language);
	}
	await waitLocale();
};
