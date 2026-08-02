import { Router } from 'express';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type {
	ShowEntry,
	ShowsCollection,
	ShowRefreshEntry,
	ShowRefreshResult
} from '@3xl/shared/types/show.type';
import { TMDB_FALLBACK_LANGUAGE } from '@3xl/shared/types/tmdb.type';
import { fetchTvTranslated } from '@3xl/shared/utils/tmdb/client';
import { showEntryOnCdn } from '@3xl/shared/utils/tmdb/image-cdn';
import { tmdbAdapter } from '@3xl/shared/adapters/classes/tmdb.adapter';
import { SHOW_ICON_PATTERN } from '@3xl/shared/types/show.type';
import { asyncHandler, httpError } from '../http-error';
import { iconExists, listIcons } from '../icons';

/**
 * Read/write API for the saved-show collection stored as JSON in the @3xl/data
 * package under `public/shows.json` (served to the apps at `/data/shows.json`).
 * The admin `/shows` screen calls this to persist a TMDB search result — the
 * show plus every image TMDB holds for it — straight into the git tree.
 *
 * Mirrors ./characters: same "author writes into @3xl/data's public dir" model,
 * but a single collection file rather than one folder per id.
 *
 * A saved show also carries the **glyph** that stands for it wherever the game names
 * it in a line of text (`ShowEntry.icon`). It used to be a hand-kept table in the
 * frontend, which meant a show got a mark only if somebody edited TypeScript for it;
 * it is authored here now, out of the whole vendored glyph set — `GET /icons`
 * lists what may be picked, and a save is held to that same listing, so the picker can
 * never offer a glyph this would then refuse.
 *
 * `POST /refresh` re-reads every saved show's *text* from TMDB in Catalan (see
 * TMDB_LANGUAGE) and rewrites it in place. Shows saved before the search asked
 * for Catalan carry the English title and description TMDB handed over then, and
 * a saved entry is otherwise never touched again — so this is the one path that
 * brings the collection up to the language the game is played in.
 */

// Resolve from this file's location (packages/backend/src/routes → packages/data)
// so it works regardless of the process cwd.
const SHOWS_PATH = fileURLToPath(new URL('../../../data/public/shows.json', import.meta.url));

const EMPTY: ShowsCollection = { shows: [] };

/** Read the collection, returning an empty one when the file doesn't exist yet. */
async function readCollection(): Promise<ShowsCollection> {
	try {
		const raw = await readFile(SHOWS_PATH, 'utf-8');
		const parsed = JSON.parse(raw) as ShowsCollection;
		return Array.isArray(parsed?.shows) ? parsed : EMPTY;
	} catch {
		return EMPTY;
	}
}

/** Pretty-print with tabs + trailing newline to match the checked-in JSON style. */
async function writeCollection(collection: ShowsCollection): Promise<void> {
	await writeFile(SHOWS_PATH, JSON.stringify(collection, null, '\t') + '\n', 'utf-8');
}

/**
 * Narrow an unknown POST body to a ShowEntry. The entry is stored verbatim so
 * the JSON matches exactly what the page displayed — we only assert the shape
 * enough to keep a malformed body out of the git tree, not reshape its fields.
 */
async function validateEntry(body: unknown): Promise<ShowEntry> {
	const entry = body as Partial<ShowEntry>;
	if (!entry || typeof entry !== 'object') httpError(400, 'Body must be an object');
	const { show, images } = entry;
	if (!show || typeof show !== 'object' || typeof show.id !== 'number') {
		httpError(400, 'Missing or invalid "show" (needs a numeric id)');
	}
	if (!images || typeof images !== 'object' || !Array.isArray(images.all)) {
		httpError(400, 'Missing or invalid "images"');
	}
	if (images.id !== show.id) httpError(400, 'images.id does not match show.id');

	// Optional author-enabled images per section. Keep only filePaths that
	// actually exist in the matching images array (de-duplicated, order
	// preserved), so a crafted body can't enable an image the show doesn't hold.
	const listByKind = { poster: images.posters, backdrop: images.backdrops, logo: images.logos };
	const rawEnabled = (entry.enabledImages ?? {}) as Record<string, unknown>;
	const enabledImages: NonNullable<ShowEntry['enabledImages']> = {};
	for (const kind of ['poster', 'backdrop', 'logo'] as const) {
		const raw = rawEnabled[kind];
		if (!Array.isArray(raw)) continue;
		const available = listByKind[kind] ?? [];
		const kept: string[] = [];
		for (const filePath of raw) {
			if (
				typeof filePath === 'string' &&
				!kept.includes(filePath) &&
				available.some((img) => img.filePath === filePath)
			) {
				kept.push(filePath);
			}
		}
		if (kept.length > 0) enabledImages[kind] = kept;
	}

	// The show's glyph, held to the artwork actually on disk — the show folder included,
	// since those Noun Project marks are exactly what a show is badged with. An absent or
	// empty icon is a show nobody has picked one for, which is a state a show is allowed
	// to be in: it is then named without a mark, as every unbadged show always has been.
	const rawIcon = typeof entry.icon === 'string' ? entry.icon.trim() : '';
	if (rawIcon && !SHOW_ICON_PATTERN.test(rawIcon)) {
		httpError(400, `Invalid icon "${rawIcon}" — expected <folder>/<slug>`);
	}
	if (rawIcon && !(await iconExists(rawIcon))) {
		httpError(400, `Unknown icon "${rawIcon}" — pick one of the glyphs in @3xl/assets`);
	}

	const validated: ShowEntry = { show, images };
	if (Object.keys(enabledImages).length > 0) validated.enabledImages = enabledImages;
	if (rawIcon) validated.icon = rawIcon;

	// The one field the entry is *not* stored verbatim in: the admin displays images
	// through this server's caching proxy, and this server does not exist outside the
	// author's machine. What is saved is shipped data, so the URLs are un-proxied back
	// to the TMDB CDN (see `showEntryOnCdn`) — otherwise every image in the deployed
	// game asks localhost:2002 for its bytes.
	return showEntryOnCdn(validated);
}

export const showsRouter = Router();

// GET /api/shows/icons — the glyphs a show may be badged with, for the admin's picker.
// The same listing the save above validates against: the whole vendored set, the `shows`
// folder included, whose marks stand for shows and nothing else. The artwork itself is
// not served from here: each app already mounts @3xl/assets' public/ at /assets, so a
// name from this list is an <img src> away.
showsRouter.get(
	'/icons',
	asyncHandler(async (_req, res) => {
		res.json({ icons: await listIcons() });
	})
);

// GET /api/shows — the whole saved-show collection.
showsRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		res.json(await readCollection());
	})
);

// POST /api/shows — upsert one show entry (keyed by show id), persisting the
// show and all its images exactly as sent. Returns the updated collection.
showsRouter.post(
	'/',
	asyncHandler(async (req, res) => {
		const entry = await validateEntry(req.body);
		const collection = await readCollection();
		const index = collection.shows.findIndex((s) => s.show.id === entry.show.id);
		if (index >= 0) collection.shows[index] = entry;
		else collection.shows.push(entry);
		await writeCollection(collection);
		res.json(collection);
	})
);

// POST /api/shows/refresh — re-query TMDB for every saved show and rewrite its
// title and description in Catalan, falling back per field for the many shows
// TMDB has a Catalan name but no Catalan overview for.
//
// Only the text moves. Images, the author's enabled selection, votes and the
// poster/backdrop URLs are all kept exactly as saved: they are either
// language-independent or hand-curated, and a re-read of what a show is *called*
// has no business discarding either.
//
// Deliberately NOT disk-cached, unlike every call in ./tmdb: this is an explicit
// authoring action whose whole point is to ask TMDB again, and its answer is
// persisted in the git tree rather than in `.cache/`. A show TMDB cannot answer
// for is reported and left alone — a failed re-read must not blank a title.
showsRouter.post(
	'/refresh',
	asyncHandler(async (_req, res) => {
		const apiKey = process.env.TMDB_API_KEY;
		if (!apiKey) httpError(500, 'TMDB_API_KEY is not configured on the server');

		const collection = await readCollection();
		const refreshed: ShowRefreshEntry[] = [];
		const failed: ShowRefreshResult['failed'] = [];

		for (const entry of collection.shows) {
			const { id, name: previousName, overview: previousOverview } = entry.show;
			let details;
			try {
				details = await fetchTvTranslated(apiKey, id);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				failed.push({ id, name: previousName, message });
				continue;
			}
			if (!details) {
				failed.push({ id, name: previousName, message: 'TMDB holds no show with this id' });
				continue;
			}

			const localized = tmdbAdapter.translatedTvShowToDisplay(details, TMDB_FALLBACK_LANGUAGE);
			entry.show = { ...entry.show, name: localized.name, overview: localized.overview };
			refreshed.push({
				id,
				name: localized.name,
				...(localized.name !== previousName ? { previousName } : {}),
				overviewChanged: localized.overview !== previousOverview,
				overviewFallback: !details.overview && Boolean(localized.overview)
			});
		}

		await writeCollection(collection);
		res.json({ shows: collection.shows, refreshed, failed } satisfies ShowRefreshResult);
	})
);
