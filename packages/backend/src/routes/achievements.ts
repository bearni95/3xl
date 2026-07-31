import { Router } from 'express';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
	ACHIEVEMENT_ID_PATTERN,
	ACHIEVEMENT_NAME_MAX_LENGTH,
	ACHIEVEMENT_DESCRIPTION_MAX_LENGTH,
	type Achievement,
	type AchievementsCollection
} from '@3xl/shared/types/achievement.type';
import {
	normalizeVariables,
	validateVariables
} from '@3xl/shared/utils/achievement/variables';
import { asyncHandler, httpError } from '../http-error';
import { iconExists, listIcons } from '../icons';

/**
 * Read/write API for the achievement collection stored as JSON in the @3xl/data
 * package under `public/achievements.json` (served to the apps at
 * `/data/achievements.json`). The admin `/achievements` screen calls this to
 * author badges straight into the git tree.
 *
 * Mirrors ./shows: one collection file rather than a folder per id, upserted by
 * id. Supabase holds only the ids — see ./achievement-templates — so everything
 * a badge *says* is written here and nowhere else.
 *
 * `GET /icons` lists the game-icons.net glyphs an achievement may use, read off
 * @3xl/assets' `public/icons/` at request time; the same directory listing backs
 * the icon validation below, so the picker can never offer a glyph the save
 * would then refuse.
 *
 * A badge may also declare variables — its own numbers, each a formula over the
 * player reading it, templated into its wording between braces — and a requirement,
 * the condition that earns it. Both are held to the rules in
 * `@3xl/shared/utils/achievement/variables`, which is the same module the admin
 * editor validates with, so a formula this refuses is one the editor already said
 * no to.
 *
 * The requirement is written here as its source text and nothing else. Compiling it
 * for the database — which is what actually decides whether a player has earned a
 * badge — happens in ./achievement-templates, on sync.
 */

// packages/backend/src/routes → packages/data. Resolved from this file's location
// so the process cwd doesn't matter. The glyphs themselves are read by ../icons,
// which the `/shows` route reads the same set through.
const ACHIEVEMENTS_PATH = fileURLToPath(
	new URL('../../../data/public/achievements.json', import.meta.url)
);

const EMPTY: AchievementsCollection = { achievements: [] };

/** Read the collection, returning an empty one when the file doesn't exist yet. */
async function readCollection(): Promise<AchievementsCollection> {
	try {
		const raw = await readFile(ACHIEVEMENTS_PATH, 'utf-8');
		const parsed = JSON.parse(raw) as AchievementsCollection;
		return Array.isArray(parsed?.achievements) ? parsed : EMPTY;
	} catch {
		return EMPTY;
	}
}

/** Pretty-print with tabs + trailing newline to match the checked-in JSON style. */
async function writeCollection(collection: AchievementsCollection): Promise<void> {
	await writeFile(ACHIEVEMENTS_PATH, JSON.stringify(collection, null, '\t') + '\n', 'utf-8');
}

/**
 * Narrow an unknown POST body to an Achievement. Everything not named here is
 * dropped, so a crafted body can't smuggle extra fields into the git tree.
 */
async function validate(body: unknown): Promise<Achievement> {
	const draft = body as Partial<Achievement>;
	if (!draft || typeof draft !== 'object') httpError(400, 'Body must be an object');

	const id = typeof draft.id === 'string' ? draft.id.trim() : '';
	if (!ACHIEVEMENT_ID_PATTERN.test(id)) {
		httpError(400, `Invalid achievement id "${id}" — lowercase letters, digits and hyphens only`);
	}

	const name = typeof draft.name === 'string' ? draft.name.trim() : '';
	if (!name) httpError(400, 'Name cannot be empty');
	if (name.length > ACHIEVEMENT_NAME_MAX_LENGTH) {
		httpError(400, `Name cannot be longer than ${ACHIEVEMENT_NAME_MAX_LENGTH} characters`);
	}

	const description = typeof draft.description === 'string' ? draft.description.trim() : '';
	if (!description) httpError(400, 'Description cannot be empty');
	if (description.length > ACHIEVEMENT_DESCRIPTION_MAX_LENGTH) {
		httpError(
			400,
			`Description cannot be longer than ${ACHIEVEMENT_DESCRIPTION_MAX_LENGTH} characters`
		);
	}

	const icon = typeof draft.icon === 'string' ? draft.icon.trim() : '';
	// Without the show set: those glyphs each stand for a show, and a badge is not one.
	if (!(await iconExists(icon, false))) {
		httpError(400, `Unknown icon "${icon}" — pick one of the game-icons in @3xl/assets`);
	}

	// The badge's own computed numbers, and the condition that earns it. Narrowed
	// first (so nothing but name/formula reaches the tree), then held against the
	// same rules the editor shows: every formula has to parse, every `{placeholder}`
	// in the wording has to name one of these — a badge whose text quotes a variable
	// it never declared would go out to players with the braces still in it — and the
	// requirement has to be a condition that parses against those same names.
	const variables = normalizeVariables(draft.variables);
	const requirement = typeof draft.requirement === 'string' ? draft.requirement.trim() : '';
	const problems = validateVariables({ name, description, variables, requirement });
	if (problems.length > 0) {
		httpError(400, problems.map((problem) => problem.message).join('; '));
	}

	// Each of the two optional fields is left out entirely when it is empty, so a
	// badge with fixed wording and no checkable rule stays the four fields it always
	// was.
	const achievement: Achievement = { id, name, description, icon };
	if (variables.length > 0) achievement.variables = variables;
	if (requirement) achievement.requirement = requirement;
	return achievement;
}

export const achievementsRouter = Router();

// GET /api/achievements/icons — the pickable glyphs, for the admin's picker. The
// artwork itself is not served from here: each app already mounts @3xl/assets'
// public/ at /assets, so a name from this list is an <img src> away.
achievementsRouter.get(
	'/icons',
	asyncHandler(async (_req, res) => {
		res.json({ icons: await listIcons(false) });
	})
);

// GET /api/achievements — the whole authored collection.
achievementsRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		res.json(await readCollection());
	})
);

// POST /api/achievements — upsert one achievement (keyed by id). Returns the
// updated collection so the admin re-renders from what actually landed on disk.
achievementsRouter.post(
	'/',
	asyncHandler(async (req, res) => {
		const achievement = await validate(req.body);
		const collection = await readCollection();
		const index = collection.achievements.findIndex((a) => a.id === achievement.id);
		if (index >= 0) collection.achievements[index] = achievement;
		else collection.achievements.push(achievement);
		await writeCollection(collection);
		res.json(collection);
	})
);

// DELETE /api/achievements/:id — drop one from the git tree. Its Supabase row
// (and every award of it) survives until the next sync, which is what reports
// the removal — see ./achievement-templates.
achievementsRouter.delete(
	'/:id',
	asyncHandler(async (req, res) => {
		const id = String(req.params.id);
		if (!ACHIEVEMENT_ID_PATTERN.test(id)) httpError(400, `Invalid achievement id: ${id}`);
		const collection = await readCollection();
		const remaining = collection.achievements.filter((a) => a.id !== id);
		if (remaining.length === collection.achievements.length) {
			httpError(404, `No achievement "${id}"`);
		}
		const updated: AchievementsCollection = { achievements: remaining };
		await writeCollection(updated);
		res.json(updated);
	})
);
