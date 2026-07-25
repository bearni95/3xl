import { error, json } from '@sveltejs/kit';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RequestHandler } from './$types';
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
	type CharacterDefinition
} from '$types/character-definition.type';

/**
 * Read/write API for character definitions stored as JSON in the @3xl/data
 * package under `public/characters/<id>.json` (served to the client at
 * `/data/characters/<id>.json`). The /admin/characters editor calls this to
 * persist animation bindings and move params straight into the git tree.
 *
 * This runs only under `vite dev` — the production build uses adapter-static and
 * has no server — which is the intended authoring flow (edit in dev, commit the
 * resulting JSON). `prerender = false` keeps the static build from touching it.
 * The path is resolved relative to the frontend package cwd (where vite dev runs).
 */
export const prerender = false;

// Definitions live in the sibling @3xl/data package's public/ dir.
const DEFINITIONS_DIR = resolve('../data/public/characters');

// Ids map 1:1 to filenames; constrain them so a crafted id can't escape the
// directory (no dots, slashes or separators).
const ID_PATTERN = /^[a-z0-9-]+$/;

function definitionPath(id: string): string {
	if (!ID_PATTERN.test(id)) throw error(400, `Invalid character id: ${id}`);
	return resolve(DEFINITIONS_DIR, `${id}.json`);
}

/** Narrow unknown parsed JSON to a CharacterDefinition, throwing 400 on gaps. */
function validate(id: string, body: unknown): CharacterDefinition {
	const def = body as Partial<CharacterDefinition>;
	if (!def || typeof def !== 'object') throw error(400, 'Body must be an object');
	if (def.id !== id) throw error(400, `Body id "${def.id}" does not match "${id}"`);
	if (typeof def.label !== 'string' || typeof def.basePath !== 'string') {
		throw error(400, 'Missing label or basePath');
	}

	// Reconstruct each slot to its canonical shape so unknown fields (e.g. the
	// removed damage/range/cooldown) can never leak back into the git tree.
	const source = def.animations ?? ({} as CharacterDefinition['animations']);
	const animations = {} as CharacterDefinition['animations'];
	for (const name of MOVEMENT_ANIMATIONS) {
		const binding = source[name];
		if (!binding || typeof binding.source !== 'string' || typeof binding.loop !== 'boolean') {
			throw error(400, `Invalid animation binding for "${name}"`);
		}
		animations[name] = { source: binding.source, loop: binding.loop };
	}

	const directionSource = def.directions ?? ({} as CharacterDefinition['directions']);
	const directions = {} as CharacterDefinition['directions'];
	for (const name of DIRECTION_NAMES) {
		const binding = directionSource[name];
		if (!binding || typeof binding.source !== 'string' || typeof binding.loop !== 'boolean') {
			throw error(400, `Invalid direction binding for "${name}"`);
		}
		directions[name] = { source: binding.source, loop: binding.loop };
	}

	// Moves are a per-character list: each entry tags a raw animation with one of
	// the shared move types and names it. Projectile-firing types carry their
	// projectile binding inline; it's stripped from any other type.
	if (!Array.isArray(def.moves)) throw error(400, 'Moves must be an array');
	const moves: CharacterDefinition['moves'] = def.moves.map((move, index) => {
		if (
			!move ||
			typeof move.name !== 'string' ||
			typeof move.source !== 'string' ||
			!MOVE_KINDS.includes(move.type)
		) {
			throw error(400, `Invalid move at index ${index}`);
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
				throw error(400, `Invalid projectile binding for move at index ${index}`);
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

	return {
		id,
		label: def.label,
		basePath: def.basePath,
		animations,
		directions,
		moves,
		stats,
		color
	};
}

export const GET: RequestHandler = async ({ params }) => {
	const path = definitionPath(params.id!);
	try {
		const raw = await readFile(path, 'utf-8');
		return json(JSON.parse(raw) as CharacterDefinition);
	} catch {
		throw error(404, `No definition for "${params.id}"`);
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	const id = params.id!;
	const definition = validate(id, await request.json());
	// Pretty-print with tabs to match the checked-in JSON style and keep diffs
	// readable when these files land in git.
	await writeFile(definitionPath(id), JSON.stringify(definition, null, '\t') + '\n', 'utf-8');
	return json(definition);
};
