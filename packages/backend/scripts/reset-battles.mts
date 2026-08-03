// Wipe everything fighting has written to Supabase, so the map goes back to the
// day it was opened: every town on its seeded OG team, nobody holding anything,
// no fight open, no cooldown standing, no experience banked.
//
//   pnpm reset:battles             # the lot, experience included
//   pnpm reset:battles --keep-exp  # territory and fights only; levels stay
//   pnpm reset:battles --dry-run   # count what would go, then roll it back
//
// Dev/authoring only, like the rest of @3xl/backend: it connects with the DB
// password (PUBLIC_SUPABASE_URL + SUPABASE_DB_KEY from the repo-root .env) and
// runs against the live project. It is not reversible.
//
// What it clears, and why each one has to go with the others:
//
//   * `municipality_holders` — the whole point. A town with no row here is a town
//     the map draws on `municipality-team`'s seed, which is what "clear slate"
//     means: nothing stored, everyone seeing the same house team again.
//   * `municipality_sieges` — a challenger's wins banked against a holder
//     generation. Left behind they would count towards taking a town off a team
//     that no longer sits there.
//   * `municipality_challenges` — the per-town hour. A cooldown outliving the
//     fight that started it just shuts towns nobody has fought.
//   * `battles` — the one open fight per player. Left behind it is unreportable
//     (its town's generation is gone) and blocks the player from starting any
//     other.
//   * `combat_results` — the audit trail behind every award. Keeping it while the
//     territory it describes is gone leaves a ledger of fights over towns nobody
//     ever took.
//   * `player_profiles.exp` — back to 0, since combat is the only thing that ever
//     raises it and its whole record is being deleted above. `--keep-exp` leaves
//     levels standing for when what is wanted is a fresh map rather than fresh
//     accounts.
//
// Nothing else is touched: claimed cards (`character_spawns`, team slots
// included), boosters, avatars, usernames and legal acceptances all survive — a
// player keeps their roster and walks back onto an untaken map with it.
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { getPool } from '../src/db.js';

config({ path: resolve(import.meta.dirname, '../../../.env') });

const keepExp = process.argv.includes('--keep-exp');
// A dry run does the whole thing and rolls it back, so the counts it prints are
// the real ones rather than a second query's guess at them.
const dryRun = process.argv.includes('--dry-run');

/** The tables emptied outright, in the order they are reported. */
const TABLES = [
	'municipality_holders',
	'municipality_sieges',
	'municipality_challenges',
	'battles',
	'combat_results'
] as const;

const pool = getPool();
const client = await pool.connect();
try {
	await client.query('begin');

	const cleared: string[] = [];
	for (const table of TABLES) {
		const { rowCount } = await client.query(`delete from public.${table}`);
		cleared.push(`  ${table}: ${rowCount ?? 0}`);
	}

	if (keepExp) {
		cleared.push('  player_profiles.exp: kept (--keep-exp)');
	} else {
		const { rowCount } = await client.query(
			'update public.player_profiles set exp = 0, updated_at = now() where exp <> 0'
		);
		cleared.push(`  player_profiles.exp zeroed: ${rowCount ?? 0}`);
	}

	await client.query(dryRun ? 'rollback' : 'commit');
	console.log(dryRun ? 'battle state that WOULD be cleared:' : 'battle state cleared:');
	console.log(cleared.join('\n'));
	console.log(
		dryRun
			? 'dry run — nothing was written.'
			: 'every municipality is back on its seeded team.'
	);
} catch (error) {
	await client.query('rollback');
	throw error;
} finally {
	client.release();
	await pool.end();
}
