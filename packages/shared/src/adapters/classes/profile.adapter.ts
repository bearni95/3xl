import { AdapterClass } from './adapter.class';
import type { Profile } from '../../types/profile.type';
import { levelForExp } from '../../utils/progression/level';

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

	/**
	 * Transform a Supabase auth user into the internal {@link Profile} model.
	 *
	 * Experience lives in a separate `player_profiles` table, not on the auth
	 * user, so it isn't available here — `exp` defaults to 0 (level 1). The auth
	 * service overlays the loaded total via {@link withExp} once it has fetched it.
	 */
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
			lastSignInAt: user.last_sign_in_at ?? null,
			exp: 0,
			level: levelForExp(0)
		};
	}

	/**
	 * Return a copy of `profile` with its experience set to `exp` and its level
	 * recomputed from it. Used by the auth service to fold the loaded (or freshly
	 * incremented) `player_profiles` total into the profile view model.
	 */
	withExp(profile: Profile, exp: number): Profile {
		const total = Number.isFinite(exp) && exp > 0 ? Math.trunc(exp) : 0;
		return { ...profile, exp: total, level: levelForExp(total) };
	}
}

export const profileAdapter = new ProfileAdapter();
