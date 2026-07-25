import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

/**
 * Lazily-created browser Supabase client, shared across the app.
 *
 * This is a pure SPA: the client talks to Supabase directly from the browser
 * using the public anon key (gated by Row Level Security, not secrecy). It is
 * created lazily so that a missing/empty config only surfaces when auth is
 * actually used, rather than crashing module load during build/prerender.
 */
let client: SupabaseClient | null = null;

/** Whether the Supabase environment variables are configured. */
export function isSupabaseConfigured(): boolean {
	return Boolean(env.PUBLIC_SUPABASE_URL && env.PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Returns the shared Supabase client, creating it on first use. Throws a
 * descriptive error when the environment is not configured so callers can show
 * a helpful message instead of a cryptic library failure.
 */
export function getSupabaseClient(): SupabaseClient {
	const url = env.PUBLIC_SUPABASE_URL;
	const key = env.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) {
		throw new Error(
			'Supabase is not configured. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in packages/frontend/.env'
		);
	}
	if (!client) {
		client = createClient(url, key, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				// Complete the magic-link flow when the user returns to the app.
				detectSessionInUrl: true
			}
		});
	}
	return client;
}
