import { routeAdapter } from '../../adapters/classes/route.adapter';
import type { RouteNode } from '../../types/navigation.type';

/**
 * Statically discover every SvelteKit page at build time. Vite requires a
 * literal glob pattern, so this cannot be parameterised. `eager: true` gives us
 * the module map immediately; we only care about the keys (file paths).
 */
const pageModules = import.meta.glob('/src/routes/**/+page.svelte');

/** The navigation tree derived from the app's routes. */
export function getRoutes(): RouteNode[] {
	return routeAdapter.fromGlob(Object.keys(pageModules));
}
