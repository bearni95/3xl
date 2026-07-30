import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type {
	Achievement,
	AchievementsCollection,
	AchievementSyncResult,
	AchievementTemplateRow
} from '@3xl/shared/types/achievement.type';
import {
	FormulaError,
	parseCondition,
	parseFormula,
	type ConditionNode,
	type FormulaNode
} from '@3xl/shared/utils/achievement/formula';
import { asyncHandler, httpError } from '../http-error';
import { getPool } from '../db';
import { ensureTables as ensureCoreSchema } from './show-templates';

/**
 * Read/sync API for achievements in Supabase, and the ledger of who holds them.
 *
 * Supabase holds no wording: a badge's glyph, name and description live in the local
 * @3xl/data `public/achievements.json` (see ./achievements) and are never pushed up,
 * so rewording a badge is one edit in the git tree and no row anywhere can disagree
 * with it. What Supabase *does* hold is each badge's **rule** — the requirement that
 * earns it — because awarding is a rule and rules are enforced where a browser
 * cannot edit them. `claim_achievements` walks that rule itself; see
 * ../../supabase/achievement_templates.sql.
 *
 * A requirement cannot be parsed in Postgres, so it is compiled here: the tree the
 * database walks is produced by the very parser the frontend uses
 * (`@3xl/shared/utils/achievement/formula`), and pushed alongside the source text it
 * came from. That source is what makes a stale rule visible — an id that exists on
 * both sides can now be out of date, which is what `mismatch` reports and what the
 * `updated` list of a sync names.
 *
 * The local collection is the source of truth. `GET /` reports the remote rows;
 * `POST /sync` makes the remote table mirror the local file (upsert every local id
 * with its compiled rule, delete remote ids that no longer exist locally).
 *
 * Deleting is the sync's one destructive act: `player_achievements` cascades off the
 * template, so removing an achievement locally and syncing takes every award of it
 * with it. That is the intended meaning of retiring a badge — a badge that no longer
 * exists cannot be held — and `removed` in the result names exactly which ids it
 * happened to.
 *
 * Mirrors ./character-templates: talks to Supabase's Postgres directly via ../db
 * (the DB password) so it can provision its own schema — no manual SQL step.
 */

// packages/backend/src/routes → packages/data. Same file as ./achievements writes.
const ACHIEVEMENTS_PATH = fileURLToPath(
	new URL('../../../data/public/achievements.json', import.meta.url)
);

// The schema and the RPCs, read off disk and executed rather than inlined here.
// Every other table in this project is provisioned from a TypeScript string with a
// reference .sql file kept beside it, but the achievement rule is evaluated in two
// places — that file and @3xl/shared's formula.ts — and two copies of an awarding
// rule that drift apart pay out badges nobody earned. One file, read at run time, is
// what lets the two evaluators be read side by side.
const SCHEMA_PATH = fileURLToPath(new URL('../../supabase/achievement_templates.sql', import.meta.url));

/**
 * Provision the achievement schema (tables, RLS, the evaluator, the daily pick and
 * `claim_achievements`) exactly once per process, lazily on first use. The core
 * schema goes first: the RPCs read `character_spawns` and `player_profiles` and call
 * `level_for_exp` / `level_span_exp`, all of which ./show-templates owns.
 */
let ensured: Promise<void> | null = null;
function ensureTables(): Promise<void> {
	if (!ensured) {
		ensured = ensureCoreSchema()
			.then(() => readFile(SCHEMA_PATH, 'utf-8'))
			.then((sql) => getPool().query(sql))
			.then(() => undefined)
			.catch((error: unknown) => {
				// Reset so a transient failure (e.g. bad password) can be retried on the
				// next request instead of being cached forever.
				ensured = null;
				const message = error instanceof Error ? error.message : String(error);
				httpError(502, `Supabase DB connection failed: ${message}`);
			});
	}
	return ensured;
}

/** One local badge, with its rule compiled into what the database walks. */
interface CompiledTemplate {
	id: string;
	/** The requirement as authored, or null when the badge has none. */
	requirement: string | null;
	/** The parsed condition, or null. */
	tree: ConditionNode | null;
	/** Each variable's parsed formula by name, or null when the badge declares none. */
	variables: Record<string, FormulaNode> | null;
}

/**
 * Compile one achievement's rule. A badge with no requirement compiles to nulls —
 * which is a badge that is never set as one of a player's three and can never be
 * claimed, and is exactly what most badges are until somebody writes a rule for one.
 *
 * A requirement that will not parse is a hard error rather than a skipped row: the
 * write API refuses to store one, so a file holding one has been hand-edited, and
 * silently syncing the badge with no rule would make it quietly unclaimable.
 */
function compile(achievement: Achievement): CompiledTemplate {
	const names = (achievement.variables ?? []).map((variable) => variable.name);
	const requirement = achievement.requirement?.trim() || null;
	let variables: Record<string, FormulaNode> | null = null;
	if (achievement.variables?.length) {
		variables = {};
		for (const variable of achievement.variables) {
			try {
				variables[variable.name] = parseFormula(variable.formula);
			} catch (error) {
				httpError(
					400,
					`Achievement "${achievement.id}": variable "${variable.name}" — ${
						error instanceof FormulaError ? error.message : String(error)
					}`
				);
			}
		}
	}
	let tree: ConditionNode | null = null;
	if (requirement) {
		try {
			tree = parseCondition(requirement, names);
		} catch (error) {
			httpError(
				400,
				`Achievement "${achievement.id}": requirement — ${
					error instanceof FormulaError ? error.message : String(error)
				}`
			);
		}
	}
	return { id: achievement.id, requirement, tree, variables };
}

/** The local collection, compiled and sorted by id — everything Supabase should hold. */
async function localTemplates(): Promise<CompiledTemplate[]> {
	let collection: AchievementsCollection;
	try {
		collection = JSON.parse(await readFile(ACHIEVEMENTS_PATH, 'utf-8')) as AchievementsCollection;
	} catch {
		return [];
	}
	return (collection?.achievements ?? [])
		.map(compile)
		.sort((a, b) => a.id.localeCompare(b.id));
}

/** The remote rows: the id and the requirement the compiled tree was made from. */
async function fetchRemote(): Promise<AchievementTemplateRow[]> {
	await ensureTables();
	const { rows } = await getPool().query<{ id: string; requirement: string | null }>(
		'select id, requirement from achievement_templates order by id'
	);
	return rows.map((row) => ({ id: row.id, requirement: row.requirement }));
}

export const achievementTemplatesRouter = Router();

// The remote rows, for the admin to compare against the local collection.
achievementTemplatesRouter.get(
	'/',
	asyncHandler(async (_req, res) => {
		res.json({ templates: await fetchRemote() });
	})
);

// How many players hold each achievement, keyed by id — the one thing about a
// badge that only Supabase can answer, and what makes deleting one legible
// before the sync does it.
achievementTemplatesRouter.get(
	'/holders',
	asyncHandler(async (_req, res) => {
		await ensureTables();
		const { rows } = await getPool().query<{ achievement_id: string; holders: string }>(
			'select achievement_id, count(*) as holders from player_achievements group by achievement_id'
		);
		const holders: Record<string, number> = {};
		for (const row of rows) holders[row.achievement_id] = Number(row.holders);
		res.json({ holders });
	})
);

// Mirror the local collection into Supabase: upsert every local id with its compiled
// rule, then delete any remote id that no longer exists locally (taking its awards
// with it). Idempotent — running it with nothing to change reports all-zero counts.
achievementTemplatesRouter.post(
	'/sync',
	asyncHandler(async (_req, res) => {
		const pool = getPool();
		const local = await localTemplates();
		const before = await fetchRemote();

		const beforeById = new Map(before.map((row) => [row.id, row]));
		const localSet = new Set(local.map((template) => template.id));
		const added = local.filter((template) => !beforeById.has(template.id)).map((t) => t.id);
		// The rule is the one thing up there that can go stale, so a row already
		// present is "updated" when the requirement it was compiled from has changed.
		const updated = local
			.filter((template) => {
				const remote = beforeById.get(template.id);
				return remote !== undefined && (remote.requirement ?? null) !== template.requirement;
			})
			.map((template) => template.id);
		const removed = before.filter((row) => !localSet.has(row.id)).map((row) => row.id);

		// One statement for the whole collection: four parallel arrays unnested into
		// rows. `do update` unconditionally rewrites the rule — cheaper than comparing
		// trees in SQL, and the row carries nothing else that could be lost.
		if (local.length > 0) {
			await pool.query(
				`insert into achievement_templates (id, requirement, requirement_tree, variables)
				 select * from unnest(
					 $1::text[],
					 $2::text[],
					 $3::jsonb[],
					 $4::jsonb[]
				 )
				 on conflict (id) do update set
					 requirement = excluded.requirement,
					 requirement_tree = excluded.requirement_tree,
					 variables = excluded.variables,
					 updated_at = now()`,
				[
					local.map((template) => template.id),
					local.map((template) => template.requirement),
					local.map((template) => (template.tree ? JSON.stringify(template.tree) : null)),
					local.map((template) => (template.variables ? JSON.stringify(template.variables) : null))
				]
			);
		}
		if (removed.length > 0) {
			await pool.query('delete from achievement_templates where id = any($1::text[])', [removed]);
		}

		const result: AchievementSyncResult = {
			ids: (await fetchRemote()).map((row) => row.id),
			added,
			updated,
			removed
		};
		res.json(result);
	})
);
