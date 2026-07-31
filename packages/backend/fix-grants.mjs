// The helper functions the schema means to be uncallable really are now.
// `revoke all ... from public` does not touch the explicit grants Supabase's
// default privileges hand anon/authenticated, so the revoke in the .sql was a
// no-op. Delete after use.
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const ref = new URL(process.env.PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const client = new pg.Client({
	connectionString: `postgresql://postgres.${ref}:${encodeURIComponent(process.env.SUPABASE_DB_KEY)}@aws-0-${process.env.SUPABASE_DB_REGION}.pooler.supabase.com:5432/postgres`,
	ssl: { rejectUnauthorized: false }
});
await client.connect();

// Internal machinery, none of it called from the browser: the three the schema
// already meant to revoke, plus the evaluator itself. The two recursive ones
// take a tree straight from the caller, so leaving them executable lets an
// unauthenticated request post a large nested payload and have the database
// walk it -- work asked for by nobody who needs it.
const SIGS = [
	'public.achievement_player_cards(uuid)',
	'public.achievement_player_towns(uuid)',
	'public.daily_achievement_ids(uuid, date)',
	'public.achievement_formula_value(jsonb, int, jsonb, int, jsonb)',
	'public.achievement_condition_holds(jsonb, int, jsonb, int, jsonb)',
	'public.achievement_filter_matches(jsonb, jsonb)',
	'public.achievement_variable_values(jsonb, int, jsonb, int)',
	'public.achievement_daily_seed(uuid, date)',
	'public.pick_weighted(text[], numeric[], numeric)',
	'public.teammate_colors(text)'
];

await client.query('begin');
for (const sig of SIGS) {
	await client.query(`revoke all on function ${sig} from anon, authenticated, public`);
}
await client.query('commit');

const { rows } = await client.query(
	`select p.proname as f, coalesce(string_agg(distinct a.grantee, ','), 'none') as who
	 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
	 left join information_schema.routine_privileges a
	   on a.specific_name = p.proname || '_' || p.oid and a.grantee in ('anon','authenticated')
	 where n.nspname = 'public'
	   and p.proname in ('achievement_player_cards','achievement_player_towns','daily_achievement_ids',
	                     'achievement_formula_value','achievement_condition_holds','achievement_filter_matches',
	                     'achievement_variable_values','achievement_daily_seed','pick_weighted','teammate_colors')
	 group by p.proname order by p.proname`
);
console.log('\nclient execute grants after revoke:');
rows.forEach((r) => console.log(`  ${r.f.padEnd(28)} ${r.who}`));

await client.end();
