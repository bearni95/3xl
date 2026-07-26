import { get } from 'svelte/store';
import localStorageWritableStore from '$utils/localStorageWritableStore';

/** The light theme is the game's default; the dark theme is its synthwave sibling. */
export const LIGHT_THEME = 'cyberpunk';
export const DARK_THEME = 'synthwave';

export type Theme = typeof LIGHT_THEME | typeof DARK_THEME;

const store = localStorageWritableStore<Theme>('theme', LIGHT_THEME);

const isBrowser = typeof document !== 'undefined';

/** Reflect the current theme onto the <html data-theme> attribute DaisyUI reads. */
function apply(theme: Theme): void {
	if (isBrowser) {
		document.documentElement.setAttribute('data-theme', theme);
	}
}

store.subscribe(apply);

export const themeService = {
	store,
	isDark(): boolean {
		return get(store) === DARK_THEME;
	},
	set(theme: Theme): void {
		store.set(theme);
	},
	toggle(): void {
		store.update((theme) => (theme === DARK_THEME ? LIGHT_THEME : DARK_THEME));
	}
};
