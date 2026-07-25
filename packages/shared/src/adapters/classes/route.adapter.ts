import { AdapterClass } from './adapter.class';
import capitalize from '../../utils/string/capitalize';
import type { RouteNode } from '../../types/navigation.type';

const ROUTES_PREFIX = '/src/routes';
const PAGE_SUFFIX = '/+page.svelte';

/**
 * Transforms the raw `import.meta.glob` keys of SvelteKit `+page.svelte` files
 * into a nested navigation tree of {@link RouteNode}s.
 */
export class RouteAdapter extends AdapterClass {
	constructor() {
		super('route');
	}

	/** `/src/routes/about/team/+page.svelte` -> `/about/team` (`` for root) */
	toPath(globKey: string): string {
		let path = globKey;
		if (path.startsWith(ROUTES_PREFIX)) path = path.slice(ROUTES_PREFIX.length);
		if (path.endsWith(PAGE_SUFFIX)) path = path.slice(0, -PAGE_SUFFIX.length);
		return path;
	}

	/** `team-members` -> `Team Members`, root -> `Home` */
	private toLabel(segment: string): string {
		return segment ? capitalize(segment) : 'Home';
	}

	/** Skip dynamic (`[param]`) and layout-group (`(group)`) segments. */
	private isNavigable(segment: string): boolean {
		return !segment.startsWith('[') && !segment.startsWith('(');
	}

	/**
	 * Build the top-level navigation tree from the glob keys.
	 * Returns the root page (as `Home`) followed by its child sections.
	 */
	fromGlob(globKeys: string[]): RouteNode[] {
		const root: RouteNode = {
			label: 'Home',
			path: '/',
			segment: '',
			hasPage: false,
			children: []
		};
		const index = new Map<string, RouteNode>([['/', root]]);

		for (const key of globKeys) {
			const segments = this.toPath(key).split('/').filter(Boolean);

			if (segments.length === 0) {
				root.hasPage = true;
				continue;
			}

			// Ignore whole routes that contain a dynamic or grouped segment.
			if (!segments.every((segment) => this.isNavigable(segment))) continue;

			let parent = root;
			let currentPath = '';
			segments.forEach((segment, i) => {
				currentPath += `/${segment}`;
				let node = index.get(currentPath);
				if (!node) {
					node = {
						label: this.toLabel(segment),
						path: currentPath,
						segment,
						hasPage: false,
						children: []
					};
					index.set(currentPath, node);
					parent.children.push(node);
				}
				if (i === segments.length - 1) node.hasPage = true;
				parent = node;
			});
		}

		const sortTree = (node: RouteNode) => {
			node.children.sort((a, b) => a.label.localeCompare(b.label));
			node.children.forEach(sortTree);
		};
		sortTree(root);

		// The root (`/`) is reached via the navbar brand, not a nav button,
		// so only its child sections are surfaced as top-level items.
		return root.children;
	}
}

export const routeAdapter = new RouteAdapter();
