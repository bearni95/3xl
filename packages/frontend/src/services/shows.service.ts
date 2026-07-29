import { writable, type Readable } from 'svelte/store';
import { showLogoUrl } from '$utils/show/show-logo';
import type { ShowsCollection } from '$types/show.type';

/**
 * The authored shows, reduced to what a card says a show with: its name and its
 * logo. Read once from the baked `/data/shows.json` — the collection the admin
 * `/shows` screen writes, where each show's usable logos are enabled by hand.
 *
 * A store rather than a prop threaded from every surface: the statue is drawn on
 * the map's pins, in the panel's team strip and across the roster grid, and each
 * of those knows a character's show id (the `/characters` assignment) but has no
 * reason to know what a show looks like. They hand over the id, and the load
 * happens once for all of them however many statues are standing.
 */
export interface ShowLogo {
	id: number;
	name: string;
	/** The show's enabled logo, at gallery size. */
	url: string;
}

const logos = writable<ReadonlyMap<number, ShowLogo>>(new Map());

/** Show id → its logo, for every show that has one enabled. Empty until loaded. */
export const showLogos: Readable<ReadonlyMap<number, ShowLogo>> = { subscribe: logos.subscribe };

// The in-flight (or finished) load, so a hundred statues mounting at once share
// one fetch. Cleared on failure, so a later mount tries again rather than the
// whole session going logo-less over one dropped request.
let loading: Promise<void> | null = null;

/**
 * Load the show logos once. Safe to call from every statue that mounts: the
 * first call fetches and the rest await that same promise. A show with no logo
 * enabled is simply absent from the map — a failed load leaves it empty, and
 * every caller draws as it does without one.
 */
export function loadShowLogos(): Promise<void> {
	loading ??= fetch('/data/shows.json')
		.then((response) => {
			if (!response.ok) throw new Error(`Failed to load shows (${response.status})`);
			return response.json() as Promise<ShowsCollection>;
		})
		.then((collection) => {
			const byId = new Map<number, ShowLogo>();
			for (const entry of collection.shows ?? []) {
				const url = showLogoUrl(entry);
				if (url) byId.set(entry.show.id, { id: entry.show.id, name: entry.show.name, url });
			}
			logos.set(byId);
		})
		.catch(() => {
			loading = null;
		});
	return loading;
}
