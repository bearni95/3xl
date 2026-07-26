import { AdapterClass } from './adapter.class';
import type { Profile } from '../../types/profile.type';

/**
 * Minimal structural shape of a Supabase auth user. Declared here (rather than
 * importing from `@supabase/supabase-js`) so the shared package stays free of
 * the frontend's runtime dependencies.
 */
export interface SupabaseUserLike {
	id: string;
	email?: string | null;
	created_at?: string | null;
	last_sign_in_at?: string | null;
	user_metadata?: {
		full_name?: string | null;
		name?: string | null;
		[key: string]: unknown;
	} | null;
}

export class ProfileAdapter extends AdapterClass {
	constructor() {
		super('profile');
	}

	/** Transform a Supabase auth user into the internal {@link Profile} model. */
	fromSupabaseUser(user: SupabaseUserLike): Profile {
		const email = user.email ?? '';
		// The chosen username, or null when the account has never set one. Unlike
		// the display name, this is not backfilled from the email — an empty
		// username is what triggers the first-login prompt.
		const rawName = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? '')?.trim();
		const username = rawName || null;

		return {
			id: user.id,
			email,
			username,
			displayName: username || email.split('@')[0] || 'Account',
			createdAt: user.created_at ?? null,
			lastSignInAt: user.last_sign_in_at ?? null
		};
	}
}

export const profileAdapter = new ProfileAdapter();
