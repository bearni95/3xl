import { register, init } from 'svelte-i18n';
import { env } from '$env/dynamic/public';

/**
 * Every dictionary this app ships. English is not among them: the game is Catalan and
 * `ca.json` is its catalogue, not a translation of one. `qq` is the pseudo-locale — every
 * string replaced by `QQQQQ`, generated from `ca.json` so its keys are exactly the ones
 * the app can ask for.
 */
const dictionaries = {
	ca: () => import('./locales/ca.json'),
	qq: () => import('./locales/qq.json')
} as const;

type Locale = keyof typeof dictionaries;

/** The language the game is in. */
const DEFAULT_LOCALE: Locale = 'ca';

/**
 * The one locale this run speaks. The browser is never asked: a player's Accept-Language
 * says nothing about a game set in the Països Catalans, and adopting it would have meant
 * every string the catalogue is missing quietly resolving somewhere else.
 *
 * `pnpm dev:qq` sets PUBLIC_I18N_LOCALE=qq, which is the only thing that moves it — and
 * the pseudo-locale is registered *alone* and is its own fallback, so a string that was
 * never put through i18n shows up as itself instead of hiding behind a Catalan one.
 */
export const activeLocale: Locale =
	env.PUBLIC_I18N_LOCALE && env.PUBLIC_I18N_LOCALE in dictionaries
		? (env.PUBLIC_I18N_LOCALE as Locale)
		: DEFAULT_LOCALE;

register(activeLocale, dictionaries[activeLocale]);

// Both ends are the same locale because there is only one. A fallback naming another
// language would be a second language, which is what this app does not have.
init({ fallbackLocale: activeLocale, initialLocale: activeLocale });
