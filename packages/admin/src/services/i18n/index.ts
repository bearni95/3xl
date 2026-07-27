import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

// Register locales
register('en', () => import('./locales/en.json'));
register('qq', () => import('./locales/qq.json'));

// Initialize i18n. Fall back to 'en' when there is no navigator (SSR/prerender),
// so the active locale is never null — otherwise the first component to format a
// message throws "Cannot format a message without first setting the initial locale".
init({
	fallbackLocale: 'en',
	initialLocale: getLocaleFromNavigator() ?? 'en'
});
