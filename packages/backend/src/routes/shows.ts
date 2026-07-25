import { Router } from 'express';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ShowEntry, ShowsCollection } from '@3xl/shared/types/show.type';
import { asyncHandler, httpError } from '../http-error';

/**
 * Read/write API for the saved-show collection stored as JSON in the @3xl/data
 * package under `public/shows.json` (served to the apps at `/data/shows.json`).
 * The admin `/shows` screen calls this to persist a TMDB search result — the
 * show plus every image TMDB holds for it — straight into the git tree.
 *
 * Mirrors ./characters: same "author writes into @3xl/data's public dir" model,
 * but a single collection file rather than one folder per id.
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
function validateEntry(body: unknown): ShowEntry {
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

	// Optional author-chosen main image per section. Keep only kinds whose value
	// is a filePath that actually exists in the matching images array, so a
	// crafted body can't point "main" at an image the show doesn't hold.
	const listByKind = { poster: images.posters, backdrop: images.backdrops, logo: images.logos };
	const rawMains = (entry.mainImages ?? {}) as Record<string, unknown>;
	const mainImages: NonNullable<ShowEntry['mainImages']> = {};
	for (const kind of ['poster', 'backdrop', 'logo'] as const) {
		const filePath = rawMains[kind];
		if (typeof filePath === 'string' && listByKind[kind]?.some((img) => img.filePath === filePath)) {
			mainImages[kind] = filePath;
		}
	}

	return Object.keys(mainImages).length > 0 ? { show, images, mainImages } : { show, images };
}

export const showsRouter = Router();

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
		const entry = validateEntry(req.body);
		const collection = await readCollection();
		const index = collection.shows.findIndex((s) => s.show.id === entry.show.id);
		if (index >= 0) collection.shows[index] = entry;
		else collection.shows.push(entry);
		await writeCollection(collection);
		res.json(collection);
	})
);
