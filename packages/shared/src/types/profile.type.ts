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
}
