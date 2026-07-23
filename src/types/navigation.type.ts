export interface RouteNode {
	/** Human-readable label derived from the route segment */
	label: string;
	/** Full URL path, e.g. `/about/team` (`/` for the root) */
	path: string;
	/** The last URL segment for this node, e.g. `team` */
	segment: string;
	/** Whether a `+page.svelte` exists at this path (i.e. it is navigable) */
	hasPage: boolean;
	/** Nested child routes */
	children: RouteNode[];
}
