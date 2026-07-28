import { AdapterClass } from './adapter.class';
import { OAUTH_PROVIDERS, OAuthProvider, type Profile } from '../../types/profile.type';
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
	/** One entry per linked identity — `email` for the magic link, `google`/`discord` for OAuth. */
	identities?: ReadonlyArray<{ provider?: string | null }> | null;
	app_metadata?: {
		provider?: string | null;
		providers?: readonly string[] | null;
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
	 * Experience and the chosen avatar live in a separate `player_profiles` table,
	 * not on the auth user, so neither is available here — `exp` defaults to 0
	 * (level 1) and the avatar to none. The auth service overlays both via
	 * {@link withExp} / {@link withAvatar} once it has fetched the row.
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
			providers: this.socialProviders(user),
			exp: 0,
			level: levelForExp(0),
			avatarCharacterId: null
		};
	}

	/**
	 * The social providers linked to `user`, deduplicated and in report order.
	 * `identities` is the authoritative list (Supabase merges accounts that share
	 * a verified email onto one user, so there can be several); `app_metadata`
	 * is the fallback for sessions that were restored without them. Anything that
	 * isn't a provider the app offers — `email` above all — is dropped.
	 */
	private socialProviders(user: SupabaseUserLike): OAuthProvider[] {
		const raw = user.identities?.length
			? user.identities.map((identity) => identity?.provider)
			: (user.app_metadata?.providers ?? [user.app_metadata?.provider]);

		const known = new Set<string>(OAUTH_PROVIDERS);
		const seen = new Set<string>();
		return (raw ?? []).filter((provider): provider is OAuthProvider => {
			if (!provider || !known.has(provider) || seen.has(provider)) return false;
			seen.add(provider);
			return true;
		});
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

	/**
	 * Return a copy of `profile` wearing `characterId`'s portrait, or the
	 * initial-letter avatar when it is null/blank. Used by the auth service to
	 * fold in the stored `player_profiles.avatar_character_id`, and again after
	 * the player picks a new one.
	 */
	withAvatar(profile: Profile, characterId: string | null): Profile {
		const id = typeof characterId === 'string' && characterId.trim() ? characterId : null;
		return { ...profile, avatarCharacterId: id };
	}
}

export const profileAdapter = new ProfileAdapter();
