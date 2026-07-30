import { Router } from 'express';
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	MUSIC_FILE_PATTERN,
	MUSIC_TITLE_MAX_LENGTH,
	type MusicTrack,
	type MusicCollection
} from '@3xl/shared/types/music.type';
import type { ShowsCollection } from '@3xl/shared/types/show.type';
import { asyncHandler, httpError } from '../http-error';

/**
 * Read/write API for the music collection stored as JSON in the @3xl/data package
 * under `public/music.json` (served to the apps at `/data/music.json`). The admin
 * `/music` screen calls this to say what each vendored song is called and which show
 * it opens, straight into the git tree.
 *
 * Mirrors ./achievements in every way that matters — one collection file, upserted
 * by key, pretty-printed with tabs — with one difference: an achievement's id is
 * invented by the author, while a track's key is a file somebody dropped into
 * @3xl/assets. So the assets are the list (`GET /files`, read off disk the way
 * ./achievements reads its icons) and the collection only ever answers them: a save
 * for a file that is not there is refused, exactly as a badge naming a glyph that is
 * not there is.
 *
 * The show a track is linked to is held to the saved shows in `public/shows.json` —
 * the same collection the admin `/shows` screen writes and the select on the music
 * screen is filled from — so a link can never name a show the game does not have.
 */

// packages/backend/src/routes → packages/data / packages/assets. Resolved from this
// file's location so the process cwd doesn't matter.
const MUSIC_PATH = fileURLToPath(new URL('../../../data/public/music.json', import.meta.url));
const SHOWS_PATH = fileURLToPath(new URL('../../../data/public/shows.json', import.meta.url));
const MUSIC_DIR = fileURLToPath(new URL('../../../assets/public/music', import.meta.url));

const EMPTY: MusicCollection = { tracks: [] };

/** Read the collection, returning an empty one when the file doesn't exist yet. */
async function readCollection(): Promise<MusicCollection> {
	try {
		const raw = await readFile(MUSIC_PATH, 'utf-8');
		const parsed = JSON.parse(raw) as MusicCollection;
		return Array.isArray(parsed?.tracks) ? parsed : EMPTY;
	} catch {
		return EMPTY;
	}
}

/** Pretty-print with tabs + trailing newline to match the checked-in JSON style. */
async function writeCollection(collection: MusicCollection): Promise<void> {
	await writeFile(MUSIC_PATH, JSON.stringify(collection, null, '\t') + '\n', 'utf-8');
}

/**
 * Every song vendored in @3xl/assets, by file name, sorted. Only the names the
 * pattern accepts are listed — the folder also holds its `credits.txt`, and a file
 * this would not accept is one no definition could name anyway.
 */
export async function listMusicFiles(): Promise<string[]> {
	try {
		const entries = await readdir(MUSIC_DIR, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && MUSIC_FILE_PATTERN.test(entry.name))
			.map((entry) => entry.name)
			.sort();
	} catch {
		return [];
	}
}

/** Whether `file` names a song that is actually on disk. */
async function fileExists(file: string): Promise<boolean> {
	// The pattern bars dots and separators, so this cannot escape MUSIC_DIR.
	if (!MUSIC_FILE_PATTERN.test(file)) return false;
	try {
		await access(resolve(MUSIC_DIR, file));
		return true;
	} catch {
		return false;
	}
}

/** The TMDB ids of the saved shows — the only shows a track may be linked to. */
async function savedShowIds(): Promise<Set<number>> {
	try {
		const raw = await readFile(SHOWS_PATH, 'utf-8');
		const parsed = JSON.parse(raw) as ShowsCollection;
		return new Set((parsed?.shows ?? []).map((entry) => entry.show.id));
	} catch {
		return new Set();
	}
}

/**
 * Narrow an unknown POST body to a MusicTrack. Everything not named here is dropped,
 * so a crafted body can't smuggle extra fields into the git tree.
 */
async function validate(body: unknown): Promise<MusicTrack> {
	const draft = body as Partial<MusicTrack>;
	if (!draft || typeof draft !== 'object') httpError(400, 'Body must be an object');

	const file = typeof draft.file === 'string' ? draft.file.trim() : '';
	if (!(await fileExists(file))) {
		httpError(400, `Unknown song "${file}" — drop the file into @3xl/assets' public/music first`);
	}

	const title = typeof draft.title === 'string' ? draft.title.trim() : '';
	if (!title) httpError(400, 'Title cannot be empty');
	if (title.length > MUSIC_TITLE_MAX_LENGTH) {
		httpError(400, `Title cannot be longer than ${MUSIC_TITLE_MAX_LENGTH} characters`);
	}

	// A song may be linked to no show at all — it is then lettered by title alone —
	// but a link that is given has to name a show the game actually holds.
	let showId: number | null = null;
	if (draft.showId !== null && draft.showId !== undefined) {
		if (typeof draft.showId !== 'number' || !Number.isInteger(draft.showId)) {
			httpError(400, 'showId must be a TMDB show id, or null for no show');
		}
		if (!(await savedShowIds()).has(draft.showId)) {
			httpError(400, `Unknown show ${draft.showId} — save it on the /shows screen first`);
		}
		showId = draft.showId;
	}

	return { file, title, showId };
}

export const musicRouter = Router();

// GET /api/music/files — the songs vendored in @3xl/assets, which is the list the
// admin screen is built from: a definition answers a file, never the other way
// round. The audio itself is not served from here — each app mounts @3xl/assets'
// public/ at /assets, so a name from this list is an <audio src> away.
musicRouter.get(
	'/files',
	asyncHandler(async (_req, res) => {
		res.json({ files: await listMusicFiles() });
	})
);

// GET /api/music — the whole authored collection.
musicRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		res.json(await readCollection());
	})
);

// POST /api/music — upsert one track (keyed by file). Returns the updated collection
// so the admin re-renders from what actually landed on disk.
musicRouter.post(
	'/',
	asyncHandler(async (req, res) => {
		const track = await validate(req.body);
		const collection = await readCollection();
		const index = collection.tracks.findIndex((entry) => entry.file === track.file);
		if (index >= 0) collection.tracks[index] = track;
		else collection.tracks.push(track);
		await writeCollection(collection);
		res.json(collection);
	})
);

// DELETE /api/music/:file — drop one definition from the git tree. The asset itself
// is untouched: this unsays what was said about a song, which is what an entry left
// behind by a file that has been removed needs.
musicRouter.delete(
	'/:file',
	asyncHandler(async (req, res) => {
		const file = String(req.params.file);
		if (!MUSIC_FILE_PATTERN.test(file)) httpError(400, `Invalid song file: ${file}`);
		const collection = await readCollection();
		const remaining = collection.tracks.filter((entry) => entry.file !== file);
		if (remaining.length === collection.tracks.length) httpError(404, `No definition for "${file}"`);
		const updated: MusicCollection = { tracks: remaining };
		await writeCollection(updated);
		res.json(updated);
	})
);
