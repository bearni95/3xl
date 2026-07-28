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
	 * The username the account chose, or `null` when it has never been set.
	 * A fresh account starts with `null`; the app prompts for one on first
	 * sign-in and via the profile card.
	 */
	username: string | null;
	/** Display name — the chosen {@link username}, falling back to the email local-part. */
	displayName: string;
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
	 * The character whose portrait the player wears as their profile picture, from
	 * the Supabase `player_profiles` table, or `null` for the initial-letter
	 * avatar every account starts on. Only the character is stored: which portrait
	 * it shows is the definition's own face, authored in the admin, so the avatar
	 * follows whatever is picked there. Set through the `set_player_avatar` RPC.
	 */
	avatarCharacterId: string | null;
}
