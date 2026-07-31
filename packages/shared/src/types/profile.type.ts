import type { SpawnColor } from './character-spawn.type';
import type { ID } from './core.type';

/** Authentication lifecycle state for the current visitor. */
export enum AuthStatus {
	/** Still restoring the session from storage / resolving the magic link. */
	Loading = 'loading',
	/** No active session — the visitor is a guest. */
	SignedOut = 'signed-out',
	/** An active session exists. */
	SignedIn = 'signed-in'
}

/**
 * Third-party identity providers the game can sign in with, alongside the
 * passwordless email link. The values are Supabase's own provider ids — they go
 * straight into `signInWithOAuth({ provider })` — and each one must also be
 * enabled, with its client id/secret, in the Supabase dashboard.
 */
export enum OAuthProvider {
	Google = 'google',
	Discord = 'discord'
}

/** The providers offered on the sign-in panel, in the order they are shown. */
export const OAUTH_PROVIDERS: readonly OAuthProvider[] = [
	OAuthProvider.Google,
	OAuthProvider.Discord
];

/**
 * How each provider is named on screen. Brand names are not translated — they
 * read the same in every locale.
 */
export const OAUTH_PROVIDER_NAMES: Record<OAuthProvider, string> = {
	[OAuthProvider.Google]: 'Google',
	[OAuthProvider.Discord]: 'Discord'
};

/** Normalised view model of the signed-in account, decoupled from Supabase. */
export interface Profile {
	id: ID;
	email: string;
	/**
	 * The username the player typed, or `null` when they never have — which is a
	 * resting state, not a gap for the app to fill in. It is stored in exactly one
	 * place, `player_profiles.username`, unique across the game and writable only
	 * through the `set_player_username` RPC; nothing about how the account signs in
	 * (the name Google or Discord supplies, the email address) is ever written to it
	 * or shown in its place. Clearing it returns the account to nameless.
	 *
	 * This is the only name a Profile carries — where a screen needs something to
	 * print for a nameless account, that placeholder is the screen's own wording and
	 * is never stored.
	 */
	username: string | null;
	/** ISO timestamp the account was created, if known. */
	createdAt: string | null;
	/** ISO timestamp of the most recent sign-in, if known. */
	lastSignInAt: string | null;
	/**
	 * The third-party identities linked to the account, in the order Supabase
	 * reports them. Empty for an account that only ever used the email link —
	 * Supabase's own `email` identity is not a social provider and is dropped.
	 */
	providers: OAuthProvider[];
	/**
	 * Total accumulated experience, from the Supabase `player_profiles` table.
	 * Starts at 0 for a fresh account and is only ever increased by winning fights
	 * (server-side, via the `award_combat_exp` RPC, which is the sole writer and
	 * decides the amount itself). Defaults to 0 until the value has loaded.
	 */
	exp: number;
	/**
	 * The player's level, derived from {@link exp} via the D&D 5e experience table
	 * (`levelForExp`). Not stored — always computed from {@link exp}.
	 */
	level: number;
	/**
	 * The character half of the avatar the player wears, from the Supabase
	 * `player_profiles` table, or `null` for the initial-letter avatar every
	 * account starts on. Always read with {@link avatarColor}: an avatar is a
	 * (character, colour) pair the player owns — a `player_avatars` row — and one
	 * half of it names nothing on its own.
	 *
	 * The artwork is not stored: it is the definition's own face, authored in the
	 * admin, so the avatar follows whatever is cropped there. Set through the
	 * `set_player_avatar` RPC, which refuses a pair the caller does not own.
	 */
	avatarCharacterId: string | null;
	/**
	 * The colour half of the worn avatar — the colour the portrait is printed in,
	 * and what the picture stands on. `null` alongside a null
	 * {@link avatarCharacterId}; the two are only ever set and cleared together.
	 */
	avatarColor: SpawnColor | null;
}
