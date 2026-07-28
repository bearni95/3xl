// Apply a .sql file from packages/backend/supabase/ to the project's Supabase,
// using the same connection the authoring API uses (PUBLIC_SUPABASE_URL +
// SUPABASE_DB_KEY from the repo-root .env).
//
//   pnpm --filter @3xl/backend exec tsx scripts/apply-sql.mts supabase/<file>.sql
//
// Dev/authoring only, like the rest of @3xl/backend. The file is run as a single
// statement batch inside one transaction: it either all applies or none of it does.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { getPool } from '../src/db.js';

config({ path: resolve(import.meta.dirname, '../../../.env') });

const target = process.argv[2];
if (!target) {
	console.error('usage: tsx scripts/apply-sql.mts <path-to.sql>');
	process.exit(1);
}

const path = resolve(process.cwd(), target);
const sql = await readFile(path, 'utf8');
const pool = getPool();
const client = await pool.connect();
try {
	await client.query('begin');
	await client.query(sql);
	await client.query('commit');
	console.log(`applied ${path}`);
} catch (error) {
	await client.query('rollback');
	throw error;
} finally {
	client.release();
	await pool.end();
}
