import { register, init, getLocaleFromNavigator } from 'svelte-i18n';
import { env } from '$env/dynamic/public';

const dictionaries = {
	en: () => import('./locales/en.json'),
	qq: () => import('./locales/qq.json')
} as const;

type Locale = keyof typeof dictionaries;

/**
 * The one locale the app speaks, or null when it speaks all of them.
 *
 * `pnpm dev:qq` sets PUBLIC_I18N_LOCALE=qq, which is what makes the pseudo-locale
 * a *test*: it is the only dictionary registered and also the fallback, so a
 * string that was never put through i18n shows up as itself instead of hiding
 * behind an English one the browser would otherwise have been given. Unset — every
 * other run, dev or build — leaves the normal set registered and the browser
 * choosing.
 */
export const pinnedLocale: Locale | null =
	env.PUBLIC_I18N_LOCALE && env.PUBLIC_I18N_LOCALE in dictionaries
		? (env.PUBLIC_I18N_LOCALE as Locale)
		: null;

for (const [name, load] of Object.entries(dictionaries)) {
	if (!pinnedLocale || name === pinnedLocale) register(name, load);
}

// Initialize i18n. Fall back to 'en' when there is no navigator (SSR/prerender),
// so the active locale is never null — otherwise the first component to format a
// message throws "Cannot format a message without first setting the initial locale".
init({
	fallbackLocale: pinnedLocale ?? 'en',
	initialLocale: pinnedLocale ?? getLocaleFromNavigator() ?? 'en'
});
