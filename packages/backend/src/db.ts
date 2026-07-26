import { Pool } from 'pg';
import { httpError } from './http-error';

/**
 * Direct Postgres connection to the Supabase database, for the authoring
 * backend only.
 *
 * We connect straight to Postgres (not the Supabase REST API), authenticating
 * with the database password — that is what `SUPABASE_DB_KEY` holds. Supabase
 * has removed the IPv4 direct-connection host (`db.<ref>.supabase.co`) for most
 * projects, so the connection string is resolved in this order:
 *
 *   1. `SUPABASE_DB_URL` — a full connection string, used verbatim.
 *   2. `SUPABASE_DB_REGION` — build the connection-pooler URL for that AWS
 *      region: `postgres.<ref>` @ `aws-0-<region>.pooler.supabase.com:5432`
 *      (session mode). The project ref and password come from the env below.
 *   3. Fallback: the legacy direct host `db.<ref>.supabase.co:5432` (only works
 *      on IPv6-capable networks / older projects).
 *
 * The ref and (for the pooler) password come from `PUBLIC_SUPABASE_URL` and
 * `SUPABASE_DB_KEY`. All of this stays server-side; the pool is created lazily
 * so a missing config only fails the endpoints that need the DB (with a 503),
 * not server startup.
 */
let pool: Pool | null = null;

/** Build the Postgres connection string from the env, or null if unconfigured. */
function connectionString(): string | null {
	// An explicit full URL wins — lets you paste the pooler URL verbatim.
	if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;

	const url = process.env.PUBLIC_SUPABASE_URL;
	const password = process.env.SUPABASE_DB_KEY;
	if (!url || !password) return null;

	const ref = new URL(url).hostname.split('.')[0];
	const encoded = encodeURIComponent(password);

	// Connection pooler (the supported path): user is tenant-scoped `postgres.<ref>`,
	// host is region-specific, session mode on 5432 for full compatibility.
	const region = process.env.SUPABASE_DB_REGION;
	if (region) {
		return `postgresql://postgres.${ref}:${encoded}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
	}

	// Legacy direct host — kept as a fallback; resolves only on some networks.
	return `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`;
}

/** Whether the database connection is configured. */
export function isDbConfigured(): boolean {
	return connectionString() !== null;
}

/**
 * Returns the shared connection pool, creating it on first use. Throws a 503
 * HttpError (rendered as `{ message }`) when the environment is not configured,
 * so the admin app shows a helpful message.
 */
export function getPool(): Pool {
	const connectionStr = connectionString();
	if (!connectionStr) {
		httpError(
			503,
			'Supabase DB is not configured on the backend. Set PUBLIC_SUPABASE_URL and SUPABASE_DB_KEY (the database password) in the repo-root .env'
		);
	}
	if (!pool) {
		// Supabase requires TLS; it presents a cert chain node doesn't bundle, so
		// don't verify it (we're only ever talking to Supabase here).
		pool = new Pool({ connectionString: connectionStr, ssl: { rejectUnauthorized: false }, max: 4 });
	}
	return pool;
}
