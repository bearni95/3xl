import { AdapterClass } from './adapter.class';
import type { SpawnColor } from '../../types/character-spawn.type';
import { OAUTH_PROVIDERS, OAuthProvider, type Profile } from '../../types/profile.type';
import { levelForExp } from '../../utils/progression/level';
import { isSpawnColor } from '../../utils/spawn/color';

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
	// `user_metadata` is deliberately absent: it is where Google and Discord stamp
	// the `full_name` / `name` they hold for the account, and where any client
	// holding the anon key can write whatever it likes through `updateUser`. Neither
	// is a username, so this adapter is not given the means to read one from there.
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
	 * The username, the experience and the chosen avatar all live in a separate
	 * `player_profiles` row, not on the auth user, so none of them is available
	 * here — the account reads as nameless, at exp 0 (level 1), on the letter
	 * avatar. The auth service overlays all three via {@link withUsername} /
	 * {@link withExp} / {@link withAvatar} once it has fetched the row.
	 *
	 * A signed-in user is therefore *only* an id, an address and how they got here.
	 * That is the point: there is nothing on this object a name could be quietly
	 * derived from, so no sign-in method can hand an account a name it never chose.
	 */
	fromSupabaseUser(user: SupabaseUserLike): Profile {
		return {
			id: user.id,
			email: user.email ?? '',
			username: null,
			createdAt: user.created_at ?? null,
			lastSignInAt: user.last_sign_in_at ?? null,
			providers: this.socialProviders(user),
			exp: 0,
			level: levelForExp(0),
			avatarCharacterId: null,
			avatarColor: null
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
	 * Return a copy of `profile` wearing the username stored for it, or nameless
	 * when the stored value is null/blank. Used by the auth service to fold in
	 * `player_profiles.username`, and again after the player sets or clears it.
	 *
	 * This is the *only* way a Profile ever acquires a name, and its one caller
	 * passes it nothing but that column — which in turn is written only by the
	 * `set_player_username` RPC.
	 */
	withUsername(profile: Profile, username: string | null): Profile {
		const name = typeof username === 'string' ? username.trim() : '';
		return { ...profile, username: name || null };
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
	 * Return a copy of `profile` wearing the avatar `characterId` shows in `color`,
	 * or the initial-letter avatar when either half is missing. Used by the auth
	 * service to fold in the stored `player_profiles.avatar_character_id` /
	 * `avatar_color`, and again after the player picks another.
	 *
	 * The two halves are set and cleared together on purpose: an avatar *is* the
	 * pair (see `player-avatar.type`), so half of one is not a lesser avatar, it is
	 * none.
	 * A character with no colour — every avatar worn before they became items — is
	 * therefore read as no avatar at all, which is exactly what the database now
	 * says about it.
	 */
	withAvatar(profile: Profile, characterId: string | null, color: SpawnColor | null): Profile {
		const id = typeof characterId === 'string' && characterId.trim() ? characterId : null;
		const worn = id && isSpawnColor(color) ? color : null;
		return {
			...profile,
			avatarCharacterId: worn ? id : null,
			avatarColor: worn
		};
	}
}

export const profileAdapter = new ProfileAdapter();
