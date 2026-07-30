import { Router } from 'express';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	MOVEMENT_ANIMATIONS,
	DIRECTION_NAMES,
	MOVE_KINDS,
	PROJECTILE_MOVES,
	STAT_KINDS,
	STAT_MIN,
	STAT_MAX,
	DEFAULT_STAT,
	COMPOUND_COLORS,
	DEFAULT_COLOR,
	LABEL_MAX_LENGTH,
	RENDER_SCALE_MIN,
	RENDER_SCALE_MAX,
	type CharacterDefinition
} from '@3xl/shared/types/character-definition.type';
// The registry is derived from these definitions, so a rename has to rewrite it.
import { regenerateRegistry } from '@3xl/mugen/registry';
import { asyncHandler, httpError } from '../http-error';
import { upsertTemplateName } from './character-templates';

/**
 * Read/write API for character definitions stored as JSON in the @3xl/data
 * package under `public/characters/<id>/definition.json` (served to the admin
 * app at `/data/characters/<id>/definition.json`). The admin `/characters`
 * editor calls this to persist animation bindings and move params straight
 * into the git tree.
 *
 * `PUT /:id/label` is the one write that reaches past the JSON: a display name is
 * mirrored in the generated registry and in Supabase, so renaming updates all
 * three (see the route).
 *
 * `DELETE /:id/frames/:animation/:index` writes another file entirely — the decoded
 * manifest in @3xl/assets, which is where a character's frames are described (a
 * definition only names animations). See the route.
 *
 * Was `src/routes/api/characters/[id]/+server.ts` in the frontend; extracted
 * here so the admin app can stay a pure static SPA.
 */

// Definitions live in the @3xl/data package's public/ dir. Resolve from this
// file's location (packages/backend/src/routes → packages/data/...) so it works
// regardless of the process cwd.
const DEFINITIONS_DIR = fileURLToPath(
	new URL('../../../data/public/characters', import.meta.url)
);

// Decoded frames + manifest live in the @3xl/assets package (served at /assets).
// Mirrors @3xl/mugen's generate-sprites output dir.
const ASSETS_DIR = fileURLToPath(new URL('../../../assets/public', import.meta.url));

// Ids map 1:1 to per-character folders; constrain them so a crafted id can't
// escape the directory (no dots, slashes or separators).
const ID_PATTERN = /^[a-z0-9-]+$/;

function definitionPath(id: string): string {
	if (!ID_PATTERN.test(id)) httpError(400, `Invalid character id: ${id}`);
	return resolve(DEFINITIONS_DIR, id, 'definition.json');
}

/**
 * Just enough of the decoded manifest to take a frame out of it — everything else
 * it holds (name, author, portraits) is carried from the parse to the write
 * untouched. The full shape is declared in @3xl/shared beside the renderers that
 * read it, but that module is browser code (PixiJS, DOM lib), so this server keeps
 * its own view of the fields it touches, as @3xl/shared's own non-renderer readers
 * do (see `utils/card/texture-cache`).
 */
interface FrameManifest {
	animations?: Record<string, { frames: unknown[] } | undefined>;
}

function manifestPath(id: string): string {
	if (!ID_PATTERN.test(id)) httpError(400, `Invalid character id: ${id}`);
	return resolve(ASSETS_DIR, id, 'frames', 'manifest.json');
}

/** Narrow unknown parsed JSON to a CharacterDefinition, throwing 400 on gaps. */
function validate(id: string, body: unknown): CharacterDefinition {
	const def = body as Partial<CharacterDefinition>;
	if (!def || typeof def !== 'object') httpError(400, 'Body must be an object');
	if (def.id !== id) httpError(400, `Body id "${def.id}" does not match "${id}"`);
	if (typeof def.label !== 'string' || typeof def.basePath !== 'string') {
		httpError(400, 'Missing label or basePath');
	}

	// Reconstruct each slot to its canonical shape so unknown fields (e.g. the
	// removed damage/range/cooldown) can never leak back into the git tree.
	const source = def.animations ?? ({} as CharacterDefinition['animations']);
	const animations = {} as CharacterDefinition['animations'];
	for (const name of MOVEMENT_ANIMATIONS) {
		const binding = source[name];
		if (!binding || typeof binding.source !== 'string' || typeof binding.loop !== 'boolean') {
			httpError(400, `Invalid animation binding for "${name}"`);
		}
		animations[name] = { source: binding.source, loop: binding.loop };
	}

	const directionSource = def.directions ?? ({} as CharacterDefinition['directions']);
	const directions = {} as CharacterDefinition['directions'];
	for (const name of DIRECTION_NAMES) {
		const binding = directionSource[name];
		if (!binding || typeof binding.source !== 'string' || typeof binding.loop !== 'boolean') {
			httpError(400, `Invalid direction binding for "${name}"`);
		}
		directions[name] = { source: binding.source, loop: binding.loop };
	}

	// Moves are a per-character list: each entry tags a raw animation with one of
	// the shared move types and names it. Projectile-firing types carry their
	// projectile binding inline; it's stripped from any other type.
	if (!Array.isArray(def.moves)) httpError(400, 'Moves must be an array');
	const moves: CharacterDefinition['moves'] = def.moves.map((move, index) => {
		if (
			!move ||
			typeof move.name !== 'string' ||
			typeof move.source !== 'string' ||
			!MOVE_KINDS.includes(move.type)
		) {
			httpError(400, `Invalid move at index ${index}`);
		}
		const clean: CharacterDefinition['moves'][number] = {
			name: move.name,
			type: move.type,
			source: move.source
		};
		if (PROJECTILE_MOVES.includes(move.type)) {
			const projectile = move.projectile;
			if (
				projectile &&
				(typeof projectile.source !== 'string' || typeof projectile.loop !== 'boolean')
			) {
				httpError(400, `Invalid projectile binding for move at index ${index}`);
			}
			clean.projectile = projectile
				? { source: projectile.source, loop: projectile.loop }
				: { source: '', loop: true };
		}
		return clean;
	});

	// Stats are new: definitions authored before this field default to DEFAULT_STAT
	// rather than failing validation. Values are coerced to integers and clamped
	// to [STAT_MIN, STAT_MAX] so a crafted body can't store out-of-range stats.
	const statSource = def.stats ?? ({} as CharacterDefinition['stats']);
	const stats = {} as CharacterDefinition['stats'];
	for (const kind of STAT_KINDS) {
		const raw = statSource[kind];
		const value = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : DEFAULT_STAT;
		stats[kind] = Math.min(STAT_MAX, Math.max(STAT_MIN, value));
	}

	// Like stats, the combat color postdates older definitions: unknown or
	// missing values fall back to DEFAULT_COLOR rather than failing validation.
	const color = COMPOUND_COLORS.includes(def.color!) ? def.color! : DEFAULT_COLOR;

	// Optional chosen portrait: a bare group-9000 sprite filename from the
	// manifest (`spr_9000_1.png`). Constrained to that shape so a crafted body
	// can't smuggle a path; anything else (or absent) drops the field, leaving the
	// board on the manifest's default face.
	const face =
		typeof def.face === 'string' && /^spr_9000_\d+\.png$/.test(def.face) ? def.face : undefined;

	// The square framed on that portrait, in its own pixels. The sprite's size
	// isn't known here (it lives in the assets manifest), so this only enforces
	// whole non-negative pixels and a real side; consumers clamp it to the image.
	const rawCrop = def.faceCrop;
	const faceCrop =
		face &&
		rawCrop &&
		[rawCrop.x, rawCrop.y, rawCrop.size].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
		rawCrop.size >= 1
			? {
					x: Math.max(0, Math.round(rawCrop.x)),
					y: Math.max(0, Math.round(rawCrop.y)),
					size: Math.round(rawCrop.size)
				}
			: undefined;

	// How much bigger than its own pixels this character's sheet is drawn — a
	// correction for sets whose art is drawn at another scale than the roster's (see
	// the type). Authored in the JSON rather than in this editor, so the job here is
	// to carry it through a save untouched: everything this function does not name is
	// dropped, and a definition that lost its scale on an unrelated edit would put
	// that character back to standing a head short of its own castmates. Held to the
	// authored range so a hand-typed 40 can't reach the renderers.
	const rawScale = def.renderScale;
	const renderScale =
		typeof rawScale === 'number' &&
		Number.isFinite(rawScale) &&
		rawScale >= RENDER_SCALE_MIN &&
		rawScale <= RENDER_SCALE_MAX
			? rawScale
			: undefined;

	const result: CharacterDefinition = {
		id,
		label: def.label,
		basePath: def.basePath,
		animations,
		directions,
		moves,
		stats,
		color
	};
	if (face) result.face = face;
	if (faceCrop) result.faceCrop = faceCrop;
	if (renderScale !== undefined) result.renderScale = renderScale;
	return result;
}

export const charactersRouter = Router();

charactersRouter.get(
	'/:id',
	asyncHandler(async (req, res) => {
		const id = String(req.params.id);
		const path = definitionPath(id);
		try {
			const raw = await readFile(path, 'utf-8');
			res.json(JSON.parse(raw) as CharacterDefinition);
		} catch {
			httpError(404, `No definition for "${id}"`);
		}
	})
);

charactersRouter.post(
	'/:id',
	asyncHandler(async (req, res) => {
		const id = String(req.params.id);
		const definition = validate(id, req.body);
		// Pretty-print with tabs to match the checked-in JSON style and keep diffs
		// readable when these files land in git.
		await writeFile(definitionPath(id), JSON.stringify(definition, null, '\t') + '\n', 'utf-8');
		res.json(definition);
	})
);

// Rename one character. Body: { label: string }.
//
// A display name is the one field of a definition that is also mirrored
// elsewhere, so a rename is three writes and is only done when all three land:
// the definition JSON it is authored in, @3xl/data's generated registry (derived
// from every definition — and what the apps and the Supabase sync both read the
// name from, so leaving it stale would put the old name back on the next sync),
// and the character's `character_templates` row.
charactersRouter.put(
	'/:id/label',
	asyncHandler(async (req, res) => {
		const id = String(req.params.id);
		const path = definitionPath(id);

		const raw = (req.body as { label?: unknown }).label;
		if (typeof raw !== 'string') httpError(400, 'Body must be { label: string }');
		const label = (raw as string).trim();
		if (!label) httpError(400, 'Label cannot be empty');
		if (label.length > LABEL_MAX_LENGTH) {
			httpError(400, `Label cannot be longer than ${LABEL_MAX_LENGTH} characters`);
		}

		let current: unknown;
		try {
			current = JSON.parse(await readFile(path, 'utf-8'));
		} catch {
			httpError(404, `No definition for "${id}"`);
		}

		// Run the whole definition back through validate() so a rename writes the
		// same canonical shape a full save does.
		const definition = validate(id, { ...(current as CharacterDefinition), label });
		await writeFile(path, JSON.stringify(definition, null, '\t') + '\n', 'utf-8');
		await upsertTemplateName(id, label);
		res.json(definition);

		// Last, and deliberately after the response: the registry is a module this
		// server itself imports (via @3xl/data), so rewriting it makes `tsx watch`
		// restart the process — which is how the restarted server picks the new name
		// up, but would also kill this request if anything still had to happen. By
		// here nothing does.
		regenerateRegistry();
	})
);

// Drop one frame from one animation. `:index` is that frame's position in the
// animation, as the frames view numbers its filmstrip cells.
//
// Frames are not part of a definition — they are described in the decoded manifest
// the MUGEN import writes into @3xl/assets, so this is the file that gets rewritten
// (which is also what the game reads, so a frame removed here is gone from every
// renderer). Two things it deliberately does not do:
//
//   - Delete the frame's PNG. MUGEN animations reuse sprites freely, so the file
//     may still be another animation's frame; a stale PNG costs nothing, a missing
//     one breaks a loop.
//   - Empty an animation. Definitions bind slots by animation name, so a frameless
//     entry would leave a bound slot with nothing to draw — the last frame of an
//     animation is refused rather than removed.
//
// The manifest is generated: `pnpm generate:sprites <id>` re-decodes it from the raw
// archive and so puts back everything removed here.
charactersRouter.delete(
	'/:id/frames/:animation/:index',
	asyncHandler(async (req, res) => {
		const id = String(req.params.id);
		const animationName = String(req.params.animation);
		const path = manifestPath(id);

		let raw: unknown;
		try {
			raw = JSON.parse(await readFile(path, 'utf-8'));
		} catch {
			httpError(404, `No manifest for "${id}"`);
		}
		const manifest = raw as FrameManifest;

		// Only ever read as an object key, never as a path — existence is the check.
		const animation = manifest.animations?.[animationName];
		if (!animation || !Array.isArray(animation.frames)) {
			httpError(404, `No animation "${animationName}" in "${id}"`);
		}

		const frames = animation.frames;
		const index = Number(req.params.index);
		if (!Number.isInteger(index) || index < 0 || index >= frames.length) {
			httpError(400, `No frame ${req.params.index} in "${animationName}"`);
		}
		if (frames.length < 2) {
			httpError(400, `"${animationName}" has one frame left; an animation cannot be emptied`);
		}

		const [removed] = frames.splice(index, 1);
		// 2-space JSON, no trailing newline: the shape generate-sprites writes, so an
		// edit here and a re-decode produce the same diff-able file.
		await writeFile(path, JSON.stringify(manifest, null, 2), 'utf-8');

		res.json({ animation: animationName, removed, frames: frames.length });
	})
);
